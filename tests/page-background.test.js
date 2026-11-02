'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const offlineHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'offline.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');

test('rectangular grid background is applied to every full-page route shell', () => {
  assert.match(indexHtml, /background-size:\s*54px 45px;/);
  assert.ok(indexHtml.includes('#root > .min-h-screen'));
  assert.ok(indexHtml.includes('#root main > [class~="bg-[#050505]"]'));
  assert.match(indexHtml, /background-attachment:\s*fixed, fixed, fixed;/);
  assert.match(indexHtml, /\[data-theme="light"\] #root main/);
});

test('offline page uses the same rectangular grid background', () => {
  assert.match(offlineHtml, /background-size:\s*54px 45px,\s*54px 45px,\s*auto;/);
});

test('service worker cache is refreshed when the site background changes', () => {
  assert.match(indexHtml, /register\('\/sw\.js\?v=13'\)/);
  assert.match(serviceWorker, /CACHE_NAME = 'yehulu-digital-shell-v13'/);
});
