'use strict';

const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const qs    = require('qs');

// Ruta donde se guardan los tokens OAuth de Bitrix24
const tokPath = path.join(process.cwd(), '.runtime', 'b24-oauth.json');

function readTok() {
  if (!fs.existsSync(tokPath)) {
    throw new Error('No hay tokens en .runtime/b24-oauth.json. Reinstala la app o usa /b24/install.');
  }
  return JSON.parse(fs.readFileSync(tokPath, 'utf8'));
}

function baseUrl() {
  const t = readTok();
  return t.client_endpoint || `https://${t.domain}/rest/`;
}

// --- LLAMADAS ---------------------------------------------------------------
async function callB24(method, params = {}) {
  const t   = readTok();
  const url = `${baseUrl()}${method}`;

  const payload = { ...(params || {}), auth: t.access_token };
  const body    = qs.stringify(payload, { encodeValuesOnly: true, arrayFormat: 'indices' });

  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    const msg = `HTTP ${res.status} calling ${method} -> ${JSON.stringify(res.data)}`;
    const err = new Error(msg);
    err.httpStatus   = res.status;
    err.responseBody = res.data;
    throw err;
  }
  if (res.data && res.data.error) {
    const err = new Error(res.data.error_description || res.data.error);
    err.httpStatus   = 400;
    err.responseBody = res.data;
    throw err;
  }

  return res.data?.result ?? res.data;
}

callB24.__usesFormUrlEncoded = true;

// --- CONTACTOS --------------------------------------------------------------
async function findContactByPhone(phoneE164) {
  const res = await callB24('crm.contact.list', {
    FILTER: { PHONE: phoneE164 },
  });
  return Array.isArray(res) ? res[0] : res;
}

async function createContact({ name, phoneE164 }) {
  return callB24('crm.contact.add', {
    FIELDS: {
      NAME:  name,
      PHONE: [{ VALUE: phoneE164, VALUE_TYPE: 'WORK' }],
    },
  });
}

module.exports = {
  callB24,
  baseUrl,
  findContactByPhone,
  createContact,
};
