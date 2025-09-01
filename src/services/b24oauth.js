// src/services/b24oauth.js
// Manejo de tokens OAuth de Bitrix24: snapshot, refresh y utilidades.

const fs = require('fs');
const path = require('path');

const RUNTIME_DIR = path.join(process.cwd(), '.runtime');
const TOKEN_FILE = path.join(RUNTIME_DIR, 'b24-oauth.json');

// Asegura carpeta .runtime
if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

/** Carga tokens de disco */
function loadTokenFromDisk() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const raw = fs.readFileSync(TOKEN_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[b24oauth] loadTokenFromDisk error', e);
    return null;
  }
}

/** Guarda tokens en disco con ts_saved */
function saveTokenSnapshot(obj) {
  try {
    const payload = { ...obj, ts_saved: Date.now() };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(payload, null, 2), 'utf8');
    return payload;
  } catch (e) {
    console.error('[b24oauth] saveTokenSnapshot error', e);
    throw e;
  }
}

/** Resumen simple para /b24/token-info */
function getTokenSnapshot() {
  const t = loadTokenFromDisk();
  if (!t) {
    return {
      has_access_token: false,
      has_refresh_token: false,
    };
  }
  return {
    has_access_token: !!t.access_token,
    has_refresh_token: !!t.refresh_token,
    expires_in: t.expires_in,
    ts_saved: t.ts_saved,
    domain: t.domain,
    client_endpoint: t.client_endpoint ? '(set)' : '(unset)',
    server_endpoint: t.server_endpoint ? '(set)' : '(unset)',
    member_id: t.member_id ? '(set)' : '(unset)',
  };
}

/** Calcula si el token expiró o va a expirar pronto (tolerancia 60s) */
function isTokenExpiringSoon(t) {
  if (!t) return true;
  const now = Math.floor(Date.now() / 1000);
  // Bitrix a veces guarda "expires" absoluto; si no, calculamos con obtained_at+expires_in
  const exp = t.expires
    ? Number(t.expires)
    : (t.obtained_at ? Math.floor(t.obtained_at / 1000) : now) + (Number(t.expires_in) || 0);
  return exp - now <= 60; // menos de 60s
}

/** Fuerza refresh contra oauth.bitrix.info */
async function forceRefresh() {
  const CLIENT_ID = process.env.B24_CLIENT_ID;
  const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;

  const current = loadTokenFromDisk();
  if (!CLIENT_ID || !CLIENT_SECRET || !current?.refresh_token) {
    const err = new Error('Faltan B24_CLIENT_ID / B24_CLIENT_SECRET o refresh_token.');
    err.code = 'REFRESH_CONFIG_MISSING';
    throw err;
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: current.refresh_token,
  });

  const url = 'https://oauth.bitrix.info/oauth/token/';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Refresh HTTP ${res.status}: ${txt}`);
    err.code = 'REFRESH_HTTP_ERROR';
    throw err;
  }

  const json = await res.json();
  const merged = {
    ...current,
    ...json,                // access_token, refresh_token, expires_in, scope, domain?, client_endpoint?, server_endpoint?, member_id?, user_id?
    obtained_at: Date.now()
  };
  saveTokenSnapshot(merged);

  return {
    refreshed_at: Date.now(),
    domain: merged.domain || 'oauth.bitrix.info',
    client_endpoint: merged.client_endpoint || '(unset)',
    server_endpoint: merged.server_endpoint || '(unset)',
  };
}

/**
 * Asegura que el access_token esté fresco.
 * - Si expira pronto, intenta forceRefresh().
 * - Devuelve el snapshot actualizado de tokens.
 */
async function ensureFreshToken() {
  let t = loadTokenFromDisk();
  if (!t) {
    const err = new Error('Snapshot de token ausente. Reinstala la app en Bitrix.');
    err.code = 'TOKEN_SNAPSHOT_MISSING';
    throw err;
  }
  if (isTokenExpiringSoon(t)) {
    await forceRefresh();
    t = loadTokenFromDisk();
  }
  return t;
}

module.exports = {
  loadTokenFromDisk,
  saveTokenSnapshot,
  getTokenSnapshot,
  forceRefresh,
  ensureFreshToken, // <- EXPORTADO para que bitrix.js lo use
};
