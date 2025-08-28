// src/b24-events.js
// Bitrix -> WhatsApp (Cloud API). Procesa ONIMCONNECTORMESSAGEADD con fields.MESSAGES[*]

const axios = require('axios');

const WSP_TOKEN = process.env.WSP_TOKEN;                     // Token de Meta (perms whatsapp_business_messaging)
const WSP_PHONE_NUMBER_ID = process.env.WSP_PHONE_NUMBER_ID; // Ej: 741220429081783

// Util: s() para castear seguro a string
const s = (v) => (v == null ? '' : String(v));

module.exports = async function b24Events(req, res) {
  try {
    const body = req.body || {};
    console.log('[b24:event] body keys=', Object.keys(body));

    const event = body.event || body?.data?.event || 'n/a';
    const fields = body.data || body.FIELDS || body || {};
    console.log('[b24:event] event=', event, 'fields keys=', Object.keys(fields));

    // Normalizamos: algunos envíos llegan con MESSAGE/CHAT, otros con MESSAGES[]
    /** @type {Array} */
    let messages = [];

    if (Array.isArray(fields.MESSAGES) && fields.MESSAGES.length) {
      messages = fields.MESSAGES;
    } else if (fields.MESSAGE || fields.CHAT) {
      // Estructura "simple": lo convertimos a array homogéneo
      messages = [
        {
          message: fields.MESSAGE || {},
          chat: fields.CHAT || {},
          user: fields.USER || {},
          data: fields.DATA || {},
        },
      ];
    }

    // Si no hay mensajes claros, devolvemos 200 para que Bitrix no reintente indefinidamente
    if (!messages.length) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: 'Sin MESSAGES/MESSAGE en payload',
      });
    }

    if (!WSP_TOKEN || !WSP_PHONE_NUMBER_ID) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: 'Faltan WSP_TOKEN/WSP_PHONE_NUMBER_ID en .env',
      });
    }

    // Enviar cada mensaje a WhatsApp Cloud API
    const out = [];
    const errs = [];

    for (const m of messages) {
      try {
        // Soporte de mayúsc/minúsc
        const msg = m.message || m.MESSAGE || {};
        const chat = m.chat || m.CHAT || {};
        const to = s(chat.id || chat.ID || '');

        // Texto: Bitrix puede mandarlo en msg.text o msg.MESSAGE u otros campos
        const text =
          s(msg.text) ||
          s(msg.MESSAGE) ||
          s(msg.body) ||
          s(msg.BODY) ||
          '';

        // Si no hay texto ni destinatario, lo ignoramos (pero reportamos 200)
        if (!to || !text) {
          out.push({ to, sent: false, ignored: true });
          continue;
        }

        const url = `https://graph.facebook.com/v20.0/${WSP_PHONE_NUMBER_ID}/messages`;
        const payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        };

        console.log(`[b24:out] → WA to=${to} text="${text}"`);
        const r = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${WSP_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('[b24:out] respuesta WA:', JSON.stringify(r.data));
        out.push({ to, sent: true, wa: r.data });
      } catch (e) {
        const data = e?.response?.data || { error: e?.message };
        console.error('[b24:out] error WA:', data);
        errs.push(data);
        // Continuamos con los demás mensajes
      }
    }

    return res.status(200).json({
      ok: true,
      sent: out.filter(x => x.sent).length,
      results: out,
      errors: errs,
    });
  } catch (e) {
    console.error('[b24:event] fatal:', e);
    // Siempre 200 para evitar reintentos infinitos de Bitrix;
    // devolvemos el error para debug en logs
    return res.status(200).json({ ok: false, error: e?.message || 'fatal' });
  }
};
