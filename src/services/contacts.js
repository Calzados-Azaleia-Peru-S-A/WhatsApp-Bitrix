// src/services/contacts.js
const { findContactByPhone, createContact } = require('./b24client');

async function ensureContactByPhone({ phoneE164, name }) {
  if (!phoneE164) throw new Error('phoneE164 requerido');
  const existing = await findContactByPhone(phoneE164);
  if (existing && existing.ID) {
    return { contactId: existing.ID, created: false, phoneE164 };
  }
  const id = await createContact({ name, phoneE164 });
  return { contactId: id, created: true, phoneE164 };
}

module.exports = { ensureContactByPhone };
