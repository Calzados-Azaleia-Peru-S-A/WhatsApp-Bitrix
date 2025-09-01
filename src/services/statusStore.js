// src/services/statusStore.js
// Persistencia ligera: timeline (status.jsonl) + mapa wamid <-> im.message_id (outbound-map.json)

const fs = require('fs-extra');
const path = require('path');

const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
const TIMELINE_FILE = path.join(RUNTIME_DIR, 'status.jsonl');
const MAP_FILE = path.join(RUNTIME_DIR, 'outbound-map.json');

fs.ensureDirSync(RUNTIME_DIR);

/** Apéndice para inbound timeline (auditoría local) */
async function appendInbound(evt) {
  const line = JSON.stringify({ type: 'inbound', ...evt }) + '\n';
  await fs.appendFile(TIMELINE_FILE, line);
}

/** Apéndice de estados (auditoría local) */
async function appendStatus(evt) {
  const line = JSON.stringify({ type: 'status', ...evt }) + '\n';
  await fs.appendFile(TIMELINE_FILE, line);
}

/** Carga mapa (si no existe, objeto vacío) */
async function loadMap() {
  try {
    const raw = await fs.readFile(MAP_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Guarda mapa completo */
async function saveMap(obj) {
  await fs.writeFile(MAP_FILE, JSON.stringify(obj, null, 2));
}

/** Guarda relación wamid -> { imMsgId, chatId }  (chatId = id del chat en Bitrix, sin '+') */
async function saveOutboundMap({ wamid, imMsgId, chatId }) {
  if (!wamid || !imMsgId || !chatId) return;
  const map = await loadMap();
  map[wamid] = { imMsgId: String(imMsgId), chatId: String(chatId) };
  await saveMap(map);
}

/** Busca relación por wamid */
async function findOutboundMap(wamid) {
  const map = await loadMap();
  return map[wamid] || null;
}

module.exports = {
  appendInbound,
  appendStatus,
  saveOutboundMap,
  findOutboundMap
};
