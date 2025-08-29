// src/webhooks/bitrix.js
const fs = require('fs-extra');
const path = require('path');
const { exchangeCodeForTokens } = require('../services/b24oauth');
const { call } = require('../services/b24client');

const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
const HIT_LOG = path.join(RUNTIME_DIR, 'install-hit.log');

async function logInstallHit(req) {
  await fs.ensureFile(HIT_LOG);
  const entry = {
    ts: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    query: req.query || {},
    body: req.body || {}
  };
  await fs.appendFile(HIT_LOG, JSON.stringify(entry) + '\n', 'utf8');
  console.log('[b24:install] hit', entry.method, entry.url);
}

async function install(req, res) {
  try {
    await logInstallHit(req);
    const code = req.query.code || req.body.code;
    const domain = req.query.domain || req.body.domain;

    if (!code) {
      return res.status(400).send(
        `<html><body style="font-family:sans-serif">
           <h3>⚠️ Falta ?code=...</h3>
           <p>Pulsa <b>REINSTALAR</b> en tu App Local Bitrix.</p>
           <p>Log: <code>${HIT_LOG.replace(/\\/g,'/')}</code></p>
         </body></html>`
      );
    }

    await exchangeCodeForTokens(code);

    return res.status(200).send(
      `<html><body style="font-family:sans-serif">
         <h3>✅ App autorizada</h3>
         <p>Dominio: ${domain || 'desconocido'}</p>
         <p>Tokens en <code>.runtime/b24-oauth.json</code></p>
       </body></html>`
    );
  } catch (e) {
    console.error('[b24:install] error', e);
    return res.status(500).send('Error en instalación: ' + e.message);
  }
}

async function events(req, res) {
  console.log('[b24:events] body=', JSON.stringify(req.body));
  return res.json({ ok: true });
}

async function test(req, res) {
  try {
    const me = await call('user.current', {});
    return res.json({ ok: true, me });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = { install, events, test };
