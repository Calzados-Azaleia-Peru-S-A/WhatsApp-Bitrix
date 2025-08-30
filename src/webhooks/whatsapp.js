// src/webhooks/whatsapp.js
// Webhook de WhatsApp Cloud: verify + inbound -> Bitrix (imconnector.receiveMessage)

const axios = require('axios');
const { appendInbound, appendStatus } = require('../services/statusStore');
const { normalizeToE164, stripPlus } = require('../utils/phone');
const { call } = require('../services/b24client');

async function fetchMediaInfo(id) {
  try {
    const token = process.env.WSP_TOKEN;
    if (!id || !token) return null;
    const url = `https://graph.facebook.com/v20.0/${id}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return {
      url: data.url,
      mime_type: data.mime_type,
      file_size: data.file_size
    };
  } catch (e) {
    console.warn('[wa:webhook] fetchMediaInfo error', e?.response?.data || e.message || e);
    return null;
  }
}

/**
 * GET /webhooks/whatsapp (challenge)
 */
async function getVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WSP_VERIFY_TOKEN && challenge) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('forbidden');
}

/**
 * POST /webhooks/whatsapp
 * Maneja mensajes entrantes y estados.
 * Empuja mensajes entrantes a Bitrix: imconnector.receiveMessage
 */
async function postEvents(req, res) {
  try {
    const body = req.body || {};
    // Responder rápido a Meta
    res.json({ ok: true });

    // WhatsApp Cloud -> entry/changes/value
    const entry = Array.isArray(body.entry) && body.entry[0];
    const changes = entry && Array.isArray(entry.changes) && entry.changes[0];
    const value = changes && changes.value;

    if (!value) return;

    // Mensajes entrantes
    if (Array.isArray(value.messages) && value.messages.length > 0) {
      for (const m of value.messages) {
        const wamid = m.id;
        const type = m.type;
        const fromRaw = m.from;               // MSISDN sin '+', ej: "51918131082"
        const fromE164 = normalizeToE164(fromRaw, 'PE'); // "+51918131082"
        const fromNoPlus = stripPlus(fromE164);          // "51918131082"
        const profileName = value.contacts && value.contacts[0] && value.contacts[0].profile && value.contacts[0].profile.name;

        let text = '';
        let files = undefined;
        let mediaMeta = undefined;

        if (type === 'text') {
          text = m.text && m.text.body ? String(m.text.body) : '';
        } else if (type === 'image' || type === 'document' || type === 'audio') {
          const mediaObj = m[type] || {};
          text = mediaObj.caption || '';
          const meta = await fetchMediaInfo(mediaObj.id);
          if (!meta) continue;

          const caps = {
            image: Number(process.env.MEDIA_CAP_IMAGE_MB || 0),
            document: Number(process.env.MEDIA_CAP_DOC_MB || 0),
            audio: Number(process.env.MEDIA_CAP_AUDIO_MB || 0),
          };
          const maxBytes = caps[type] * 1024 * 1024;
          if (maxBytes && meta.file_size && meta.file_size > maxBytes) {
            console.warn(`[WA] ${type} excede tamaño permitido (${meta.file_size} > ${maxBytes})`);
            continue;
          }

          const allowed = {
            image: (process.env.MEDIA_TYPES_IMAGE || 'image/jpeg,image/png').split(','),
            document: (process.env.MEDIA_TYPES_DOC || 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
            audio: (process.env.MEDIA_TYPES_AUDIO || 'audio/ogg,audio/mpeg').split(','),
          };
          const mime = meta.mime_type || mediaObj.mime_type;
          if (mime && allowed[type] && !allowed[type].includes(mime)) {
            console.warn(`[WA] ${type} mime no permitido (${mime})`);
            continue;
          }

          const filename = mediaObj.filename || `${type}-${wamid}`;
          files = [{ name: filename, type: mime, link: meta.url, size: meta.file_size }];
          mediaMeta = {
            type,
            id: mediaObj.id,
            sha256: mediaObj.sha256,
            mime_type: mime,
            size: meta.file_size,
            url: meta.url,
            filename,
          };
        } else {
          continue; // tipo no soportado
        }

        // Guardar timeline local
        await appendInbound({
          wamid,
          from: fromE164,
          text,
          profileName: profileName || '',
          media: mediaMeta,
          ts: Date.now()
        });

        // Empujar a Bitrix (Open Line) como mensaje del cliente
        try {
          const connector = process.env.CONNECTOR_CODE || 'wa_cloud_custom';
          const line = String(process.env.OPENLINE_ID || '').trim();
          if (!connector || !line) {
            console.warn('[WA→B24] faltan CONNECTOR_CODE u OPENLINE_ID en .env; se salta push');
          } else {
            const message = {
              id: wamid,
              text: text,
              date: Math.floor(Date.now() / 1000),
            };
            if (files) message.files = files;

            const payload = {
              CONNECTOR: connector,
              LINE: line,
              MESSAGES: [
                {
                  chat: { id: fromNoPlus }, // teléfono sin '+'
                  message,
                  user: {
                    id: fromNoPlus,               // identificador del cliente en el conector
                    name: profileName || fromE164 // nombre visible
                  }
                }
              ]
            };
            const r = await call('imconnector.send.messages', payload);
            console.log(`[WA→B24] rx ${type} ok`, JSON.stringify(r));
          }
        } catch (e) {
          console.error(`[WA→B24] rx ${type} error`, e?.response?.data || e.message || e);
        }
      }
    }

    // Estados de entrega/lectura (opcional: guardar local)
    if (Array.isArray(value.statuses) && value.statuses.length > 0) {
      for (const s of value.statuses) {
        await appendStatus({
          wamid: s.id,
          status: s.status,   // sent, delivered, read, failed
          ts: Date.now(),
          raw: s
        });
      }
    }
  } catch (e) {
    console.error('[wa:webhook] error', e?.response?.data || e.message || e);
    // ya respondimos 200 arriba
  }
}

module.exports = { getVerify, postEvents };
