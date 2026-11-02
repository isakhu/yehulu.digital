'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sourceGallery = JSON.parse(fs.readFileSync(path.join(root, 'data', 'gallery.json'), 'utf8'));
const fallbackGallery = JSON.parse(fs.readFileSync(path.join(root, 'public', 'projects-fallback.json'), 'utf8'));
const bundle = fs.readFileSync(path.join(root, 'public', 'assets', 'index-BSXl1opM.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');

test('the public project snapshot includes every committed gallery record', () => {
  assert.equal(fallbackGallery.length, sourceGallery.length);
  assert.deepEqual(
    fallbackGallery.map(item => item.id).sort(),
    sourceGallery.map(item => item.id).sort()
  );
});

test('all local project image paths referenced by the snapshot exist in public uploads', () => {
  const localItems = fallbackGallery.filter(item => (item.imageUrl || '').startsWith('/uploads/projects/'));
  assert.ok(localItems.length >= 30, 'expected the committed project images to be included');
  for (const item of localItems) {
    const relativePath = decodeURIComponent(item.imageUrl.slice(1));
    const absolutePath = path.join(root, 'public', relativePath);
    assert.ok(fs.existsSync(absolutePath), 'missing project image: ' + item.imageUrl);
  }
});

test('the homepage merges API projects with the committed project snapshot', () => {
  assert.ok(bundle.includes('fetch("/projects-fallback.json")'));
  assert.ok(bundle.includes('const merged=new Map()'));
  assert.ok(bundle.includes('d(projects.length?projects:ax)'));
});

test('homepage project cards fall back to the GitHub-hosted original when a local image fails', () => {
  assert.ok(bundle.includes('raw.githubusercontent.com/isakhu/yehulu.digital/main/public'));
  assert.ok(bundle.includes('dataset.githubFallback'));
});

test('the expanded homepage archive and lightbox use the same project fallback', () => {
  assert.ok(html.includes("fetch('/projects-fallback.json')"));
  assert.ok(html.includes('injectExpandableArchive(data)'));
  assert.ok(html.includes("image.dataset.githubFallback = 'true'"));
  assert.ok(html.includes("imgEl.onerror = function()"));
});

test('the offline shell caches the project data snapshot', () => {
  assert.ok(serviceWorker.includes('yehulu-digital-shell-v12'));
  assert.ok(serviceWorker.includes("'/projects-fallback.json'"));
  assert.ok(html.includes("register('/sw.js?v=12')"));
});
