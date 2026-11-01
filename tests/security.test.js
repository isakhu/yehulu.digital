'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SESSION_SECRET = 'test-only-session-secret-with-at-least-32-characters';

const {
  createSessionToken,
  hashPassword,
  isValidPasswordHash,
  verifyPassword,
  verifySessionToken
} = require('../lib/auth');

test('passwords are stored as scrypt hashes and verified correctly', () => {
  const hash = hashPassword('A-long-test-password-2026!');
  assert.equal(isValidPasswordHash(hash), true);
  assert.equal(verifyPassword('A-long-test-password-2026!', hash), true);
  assert.equal(verifyPassword('incorrect-password', hash), false);
  assert.equal(isValidPasswordHash('plain-text-password'), false);
});

test('signed administrator sessions can be verified', () => {
  const token = createSessionToken({ id: 'admin-test', role: 'ADMIN' });
  const payload = verifySessionToken(token);

  assert.equal(payload.sub, 'admin-test');
  assert.equal(payload.role, 'ADMIN');
  assert.equal(payload.ver, 0);
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
});

test('session tokens carry a revocation version for administrator logout', () => {
  const token = createSessionToken({
    id: 'admin-versioned',
    role: 'ADMIN',
    tokenVersion: 4
  });

  assert.equal(verifySessionToken(token).ver, 4);
});

test('modified session tokens are rejected', () => {
  const token = createSessionToken({ id: 'admin-test', role: 'ADMIN' });
  const [payload, signature] = token.split('.');
  const replacement = signature[0] === 'a' ? 'b' : 'a';
  const tampered = `${payload}.${replacement}${signature.slice(1)}`;

  assert.equal(verifySessionToken(tampered), null);
  assert.equal(verifySessionToken('yehulu-token-admin-test'), null);
  assert.equal(verifySessionToken('yehulu-permanent-session-key'), null);
});

test('non-admin sessions are rejected', () => {
  const token = createSessionToken({ id: 'user-test', role: 'USER' });
  assert.equal(verifySessionToken(token), null);
});

test('sessions are rejected when the server secret is missing', () => {
  const token = createSessionToken({ id: 'admin-test', role: 'ADMIN' });
  const original = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;

  try {
    assert.equal(verifySessionToken(token), null);
  } finally {
    process.env.SESSION_SECRET = original;
  }
});

test('gallery markup renders API content as text and accepts only safe image URLs', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const start = html.indexOf('function injectExpandableArchive(items)');
  const end = html.indexOf('window.expandAllArchiveItems =', start);
  const archiveRenderer = html.slice(start, end);

  assert.notEqual(start, -1);
  assert.ok(end > start);
  assert.match(archiveRenderer, /cardTitle\.textContent = title/);
  assert.match(archiveRenderer, /image\.src = safeGalleryImageUrl\(item\.imageUrl\)/);
  assert.doesNotMatch(archiveRenderer, /innerHTML\s*=\s*html\.join/);
});
