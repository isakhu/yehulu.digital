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
  assert.equal(vercel.rewrites.some(item => item.source === '/about'), true);
  assert.ok(server.includes("pathname === '/services' || pathname === '/services.html'"));
  assert.ok(server.includes('serveStaticFile(servicesPage, res)'));
});

test('the dedicated Services page contains five distinct service doors', () => {
  const keys = ['branding', 'video', 'design', 'social', 'digital'];
  const titles = ['Brand identity', 'Video production', 'Graphic design', 'Social media', 'Digital experiences'];
  for (let i = 0; i < keys.length; i += 1) {
    assert.ok(servicePage.includes('data-service="' + keys[i] + '"'), 'Missing service door: ' + keys[i]);
    assert.ok(servicePage.includes('title: "' + titles[i] + '"'), 'Missing service detail: ' + titles[i]);
  }
  assert.ok(servicePage.includes('aria-label="Yehulu Digital services"'));
  assert.ok(servicePage.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
});

test('each service door opens an accessible detail dialog with deliverables', () => {
  assert.ok(servicePage.includes('<dialog id="service-dialog"'));
  assert.ok(servicePage.includes('card.addEventListener("click"'));
  assert.ok(servicePage.includes('dialog.showModal()'));
  assert.ok(servicePage.includes('deliverables.forEach'));
  assert.ok(servicePage.includes('dialog.addEventListener("close"'));
  assert.ok(servicePage.includes('href = "/contact?service="'));
  assert.ok(servicePage.includes('pendingOpenTimer'));
  assert.ok(servicePage.includes('}, 460);'));
});

test('the standalone page retains the brand navigation, theme and page grid', () => {
  assert.ok(servicePage.includes('href="/"'));
  assert.ok(servicePage.includes('href="/services" class="active"'));
  assert.equal(servicePage.includes('href="/admin/login"'), false);
  assert.ok(servicePage.includes('grid-template-columns:repeat(6,minmax(0,1fr))'));
  assert.ok(servicePage.includes('id="theme-toggle"'));
  assert.ok(servicePage.includes('background-size:54px 45px,54px 45px,auto'));
  assert.doesNotMatch(servicePage, /FREQUENTLY ASKED|COMMON QUESTIONS|faq-card/i);
});

test('Service Worker caches the dedicated page and uses the current cache version', () => {
  assert.ok(serviceWorker.includes("CACHE_NAME = 'yehulu-digital-shell-v14'"));
  assert.ok(serviceWorker.includes("'/services.html'"));
  assert.ok(serviceWorker.includes('cachedServicesPage'));
  assert.ok(index.includes("navigator.serviceWorker.register('/sw.js?v=14')"));
});
