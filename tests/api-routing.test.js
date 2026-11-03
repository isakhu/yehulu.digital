'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  isPublicApiRequest,
  normalizeApiPath,
  resolveApiPath
} = require('../lib/api-routing');

test('normalizes API paths and removes trailing slashes', () => {
  assert.equal(normalizeApiPath('/api/auth/login'), '/api/auth/login');
  assert.equal(normalizeApiPath('/api/industries/'), '/api/industries');
});

test('resolves rewritten auth paths before checking public access', () => {
  assert.equal(resolveApiPath('/api/index.js?__route=%2Fapi%2Fauth%2Flogin'), '/api/auth/login');
  assert.equal(resolveApiPath('/api/index.js?__route=%2Fapi%2Fauth%2Fme'), '/api/auth/me');
  assert.equal(resolveApiPath('/api/index.js?__route=%2Fapi%2Fauth%2Flogout'), '/api/auth/logout');
});

test('public authentication endpoints are never mistaken for protected admin routes', () => {
  assert.equal(isPublicApiRequest('/api/auth/login', 'POST'), true);
  assert.equal(isPublicApiRequest('/api/auth/me', 'GET'), true);
  assert.equal(isPublicApiRequest('/api/auth/me', 'HEAD'), true);
  assert.equal(isPublicApiRequest('/api/auth/logout', 'POST'), false);
});

test('admin mutation endpoints remain protected', () => {
  assert.equal(isPublicApiRequest('/api/industries', 'POST'), false);
  assert.equal(isPublicApiRequest('/api/gallery', 'POST'), false);
  assert.equal(isPublicApiRequest('/api/admin/courses', 'DELETE'), false);
});

test('existing public read endpoints remain public', () => {
  assert.equal(isPublicApiRequest('/api/gallery', 'GET'), true);
  assert.equal(isPublicApiRequest('/api/videos/abc', 'GET'), true);
  assert.equal(isPublicApiRequest('/api/courses', 'HEAD'), true);
});


test('Vercel sends all API requests through one shared handler', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  const apiRewrites = config.rewrites.filter(rule => rule.source.startsWith('/api/'));
  assert.deepEqual(apiRewrites, [{
    source: '/api/(.*)',
    destination: '/api/index.js?__route=/api/$1'
  }]);
  for (const file of ['login.js', 'me.js', 'logout.js']) {
    assert.equal(fs.existsSync(path.join(__dirname, '..', 'api', 'auth', file)), false);
  }
});
