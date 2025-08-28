// src/webhooks/whatsapp.js
// Webhook de META (entradas de WhatsApp) -> Open Lines (Bitrix)

const { sendToOpenLines, mapStatus } = require('../services/oc');

function first(a) { return Array.isArray(a) ? a[0] : undefined; }

module.exports = async function whatsappWebhook(req, res) {
  try {
    const raw = req.body || {};
    console.log('[WA webhook] raw:', JSON.stringify(raw));

    const entry = first(raw.entry) || {};
    const change = first(entry.changes) || {};
    const value = change.value || change || {};
    const metadata = value.metadata || {};
    const messages = value.messages || [];

    if (!messages.length) {
      return res.status(200).json({ ok: true, processed: 0, results: [], errors: [] });
    }

    const results = [];
    const errors = [];

    for (const m of messages) {
      try {
        const from = m.from || m.contact?.wa_id || '';
        const type = m.type || 'text';
        const id = m.id || `wamid.LOCAL_${Date.now()}`;
        let text = '';

        if (type === 'text' && m.text?.body) {
          text = m.text.body;
        } else if (type === 'image') {
          text = '📷 Imagen recibida';
        } else if (type === 'document') {
          text = `📄 Documento${m.document?.filename ? ': ' + m.document.filename : ''}`;
        } else if (type === 'audio') {
          text = '🎤 Audio recibido';
        } else if (type === 'video') {
          text = '🎬 Video recibido';
        } else {
          text = `[${type}] mensaje recibido`;
        }

        const r = await sendToOpenLines({
          userId: from,
          chatId: from,
          text,
          clientMsgId: id,
        });

        mapStatus.set(id, {
          wa_from: from,
          phone_id: metadata.phone_number_id,
          display_number: metadata.display_phone_number,
          result: r,
        });

        results.push({ type: 'message', messageId: id, result: r });
      } catch (e) {
        errors.push({
          messageId: (m && m.id) || null,
          error: (e && e.code) || (e && e.message) || 'UNKNOWN',
          details: e?.response?.data || { error: e?.message },
        });
      }
    }

    return res.status(200).json({ ok: true, processed: results.length, results, errors });
  } catch (e) {
    console.error('[WA webhook] fatal:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
