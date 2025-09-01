'use strict';

/**
 * Cliente mínimo para llamar REST Bitrix con application/json.
 * Si tienes .runtime/b24-oauth.json, lo toma de ahí.
 * Si no, intentará usar B24_DOMAIN + B24_ACCESS_TOKEN (por si lo pones a mano).
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ===== Helpers para token/endpoint ====================================================
function readTok() {
  const f = path.join(process.cwd(), '.runtime', 'b24-oauth.json');
  if (fs.existsSync(f)) {
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch (e) {
      throw new Error('No pude leer .runtime/b24-oauth.json: ' + e.message);
    }
  }
  // fallback simple por variables de entorno (opcional)
  return {
    access_token: process.env.B24_ACCESS_TOKEN || '',
    client_endpoint: process.env.B24_CLIENT_ENDPOINT || (process.env.B24_DOMAIN ? `https://${process.env.B24_DOMAIN}/rest/` : ''),
    domain: process.env.B24_DOMAIN || '',
  };
}

function baseUrl() {
  const tok = readTok();
  const ep = (tok.client_endpoint || '').replace(/\/?$/, '/');
  if (!ep) throw new Error('No tengo client_endpoint. Reinstala la app o define B24_DOMAIN/B24_CLIENT_ENDPOINT.');
  return ep;
}

// ===== Llamadas REST (JSON) ===========================================================
async function callB24(method, params = {}) {
  const tok = readTok();
  const url = baseUrl() + method;
  const payload = { ...(params || {}), auth: tok.access_token };

  const res = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000,
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    const err = new Error(`HTTP ${res.status} calling ${method}`);
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

// Marca para que otros módulos sepan que estamos usando JSON (no x-www-form-urlencoded)
callB24.__usesJson = true;

module.exports = { callB24, baseUrl };
