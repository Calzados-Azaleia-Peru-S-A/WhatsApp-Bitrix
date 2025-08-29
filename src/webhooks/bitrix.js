// src/webhooks/bitrix.js
// Rutas Bitrix: instalación (tokens), eventos (agente->cliente), pruebas y depuración.

const fs = require('fs-extra');
const path = require('path');
const { exchangeCodeForTokens, getRedirectUri, saveTokensFromInstallEvent } = require('../services/b24oauth');
const { call } = require('../services/b24client');

const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
const HIT_LOG = path.join(RUNTIME_DIR, 'install-hit.log');
const OAUTH_FILE = path.join(RUNTIME_DIR, 'b24-oauth.json');

/**
 * Registra cada hit a /b24/install (útil para ver si llegó ONAPPINSTALL o ?code=...)
 */
async function logInstallHit(req) {
  await fs.ensureFile(HIT_LOG);
  const entry = {
    ts: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    query: req.query || {},
    body: req.body || {}
  };
  await fs.appendFile(HIT_LOG, JSON.stringify(entry) + '\n', 'utf8');
  console.log('[b24:install] hit', entry.method, entry.url);
}

/**
 * /b24/install
 * - App Local: llega event=ONAPPINSTALL con tokens en body.auth -> guardamos tokens
 * - OAuth clásico: llega ?code=... -> intercambiamos por tokens
 * - Si no llega ninguno, devolvemos 400 con pista
 */
async function install(req, res) {
  try {
    await logInstallHit(req);

    // Caso App Local: Bitrix manda ONAPPINSTALL con tokens en body.auth
    if (req.body && req.body.event === 'ONAPPINSTALL' && req.body.auth && req.body.auth.access_token) {
      await saveTokensFromInstallEvent(req.body.auth);
      return res.status(200).send(
        `<html><body style="font-family:sans-serif">
           <h3>✅ App autorizada (App Local)</h3>
           <p>Tokens guardados en <code>.runtime/b24-oauth.json</code></p>
         </body></html>`
      );
    }

    // Caso OAuth clásico: ?code=...
    const code = req.query.code || req.body.code;
    if (code) {
      await exchangeCodeForTokens(code);
      return res.status(200).send(
        `<html><body style="font-family:sans-serif">
           <h3>✅ App autorizada (OAuth code)</h3>
           <p>Tokens guardados en <code>.runtime/b24-oauth.json</code></p>
         </body></html>`
      );
    }

    // Ninguno de los dos
    const dbg = { hint: 'No vino ONAPPINSTALL ni ?code=. Pulsa REINSTALAR en la App Local.', expected_redirect_uri: getRedirectUri() };
    return res.status(400).send(
      `<html><body style="font-family:sans-serif">
         <h3>⚠️ Falta ONAPPINSTALL o ?code=...</h3>
         <pre>${JSON.stringify(dbg, null, 2)}</pre>
         <p>Log: <code>${HIT_LOG.replace(/\\/g,'/')}</code></p>
       </body></html>`
    );
  } catch (e) {
    console.error('[b24:install] error', e);
    return res.status(500).send('Error en instalación: ' + e.message);
  }
}

/**
 * /b24/events
 * Recibe eventos de Bitrix. Nos interesa ONIMCONNECTORMESSAGEADD (agente -> cliente).
 * Lee CONNECTOR/LINE y MESSAGES[] con chat.id (teléfono sin +) y message.text.
 * Envía por WhatsApp usando src/services/wsp.js
 */
