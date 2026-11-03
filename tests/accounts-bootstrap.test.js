'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const dataStore = require('../lib/data-store');
const accounts = require('../lib/accounts');
const { hashPassword } = require('../lib/auth');

test('the environment-configured admin can bootstrap when CMS storage is unavailable', async () => {
  const originalUsername = process.env.ADMIN_USERNAME;
  const originalHash = process.env.ADMIN_PASSWORD_HASH;
  const originalReadJSON = dataStore.readJSON;
  const originalWriteJSON = dataStore.writeJSON;
  let writeCount = 0;

  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD_HASH = hashPassword('test-only-password');
  dataStore.readJSON = async () => {
    throw new Error('Private CMS Blob is unavailable');
  };
  dataStore.writeJSON = async () => {
    writeCount += 1;
    throw new Error('The login flow should not need to write to storage');
  };

  try {
    const users = await accounts.getUsers();
    assert.equal(users.length, 1);
    assert.equal(users[0].username, 'owner');
    assert.equal(users[0].id, 'admin-1');
    assert.equal(writeCount, 0);
  } finally {
    dataStore.readJSON = originalReadJSON;
    dataStore.writeJSON = originalWriteJSON;
    if (originalUsername === undefined) delete process.env.ADMIN_USERNAME;
    else process.env.ADMIN_USERNAME = originalUsername;
    if (originalHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = originalHash;
  }
});
