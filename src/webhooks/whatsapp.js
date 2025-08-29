// src/webhooks/whatsapp.js
// Webhook de WhatsApp Cloud: verify + inbound -> Bitrix (imconnector.receiveMessage)

const { appendInbound, appendStatus } = require('../services/statusStore');
const { normalizeToE164, stripPlus } = require('../utils/phone');
const { call } = require('../services/b24client');

/**
 * GET /webhooks/whatsapp (challenge)
 */
async function getVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WSP_VERIFY_TOKEN && challenge) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('forbidden');
}

/**
 * POST /webhooks/whatsapp
 * Maneja mensajes entrantes y estados.
 * Empuja mensajes entrantes a Bitrix: imconnector.receiveMessage
 */
async function postEvents(req, res) {
  try {
    const body = req.body || {};
    // Responder rápido a Meta
    res.json({ ok: true });

    // WhatsApp Cloud -> entry/changes/value
    const entry = Array.isArray(body.entry) && body.entry[0];
    const changes = entry && Array.isArray(entry.changes) && entry.changes[0];
    const value = changes && changes.value;

    if (!value) return;

    // Mensajes entrantes
    if (Array.isArray(value.messages) && value.messages.length > 0) {
      for (const m of value.messages) {
        // Solo texto simple por ahora
        if (m.type !== 'text') continue;

        const wamid = m.id;
        const fromRaw = m.from;               // MSISDN sin '+', ej: "51918131082"
        const fromE164 = normalizeToE164(fromRaw, 'PE'); // "+51918131082"
        const fromNoPlus = stripPlus(fromE164);          // "51918131082"
        const text = m.text && m.text.body ? String(m.text.body) : '';
        const profileName = value.contacts && value.contacts[0] && value.contacts[0].profile && value.contacts[0].profile.name;

        // Guardar timeline local
        await appendInbound({
          wamid,
          from: fromE164,
          text,
          profileName: profileName || '',
          ts: Date.now()
        });

        // Empujar a Bitrix (Open Line) como mensaje del cliente
        try {
          const connector = process.env.CONNECTOR_CODE || 'wa_cloud_custom';
          const line = String(process.env.OPENLINE_ID || '').trim();
          if (!connector || !line) {
            console.warn('[WA→B24] faltan CONNECTOR_CODE u OPENLINE_ID en .env; se salta push');
          } else {
            const payload = {
              CONNECTOR: connector,
              LINE: line,
              MESSAGES: [
                {
                  chat: { id: fromNoPlus }, // teléfono sin '+'
                  message: {
                    id: wamid,
                    text: text,
                    date: Math.floor(Date.now() / 1000)
                  },
                  user: {
                    id: fromNoPlus,               // identificador del cliente en el conector
                    name: profileName || fromE164 // nombre visible
                  }
                }
              ]
            };
            const r = await call('imconnector.send.messages', payload);
            console.log('[WA→B24] rx text ok', JSON.stringify(r));
          }
        } catch (e) {
          console.error('[WA→B24] rx text error', e?.response?.data || e.message || e);
        }
      }
    }

    // Estados de entrega/lectura (opcional: guardar local)
    if (Array.isArray(value.statuses) && value.statuses.length > 0) {
      for (const s of value.statuses) {
        await appendStatus({
          wamid: s.id,
          status: s.status,   // sent, delivered, read, failed
          ts: Date.now(),
          raw: s
        });
      }
    }
  } catch (e) {
    console.error('[wa:webhook] error', e?.response?.data || e.message || e);
    // ya respondimos 200 arriba
  }
}

module.exports = { getVerify, postEvents };
