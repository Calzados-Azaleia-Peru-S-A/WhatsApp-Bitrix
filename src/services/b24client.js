// src/services/b24client.js
const axios = require('axios');
const { ensureAccessToken, loadTokens } = require('./b24oauth');

const B24_DEBUG = String(process.env.B24_DEBUG || '0') === '1';

async function apiUrl(method) {
  const tok = await loadTokens();
  const domain = tok.domain || process.env.B24_DOMAIN || 'azaleia-peru.bitrix24.es';
  return `https://${domain}/rest/${method}`;
}

async function call(method, params = {}) {
  const url = await apiUrl(method);
  const access_token = await ensureAccessToken();
  const payload = { ...params, auth: access_token };
  if (B24_DEBUG) {
    console.log(`[B24] POST ${url} ${JSON.stringify(Object.keys(params))}`);
  }
  const { data } = await axios.post(url, payload);
  if (data.error) throw new Error(`[Bitrix24] ${data.error}: ${data.error_description}`);
  return data.result;
}

// === CRM helpers ===

async function findContactByPhone(phoneE164) {
  // Bitrix no permite filter PHONE directo en /list, usamos filter[PHONE]=... (depende instancia).
  const params = {
    filter: { 'PHONE': phoneE164 },
    select: ['ID','NAME','LAST_NAME','PHONE','EMAIL']
  };
  const res = await call('crm.contact.list', params);
  if (Array.isArray(res) && res.length) return res[0];
  return null;
}

async function createContact({ name, phoneE164 }) {
  const fields = {
    NAME: name || phoneE164,
    OPENED: 'Y',
    TYPE_ID: 'CLIENT',
    SOURCE_ID: process.env.B24_SOURCE_ID || 'WHATSAPP',
    PHONE: [{ VALUE: phoneE164, VALUE_TYPE: 'WORK' }]
  };
  const id = await call('crm.contact.add', { fields });
  return id;
}

module.exports = {
  call,
  findContactByPhone,
  createContact
};
