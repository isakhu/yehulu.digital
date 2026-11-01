'use strict';

const crypto = require('node:crypto');

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

function isValidPasswordHash(encodedHash) {
  if (typeof encodedHash !== 'string') return false;
  const parts = encodedHash.split('$');
  return parts.length === 3 &&
    parts[0] === 'scrypt' &&
    /^[a-f0-9]{32,128}$/i.test(parts[1]) &&
    /^[a-f0-9]{128}$/i.test(parts[2]);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

function verifyPassword(password, encodedHash) {
  if (!isValidPasswordHash(encodedHash)) return false;

  try {
    const [, salt, hashHex] = encodedHash.split('$');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch (_) {
    return false;
  }
}

function isSessionSecretConfigured() {
  return typeof process.env.SESSION_SECRET === 'string' &&
    Buffer.byteLength(process.env.SESSION_SECRET, 'utf8') >= 32;
}

function createSessionToken(user) {
  if (!isSessionSecretConfigured()) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }

  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    role: user.role || 'ADMIN',
    ver: Number(user.tokenVersion) || 0,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!isSessionSecretConfigured() || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  try {
    const expected = crypto
      .createHmac('sha256', process.env.SESSION_SECRET)
      .update(parts[0])
      .digest();

    const supplied = Buffer.from(parts[1], 'base64url');
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      payload.role !== 'ADMIN' ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch (_) {
    return null;
  }
}

module.exports = {
  createSessionToken,
  hashPassword,
  isSessionSecretConfigured,
  isValidPasswordHash,
  verifyPassword,
  verifySessionToken
};
