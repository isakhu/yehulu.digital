'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'public', 'assets', 'index-BSXl1opM.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');

const assignmentStart = html.indexOf('function assignSectionIds()');
const assignmentEnd = html.indexOf('//  4. INJECT COMPACT FAQ ACCORDION', assignmentStart);
const assignment = html.slice(assignmentStart, assignmentEnd);

const dockStart = html.indexOf('<nav id="floating-dock"');
const dockEnd = html.indexOf('</nav>', dockStart);
const dock = html.slice(dockStart, dockEnd);

const navigationStart = html.indexOf('function setupDockNavigation()');
const navigationEnd = html.indexOf('function setActiveDockItem', navigationStart);
const navigation = html.slice(navigationStart, navigationEnd);

test('Services is restored as a first-class bottom navigation destination', () => {
  assert.match(dock, /href="\/services"[^>]*data-target="services"[^>]*aria-label="Services"/);
  assert.match(navigation, /services:\s*'\/services'/);
  assert.match(navigation, /currentPath === '\/services'\s*\?\s*'services'/);
});

test('the dedicated Services route validates the existing five-card section', () => {
  assert.match(bundle, /id:"services"/);
  for (const title of ['BRAND IDENTITY', 'VIDEO PRODUCTION', 'GRAPHIC DESIGN', 'SOCIAL MEDIA', 'DIGITAL EXPERIENCES']) {
    assert.ok(bundle.includes('title:"' + title + '"'), 'Missing service card: ' + title);
  }
  assert.match(assignment, /var servicesSection = main\.querySelector\('#services'\)/);
  assert.match(assignment, /servicesSection\.parentElement === hero/);
  assert.match(assignment, /serviceCards\.length === serviceTitleMatchers\.length/);
  assert.match(assignment, /document\.body\.setAttribute\('data-yd-view', 'services'\)/);
  assert.match(assignment, /document\.body\.removeAttribute\('data-yd-view'\)/);
});

test('Services route shows only its section and applies the five-door design', () => {
  assert.ok(html.includes(
    'body[data-yd-view="services"] #root main > #home > *:not(#services):not(.fixed.inset-0),'
  ));
  assert.match(html, /body\[data-yd-view="services"\] #services \.grid > div\.yd-service-door-card/);
  assert.ok(html.includes('grid-template-columns: repeat(5, minmax(0, 1fr)) !important;'));
  assert.equal((html.match(/enhanceServiceDoorCards\(\);/g) || []).length, 2);
});

test('the active Services item and service-door interactions are restored', () => {
  assert.match(navigation, /services:\s*'\/services'/);
  assert.match(navigation, /currentPath === '\/services'\s*\?\s*'services'/);
  assert.match(html, /function enhanceServiceDoorCards\(\)/);
  assert.doesNotMatch(html, /enhanceServiceDoorCards\(\);[^\n]*disabled/);
  assert.match(html, /section\.querySelectorAll\('\.grid > div'\)/);
});

test('the service route cache is refreshed after restoring the page', () => {
  assert.match(html, /register\('\/sw\.js\?v=6'\)/);
  assert.match(serviceWorker, /CACHE_NAME = 'yehulu-digital-shell-v6'/);
});
