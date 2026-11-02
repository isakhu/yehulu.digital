'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'public', 'assets', 'index-BSXl1opM.js'), 'utf8');

const routerStart = bundle.indexOf('qy=()=>');
const router = bundle.slice(routerStart, routerStart + 2600);

test('the public landing route renders the real About page component', () => {
  assert.ok(router.includes('l.jsx(Ge,{path:"/",element:l.jsx(Cy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/about",element:l.jsx(Cy,{})})'));
  assert.match(html, /'\/': \['About Yehulu Digital \| Our Creative Studio'/);
  assert.doesNotMatch(html, /'\/': \['Yehulu Digital \| We Create Brands'/);
});

test('each navigation route retains its own page component', () => {
  assert.ok(router.includes('l.jsx(Ge,{path:"/services",element:l.jsx(ky,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/gallery",element:l.jsx(Ry,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/video",element:l.jsx(Oy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/courses",element:l.jsx(Fy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/contact",element:l.jsx(By,{})})'));
});

test('page headings and descriptions are not overwritten by the old global hero patch', () => {
  assert.doesNotMatch(html, /function patchHeroSection\(/);
  assert.doesNotMatch(html, /patchHeroSection\(\);/);
  assert.doesNotMatch(html, /We Build Brands<br><span style="color:#B6FF00">People Remember\./);
  assert.match(html, /var currentView = currentPath === '\/gallery' \? 'projects' :/);
  assert.doesNotMatch(html, /\? 'home' : '';/);
});

test('the landing About page is not accidentally filtered down to its first section', () => {
  assert.doesNotMatch(html, /\(\(currentPath === '\/' \|\| currentPath === '\/index\.html'\) \? 'home'/);
  assert.match(html, /Only routes with an explicit isolated view receive a data-yd-view filter/);
});
