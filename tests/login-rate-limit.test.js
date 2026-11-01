'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { clearLoginAttempts, consumeLoginAttempt } = require('../lib/login-rate-limit');

test('limits login attempts per client and resets after the window', () => {
  const req = { headers: {}, socket: { remoteAddress: '192.0.2.245' } };
  const now = 1_800_000_000_000;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal(consumeLoginAttempt(req, now), null);
  }
  assert.equal(consumeLoginAttempt(req, now), 900);
  assert.equal(consumeLoginAttempt(req, now + 15 * 60 * 1000), null);

  clearLoginAttempts(req);
});

test('successful authentication can clear the client limit', () => {
  const req = { headers: {}, socket: { remoteAddress: '192.0.2.246' } };
  const now = 1_800_000_000_000;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    consumeLoginAttempt(req, now);
  }
  clearLoginAttempts(req);

  assert.equal(consumeLoginAttempt(req, now), null);
  clearLoginAttempts(req);
});
