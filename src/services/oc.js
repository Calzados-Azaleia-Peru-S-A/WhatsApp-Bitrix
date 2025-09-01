// src/services/oc.js
// Envío estable a Open Lines (Bitrix) usando SIEMPRE el payload tipo "B"

const { callB24 } = require('./b24client');

const CONNECTOR = process.env.CONNECTOR_CODE || 'wa_cloud_custom';
const OPENLINE_ID = Number(process.env.OPENLINE_ID || 0);

// Mapa opcional para correlacionar IDs
const statusStore = new Map();
function statusSet(id, data) {
  if (id) statusStore.set(id, { ...(data || {}), at: new Date().toISOString() });
}
function statusGet(id) {
  return statusStore.get(id);
}

function s(v) { return v == null ? '' : String(v); }

/**
 * Envía a Open Lines por imconnector.send.messages (forma B)
 * @param {Object} opts
 * @param {number} [opts.lineId]           si no se pasa, usa OPENLINE_ID
 * @param {string} [opts.connector]        si no se pasa, usa CONNECTOR
 * @param {string} opts.userId             ej. "51918131082"
 * @param {string} [opts.chatId]           normalmente igual a userId
 * @param {string} [opts.text]             texto
 * @param {string} [opts.clientMsgId]      id (si no, se genera)
 * @param {Object} [opts.extra]            más campos para "message"
 */
async function sendToOpenLines({
  lineId,
  connector,
  userId,
  chatId,
  text,
  clientMsgId,
  extra = {},
} = {}) {
  const LINE = Number(lineId || OPENLINE_ID);
  const CONNECTOR_CODE = connector || CONNECTOR;
  if (!LINE || !CONNECTOR_CODE) {
    throw new Error('sendToOpenLines: falta LINE/CONNECTOR (revisa OPENLINE_ID y CONNECTOR_CODE en .env)');
  }

  const peerId = s(chatId || userId);
  if (!peerId) throw new Error('sendToOpenLines: falta chatId/userId');

  const messageId = clientMsgId || `wa_${Date.now()}`;
  const message = {
    id: messageId,
    text: text || '',
    date: new Date().toISOString(),
    ...extra,
  };

  const payloadB = {
    CONNECTOR: CONNECTOR_CODE,
    LINE,
    MESSAGES: [
      {
        user: { id: peerId, name: 'WhatsApp', last_name: '' },
        chat: { id: peerId, name: 'WhatsApp' },
        message,
      },
    ],
  };

  try {
    const r = await call('imconnector.send.messages', payloadB);
    statusSet(messageId, { LINE, CONNECTOR: CONNECTOR_CODE, chatId: peerId, text, variant: 'B' });
    return r;
  } catch (e) {
    const bx = e?.response?.data || {};
    const msg = bx?.error || e?.message || 'ERROR';
    console.log('[imconnector.send.messages] ERROR B ->', msg, bx);
    throw e;
  }
}

module.exports = {
  sendToOpenLines,
  mapStatus: { set: statusSet, get: statusGet },
};
