// src/server.js
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const fs = require('fs-extra');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true })); // Bitrix puede mandar form-encoded
app.use(morgan('dev'));

const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
fs.ensureDirSync(RUNTIME_DIR);

// Salud
app.get('/', (_, res) => res.json({ ok: true, name: 'b24-wsp', ts: Date.now() }));
app.get('/ping', (_, res) => res.json({ ok: true, ts: Date.now() }));

// Bitrix
const b24 = require('./webhooks/bitrix');
app.get('/b24/install', b24.install);   // GET
app.post('/b24/install', b24.install);  // POST (por si Bitrix envía POST)
app.post('/b24/events', b24.events);
app.get('/b24/test', b24.test);

// WhatsApp (challenge OK probado)
const wsp = require('./webhooks/whatsapp');
app.get('/webhooks/whatsapp', wsp.getVerify);
app.post('/webhooks/whatsapp', wsp.postEvents);

// Estados locales (opcionales)
const { getStatusByMessageId, getTimelineByPhone } = require('./services/statusStore');
app.get('/status/:wamid', async (req, res) => {
  const status = await getStatusByMessageId(req.params.wamid);
  res.json({ ok: true, wamid: req.params.wamid, status });
});
app.get('/status/timeline', async (req, res) => {
  const { phone } = req.query;
  const timeline = await getTimelineByPhone(phone);
  res.json({ ok: true, phone, timeline });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`[b24-wsp] listo en http://localhost:${PORT}`);
  console.log(`[routes] GET/POST /b24/install | GET /b24/test | POST /b24/events`);
});
module.exports = app;
