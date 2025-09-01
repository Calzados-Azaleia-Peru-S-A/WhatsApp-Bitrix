// src/config/env.js
// Carga .env MUY temprano y valida claves críticas.

const path = require('path');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validar claves mínimas (no detenemos el server, pero avisamos)
function ensureEnv() {
  const required = [
    'B24_CLIENT_ID',
    'B24_CLIENT_SECRET',
    'APP_PUBLIC_BASE',
  ];
  const missing = required.filter(k => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    console.warn('[env] Faltan variables en .env ->', missing.join(', '));
  }

  // Opcional: sugerir dominio si no está
  if (!process.env.B24_DOMAIN) {
    console.warn('[env] Sugerencia: define B24_DOMAIN=azaleia-peru.bitrix24.es para fallback estable.');
  }
}

// Exponer una helper para depurar .env (enmascarando secretos)
function snapshotEnv() {
  const mask = (s) => (s ? s.slice(0, 4) + '***' + s.slice(-4) : '(empty)');
  return {
    APP_PUBLIC_BASE: process.env.APP_PUBLIC_BASE || '(empty)',
    B24_CLIENT_ID: mask(process.env.B24_CLIENT_ID),
    B24_CLIENT_SECRET: mask(process.env.B24_CLIENT_SECRET),
    B24_DOMAIN: process.env.B24_DOMAIN || '(empty)',
    WSP_PHONE_NUMBER_ID: process.env.WSP_PHONE_NUMBER_ID || '(empty)',
    CONNECTOR_CODE: process.env.CONNECTOR_CODE || '(empty)',
  };
}

ensureEnv();

module.exports = { snapshotEnv };