// --- reemplazar SOLO esta función en src/webhooks/bitrix.js ---
async function events(req, res) {
  try {
    const p = req.body || {};
    const ev = String(p.event || '').toUpperCase();

    // responde rápido a Bitrix
    res.json({ ok: true });

    if (ev !== 'ONIMCONNECTORMESSAGEADD') {
      console.log('[b24:events] ignorado:', ev);
      return;
    }

    // filtros opcionales por conector/línea desde .env
    const WANT_CONNECTOR = (process.env.CONNECTOR_CODE || '').toLowerCase() || null; // ej: "wa_cloud_custom"
    const WANT_LINE = String(process.env.OPENLINE_ID || '').trim() || null;          // ej: "154"

    const data = p.data || p.DATA || {};
    const connectorCode = (data.CONNECTOR || '').toLowerCase();
    const lineId = data.LINE ? String(data.LINE) : null;

    if (WANT_CONNECTOR && connectorCode && connectorCode !== WANT_CONNECTOR) {
      console.log('[b24:events] skip: connector distinto', connectorCode);
      return;
    }
    if (WANT_LINE && lineId && lineId !== WANT_LINE) {
      console.log('[b24:events] skip: line distinta', lineId);
      return;
    }

    // Bitrix manda un array MESSAGES con info del mensaje del agente
    const items = Array.isArray(data.MESSAGES) ? data.MESSAGES : [];
    if (!items.length) {
      console.warn('[b24:events] sin MESSAGES en payload', JSON.stringify(p));
      return;
    }

    const { sendText } = require('../services/wsp');
    const { call } = require('../services/b24client');

    for (const it of items) {
      // Teléfono del cliente (sin '+')
      const chatId =
        it.chat?.id ||
        it.connector?.chat_id ||
        it.im?.chat_id ||
        null;

      // Texto del agente
      const messageText =
        it.message?.text ||
        it.MESSAGE_TEXT ||
        '';

      // ID interno de Bitrix para este mensaje (sirve para confirmar estado)
      const bitrixMsgId = it.im?.message_id || it.message?.id || null;

      console.log('[b24:events] parsed chatId=', chatId, 'message=', messageText, 'bxMsgId=', bitrixMsgId);

      if (!chatId) { console.warn('[b24:events] item sin chatId', JSON.stringify(it)); continue; }
      if (!messageText) { console.warn('[b24:events] item sin texto', JSON.stringify(it)); continue; }

      const toPhoneRaw = String(chatId).startsWith('+') ? String(chatId) : `+${chatId}`;

      // 1) Enviar al cliente por WhatsApp
      let wamid = null;
      try {
        const resp = await sendText(toPhoneRaw, messageText);
        // ej: resp.messages[0].id
        wamid = resp && resp.messages && resp.messages[0] && resp.messages[0].id || null;
        console.log('[b24→WA] text ok', JSON.stringify(resp));
      } catch (e) {
        console.error('[b24→WA] text error', e?.response?.data || e.message || e);
        // Si falló el envío a WA, notificamos error de envío a Bitrix (opcional)
        try {
          const payloadErr = {
            CONNECTOR: process.env.CONNECTOR_CODE || connectorCode || 'wa_cloud_custom',
            LINE: process.env.OPENLINE_ID || lineId || '',
            MESSAGES: [
              {
                chat: { id: chatId },
                im: bitrixMsgId ? { message_id: bitrixMsgId } : undefined,
                message: { id: wamid || 'send_failed' },
                status: 'error',
                error: String(e?.response?.data?.error?.message || e.message || 'send_failed')
              }
            ]
          };
          await call('imconnector.send.status.delivery', payloadErr);
        } catch (e2) {
          console.error('[b24→B24] status error (al reportar fallo)', e2?.response?.data || e2.message || e2);
        }
        continue; // pasa al siguiente item
      }

      // 2) Confirmar a Bitrix que el mensaje fue “enviado/entregado”
      //    Esto evita que se quede “cargando / no se pudo enviar” en la Open Line.
      try {
        const payloadOk = {
          CONNECTOR: process.env.CONNECTOR_CODE || connectorCode || 'wa_cloud_custom',
          LINE: process.env.OPENLINE_ID || lineId || '',
          MESSAGES: [
            {
              chat: { id: chatId },                 // sin '+'
              im: bitrixMsgId ? { message_id: bitrixMsgId } : undefined, // referencia al mensaje original del agente en Bitrix
              message: { id: wamid || 'sent' },     // id externo (wamid) para trazabilidad
              status: 'delivered'                   // “delivered”/“sent” según preferencia
            }
          ]
        };
        const ack = await call('imconnector.send.status.delivery', payloadOk);
        console.log('[b24→B24] status ok', JSON.stringify(ack));
      } catch (e) {
        console.error('[b24→B24] status error', e?.response?.data || e.message || e);
      }
    }
  } catch (e) {
    console.error('[b24:events] error', e?.response?.data || e.message || e);
  }
}
// --- fin función events ---


/**
 * /b24/test
 * Usa el cliente Bitrix para llamar user.current y validar token almacenado.
 */
async function test(req, res) {
  try {
    const me = await call('user.current', {});
    return res.json({ ok: true, me });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * /b24/debug
 * Muestra APP_PUBLIC_BASE, redirect_uri esperado y existencia de archivos clave.
 */
async function debug(req, res) {
  try {
    const appBase = process.env.APP_PUBLIC_BASE;
    const expected_redirect_uri = getRedirectUri();
    const hitLogExists = await fs.pathExists(HIT_LOG);
    const oauthExists = await fs.pathExists(OAUTH_FILE);
    res.json({
      ok: true,
      app_public_base: appBase,
      expected_redirect_uri,
      files: { 'install-hit.log': hitLogExists, 'b24-oauth.json': oauthExists }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = { install, events, test, debug };
