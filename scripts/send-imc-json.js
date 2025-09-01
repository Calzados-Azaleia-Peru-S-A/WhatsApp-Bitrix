const axios = require('axios');
const fs = require('fs');

(async () => {
  const tk = require('../.runtime/b24-oauth.json');
  const B24_EP = tk.client_endpoint || `https://${process.env.B24_DOMAIN}/rest/`;
  const CONNECTOR = process.env.CONNECTOR || 'wa_cloud_custom';
  const LINE = process.env.OPENLINE || '154';
  const PHONE = process.env.TEST_PHONE || '51918131082';
  const MSGID = 'wamid.NODE.' + Math.random().toString(36).slice(2);

  const body = {
    CONNECTOR,
    LINE,
    MESSAGES: [{
      user: { id: PHONE },
      chat: { id: PHONE },
      message: { id: MSGID, text: 'Hola desde Node JSON' }
    }],
    auth: tk.access_token
  };

  console.log('POST ->', B24_EP + 'imconnector.send.messages');
  console.log(JSON.stringify(body, null, 2));
  const r = await axios.post(B24_EP + 'imconnector.send.messages', body, {
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true
  });
  console.log('STATUS', r.status);
  console.log(r.data);
})();
