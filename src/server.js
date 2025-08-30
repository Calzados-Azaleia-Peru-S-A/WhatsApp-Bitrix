// src/server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');   // 👈 se había borrado, vuelve aquí
const morgan = require('morgan');
const fs = require('fs-extra');
const { sendToOpenLines } = require('./services/oc');

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
app.get('/b24/install', b24.install);
app.post('/b24/install', b24.install);
app.post('/b24/events', b24.events);
app.get('/b24/test', b24.test);
app.get('/b24/debug', b24.debug);

// WhatsApp
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

// Test directo de envío a WhatsApp
app.get('/wsp/send', async (req, res) => {
  try {
    const { to, text } = req.query;
    const { sendText } = require('./services/wsp');
    const r = await sendText(to, text || 'ping');
    console.log('[wsp:send] ok', JSON.stringify(r));
    res.json({ ok: true, result: r });
  } catch (e) {
    console.error('[wsp:send] error', e?.response?.data || e.message || e);
    res.status(500).json({ ok: false, error: e?.response?.data || e.message || String(e) });
  }
});

// Demo de envío a Open Lines
app.post('/b24/imc/send-demo', async (req, res) => {
  try {
    const { to, text } = req.query;
    const r = await sendToOpenLines({ userId: to, chatId: to, text: text || 'ping' });
    console.log('[b24:imc:send-demo] ok', JSON.stringify(r));
    res.json({ ok: true, result: r });
  } catch (e) {
    console.error('[b24:imc:send-demo] error', e?.response?.data || e.message || e);
    res.status(500).json({ ok: false, error: e?.response?.data || e.message || String(e) });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`[b24-wsp] listo en http://localhost:${PORT}`);
  console.log(`[routes] GET/POST /b24/install | GET /b24/test | GET /b24/debug | POST /b24/events`);
  console.log(`[routes] GET /webhooks/whatsapp (challenge) | POST /webhooks/whatsapp`);
  console.log(`[routes] GET /wsp/send?to=+51...&text=...`);
  console.log(`[routes] POST /b24/imc/send-demo?to=+51...&text=...`);
});

module.exports = app;
