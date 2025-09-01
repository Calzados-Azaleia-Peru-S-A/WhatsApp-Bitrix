// src/webhooks/whatsapp.js
// Webhook WhatsApp -> Bitrix24 (imconnector.send.messages) usando claves MAYÚSCULAS
// y x-www-form-urlencoded (php indices) para MESSAGES[*].

'use strict';

const qs = require('qs');
let b24client = {};
let b24oauth = {};
try { b24client = require('../services/b24client'); } catch {}
try { b24oauth = require('../services/b24oauth'); } catch {}

const ensureFreshToken = b24oauth?.ensureFreshToken;

// ENV
const VERIFY_TOKEN = process.env.WSP_VERIFY_TOKEN || 'test123';
const CONNECTOR = process.env.CONNECTOR_CODE || 'wa_cloud_custom';
const LINE = process.env.OPENLINE_ID || process.env.OPENLINE || '154';
const APP_PUBLIC_BASE = (process.env.APP_PUBLIC_BASE || '').replace(/\/$/, '');

// ------- helpers -------
function textForMedia(msg) {
  let caption = msg?.image?.caption || msg?.video?.caption || msg?.document?.caption || msg?.audio?.caption || '';
  let mediaUrl = msg?.image?.url || msg?.video?.url || msg?.document?.url || msg?.audio?.url || '';
  const mediaId = msg?.image?.id || msg?.video?.id || msg?.document?.id || msg?.audio?.id || msg?.sticker?.id || '';
  if (!mediaUrl && APP_PUBLIC_BASE && mediaId) {
    mediaUrl = `${APP_PUBLIC_BASE}/media/wsp/${encodeURIComponent(mediaId)}?filename=${encodeURIComponent('media_'+mediaId)}`;
  }
  const parts = [];
  if (caption && caption.trim()) parts.push(caption.trim());
  if (mediaUrl) parts.push(mediaUrl);
  return parts.join('\n') || '[media]';
}

function toUpperMessage(waMsg) {
  const phone = (waMsg?.from || '').replace(/^\+/, '');
  const type = waMsg?.type;
  let text = '';
  if (type === 'text') {
    text = waMsg?.text?.body || '';
  } else if (['image','video','audio','document','sticker'].includes(type)) {
    text = textForMedia(waMsg);
  } else if (type === 'location') {
    const loc = waMsg.location || {};
    text = `Ubicación: ${loc.latitude},${loc.longitude}${loc.name ? ' - '+loc.name : ''}${loc.address ? ' - '+loc.address : ''}`;
  } else if (type === 'contacts') {
    text = '[contact]';
  } else if (type === 'interactive' || type === 'button') {
    text = '[interactive]';
  } else {
    text = '[mensaje]';
  }

  // Estructura en MAYÚSCULAS
  return {
    USER: { ID: phone },
    CHAT: { ID: phone },
    MESSAGE: {
      ID: waMsg?.id || `wamid.AUTO.${Date.now()}`,
      TEXT: text,
      DATE: { TIMESTAMP: Math.floor(Date.now() / 1000) }
    }
  };
}

async function callB24Form(method, params) {
  // Siempre x-www-form-urlencoded con indices
  let tk;
  if (typeof b24client?.__usesFormUrlEncoded === 'boolean' && typeof b24client?.callB24 === 'function') {
    return b24client.callB24(method, params);
  } else if (typeof ensureFreshToken === 'function') {
    tk = await ensureFreshToken();
    const endpoint = (tk.client_endpoint || '').replace(/\/?$/, '/');
    const url = endpoint + method;
    const body = qs.stringify({ ...(params || {}), auth: tk.access_token }, { encodeValuesOnly: true, arrayFormat: 'indices' });
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const j = await r.json().catch(async () => ({ error: 'HTTP_'+r.status, raw: await r.text() }));
    if (j?.error) throw new Error(j.error_description || j.error);
    return j?.result ?? j;
  } else {
    throw new Error('Tokens no disponibles');
  }
}

// ------- handlers -------
async function getVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge || 'ok');
  return res.status(403).send('Forbidden');
}

async function postEvents(req, res) {
  try {
    res.json({ ok: true }); // responder rápido
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const ch of changes) {
        const val = ch?.value || {};
        const messages = val?.messages || [];
        for (const m of messages) {
          const item = toUpperMessage(m);

          const payload = {
            CONNECTOR,
            LINE,
            MESSAGES: [ item ]
          };

          console.log('[WA->B24] sending', JSON.stringify({
            CONNECTOR: payload.CONNECTOR,
            LINE: payload.LINE,
            sampleKeys: Object.keys(item),
            msgKeys: Object.keys(item.MESSAGE),
            upper: true
          }));

          try {
            const resp = await callB24Form('imconnector.send.messages', payload);
            console.log('[WA->B24] ok', JSON.stringify(resp));
          } catch (e) {
            console.error('[WA->B24] error', e?.message || e);
          }
        }
      }
    }
  } catch (e) {
    console.error('[whatsapp webhook] fatal', e);
  }
}

module.exports = { getVerify, postEvents };
