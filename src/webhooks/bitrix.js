// src/webhooks/bitrix.js
// Handlers de instalación, pruebas y eventos para Bitrix24.
// No crashea si faltan otros servicios; responde con 200/JSON para mantener la sesión viva.

const fs = require('fs');
const path = require('path');

// Carga de utilidades OAuth (tolerante)
let b24oauth = {};
try {
  b24oauth = require('../services/b24oauth');
} catch (e) {
  console.warn('[bitrix] b24oauth no disponible:', e.message);
}
const ensureFreshToken = b24oauth?.ensureFreshToken;
const saveTokenSnapshot = b24oauth?.saveTokenSnapshot;

// Carga opcional de cliente (enviar a WhatsApp, etc.)
let b24client = {};
try {
  b24client = require('../services/b24client');
} catch (e) {
  console.warn('[bitrix] b24client no disponible:', e.message);
}

const RUNTIME_DIR = path.join(process.cwd(), '.runtime');
const INSTALL_LOG = path.join(RUNTIME_DIR, 'install-hit.log');
const TOKEN_FILE  = path.join(RUNTIME_DIR, 'b24-oauth.json');

// Asegura .runtime
if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

// Util: apéndice de línea JSON a install-hit.log
function appendInstallLog(entry) {
  try {
    fs.appendFileSync(INSTALL_LOG, JSON.stringify(entry) + '\n', 'utf8');
  } catch (e) {
    console.error('[bitrix] no se pudo escribir install-hit.log:', e);
  }
}

// Util: lee snapshot tokens (si existe)
function readToken() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// GET /b24/install -> debe responder HTML 400 y escribir install-hit.log
async function getInstall(req, res) {
  const hit = {
    ts: new Date().toISOString(),
    method: 'GET',
    url: req.originalUrl || req.url,
    headers: {
      host: req.headers.host,
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'accept-encoding': req.headers['accept-encoding'],
    },
    query: req.query || {},
    body: {},
  };
  appendInstallLog(hit);

  res.status(400).send(
    '<!doctype html><html><head><meta charset="utf-8"><title>Bitrix Install</title></head>' +
    '<body><h3>Instalación Bitrix</h3><p>Usa el método POST para ONAPPINSTALL.</p></body></html>'
  );
}

// POST /b24/install -> guarda tokens de ONAPPINSTALL y responde 200 (HTML corto)
async function postInstall(req, res) {
  try {
    const payload = req.body || {};
    appendInstallLog({
      ts: new Date().toISOString(),
      method: 'POST',
      url: req.originalUrl || req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-length': req.headers['content-length'],
        'content-type': req.headers['content-type'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
      },
      query: req.query || {},
      body: payload,
    });

    // Bitrix envía ONAPPINSTALL con auth.*
    const auth = payload?.auth || {};
    if (auth?.access_token) {
      const snapshot = {
        access_token: auth.access_token,
        refresh_token: auth.refresh_token,
        expires_in: Number(auth.expires_in || 3600),
        domain: auth.domain || 'oauth.bitrix.info',
        client_endpoint: auth.client_endpoint,
        server_endpoint: auth.server_endpoint,
        member_id: auth.member_id,
        user_id: auth.user_id,
        scope: auth.scope,
        status: auth.status,
        obtained_at: Date.now(),
      };
      if (typeof saveTokenSnapshot === 'function') {
        saveTokenSnapshot(snapshot);
      } else {
        // fallback mínimo: escribir directo
        fs.writeFileSync(TOKEN_FILE, JSON.stringify({ ...snapshot, ts_saved: Date.now() }, null, 2), 'utf8');
      }
    }

    res.status(200).send(
      '<!doctype html><html><head><meta charset="utf-8"><title>Install OK</title></head>' +
      '<body><h3>Instalación recibida</h3><p>Tokens almacenados.</p></body></html>'
    );
  } catch (e) {
    console.error('[b24:install] error', e);
    res.status(500).send(
      '<!doctype html><html><head><meta charset="utf-8"><title>Error</title></head>' +
      '<body><h3>Error procesando instalación</h3></body></html>'
    );
  }
}

