'use strict';

const CACHE_NAME = 'yehulu-digital-shell-v13';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/services.html',
  '/assets/index-BSXl1opM.js',
  '/assets/index-Bs1w5tPm.css',
  '/assets/logopng-BhI97nKv.png',
  '/projects-fallback.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedRequestedPage = await caches.match(request);
          if (cachedRequestedPage) return cachedRequestedPage;
          if (url.pathname === '/services') {
            const cachedServicesPage = await caches.match('/services.html');
            if (cachedServicesPage) return cachedServicesPage;
          }
          const cachedPage = await caches.match('/index.html');
          return cachedPage || caches.match('/offline.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
