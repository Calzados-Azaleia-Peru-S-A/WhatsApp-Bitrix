'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const secretsPath = path.join(process.cwd(), 'secrets', 'b24.json');

function readTokens() {
  if (!fs.existsSync(secretsPath)) {
    throw new Error('Tokens no instalados. Reinstala la app (llama /b24/install).');
  }
  return JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
}

function saveTokens(obj) {
  fs.writeFileSync(secretsPath, JSON.stringify(obj, null, 2), 'utf8');
}

async function refresh() {
  const t = readTokens();
  const cid = process.env.B24_CLIENT_ID;
  const cs = process.env.B24_CLIENT_SECRET;
  const refreshId = t.refresh_id;

  if (!cid || !cs || !refreshId) {
    throw new Error('No hay credenciales para refresh (B24_CLIENT_ID/SECRET o refresh_id).');
  }

  console.log('[b24client] Refreshing token...');
  const url = `https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=${encodeURIComponent(cid)}&client_secret=${encodeURIComponent(cs)}&refresh_token=${encodeURIComponent(refreshId)}`;

  const { data } = await axios.get(url, { timeout: 15000 });
  if (!data?.access_token) {
    throw new Error('No se pudo refrescar token');
  }

  const updated = {
    ...t,
    auth_id: data.access_token,
    refresh_id: data.refresh_token || t.refresh_id,
    expires: data.expires_in || 3600,
    received_at: new Date().toISOString()
  };
  saveTokens(updated);
  console.log('[b24client] Token refreshed.');
  return updated;
}

function baseUrl() {
  const t = readTokens();
  return `https://${t.domain}/rest/`;
}

async function call(method, params = {}) {
  try {
    const t = readTokens();
    const url = `${baseUrl()}${method}`;
    const { data } = await axios.post(url, { ...params, auth: t.auth_id }, { timeout: 20000 });
    if (data?.error) {
      const e = new Error(data.error_description || data.error);
      e.httpStatus = 400;
      e.bitrix = data;
      throw e;
    }
    return data?.result ?? data;
  } catch (e) {
    const code = e?.bitrix?.error || e?.response?.data?.error;
    const desc = e?.bitrix?.error_description || e?.response?.data?.error_description || e.message;

    if (code === 'expired_token' || code === 'invalid_token' || /expired/i.test(desc || '')) {
      console.log('[b24client] Detected expired/invalid token -> refreshing...');
      await refresh();
      const t2 = readTokens();
      const url2 = `${baseUrl()}${method}`;
      const { data } = await axios.post(url2, { ...params, auth: t2.auth_id }, { timeout: 20000 });
      if (data?.error) {
        const err = new Error(data.error_description || data.error);
        err.httpStatus = 400;
        err.bitrix = data;
        throw err;
      }
      return data?.result ?? data;
    }

    if (e.response) {
      const err = new Error(`HTTP ${e.response.status} ${e.response.statusText}`);
      err.httpStatus = e.response.status;
      err.bitrix = e.response.data;
      throw err;
    }
    throw e;
  }
}

module.exports = { call, refresh };
