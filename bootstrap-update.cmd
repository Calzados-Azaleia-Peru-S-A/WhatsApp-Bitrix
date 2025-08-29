@echo off
setlocal
cd /d "%~dp0"

REM === carpetas ===
mkdir src 2>nul
mkdir src\webhooks 2>nul
mkdir src\services 2>nul
mkdir src\utils 2>nul
mkdir scripts 2>nul

REM === .gitignore ===
> .gitignore (
  echo .env
  echo .env.*
  echo .runtime/
  echo node_modules/
)

REM === .env.azaleia (con tus valores) ===
> .env.azaleia (
  echo PORT=3000
  echo WSP_VERIFY_TOKEN=test123
  echo B24_SOURCE_ID=WHATSAPP
  echo B24_CLIENT_ID=local.68ad499b069dc3.30405953
  echo B24_CLIENT_SECRET=vgdZlgUSx2mgqWL3RBUpSmAKTV4oyo0UPTSix9cp55rZZB2Rof
  echo APP_PUBLIC_BASE=https://squirrel-talented-hermit.ngrok-free.app
  echo CONNECTOR_CODE=wa_cloud_custom
  echo CONNECTOR_NAME=WhatsApp Cloud (Propio)
  echo OPENLINE_ID=154
  echo WSP_PHONE_NUMBER_ID=741220429081783
  echo WSP_TOKEN=EAAQ2uEgACPwBPUQa3fbKaBc0WRh9lAL5sFjbsxeByAldG3srsspWfyZCQfJTMs0htDBNxY0TxZBPGZA1Akq17SzPI0Ezm64WTjjzdoPgcYDNO8ZA6jxkptKrpfKe28vHSvie4yjZCZCOy8Dh0wCsT997Y6USpEg2s7KUsD5eAjAzCdiBecZCa86UaoDcYaKGAZDZD
  echo B24_DEBUG=1
  echo B24_USE_WEBHOOK=0
  echo WSP_MARK_READ=1
  echo MEDIA_CAP_IMAGE_MB=5
  echo MEDIA_CAP_VIDEO_MB=16
  echo MEDIA_CAP_AUDIO_MB=16
  echo MEDIA_CAP_DOC_MB=100
)

REM === scripts/setup-env.cmd (copia siempre .env) ===
> scripts\setup-env.cmd (
  echo @echo off
  echo setlocal enabledelayedexpansion
  echo cd /d "%%~dp0\.."
  echo if exist ".env.azaleia" (
  echo ^  copy /Y ".env.azaleia" ".env" ^>nul
  echo ^  echo [ok] .env actualizado desde .env.azaleia
  echo ^  endlocal ^& exit /b 0
  echo ^) else (
  echo ^  echo [err] No existe .env.azaleia
  echo ^  endlocal ^& exit /b 1
  echo ^)
)

REM === scripts/push-from-home.cmd ===
> scripts\push-from-home.cmd (
  echo @echo off
  echo setlocal
  echo cd /d "%%~dp0\.."
  echo git add .
  echo git commit -m "sync: %%DATE%% %%TIME%% bootstrap update"
  echo git push
  echo [ok] cambios subidos a origin/main
  echo endlocal
)

REM === scripts/work-sync-and-run.cmd (para la otra PC) ===
> scripts\work-sync-and-run.cmd (
  echo @echo off
  echo setlocal
  echo cd /d "%%~dp0\.."
  echo echo [1/4] git pull...
  echo git pull --rebase ^|^| goto :err
  echo echo [2/4] npm install...
  echo npm install ^|^| goto :err
  echo echo [3/4] npm run dev...
  echo start "b24-wsp dev" /D "%%CD%%" cmd /c "npm run dev"
  echo echo [4/4] ngrok...
  echo start "ngrok 3000" cmd /c "ngrok http --url=squirrel-talented-hermit.ngrok-free.app 3000"
  echo echo [ok] listo.
  echo goto :eof
  echo :err
  echo echo [err] fallo en paso anterior
  echo exit /b 1
  echo endlocal
)

REM === package.json (con postinstall) ===
> package.json (
  echo {
  echo   "name": "b24-wsp",
  echo   "version": "1.0.0",
  echo   "private": true,
  echo   "main": "src/server.js",
  echo   "type": "commonjs",
  echo   "scripts": {
  echo     "dev": "nodemon --watch src --ext js,json --exec node src/server.js",
  echo     "start": "node src/server.js",
  echo     "postinstall": "scripts\\setup-env.cmd"
  echo   },
  echo   "dependencies": {
  echo     "axios": "^1.7.7",
  echo     "dotenv": "^16.4.5",
  echo     "express": "^4.19.2",
  echo     "fs-extra": "^11.2.0",
  echo     "libphonenumber-js": "^1.11.7",
  echo     "morgan": "^1.10.0"
  echo   },
  echo   "devDependencies": {
  echo     "nodemon": "^3.1.4"
  echo   }
  echo }
)

