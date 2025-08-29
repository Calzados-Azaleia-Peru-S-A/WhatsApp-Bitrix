// src/services/statusStore.js
const path = require('path');
const fs = require('fs-extra');

const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
const FILE = path.join(RUNTIME_DIR, 'status.jsonl');

async function append(event) {
  await fs.ensureFile(FILE);
  const line = JSON.stringify({ ...event, ts: Date.now() }) + '\n';
  await fs.appendFile(FILE, line, 'utf8');
}

async function readAll() {
  await fs.ensureFile(FILE);
  const txt = await fs.readFile(FILE, 'utf8');
  if (!txt.trim()) return [];
  return txt.split('\n').filter(Boolean).map(s => JSON.parse(s));
}

function mapStatus(status) {
  switch (status) {
    case 'message_sent':
    case 'sent': return 'Enviado';
    case 'delivered': return 'Entregado';
    case 'read': return 'Leído';
    case 'failed':
    case 'failed_to_send': return 'Error';
    default: return status;
  }
}

async function saveInboundMessage({ wamid, fromE164, text, profileName }) {
  await append({ type: 'inbound', wamid, from: fromE164, text, profileName });
}

async function saveStatus({ wamid, phoneE164, status, error }) {
  await append({ type: 'status', wamid, phone: phoneE164, status, chip: mapStatus(status), error: error || null });
}

async function getStatusByMessageId(wamid) {
  const all = await readAll();
  return all.filter(e => e.wamid === wamid);
}

async function getTimelineByPhone(phoneE164) {
  const all = await readAll();
  return all.filter(e => e.from === phoneE164 || e.phone === phoneE164);
}

module.exports = {
  saveInboundMessage,
  saveStatus,
  getStatusByMessageId,
  getTimelineByPhone,
  mapStatus
};
