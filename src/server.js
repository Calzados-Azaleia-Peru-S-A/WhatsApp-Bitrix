// src/server.js
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// ==== CARGA DE MÓDULOS (con tolerancia a faltantes) ====
function safeRequire(modPath, label) {
  try {
    const m = require(modPath);
    return m || {};
  } catch (e) {
    console.warn(`[routes] módulo no disponible: ${label} -> ${e.message}`);
    return {};
  }
}

const b24oauth = safeRequire('./services/b24oauth', 'services/b24oauth');
const bitrix = safeRequire('./webhooks/bitrix', 'webhooks/bitrix');
const whatsapp = safeRequire('./webhooks/whatsapp', 'webhooks/whatsapp');
const statusStore = safeRequire('./services/statusStore', 'services/statusStore');
const b24client = safeRequire('./services/b24client', 'services/b24client');

// ==== HELPERS PARA EVITAR CRASH SI FALTA UN HANDLER ====
function safeHandler(fn, label) {
  if (typeof fn === 'function') return fn;
  console.warn(`[routes] handler faltante: ${label} -> undefined`);
  return (req, res) => res
    .status(501)
    .json({ ok: false, error: `handler '${label}' no implementado` });
}

// ==== RUTAS BÁSICAS ====
app.get('/', (_req, res) => res.json({ ok: true, name: 'b24-wsp', ts: Date.now() }));
app.get('/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ==== B24 OAuth helpers (/b24/token-info y /b24/force-refresh) ====
app.get('/b24/token-info', (req, res) => {
  try {
    const snapFn = b24oauth.getTokenSnapshot;
    if (typeof snapFn !== 'function') {
      return res.json({ ok: false, error: 'getTokenSnapshot no está disponible' });
    }
    const snap = snapFn();
    return res.json({ ok: true, token: snap });
  } catch (e) {
    console.error('[b24] /b24/token-info error', e);
    return res.json({ ok: false, error: e.message });
  }
});

app.post('/b24/force-refresh', async (req, res) => {
  try {
    const rf = b24oauth.forceRefresh;
    if (typeof rf !== 'function') {
      return res.json({ ok: false, error: 'forceRefresh no está disponible' });
    }
    const info = await rf();
    return res.json({ ok: true, ...info });
  } catch (e) {
    console.error('[b24] /b24/force-refresh error', e);
    return res.json({
      ok: false,
      error: e.message,
      code: e.code,
      hint: 'Si persiste, pulsa REINSTALAR en Bitrix para emitir tokens nuevos.',
    });
  }
});

// ==== Bitrix install / events ====
app.get('/b24/install', safeHandler(bitrix.getInstall, 'bitrix.getInstall'));
app.post('/b24/install', safeHandler(bitrix.postInstall, 'bitrix.postInstall'));
app.get('/b24/test', safeHandler(bitrix.getTest, 'bitrix.getTest'));
app.get('/b24/debug', safeHandler(bitrix.getDebug, 'bitrix.getDebug'));
app.post('/b24/events', safeHandler(bitrix.postEvents, 'bitrix.postEvents'));

// ==== WhatsApp webhooks ====
app.get('/webhooks/whatsapp', safeHandler(whatsapp.getVerify, 'whatsapp.getVerify'));
app.post('/webhooks/whatsapp', safeHandler(whatsapp.postEvents, 'whatsapp.postEvents'));

// ==== Status timeline (depende de statusStore, pero no crashea si falta) ====
app.get('/status/timeline', (req, res) => {
  try {
    const phone = req.query.phone || '';
    const tlFn = statusStore.getTimeline;
    const events = typeof tlFn === 'function' ? tlFn(phone) : [];
    res.json({ ok: true, wamid: 'timeline', status: events || [] });
  } catch (e) {
    console.error('[status/timeline] error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.get('/status/:wamid', (req, res) => {
  try {
    const w = req.params.wamid;
    const byIdFn = statusStore.getById;
    const st = typeof byIdFn === 'function' ? byIdFn(w) : [];
    res.json({ ok: true, wamid: w, status: st || [] });
  } catch (e) {
    console.error('[status/:wamid] error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ==== Envío directo a WA (debug) ====
app.get('/wsp/send', async (req, res) => {
  try {
    const to = req.query.to;
    const text = req.query.text || 'Hola';
    if (!to) return res.status(400).json({ ok: false, error: 'Parámetro "to" requerido' });
    const sendFn = b24client.sendText;
    if (typeof sendFn !== 'function') {
      return res.status(501).json({ ok: false, error: 'sendText no implementado' });
    }
    const r = await sendFn(to, text);
    return res.json({ ok: true, result: r });
  } catch (e) {
    console.error('[wsp:send] error', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ==== Arranque ====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const fallbackDomain = process.env.B24_DOMAIN || 'azaleia-peru.bitrix24.es';
  if (!process.env.B24_DOMAIN) {
    console.log(`[env] Sugerencia: define B24_DOMAIN=${fallbackDomain} para fallback estable.`);
  }
  console.log(`[b24-wsp] listo en http://localhost:${PORT}`);
  console.log('[routes] GET/POST /b24/install | GET /b24/test | GET /b24/debug | POST /b24/events');
  console.log('[routes] GET /webhooks/whatsapp (challenge) | POST /webhooks/whatsapp');
  console.log('[routes] GET /status/timeline?phone=+51... | GET /status/:wamid');
  console.log('[routes] GET /wsp/send?to=+51...&text=...');
});

module.exports = app;
