// src/services/statusStore.js
// Almacenamiento simple tipo JSONL para timeline y estados.

const path = require('path');
const fs = require('fs-extra');

const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
const LOG_FILE = path.join(RUNTIME_DIR, 'status.jsonl');

// Asegura carpeta/archivo al cargar el módulo
fs.ensureDirSync(RUNTIME_DIR);
fs.ensureFileSync(LOG_FILE);

/**
 * Escribe una línea JSON en status.jsonl
 */
async function appendLine(obj) {
  const line = JSON.stringify(obj) + '\n';
  await fs.appendFile(LOG_FILE, line, 'utf8');
}

/**
 * Normaliza número a formato E.164 si ya viene con '+'
 * (si necesitas más lógica, centralízala en utils/phone)
 */
function normalizeE164Maybe(s) {
  if (!s) return null;
  const str = String(s).trim();
  return str.startsWith('+') ? str : str;
}

/**
 * Guarda un inbound (mensaje entrante de WhatsApp)
 * { wamid, from: '+51...', text, profileName, ts }
 */
async function appendInbound(evt) {
  const row = {
    type: 'inbound',
    wamid: evt.wamid || null,
    from: normalizeE164Maybe(evt.from),
    text: evt.text || '',
    profileName: evt.profileName || '',
    ts: Number(evt.ts || Date.now())
  };
  await appendLine(row);
  return row;
}

/**
 * Guarda un estado (sent/delivered/read/failed)
 * { wamid, status, ts, raw? }
 */
async function appendStatus(evt) {
  const row = {
    type: 'status',
    wamid: evt.wamid || null,
    status: evt.status || '',
    ts: Number(evt.ts || Date.now()),
    raw: evt.raw || undefined
  };
  await appendLine(row);
  return row;
}

/**
 * Lee el archivo completo como array de objetos (cuidado con tamaño).
 * Para este proyecto basta y sobra; si crece, podemos indexar.
 */
async function readAll() {
  const exists = await fs.pathExists(LOG_FILE);
  if (!exists) return [];
  const content = await fs.readFile(LOG_FILE, 'utf8');
  const lines = content.split('\n').filter(Boolean);
  const out = [];
  for (const ln of lines) {
    try { out.push(JSON.parse(ln)); } catch { /* ignora líneas corruptas */ }
  }
  return out;
}

/**
 * Busca todas las entradas por WAMID (puede haber varios estados para 1 wamid)
 */
async function getStatusByMessageId(wamid) {
  if (!wamid) return [];
  const all = await readAll();
  return all.filter(r => r.wamid === wamid);
}

/**
 * Devuelve el timeline por número E.164 (+51...), ordenado por ts asc
 */
async function getTimelineByPhone(phoneE164) {
  if (!phoneE164) return [];
  const e164 = normalizeE164Maybe(phoneE164);
  const all = await readAll();
  const filtered = all.filter(r => r.from === e164);
  // orden cronológico
  filtered.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  return filtered;
}

module.exports = {
  appendInbound,
  appendStatus,
  getStatusByMessageId,
  getTimelineByPhone,
  // por si sirve exportar también constantes
  LOG_FILE,
  RUNTIME_DIR,
};