REM === src/server.js ===
> src\server.js (
  echo // src/server.js
  echo require('dotenv').config();
  echo const express = require('express');
  echo const morgan = require('morgan');
  echo const fs = require('fs-extra');
  echo
  echo const app = express();
  echo app.use(express.json({ limit: '10mb' }));
  echo app.use(express.urlencoded({ extended: true }));
  echo app.use(morgan('dev'));
  echo
  echo const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
  echo fs.ensureDirSync(RUNTIME_DIR);
  echo
  echo app.get('/', (_, res) => res.json({ ok: true, name: 'b24-wsp', ts: Date.now() }));
  echo app.get('/ping', (_, res) => res.json({ ok: true, ts: Date.now() }));
  echo
  echo const b24 = require('./webhooks/bitrix');
  echo app.get('/b24/install', b24.install);
  echo app.post('/b24/install', b24.install);
  echo app.post('/b24/events', b24.events);
  echo app.get('/b24/test', b24.test);
  echo
  echo const wsp = require('./webhooks/whatsapp');
  echo app.get('/webhooks/whatsapp', wsp.getVerify);
  echo app.post('/webhooks/whatsapp', wsp.postEvents);
  echo
  echo const { getStatusByMessageId, getTimelineByPhone } = require('./services/statusStore');
  echo app.get('/status/:wamid', async (req, res) => {
  echo ^  const status = await getStatusByMessageId(req.params.wamid);
  echo ^  res.json({ ok: true, wamid: req.params.wamid, status });
  echo });
  echo app.get('/status/timeline', async (req, res) => {
  echo ^  const { phone } = req.query;
  echo ^  const timeline = await getTimelineByPhone(phone);
  echo ^  res.json({ ok: true, phone, timeline });
  echo });
  echo
  echo const PORT = Number(process.env.PORT || 3000);
  echo app.listen(PORT, () => {
  echo ^  console.log(`\[b24-wsp] listo en http://localhost:${PORT}`);
  echo ^  console.log(`\[routes] GET/POST /b24/install | GET /b24/test | POST /b24/events`);
  echo });
  echo module.exports = app;
)

REM === src/webhooks/bitrix.js ===
> src\webhooks\bitrix.js (
  echo const fs = require('fs-extra');
  echo const path = require('path');
  echo const { exchangeCodeForTokens } = require('../services/b24oauth');
  echo const { call } = require('../services/b24client');
  echo
  echo const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
  echo const HIT_LOG = path.join(RUNTIME_DIR, 'install-hit.log');
  echo
  echo async function logInstallHit(req) {
  echo ^  await fs.ensureFile(HIT_LOG);
  echo ^  const entry = { ts: new Date().toISOString(), method: req.method, url: req.originalUrl, headers: req.headers, query: req.query || {}, body: req.body || {} };
  echo ^  await fs.appendFile(HIT_LOG, JSON.stringify(entry) + '\\n', 'utf8');
  echo ^  console.log('[b24:install] hit', entry.method, entry.url);
  echo }
  echo
  echo async function install(req, res) {
  echo ^  try {
  echo ^    await logInstallHit(req);
  echo ^    const code = req.query.code || req.body.code;
  echo ^    const domain = req.query.domain || req.body.domain;
  echo ^    if (!code) {
  echo ^      return res.status(400).send(`^<html^><body style="font-family:sans-serif"^>^<h3^>⚠️ Falta ?code=...^</h3^>^<p^>Pulsa ^<b^>REINSTALAR^</b^> en tu App Local Bitrix.^</p^>^<p^>Log: ^<code^>${HIT_LOG.replace(/\\\/g,'/') }^</code^>^</p^>^</body^>^</html^>`);
  echo ^    }
  echo ^    await exchangeCodeForTokens(code);
  echo ^    return res.status(200).send(`^<html^><body style="font-family:sans-serif"^>^<h3^>✅ App autorizada^</h3^>^<p^>Dominio: ${'${domain || "desconocido"}'}^</p^>^<p^>Tokens en ^<code^>.runtime/b24-oauth.json^</code^>^</p^>^</body^>^</html^>`);
  echo ^  } catch (e) {
  echo ^    console.error('[b24:install] error', e);
  echo ^    return res.status(500).send('Error en instalación: ' + e.message);
  echo ^  }
  echo }
  echo
  echo async function events(req, res) {
  echo ^  console.log('[b24:events] body=', JSON.stringify(req.body));
  echo ^  return res.json({ ok: true });
  echo }
  echo
  echo async function test(req, res) {
  echo ^  try {
  echo ^    const me = await call('user.current', {});
  echo ^    return res.json({ ok: true, me });
  echo ^  } catch (e) {
  echo ^    return res.status(500).json({ ok: false, error: e.message });
  echo ^  }
  echo }
  echo
  echo module.exports = { install, events, test };
)

