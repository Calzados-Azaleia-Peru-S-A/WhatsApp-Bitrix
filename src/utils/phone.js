// src/utils/phone.js
function normalizeToE164(raw, defaultCountry = 'PE') {
  if (!raw) return null;
  let s = String(raw).replace(/[^\d+]/g, '');
  if (s.startsWith('+')) return s;
  // Asumimos Perú (51) por defecto
  if (defaultCountry === 'PE') {
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (!s.startsWith('51')) s = '51' + s;
    return '+' + s;
  }
  return '+' + s;
}
function stripPlus(e164) {
  if (!e164) return null;
  return String(e164).replace(/^\+/, '');
}
module.exports = { normalizeToE164, stripPlus };
