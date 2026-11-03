'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isPublicApiRequest,
  normalizeApiPath,
  resolveApiPath
} = require('../lib/api-routing');

test('normalizes Vercel API function paths ending in .js', () => {
  assert.equal(normalizeApiPath('/api/auth/login.js'), '/api/auth/login');
  assert.equal(normalizeApiPath('/api/auth/me.js'), '/api/auth/me');
  assert.equal(normalizeApiPath('/api/auth/logout.js'), '/api/auth/logout');
  assert.equal(normalizeApiPath('/api/industries.js'), '/api/industries');
});

test('resolves rewritten auth paths before checking public access', () => {
  assert.equal(resolveApiPath('/api/index.js?__route=%2Fapi%2Fauth%2Flogin.js'), '/api/auth/login');
  assert.equal(resolveApiPath('/api/auth/login.js'), '/api/auth/login');
  assert.equal(resolveApiPath('/api/index.js?__route=%2Fapi%2Fauth%2Fme.js'), '/api/auth/me');
});

test('public authentication endpoints are never mistaken for protected admin routes', () => {
  assert.equal(isPublicApiRequest('/api/auth/login.js', 'POST'), true);
  assert.equal(isPublicApiRequest('/api/auth/login', 'POST'), true);
  assert.equal(isPublicApiRequest('/api/auth/me.js', 'GET'), true);
  assert.equal(isPublicApiRequest('/api/auth/me', 'HEAD'), true);
  assert.equal(isPublicApiRequest('/api/auth/logout.js', 'POST'), false);
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
