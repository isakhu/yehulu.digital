'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'public/assets/index-BSXl1opM.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

test('editor routes render without a login or session check', () => {
  assert.ok(bundle.includes('pt=({children:r})=>r'));
  assert.ok(!bundle.includes('VERIFYING ADMIN CREDENTIALS'));
  assert.ok(!bundle.includes('LOGGED IN AS'));
  assert.ok(!bundle.includes('name:"Contact Messages"'));
  assert.ok(!bundle.includes('name:"Account & Team"'));
});

test('dashboard home contains only public content-management links', () => {
  const start = bundle.indexOf('Ly=()=>');
  const end = bundle.indexOf(',zy=()=>', start);
  assert.ok(start >= 0 && end > start, 'dashboard component must be present');
  const dashboard = bundle.slice(start, end);
  assert.ok(dashboard.includes('Projects & Images'));
  assert.ok(dashboard.includes('Videos & Links'));
  assert.ok(!dashboard.includes('MESSAGES'));
  assert.ok(!dashboard.includes('INQUIRIES'));
});

test('admin login URL redirects to the open dashboard and old service-worker cache is invalidated', () => {
  assert.ok(config.redirects.some(rule => rule.source === '/admin/login' && rule.destination === '/admin'));
  assert.ok(!config.rewrites.some(rule => rule.source === '/admin/login'));
  assert.ok(html.includes('index-BSXl1opM.js?v=9-open-content-editor'));
  assert.ok(html.includes('/sw.js?v=15'));
  assert.ok(sw.includes('yehulu-digital-shell-v15'));
  assert.equal(fs.existsSync(path.join(root, 'public/admin-passkey.html')), false);
});
