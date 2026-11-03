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

test('About is not a separate public navigation item or homepage section', () => {
  assert.equal(router.includes('path:"/about"'), false);
  assert.equal(html.includes('data-target="about"'), false);
  assert.equal(html.includes("'/about':"), false);
  assert.ok(vercel.redirects.some(rule => rule.source === '/about' && rule.destination === '/' && rule.permanent === true));
  assert.ok(server.includes("res.writeHead(301, { Location: '/' });"));
});

test('the top navigation links to independent pages rather than homepage sections', () => {
  assert.ok(bundle.includes('{name:"SERVICES",path:"/services"}'));
  assert.ok(bundle.includes('{name:"PROJECTS",path:"/gallery"}'));
  assert.ok(bundle.includes('{name:"VIDEOS",path:"/video"}'));
  assert.ok(bundle.includes('{name:"COURSES",path:"/courses"}'));
  assert.ok(bundle.includes('{name:"ESTIMATE",path:"/estimate"}'));
  assert.ok(bundle.includes('l.jsxs("a",{href:N.path'));
  assert.ok(bundle.includes('l.jsx("a",{href:N.path'));
});

test('the public navigation has six destinations and Admin stays in Contact', () => {
  assert.ok(html.includes('grid-template-columns: repeat(6, minmax(0, 1fr))'));
  for (const target of ['home', 'services', 'work', 'video', 'courses', 'contact']) {
    assert.ok(html.includes('data-target="' + target + '"'), 'missing navigation item: ' + target);
  }
  assert.equal(html.includes('data-target="admin"'), false);
  assert.equal(html.includes('href="/admin/login"'), false);
  assert.ok(bundle.includes('children:"CONTENT EDITOR"'));
  assert.ok(bundle.includes('children:"OPEN EDITOR"'));
  assert.ok(bundle.includes('to:"/admin"'));
  assert.equal(bundle.includes('to:"/admin/login"'), false);
});

test('each other navigation route retains its own page component', () => {
  assert.ok(router.includes('l.jsx(Ge,{path:"/services",element:l.jsx(ky,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/gallery",element:l.jsx(Ry,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/video",element:l.jsx(Oy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/courses",element:l.jsx(Fy,{})})'));
  assert.ok(router.includes('l.jsx(Ge,{path:"/contact",element:l.jsx(By,{})})'));
});

test('Projects page merges live API records with committed images and prefers repository-owned files', () => {
  const projectsPage = bundle.slice(bundle.indexOf('Ry=()=>'), bundle.indexOf('Oy=()=>'));
  assert.ok(projectsPage.includes('fetch("/api/gallery")'));
  assert.ok(projectsPage.includes('fetch("/projects-fallback.json")'));
  assert.ok(projectsPage.includes('imageUrl:previous.imageUrl||item.imageUrl||""'));
  assert.ok(projectsPage.includes('loading:"lazy"'));
  assert.ok(projectsPage.includes('decoding:"async"'));
  const committed = JSON.parse(fs.readFileSync(path.join(root, 'data', 'gallery.json'), 'utf8'));
  const localProjects = committed.filter(item => String(item.imageUrl || '').startsWith('/uploads/projects/'));
  assert.ok(localProjects.length >= 30, 'expected the checked-in project images to use same-origin URLs');
  for (const item of localProjects) {
    const relative = decodeURIComponent(item.imageUrl.replace(/^\//, ''));
    assert.ok(fs.existsSync(path.join(root, 'public', relative)), 'missing project image: ' + relative);
  }
});

test('Courses page provides a direct Telegram contact for @mihretab01', () => {
  const coursesPage = bundle.slice(bundle.indexOf('Fy=()=>'), bundle.indexOf('Dy=()=>'));
  assert.ok(coursesPage.includes('href:"https://t.me/mihretab01"'));
  assert.ok(coursesPage.includes('children:"@mihretab01"'));
  assert.ok(coursesPage.includes('CONTACT COURSE SUPPORT'));
  assert.ok(coursesPage.includes('aria-label":"Contact course support on Telegram at @mihretab01'));
});

test('Contact shows Hawassa location and Yzak Software developer credit', () => {
  assert.ok(bundle.includes('children:"Hawassa, Sidama, Ethiopia"'));
  assert.ok(bundle.includes('https://www.google.com/maps/search/?api=1&query=Hawassa%2C%20Sidama%2C%20Ethiopia'));
  assert.ok(bundle.includes('DEVELOPED BY YZAK SOFTWARE'));
});

test('Contact social links use icon-only buttons with accessible platform names', () => {
  const socialBlock = bundle.slice(bundle.indexOf('children:"CONNECT ON SOCIAL"'), bundle.indexOf('children:"CONTENT EDITOR"'));
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

test('legacy About URLs redirect to the focused Home page', () => {
  assert.ok(vercel.redirects.some(rule => rule.source === '/about.html' && rule.destination === '/' && rule.permanent === true));
  assert.ok(vercel.redirects.some(rule => rule.source === '/about' && rule.destination === '/' && rule.permanent === true));
  assert.ok(server.includes("res.writeHead(301, { Location: '/' });"));
  assert.match(html, /body\[data-yd-view="landing"\] #root main > #home > \*:not\(:first-child\)/);
});
