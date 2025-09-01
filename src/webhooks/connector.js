// src/webhooks/connector.js
// Rutas para administrar el conector personalizado de Bitrix24

const { call } = require('../services/b24client');

// GET /b24/connector/status
async function status(req, res) {
  try {
    const connector = req.query.connector || process.env.CONNECTOR_CODE;
    const line = req.query.line || req.query.line_id || process.env.OPENLINE_ID;
    const params = { CONNECTOR: connector };
    if (line) params.LINE = Number(line);
    const result = await call('imconnector.connector.data.get', params);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

// POST /b24/connector/configure
async function configure(req, res) {
  try {
    const connector = req.body.connector || process.env.CONNECTOR_CODE;
    const line = req.body.line || req.body.line_id || process.env.OPENLINE_ID;
    const data = req.body.data || {};
    const result = await call('imconnector.connector.data.set', {
      CONNECTOR: connector,
      LINE: Number(line),
      DATA: data
    });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

// POST /b24/connector/activate
async function activate(req, res) {
  try {
    const connector = req.body.connector || process.env.CONNECTOR_CODE;
    const line = req.body.line || req.body.line_id || process.env.OPENLINE_ID;
    const params = { CONNECTOR: connector };
    if (line) params.LINE = Number(line);
    const result = await call('imconnector.connector.activate', params);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = { status, configure, activate };