REM === src/webhooks/whatsapp.js ===
> src\webhooks\whatsapp.js (
  echo const { normalizeToE164 } = require('../utils/phone');
  echo const { saveInboundMessage, saveStatus } = require('../services/statusStore');
  echo const { ensureContactByPhone } = require('../services/contacts');
  echo
  echo const VERIFY_TOKEN = process.env.WSP_VERIFY_TOKEN || 'test123';
  echo const MARK_READ = String(process.env.WSP_MARK_READ || '1') === '1';
  echo
  echo async function getVerify(req, res) {
  echo ^  const mode = req.query['hub.mode'];
  echo ^  const token = req.query['hub.verify_token'];
  echo ^  const challenge = req.query['hub.challenge'];
  echo ^  if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  echo ^  res.sendStatus(403);
  echo }
  echo
  echo async function postEvents(req, res) {
  echo ^  try {
  echo ^    const body = req.body;
  echo ^    res.status(200).json({ ok: true });
  echo ^    if (!body || body.object !== 'whatsapp_business_account') return;
  echo ^    for (const entry of body.entry || []) {
  echo ^      for (const change of entry.changes || []) {
  echo ^        const value = change.value || {};
  echo ^        if (Array.isArray(value.messages)) {
  echo ^          for (const msg of value.messages) {
  echo ^            const fromRaw = msg.from;
  echo ^            const fromE164 = normalizeToE164(fromRaw);
  echo ^            const text = msg.text?.body || msg.button?.text || '';
  echo ^            const wamid = msg.id;
  echo ^            const profileName = value.contacts?.[0]?.profile?.name || null;
  echo ^            try { await ensureContactByPhone({ phoneE164: fromE164, name: profileName || fromE164 }); } catch(_) {}
  echo ^            await saveInboundMessage({ wamid, fromE164, text, profileName });
  echo ^            if (MARK_READ) { /* opcional marcar leído */ }
  echo ^          }
  echo ^        }
  echo ^        if (Array.isArray(value.statuses)) {
  echo ^          for (const st of value.statuses) {
  echo ^            const wamid = st.id;
  echo ^            const phoneE164 = normalizeToE164(st.recipient_id);
  echo ^            const status = st.status;
  echo ^            const error = st.errors?.[0] ? JSON.stringify(st.errors[0]) : null;
  echo ^            await saveStatus({ wamid, phoneE164, status, error });
  echo ^          }
  echo ^        }
  echo ^      }
  echo ^    }
  echo ^  } catch (e) { console.error('[wsp:webhook] error', e); }
  echo }
  echo
  echo module.exports = { getVerify, postEvents };
)

REM === src/services/b24oauth.js ===
> src\services\b24oauth.js (
  echo const fs = require('fs-extra');
  echo const path = require('path');
  echo const axios = require('axios');
  echo
  echo const RUNTIME_DIR = process.env.RUNTIME_DIR || '.runtime';
  echo const TOK_FILE = path.join(RUNTIME_DIR, 'b24-oauth.json');
  echo
  echo const B24_DOMAIN = process.env.B24_DOMAIN || 'azaleia-peru.bitrix24.es';
  echo const CLIENT_ID = process.env.B24_CLIENT_ID;
  echo const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;
  echo const APP_PUBLIC_BASE = process.env.APP_PUBLIC_BASE;
  echo
  echo function getRedirectUri() { return `${APP_PUBLIC_BASE}/b24/install`; }
  echo async function loadTokens(){ try { return await fs.readJson(TOK_FILE); } catch { return {}; } }
  echo async function saveTokens(obj){ await fs.ensureFile(TOK_FILE); await fs.writeJson(TOK_FILE, obj, { spaces: 2 }); return obj; }
  echo async function exchangeCodeForTokens(code){
  echo ^  const url = 'https://oauth.bitrix.info/oauth/token/';
  echo ^  const params = { grant_type:'authorization_code', client_id:CLIENT_ID, client_secret:CLIENT_SECRET, code, redirect_uri:getRedirectUri() };
  echo ^  const { data } = await axios.post(url, null, { params });
  echo ^  if (data.error) throw new Error(`${data.error}: ${data.error_description}`);
  echo ^  return saveTokens({ access_token:data.access_token, refresh_token:data.refresh_token, expires_in:data.expires_in, domain:data.domain || B24_DOMAIN, obtained_at:Date.now() });
  echo }
  echo module.exports = { getRedirectUri, exchangeCodeForTokens, loadTokens, saveTokens };
)

