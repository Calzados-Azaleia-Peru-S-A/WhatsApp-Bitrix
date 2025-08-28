// services/wsp.js
const axios = require('axios');

const PHONE_ID = process.env.WSP_PHONE_NUMBER_ID;   // ej: 741220429081783
const TOKEN    = process.env.WSP_TOKEN;             // token de acceso de Meta

function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
}

async function sendText(to, text) {
  const dest = normalizePhone(to);
  if (!dest) throw new Error('WSP: número destino vacío');
  if (!text) throw new Error('WSP: texto vacío');

  const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: dest,
    type: 'text',
    text: { body: text }
  };

  const { data } = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    timeout: 20000
  });

  return data;
}

async function markRead(messageId) {
  try {
    const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    };
    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  } catch (e) {
    console.warn('[wsp.markRead] warn:', e.message);
  }
}

module.exports = { sendText, markRead, normalizePhone };
