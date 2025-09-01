// src/services/wsp.js
const axios = require('axios');
const { normalizeToE164 } = require('../utils/phone');

const WSP_TOKEN = process.env.WSP_TOKEN;
const WSP_PHONE_NUMBER_ID = process.env.WSP_PHONE_NUMBER_ID; // ej. 741220429081783

function ensureConfig() {
  if (!WSP_TOKEN || !WSP_PHONE_NUMBER_ID) {
    throw new Error('Faltan WSP_TOKEN o WSP_PHONE_NUMBER_ID en el .env');
  }
}
function getApiUrl() {
  return `https://graph.facebook.com/v20.0/${WSP_PHONE_NUMBER_ID}/messages`;
}

/** --- ENVÍO --- **/
async function sendText(toPhone, bodyText) {
  ensureConfig();
  const to = normalizeToE164(toPhone, 'PE');
  if (!to) throw new Error(`Número inválido: ${toPhone}`);
  const payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: String(bodyText || '') } };
  const { data } = await axios.post(getApiUrl(), payload, { headers: { Authorization: `Bearer ${WSP_TOKEN}` } });
  return data;
}
async function sendImageUrl(toPhone, url, caption) {
  ensureConfig();
  const to = normalizeToE164(toPhone, 'PE');
  if (!to) throw new Error(`Número inválido: ${toPhone}`);
  const payload = { messaging_product: 'whatsapp', to, type: 'image', image: { link: url, caption: caption || '' } };
  const { data } = await axios.post(getApiUrl(), payload, { headers: { Authorization: `Bearer ${WSP_TOKEN}` } });
  return data;
}
async function sendDocumentUrl(toPhone, url, filename) {
  ensureConfig();
  const to = normalizeToE164(toPhone, 'PE');
  if (!to) throw new Error(`Número inválido: ${toPhone}`);
  const payload = { messaging_product: 'whatsapp', to, type: 'document', document: { link: url, filename: filename || undefined } };
  const { data } = await axios.post(getApiUrl(), payload, { headers: { Authorization: `Bearer ${WSP_TOKEN}` } });
  return data;
}

/** --- RECEPCIÓN: obtener URL de media (temporal) --- **/
async function getMediaUrlById(mediaId) {
  // 1) obtener metadatos del media
  const metaUrl = `https://graph.facebook.com/v20.0/${mediaId}`;
  const { data: meta } = await axios.get(metaUrl, { headers: { Authorization: `Bearer ${WSP_TOKEN}` } });
  // meta.url es una URL temporal servida por Facebook (válida por minutos)
  return { url: meta.url, mime_type: meta.mime_type || null, sha256: meta.sha256 || null, file_size: meta.file_size || null, id: mediaId };
}

module.exports = { sendText, sendImageUrl, sendDocumentUrl, getMediaUrlById };
