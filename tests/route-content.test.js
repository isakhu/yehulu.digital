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
const router = bundle.slice(routerStart, routerStart + 3400);

test('the homepage shows only its bold landing hero, not About or other content sections', () => {
  assert.ok(router.includes('l.jsx(Ge,{path:"/",element:l.jsx(ky,{})})'));
  assert.ok(html.includes("'/': ['Yehulu Digital | We Build Brands People Remember'"));
  assert.ok(html.includes('body[data-yd-view="landing"] #root main > #home > *:not(:first-child)'));
  assert.ok(bundle.includes('Brand Strategy & Digital Experiences'));
  assert.ok(bundle.includes('We Build Brands '));
  assert.ok(bundle.includes('People Remember.'));
  assert.ok(bundle.includes('Strategy-led branding, websites, and digital systems for ambitious startups and modern businesses.'));
  assert.match(html, /body\[data-yd-view="landing"\] #root main > #home > section:first-of-type h1/);
  assert.match(html, /body\[data-yd-view="landing"\] #root main > #home \{\s*padding-top: 0 !important;/);
  assert.match(html, /text-transform: none !important;/);
});

test('About has its own route, navigation item, metadata, and component', () => {
  assert.ok(router.includes('l.jsx(Ge,{path:"/about",element:l.jsx(Cy,{})})'));
  assert.ok(html.includes('data-target="about"'));
  assert.ok(html.includes("'/about': ['About Yehulu Digital | Our Studio'"));
  assert.ok(config.rewrites.some(rule => rule.source === '/about' && rule.destination === '/index.html'));
  assert.equal(config.redirects.some(rule => rule.source === '/about' && rule.destination === '/'), false);
  assert.ok(server.includes("if (pathname === '/about' || pathname === '/about.html') {"));
  assert.ok(server.includes("if (fs.existsSync(appIndex)) return serveStaticFile(appIndex, res);"));
  assert.ok(bundle.includes('children:"ABOUT YEHULU DIGITAL"'));
});

test('the top navigation links to independent pages rather than homepage sections', () => {
  assert.ok(bundle.includes('{name:"ABOUT",path:"/about"}'));
  assert.ok(bundle.includes('{name:"SERVICES",path:"/services"}'));
  assert.ok(bundle.includes('{name:"PROJECTS",path:"/gallery"}'));
  assert.ok(bundle.includes('{name:"VIDEOS",path:"/video"}'));
  assert.ok(bundle.includes('{name:"COURSES",path:"/courses"}'));
  assert.ok(bundle.includes('{name:"ESTIMATE",path:"/estimate"}'));
  assert.ok(bundle.includes('l.jsxs("a",{href:N.path'));
  assert.ok(bundle.includes('l.jsx("a",{href:N.path'));
});

test('the public navigation has seven independent destinations and Admin stays in Contact', () => {
  assert.ok(html.includes('grid-template-columns: repeat(7, minmax(0, 1fr))'));
  for (const target of ['home', 'about', 'services', 'work', 'video', 'courses', 'contact']) {
    assert.ok(html.includes('data-target="' + target + '"'), 'missing navigation item: ' + target);
  }
  assert.equal(html.includes('data-target="admin"'), false);
  assert.equal(html.includes('href="/admin/login"'), false);
  assert.ok(bundle.includes('children:"ADMIN PORTAL"'));
  assert.ok(bundle.includes('children:"ADMIN SIGN IN"'));
  assert.ok(bundle.includes('to:"/admin/login"'));
});

test('each other navigation route retains its own page component', () => {
  assert.ok(router.includes('l.jsx(Ge,{path:"/services",element:l.jsx(ky,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/gallery",element:l.jsx(Ry,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/video",element:l.jsx(Oy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/courses",element:l.jsx(Fy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/contact",element:l.jsx(By,{})})'));
});

test('Contact shows Hawassa location and Yzak Software developer credit', () => {
  assert.ok(bundle.includes('children:"Hawassa, Sidama, Ethiopia"'));
  assert.ok(bundle.includes('https://www.google.com/maps/search/?api=1&query=Hawassa%2C%20Sidama%2C%20Ethiopia'));
  assert.ok(bundle.includes('DEVELOPED BY YZAK SOFTWARE'));
});

test('Contact social links use icon-only buttons with accessible platform names', () => {
  const socialBlock = bundle.slice(bundle.indexOf('children:"CONNECT ON SOCIAL"'), bundle.indexOf('children:"ADMIN PORTAL"'));
  for (const platform of ['YouTube', 'Instagram', 'TikTok', 'Facebook']) {
    assert.ok(socialBlock.includes('"aria-label":"' + platform + '"'));
    assert.ok(socialBlock.includes('"title":"' + platform + '"'));
  }
  for (const visibleLabel of ['children:"YOUTUBE"', 'children:"INSTAGRAM"', 'children:"TIKTOK"', 'children:"FACEBOOK"']) {
    assert.equal(socialBlock.includes(visibleLabel), false, 'social platform text should be icon-only');
  }
  assert.equal((socialBlock.match(/"aria-label":"/g) || []).length, 4);
});

test('home isolation filter matches the landing body view and other route views remain independent', () => {
  assert.doesNotMatch(html, /function patchHeroSection\(/);
  assert.doesNotMatch(html, /patchHeroSection\(\);/);
  assert.match(html, /var currentView = currentPath === '\/' \|\| currentPath === '\/index\.html' \? 'landing' :/);
  assert.match(html, /body\[data-yd-view="landing"\] #root main > #home > \*:not\(:first-child\)/);
  assert.match(html, /currentPath === '\/gallery' \? 'projects'/);
  assert.match(html, /currentPath === '\/estimate' \? 'estimate'/);
});

test('the landing page is not accidentally filtered down to its first section', () => {
  assert.doesNotMatch(html, /\(\(currentPath === '\/' \|\| currentPath === '\/index\.html'\) \? 'home'/);
  assert.match(html, /Only routes with an explicit isolated view receive a data-yd-view filter/);
});
