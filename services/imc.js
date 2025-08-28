// services/imc.js
"use strict";

const { call } = require("./b24client");

// Construye el array MESSAGES con el formato oficial:
// user.id*, message.id*, message.date* (timestamp en segundos), message.text, chat.id*
function buildMessages({ externalUserId, externalChatId, text }) {
  const nowSec = Math.floor(Date.now() / 1000);
  return [
    {
      user: {
        id: String(externalUserId),
        name: String(externalUserId)
      },
      message: {
        id: `wa-${nowSec}-${Math.random().toString(36).slice(2, 8)}`,
        date: nowSec, // ⚠️ Bitrix espera 'date' (timestamp), NO 'timestamp'
        text: text || ""
      },
      chat: {
        id: String(externalChatId),
        name: `WA ${externalUserId}`
      }
    }
  ];
}

// Envía un texto hacia la Línea Abierta usando imconnector.send.messages
async function sendText({ lineId, connector, to, text }) {
  if (!lineId) throw new Error("Falta lineId");
  if (!connector) throw new Error("Falta connector");
  if (!to) throw new Error("Falta número 'to'");

  const payload = {
    CONNECTOR: connector,
    LINE: Number(lineId),
    MESSAGES: buildMessages({
      externalUserId: to,
      externalChatId: `wa:${to}`,
      text
    })
  };

  return call("imconnector.send.messages", payload);
}

// Marcar entregado (opcional)
async function sendDelivered({ lineId, connector, to, messageId }) {
  const payload = {
    CONNECTOR: connector,
    LINE: Number(lineId),
    MESSAGES: [
      {
        chat: { id: `wa:${to}` },
        message: { id: messageId }
      }
    ]
  };
  return call("imconnector.send.status.delivery", payload);
}

// Marcar leído (opcional)
async function sendRead({ lineId, connector, to, messageId }) {
  const payload = {
    CONNECTOR: connector,
    LINE: Number(lineId),
    MESSAGES: [
      {
        chat: { id: `wa:${to}` },
        message: { id: messageId }
      }
    ]
  };
  return call("imconnector.send.status.read", payload);
}

module.exports = { sendText, sendDelivered, sendRead };
