'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const accounts = require('../lib/accounts');
const { hashPassword, verifySessionToken, createSessionToken } = require('../lib/auth');

let users = [];
accounts.getUsers = async () => users;
accounts.saveUsers = async nextUsers => {
  users = nextUsers;
  return users;
};

const { handleAccountApi } = require('../lib/account-api');

test('changing the current administrator password revokes existing sessions', async () => {
  const originalSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'test-only-account-secret-with-at-least-32-characters';

  const user = {
    id: 'admin-profile-test',
    name: 'Test Admin',
    email: 'admin@example.com',
    passwordHash: hashPassword('Current-test-password-2026!'),
    role: 'ADMIN',
    tokenVersion: 3
  };
  users = [user];
  const previousToken = createSessionToken(user);

  try {
    const result = await handleAccountApi('/api/admin/profile', 'PUT', {
      headers: {},
      body: {
        name: user.name,
        email: user.email,
        currentPassword: 'Current-test-password-2026!',
        newPassword: 'Replacement-test-password-2026!'
      }
    }, user);

    assert.equal(result.status, 200);
    assert.equal(users[0].tokenVersion, 4);
    assert.equal(verifySessionToken(previousToken).ver, 3);
    assert.notEqual(verifySessionToken(previousToken).ver, users[0].tokenVersion);
  } finally {
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
  }
});
