'use strict';

const fs = require('node:fs');
const path = require('node:path');

let putBlob = null;
let getBlob = null;

try {
  const blob = require('@vercel/blob');
  putBlob = blob.put;
  getBlob = blob.get;
} catch (_) {}

const DATA_DIR = path.join(__dirname, '..', 'data');

async function readJSON(name, fallback) {
  const token = process.env.CMS_BLOB_READ_WRITE_TOKEN;

  if (token) {
    if (!getBlob) {
      throw new Error('Vercel Blob support is unavailable while CMS_BLOB_READ_WRITE_TOKEN is configured.');
    }

    let result;
    try {
      result = await getBlob(`data/${name}`, {
        access: 'private',
        token
      });
    } catch (error) {
      throw new Error(`Unable to read private CMS record "${name}": ${error.message}`);
    }

    if (result && result.statusCode === 200 && result.stream) {
      try {
        const chunks = [];
        for await (const chunk of result.stream) {
          chunks.push(Buffer.from(chunk));
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch (error) {
        throw new Error(`Private CMS record "${name}" could not be decoded: ${error.message}`);
      }
    }

    if (result !== null) {
      throw new Error(`Private CMS record "${name}" returned an unexpected response.`);
    }
    // A genuinely missing Blob may be seeded from the repository's initial data file.
  }

  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Local CMS record "${name}" contains invalid JSON: ${error.message}`);
  }
}

async function writeJSON(name, value) {
  const serialized = JSON.stringify(value, null, 2);
  const token = process.env.CMS_BLOB_READ_WRITE_TOKEN;

  if (token) {
    if (!putBlob) throw new Error('Vercel Blob support is unavailable in this deployment.');
    await putBlob(`data/${name}`, serialized, {
      access: 'private',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json'
    });
    return;
  }

  if (process.env.VERCEL === '1') {
    throw new Error('Configure CMS_BLOB_READ_WRITE_TOKEN to save admin data on Vercel.');
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, name), serialized, 'utf8');
}

module.exports = { readJSON, writeJSON };
