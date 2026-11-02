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

test('project records use same-origin image URLs backed by committed files', () => {
  const localPrefix = '/uploads/projects/';
  const localItems = fallbackGallery.filter(item => (item.imageUrl || '').startsWith(localPrefix));
  assert.ok(localItems.length >= 30, 'expected checked-in project images to use same-origin URLs');
  for (const item of localItems) {
    const filename = decodeURIComponent(item.imageUrl.slice(localPrefix.length));
    const absolutePath = path.join(root, 'public', 'uploads', 'projects', filename);
    assert.ok(fs.existsSync(absolutePath), 'missing same-origin project image: ' + item.imageUrl);
  }
  assert.equal(sourceGallery.filter(item => (item.imageUrl || '').startsWith(localPrefix)).length, localItems.length);
});

test('committed project images are rendered only in the homepage Projects section and project archive', () => {
  assert.ok(bundle.includes('id:"work"'));
  assert.ok(html.includes("var workSection = document.getElementById('work')"));
  assert.ok(html.includes('workSection.appendChild(archiveWrapper)'));
  assert.ok(html.includes("fetch('/projects-fallback.json')"));
});

test('homepage and dedicated Projects page both merge API projects with the committed snapshot', () => {
  assert.ok(bundle.includes('fetch("/projects-fallback.json")'));
  assert.ok(bundle.includes('const merged=new Map()'));
  assert.ok(bundle.includes('d(projects.length?projects:ax)'));
  const projectsPage = bundle.slice(bundle.indexOf('Ry=()=>'), bundle.indexOf('Oy=()=>'));
  assert.ok(projectsPage.includes('fetch("/api/gallery")'));
  assert.ok(projectsPage.includes('fetch("/projects-fallback.json")'));
  assert.ok(projectsPage.includes('imageUrl:previous.imageUrl||item.imageUrl||""'));
  assert.ok(projectsPage.includes('loading:"lazy"'));
});

test('homepage project cards fall back to the GitHub-hosted original when a local image fails', () => {
  assert.ok(bundle.includes('https://cdn.jsdelivr.net/gh/isakhu/yehulu.digital@main/public/uploads/projects/'));
  assert.ok(bundle.includes('https://raw.githubusercontent.com/isakhu/yehulu.digital/main/public/uploads/projects/'));
  assert.ok(bundle.includes('dataset.githubFallback'));
});

test('the expanded homepage archive and lightbox use the same project fallback', () => {
  assert.ok(html.includes("fetch('/projects-fallback.json')"));
  assert.ok(html.includes('https://cdn.jsdelivr.net/gh/isakhu/yehulu.digital@main/public/uploads/projects/'));
  assert.ok(html.includes('injectExpandableArchive(data)'));
  assert.ok(html.includes("image.dataset.githubFallback = 'true'"));
  assert.ok(html.includes("imgEl.onerror = function()"));
});

test('the offline shell caches the project data snapshot', () => {
  assert.ok(serviceWorker.includes('yehulu-digital-shell-v14'));
  assert.ok(serviceWorker.includes("'/projects-fallback.json'"));
  assert.ok(html.includes("register('/sw.js?v=14')"));
});
