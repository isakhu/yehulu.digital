'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

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
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
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
