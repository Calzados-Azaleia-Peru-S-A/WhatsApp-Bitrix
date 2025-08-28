'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'secrets', 'wamap.json');

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}), 'utf8');
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function writeAll(obj) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2), 'utf8');
}

function put(wamid, value) {
  const db = readAll();
  db[wamid] = value;
  writeAll(db);
}

function get(wamid) {
  const db = readAll();
  return db[wamid] || null;
}

function remove(wamid) {
  const db = readAll();
  delete db[wamid];
  writeAll(db);
}

module.exports = { put, get, remove, readAll, writeAll, FILE };
