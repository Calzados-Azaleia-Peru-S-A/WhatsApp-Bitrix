// src/utils/phone.js
const { parsePhoneNumberFromString } = require('libphonenumber-js');

function normalizeToE164(input, defaultCountry = 'PE') {
  if (!input) return null;
  const raw = ('' + input).replace(/[^\d+]/g, '');
  const pn = parsePhoneNumberFromString(raw.startsWith('+') ? raw : '+' + raw, defaultCountry);
  if (!pn || !pn.isValid()) return null;
  return pn.number; // +519...
}

module.exports = { normalizeToE164 };
