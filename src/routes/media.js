// src/routes/media.js
// Sirve binarios de WhatsApp Cloud API como proxy para que Bitrix los muestre embebidos.

const express = require('express');
const fetch = require('node-fetch');

const WSP_TOKEN = process.env.WSP_TOKEN || '';

const router = express.Router();

// GET /media/wsp/:id?filename=algo.jpg
router.get('/media/wsp/:id', async (req, res) => {
  try {
    if (!WSP_TOKEN) {
      return res.status(500).send('WSP_TOKEN ausente en .env');
    }
    const mediaId = req.params.id;
    const filename = (req.query.filename || `media_${mediaId}`).toString();

    // 1) Info del media para obtener la URL temporal
    const infoUrl = `https://graph.facebook.com/v20.0/${mediaId}`;
    const infoResp = await fetch(infoUrl, {
      headers: { Authorization: `Bearer ${WSP_TOKEN}` },
    });
    if (!infoResp.ok) {
      const t = await infoResp.text();
      return res.status(infoResp.status).send(`Error media info: ${t}`);
    }
    const info = await infoResp.json(); // { url, mime_type, file_size, id, ... }
    if (!info.url) {
      return res.status(500).send('Media URL ausente en respuesta de Graph');
    }

    // 2) Descargar el binario desde la URL firmada
    const binResp = await fetch(info.url, {
      headers: { Authorization: `Bearer ${WSP_TOKEN}` },
    });
    if (!binResp.ok) {
      const t = await binResp.text();
      return res.status(binResp.status).send(`Error media download: ${t}`);
    }

    // 3) Propagar cabeceras y hacer stream
    const mime = binResp.headers.get('content-type') || info.mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mime);

    // inline para que Bitrix intente mostrarlo embebido (imagen/audio/video); si prefieres descarga, usa attachment
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    binResp.body.pipe(res);
  } catch (e) {
    console.error('[media] error', e);
    res.status(500).send(e.message || 'media error');
  }
});

module.exports = router;
