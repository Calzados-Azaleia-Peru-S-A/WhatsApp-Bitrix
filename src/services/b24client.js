'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const qs = require('qs');

// Ruta de tokens OAuth locales
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

// === LLAMADAS ===============================================================

// Siempre enviar x-www-form-urlencoded con arrays tipo PHP
async function callB24(method, params = {}) {
  const t = readTok();
  const url = `${baseUrl()}${method}`;

  // Construimos payload con auth
  const payload = { ...(params || {}), auth: t.access_token };

  // Convertir a form-urlencoded con índices
  const body = qs.stringify(payload, {
    encodeValuesOnly: true,
    arrayFormat: 'indices',
  });

  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    const msg = `HTTP ${res.status} calling ${method} -> ${JSON.stringify(res.data)}`;
    const err = new Error(msg);
    err.httpStatus = res.status;
    err.responseBody = res.data;
    throw err;
  }
  if (res.data && res.data.error) {
    const err = new Error(res.data.error_description || res.data.error);
    err.httpStatus = 400;
    err.responseBody = res.data;
    throw err;
  }

  return res.data?.result ?? res.data;
}

// Para que whatsapp.js sepa que esto usa form-urlencoded
callB24.__usesFormUrlEncoded = true;

module.exports = {
  callB24,
  baseUrl,
};
