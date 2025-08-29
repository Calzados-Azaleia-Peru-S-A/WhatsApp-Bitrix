// src/webhooks/whatsapp.js
const { normalizeToE164 } = require('../utils/phone');
const { saveInboundMessage, saveStatus } = require('../services/statusStore');
const { ensureContactByPhone } = require('../services/contacts');

const VERIFY_TOKEN = process.env.WSP_VERIFY_TOKEN || 'test123';
const MARK_READ = String(process.env.WSP_MARK_READ || '1') === '1';

async function getVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
}

async function postEvents(req, res) {
  try {
    const body = req.body;
    res.status(200).json({ ok: true }); // ACK rápido

    if (!body || body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        // Mensajes entrantes
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const fromRaw = msg.from; // '519...'
            const fromE164 = normalizeToE164(fromRaw);
            const text = msg.text?.body || msg.button?.text || '';
            const wamid = msg.id;
            const profileName = value.contacts?.[0]?.profile?.name || null;

            // 1) Contacto automático en Bitrix
            try {
              await ensureContactByPhone({ phoneE164: fromE164, name: profileName || fromE164 });
            } catch (e) {
              console.error('[contact:auto] error', e.message);
            }

            // 2) Timeline local
            await saveInboundMessage({ wamid, fromE164, text, profileName });

            // 3) (opcional) marcar leído -> se puede implementar con llamada a /messages (Meta)
            if (MARK_READ) {
              // TODO: marcar leído si lo requieres
            }
          }
        }

        // Estados de entrega/lectura/error
        if (Array.isArray(value.statuses)) {
          for (const st of value.statuses) {
            const wamid = st.id;
            const phoneE164 = normalizeToE164(st.recipient_id);
            const status = st.status; // sent/delivered/read/failed
            const error = st.errors?.[0] ? JSON.stringify(st.errors[0]) : null;
            await saveStatus({ wamid, phoneE164, status, error });
          }
        }
      }
    }
  } catch (e) {
    console.error('[wsp:webhook] error', e);
  }
}

module.exports = { getVerify, postEvents };
