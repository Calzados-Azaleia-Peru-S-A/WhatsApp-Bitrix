// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ping
app.get('/ping', (req, res) => {
  res.json({ ok: true, service: 'b24-wsp', ts: new Date().toISOString() });
});

// Handshake de verificación de META (GET)
app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const token = req.query['hub.verify_token'];

  if (mode === 'subscribe' && token === process.env.WSP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Webhook de mensajes de META (POST)
app.post('/webhooks/whatsapp', require('./webhooks/whatsapp'));

// Eventos salientes de Bitrix -> WhatsApp
app.post('/b24/events', require('./b24-events'));

// Endpoints auxiliares (si los tienes)
app.get('/b24/test', async (req, res) => {
  try {
    const { call } = require('../services/b24client');
    const me = await call('profile', {});
    res.json({ ok: true, me });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`[b24-wsp] Servidor escuchando en http://localhost:${PORT}`);
});