// GET /b24/test -> llama user.current con access_token vigente
async function getTest(req, res) {
  try {
    if (typeof ensureFreshToken !== 'function') {
      return res.json({ ok: false, error: 'ensureFreshToken no disponible' });
    }
    const tk = await ensureFreshToken(); // refresca si expira
    const endpoint = tk.client_endpoint || `https://${tk.domain || 'oauth.bitrix.info'}/rest/`;
    const url = endpoint.replace(/\/?$/, '/') + 'user.current';

    const params = new URLSearchParams({ auth: tk.access_token });
    const r = await fetch(url + '?' + params.toString(), { method: 'GET' });
    if (!r.ok) {
      const txt = await r.text();
      return res.json({ ok: false, error: `HTTP ${r.status}`, detail: txt.slice(0, 4000) });
    }
    const j = await r.json();
    if (j.error) {
      return res.json({ ok: false, error: j.error_description || j.error });
    }
    return res.json({ ok: true, me: j.result || j });
  } catch (e) {
    console.error('[b24:test] error', e);
    return res.json({ ok: false, error: e.message });
  }
}

// GET /b24/debug -> info básica y existencia de archivos
async function getDebug(req, res) {
  try {
    const appPublicBase = process.env.APP_PUBLIC_BASE;
    const expectedRedirect = appPublicBase
      ? `${appPublicBase.replace(/\/$/, '')}/b24/install`
      : '(unset)';

    const files = {
      'install-hit.log': fs.existsSync(INSTALL_LOG),
      'b24-oauth.json': fs.existsSync(TOKEN_FILE),
    };

    res.json({
      ok: true,
      app_public_base: appPublicBase,
      expected_redirect_uri: expectedRedirect,
      files,
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
}

// POST /b24/events -> acepta eventos y responde OK
// Soporta ONIMCONNECTORMESSAGEADD (texto saliente desde Bitrix)
async function postEvents(req, res) {
  try {
    const body = req.body || {};
    // Siempre responder rápido 200 para que Bitrix no reintente
    res.json({ ok: true });

    console.log('[b24:events] body=', JSON.stringify(body));

    const event = body.event || body.type || '';
    // Ej: ONIMCONNECTORMESSAGEADD/ONIMCONNECTORDIALOGFINISH/etc.
    if (event === 'ONIMCONNECTORMESSAGEADD') {
      const chatId = body?.data?.MESSAGES?.[0]?.chat?.id || body?.data?.chat?.id || body?.data?.CONNECTOR?.chat_id;
      const text = body?.data?.MESSAGES?.[0]?.message?.text || body?.data?.message?.text;

      if (chatId && text) {
        // Si existe b24client.sendText, intentamos enviar a WhatsApp
        const sendFn = typeof b24client.sendText === 'function' ? b24client.sendText : null;
        if (sendFn) {
          try {
            const phone = chatId.startsWith('+') ? chatId : `+${chatId}`;
            const r = await sendFn(phone, text);
            console.log('[b24→WA] text ok', JSON.stringify(r));
          } catch (e) {
            console.error('[b24→WA] text error', e.message);
          }
        } else {
          console.warn('[b24→WA] sendText no implementado; evento recibido pero no reenviado.');
        }
      } else {
        console.warn('[b24:events] sin chatId o texto en ONIMCONNECTORMESSAGEADD');
      }
    }

    // Otros eventos pueden manejarse aquí si lo necesitas:
    // - ONIMCONNECTORDIALOGFINISH, etc.

  } catch (e) {
    console.error('[b24:events] error', e);
    // Ya respondimos 200 antes, no hacemos nada más
  }
}

module.exports = {
  getInstall,
  postInstall,
  getTest,
  getDebug,
  postEvents,
};
