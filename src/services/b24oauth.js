// src/services/b24oauth.js
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
const TOK_FILE = path.join(RUNTIME_DIR, 'b24-oauth.json');

const B24_DOMAIN_ENV = process.env.B24_DOMAIN || 'azaleia-peru.bitrix24.es';
const CLIENT_ID = process.env.B24_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;
const APP_PUBLIC_BASE = process.env.APP_PUBLIC_BASE;

function getRedirectUri() {
  return `${APP_PUBLIC_BASE}/b24/install`;
}

async function loadTokens() {
  try { return await fs.readJson(TOK_FILE); } catch { return {}; }
}
async function saveTokens(obj) {
  await fs.ensureFile(TOK_FILE);
  await fs.writeJson(TOK_FILE, obj, { spaces: 2 });
  return obj;
}

async function exchangeCodeForTokens(code) {
  const url = 'https://oauth.bitrix.info/oauth/token/';
  const params = {
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: getRedirectUri(),
  };
  const { data } = await axios.post(url, null, { params });
  if (data.error) throw new Error(`${data.error}: ${data.error_description}`);
  return saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    domain: data.domain || B24_DOMAIN_ENV,
    obtained_at: Date.now(),
  });
}

async function saveTokensFromInstallEvent(auth) {
  if (!auth || !auth.access_token) throw new Error('ONAPPINSTALL sin auth.access_token');
  const obj = {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token || null,
    expires_in: Number(auth.expires_in || 3600),
    domain: auth.domain || B24_DOMAIN_ENV,
    obtained_at: Date.now(),
  };
  return saveTokens(obj);
}

function isExpired(tok) {
  if (!tok.access_token || !tok.expires_in || !tok.obtained_at) return true;
  const skew = 60;
  return (Date.now() / 1000) > (tok.obtained_at / 1000 + tok.expires_in - skew);
}

async function ensureAccessToken() {
  const tok = await loadTokens();
  if (!tok.access_token) throw new Error('Sin access_token. Autoriza en /b24/install (REINSTALAR en Bitrix).');
  if (isExpired(tok)) throw new Error('Token expirado. Pulsa REINSTALAR para renovar.');
  return tok.access_token;
}

module.exports = {
  getRedirectUri,
  exchangeCodeForTokens,
  saveTokensFromInstallEvent,
  ensureAccessToken,
  loadTokens,
  saveTokens,
};
