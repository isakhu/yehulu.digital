'use strict';

const fs = require('node:fs');
const path = require('node:path');

let putBlob = null;
let headBlob = null;

try {
  const blob = require('@vercel/blob');
  putBlob = blob.put;
  headBlob = blob.head;
} catch (_) {}

const DATA_DIR = path.join(__dirname, '..', 'data');

async function readJSON(name, fallback) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token && headBlob) {
    try {
      const metadata = await headBlob(`data/${name}`);
      const url = metadata && (metadata.downloadUrl || metadata.url);
      if (url) {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const value = await response.json();
          return value;
        }
      }
    } catch (_) {
      // A missing or temporarily unavailable Blob falls back to the bundled data file.
    }
  }

  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

async function writeJSON(name, value) {
  const serialized = JSON.stringify(value, null, 2);
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    if (!putBlob) throw new Error('Vercel Blob support is unavailable in this deployment.');
    await putBlob(`data/${name}`, serialized, {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
    return;
  }

  if (process.env.VERCEL === '1') {
    throw new Error('Configure BLOB_READ_WRITE_TOKEN to save admin data on Vercel.');
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, name), serialized, 'utf8');
}

module.exports = { readJSON, writeJSON };
