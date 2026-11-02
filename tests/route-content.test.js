'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'public', 'assets', 'index-BSXl1opM.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

const routerStart = bundle.indexOf('qy=()=>');
const router = bundle.slice(routerStart, routerStart + 2600);

test('the homepage renders the bold brand landing page hero', () => {
  assert.ok(router.includes('l.jsx(Ge,{path:"/",element:l.jsx(ky,{})}')));
  assert.equal(router.includes('path:"/about"'), false);
  assert.ok(html.includes("'/': ['Yehulu Digital | We Build Brands People Remember'"));
  assert.equal(html.includes("'/about':"), false);
  assert.ok(bundle.includes('Brand Strategy & Digital Experiences'));
  assert.ok(bundle.includes('We Build Brands '));
  assert.ok(bundle.includes('People Remember.'));
  assert.ok(bundle.includes('Strategy-led branding, websites, and digital systems for ambitious startups and modern businesses.'));
  assert.match(html, /body\[data-yd-view="landing"\] #root main > #home > section:first-of-type h1/);
  assert.match(html, /body\[data-yd-view="landing"\] #root main > #home \{\s*padding-top: 0 !important;/);
  assert.match(html, /text-transform: none !important;/);
});

test('About is removed from navigation and its old URL redirects home', () => {
  assert.equal(html.includes('data-target="about"'), false);
  assert.equal(html.includes('href="/about"'), false);
  assert.equal(bundle.includes('name:"ABOUT",path:"/about"'), false);
  assert.equal(bundle.includes('path:"/about",element:l.jsx(Cy,{})'), false);
  assert.ok(vercel.redirects.some(rule => rule.source === '/about' && rule.destination === '/' && rule.permanent === true));
  assert.ok(vercel.redirects.some(rule => rule.source === '/about.html' && rule.destination === '/' && rule.permanent === true));
  assert.ok(server.includes("if (pathname === '/about' || pathname === '/about.html') {"));
  assert.ok(server.includes("res.writeHead(301, { Location: '/' });"));
});

test('the remaining public navigation has seven items and all distinct sections', () => {
  assert.ok(html.includes('grid-template-columns: repeat(7, minmax(0, 1fr))'));
  for (const target of ['home', 'services', 'work', 'video', 'courses', 'admin', 'contact']) {
    assert.ok(html.includes('data-target="' + target + '"'), 'missing navigation item: ' + target);
  }
});

test('each other navigation route retains its own page component', () => {
  assert.ok(router.includes('l.jsx(Ge,{path:"/services",element:l.jsx(ky,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/gallery",element:l.jsx(Ry,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/video",element:l.jsx(Oy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/courses",element:l.jsx(Fy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/contact",element:l.jsx(By,{})})'));
});

test('home route receives only its dedicated hero styling and other routes keep their own view modes', () => {
  assert.doesNotMatch(html, /function patchHeroSection\(/);
  assert.doesNotMatch(html, /patchHeroSection\(\);/);
  assert.match(html, /var currentView = currentPath === '\/' \|\| currentPath === '\/index\.html' \? 'landing' :/);
  assert.match(html, /currentPath === '\/gallery' \? 'projects'/);
  assert.match(html, /currentPath === '\/estimate' \? 'estimate'/);
});

test('the landing page is not accidentally filtered down to its first section', () => {
  assert.doesNotMatch(html, /\(\(currentPath === '\/' \|\| currentPath === '\/index\.html'\) \? 'home'/);
  assert.match(html, /Only routes with an explicit isolated view receive a data-yd-view filter/);
});
