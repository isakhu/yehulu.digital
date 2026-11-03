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

test('protected requests accept the signed session cookie and bearer token', async () => {
  const original = {
    vercel: process.env.VERCEL,
    storeId: process.env.CMS_BLOB_STORE_ID,
    cmsToken: process.env.CMS_BLOB_READ_WRITE_TOKEN,
    password: process.env.ADMIN_PASSWORD,
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    secret: process.env.SESSION_SECRET
  };

  delete process.env.VERCEL;
  delete process.env.CMS_BLOB_STORE_ID;
  delete process.env.CMS_BLOB_READ_WRITE_TOKEN;
  delete process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD_HASH = hashPassword('123456');
  process.env.SESSION_SECRET = 'test-only-cookie-session-secret-with-32-characters';

  const token = createSessionToken({ id: 'admin-1', role: 'ADMIN', tokenVersion: 0 });
  try {
    const cookieUser = await accounts.getAuthenticatedUser({
      headers: { cookie: `other=value; yehulu_admin_session=${token}` }
    });
    assert.equal(cookieUser && cookieUser.id, 'admin-1');

    const bearerUser = await accounts.getAuthenticatedUser({
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(bearerUser && bearerUser.id, 'admin-1');

    const fallbackUser = await accounts.getAuthenticatedUser({
      headers: {
        authorization: 'Bearer stale-or-invalid-token',
        cookie: `yehulu_admin_session=${token}`
      }
    });
    assert.equal(fallbackUser && fallbackUser.id, 'admin-1');
  } finally {
    if (original.vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original.vercel;
    if (original.storeId === undefined) delete process.env.CMS_BLOB_STORE_ID;
    else process.env.CMS_BLOB_STORE_ID = original.storeId;
    if (original.cmsToken === undefined) delete process.env.CMS_BLOB_READ_WRITE_TOKEN;
    else process.env.CMS_BLOB_READ_WRITE_TOKEN = original.cmsToken;
    if (original.password === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = original.password;
    if (original.passwordHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = original.passwordHash;
    if (original.secret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = original.secret;
  }
});


test('configured scrypt hash overrides an old saved admin password', async () => {
  const originalSecret = process.env.SESSION_SECRET;
  const originalPassword = process.env.ADMIN_PASSWORD;
  const originalHash = process.env.ADMIN_PASSWORD_HASH;
  process.env.SESSION_SECRET = 'test-only-hash-password-secret-with-32-characters';
  delete process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD_HASH = hashPassword('123456');

  const user = {
    id: 'admin-hash-override-test',
    name: 'Test Owner',
    email: 'owner@example.com',
    passwordHash: hashPassword('old-saved-password'),
    role: 'ADMIN',
    tokenVersion: 0
  };
  users = [user];

  try {
    const success = await handleAccountApi('/api/auth/login', 'POST', {
      headers: {},
      body: { password: '123456' }
    }, null);
    assert.equal(success.status, 200);
    assert.equal(verifySessionToken(success.body.token).sub, user.id);
  } finally {
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalPassword;
    if (originalHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = originalHash;
    users = [];
  }
});


test('owner can sign in with the configured password only', async () => {
  const originalSecret = process.env.SESSION_SECRET;
  const originalPassword = process.env.ADMIN_PASSWORD;
  process.env.SESSION_SECRET = 'test-only-single-password-secret-with-32-characters';
  process.env.ADMIN_PASSWORD = '123456';

  const user = {
    id: 'admin-single-password-test',
    name: 'Test Owner',
    email: 'owner@example.com',
    passwordHash: hashPassword('a-different-legacy-password'),
    role: 'ADMIN',
    tokenVersion: 0
  };
  users = [user];

  try {
    const success = await handleAccountApi('/api/auth/login', 'POST', {
      headers: {},
      body: { password: '123456' }
    }, null);

    assert.equal(success.status, 200);
    assert.equal(typeof success.body.token, 'string');
    assert.equal(verifySessionToken(success.body.token).sub, user.id);
    assert.match(success.headers['Set-Cookie'], /HttpOnly/);
    assert.match(success.headers['Set-Cookie'], /SameSite=Lax/);
    assert.match(success.headers['Set-Cookie'], /Max-Age=28800/);

    const failure = await handleAccountApi('/api/auth/login', 'POST', {
      headers: {},
      body: { password: 'wrong-password' }
    }, null);
    assert.equal(failure.status, 401);
  } finally {
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalPassword;
    users = [];
  }
});


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


test('admin login does not require a CMS Blob store on Vercel', async () => {
  const original = {
    vercel: process.env.VERCEL,
    storeId: process.env.CMS_BLOB_STORE_ID,
    cmsToken: process.env.CMS_BLOB_READ_WRITE_TOKEN,
    username: process.env.ADMIN_USERNAME,
    secret: process.env.SESSION_SECRET
  };

  process.env.VERCEL = '1';
  delete process.env.CMS_BLOB_STORE_ID;
  delete process.env.CMS_BLOB_READ_WRITE_TOKEN;
  process.env.ADMIN_USERNAME = 'owner';
  process.env.SESSION_SECRET = 'test-only-login-secret-with-at-least-32-characters';

  const user = {
    id: 'admin-login-test',
    username: 'owner',
    name: 'Test Owner',
    email: 'owner@example.com',
    passwordHash: hashPassword('test-only-password'),
    role: 'ADMIN',
    tokenVersion: 0
  };
  users = [user];

  try {
    const result = await handleAccountApi('/api/auth/login', 'POST', {
      headers: {},
      body: { username: 'owner', password: 'test-only-password' }
    }, null);

    assert.equal(result.status, 200);
    assert.equal(typeof result.body.token, 'string');
    assert.equal(verifySessionToken(result.body.token).sub, user.id);
  } finally {
    if (original.vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original.vercel;
    if (original.storeId === undefined) delete process.env.CMS_BLOB_STORE_ID;
    else process.env.CMS_BLOB_STORE_ID = original.storeId;
    if (original.cmsToken === undefined) delete process.env.CMS_BLOB_READ_WRITE_TOKEN;
    else process.env.CMS_BLOB_READ_WRITE_TOKEN = original.cmsToken;
    if (original.username === undefined) delete process.env.ADMIN_USERNAME;
    else process.env.ADMIN_USERNAME = original.username;
    if (original.secret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = original.secret;
    users = [];
  }
});