REM === src/services/b24client.js ===
> src\services\b24client.js (
  echo const axios = require('axios');
  echo const { loadTokens } = require('./b24oauth');
  echo
  echo async function apiUrl(method){
  echo ^  const tok = await loadTokens();
  echo ^  const domain = tok.domain || process.env.B24_DOMAIN || 'azaleia-peru.bitrix24.es';
  echo ^  return `https://${domain}/rest/${method}`;
  echo }
  echo async function call(method, params = {}){
  echo ^  const url = await apiUrl(method);
  echo ^  const tok = await loadTokens();
  echo ^  if(!tok.access_token) throw new Error('Sin access_token: pulsa REINSTALAR en Bitrix para /b24/install');
  echo ^  const payload = { ...params, auth: tok.access_token };
  echo ^  const { data } = await axios.post(url, payload);
  echo ^  if (data.error) throw new Error(`[Bitrix24] ${data.error}: ${data.error_description}`);
  echo ^  return data.result;
  echo }
  echo module.exports = { call };
)

REM === src/services/statusStore.js ===
> src\services\statusStore.js (
  echo const path = require('path');
  echo const fs = require('fs-extra');
  echo const FILE = path.join(process.env.RUNTIME_DIR || '.runtime', 'status.jsonl');
  echo
  echo async function append(e){ await fs.ensureFile(FILE); await fs.appendFile(FILE, JSON.stringify({ ...e, ts: Date.now() })+'\\n'); }
  echo async function readAll(){ await fs.ensureFile(FILE); const t=await fs.readFile(FILE,'utf8'); return t.trim()?t.split('\\n').filter(Boolean).map(JSON.parse):[]; }
  echo function mapStatus(s){ return s==='sent'||s==='message_sent'?'Enviado':s==='delivered'?'Entregado':s==='read'?'Leído':(s==='failed'||s==='failed_to_send'?'Error':s); }
  echo async function saveInboundMessage({wamid,fromE164,text,profileName}){ await append({type:'inbound',wamid,from:fromE164,text,profileName}); }
  echo async function saveStatus({wamid,phoneE164,status,error}){ await append({type:'status',wamid,phone:phoneE164,status,chip:mapStatus(status),error:error||null}); }
  echo async function getStatusByMessageId(w){ return (await readAll()).filter(e=>e.wamid===w); }
  echo async function getTimelineByPhone(p){ return (await readAll()).filter(e=>e.from===p || e.phone===p); }
  echo module.exports={saveInboundMessage,saveStatus,getStatusByMessageId,getTimelineByPhone,mapStatus};
)

REM === src/services/contacts.js ===
> src\services\contacts.js (
  echo const { findContactByPhone, createContact } = require('./b24client');
  echo async function ensureContactByPhone({ phoneE164, name }) {
  echo ^  if (!phoneE164) throw new Error('phoneE164 requerido');
  echo ^  const existing = await findContactByPhone(phoneE164).catch(()=>null);
  echo ^  if (existing && existing.ID) return { contactId: existing.ID, created: false, phoneE164 };
  echo ^  const id = await createContact({ name, phoneE164 });
  echo ^  return { contactId: id, created: true, phoneE164 };
  echo }
  echo module.exports = { ensureContactByPhone };
)

REM === src/utils/phone.js ===
> src\utils\phone.js (
  echo const { parsePhoneNumberFromString } = require('libphonenumber-js');
  echo function normalizeToE164(input, defaultCountry = 'PE') {
  echo ^  if (!input) return null;
  echo ^  const raw = ('' + input).replace(/[^\d+]/g, '');
  echo ^  const pn = parsePhoneNumberFromString(raw.startsWith('+') ? raw : '+' + raw, defaultCountry);
  echo ^  if (!pn || !pn.isValid()) return null;
  echo ^  return pn.number;
  echo }
  echo module.exports = { normalizeToE164 };
)

echo [ok] Archivos escritos. Ahora: npm install
endlocal
