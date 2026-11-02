'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const servicePage = fs.readFileSync(path.join(root, 'public', 'services.html'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

test('the Services URL is served by an independent HTML page', () => {
  const route = vercel.rewrites.find(item => item.source === '/services');
  assert.ok(route, 'Missing /services rewrite');
  assert.equal(route.destination, '/services.html');
  assert.match(server, /pathname === '\\/services' \\|\\| pathname === '\\/services\\.html'/);
  assert.match(server, /serveStaticFile\\(servicesPage, res\\)/);
});

test('the dedicated Services page contains five distinct service doors', () => {
  const keys = ['branding', 'video', 'design', 'social', 'digital'];
  const titles = ['Brand identity', 'Video production', 'Graphic design', 'Social media', 'Digital experiences'];
  for (let i = 0; i < keys.length; i += 1) {
    assert.ok(servicePage.includes('data-service="' + keys[i] + '"'), 'Missing service door: ' + keys[i]);
    assert.ok(servicePage.includes('title: "' + titles[i] + '"'), 'Missing service detail: ' + titles[i]);
  }
  assert.match(servicePage, /aria-label="Yehulu Digital services"/);
  assert.match(servicePage, /grid-template-columns:repeat\\(5,minmax\\(0,1fr\\)\\)/);
});

test('each service door opens an accessible detail dialog with deliverables', () => {
  assert.match(servicePage, /<dialog id="service-dialog"/);
  assert.match(servicePage, /card\\.addEventListener\\("click"/);
  assert.match(servicePage, /dialog\\.showModal\\(\\)/);
  assert.match(servicePage, /deliverables\\.forEach/);
  assert.match(servicePage, /dialog\\.addEventListener\\("close"/);
  assert.match(servicePage, /href = "\\/contact\\?service="/);
});

test('the standalone page retains the brand navigation, theme and page grid', () => {
  assert.match(servicePage, /href="\/"/);
  assert.match(servicePage, /href="\/about"/);
  assert.match(servicePage, /href="\/services" class="active"/);
  assert.match(servicePage, /id="theme-toggle"/);
  assert.match(servicePage, /background-size:54px 45px,54px 45px,auto/);
  assert.doesNotMatch(servicePage, /FREQUENTLY ASKED|COMMON QUESTIONS|faq-card/i);
});

test('Service Worker caches the dedicated page and uses the v9 cache', () => {
  assert.match(serviceWorker, /CACHE_NAME = 'yehulu-digital-shell-v9'/);
  assert.match(serviceWorker, /'\\/services\\.html'/);
  assert.match(serviceWorker, /cachedServicesPage/);
  assert.match(index, /register\\('\\/sw\\.js\\?v=9'\\)/);
});
