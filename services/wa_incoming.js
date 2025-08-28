// services/wa_incoming.js
const { call } = require('./b24client');

const CONNECTOR = process.env.CONNECTOR_CODE;
const OPENLINE_ID = Number(process.env.OPENLINE_ID);

function toIso(ts) {
  if (!ts) return new Date().toISOString();
  if (/^\d+$/.test(String(ts))) {
    const n = Number(ts);
    return new Date((String(n).length <= 10 ? n * 1000 : n)).toISOString();
  }
  return new Date(ts).toISOString();
}

// Extrae un mensaje de payload FB/WhatsApp Cloud
function normalizeIncoming(waBody = {}) {
  const msg = waBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] || {};
  const from = msg.from || waBody.from || 'unknown';
  const type = msg.type || 'text';
  const text = type === 'text' ? msg.text?.body : JSON.stringify(msg);
  return {
    from,
    mid: msg.id || `wa-${Date.now()}`,
    text: text || '',
    timestamp: toIso(msg.timestamp),
    name: waBody?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || `+${from}`,
  };
}

function buildMessagePayload(n) {
  const userId = `wa:${n.from}`;
  const chatId = `wa:${n.from}`;
  return {
    CONNECTOR: CONNECTOR,
    LINE: OPENLINE_ID,
    MESSAGES: [
      {
        USER: { id: userId, name: n.name },
        CHAT: { id: chatId, name: `WhatsApp ${n.from}` },
        MESSAGE: {
          id: n.mid,
          text: n.text,
          date: n.timestamp,
        },
      },
    ],
  };
}

async function pushIncomingToOpenLine(waBody) {
  if (!CONNECTOR || !OPENLINE_ID) throw new Error('Faltan CONNECTOR_CODE u OPENLINE_ID en .env');
  const n = normalizeIncoming(waBody);
  const payload = buildMessagePayload(n);
  const res = await call('imconnector.send.messages', payload);
  return res?.result || res;
}

module.exports = { pushIncomingToOpenLine, normalizeIncoming, buildMessagePayload };
