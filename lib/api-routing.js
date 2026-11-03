'use strict';

function normalizeApiPath(pathname) {
  if (typeof pathname !== 'string') return '/';
  let normalized = pathname.trim();
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  if (normalized.startsWith('/api/')) {
    normalized = normalized.replace(/\\.js$/i, '');
    if (normalized.length > 5) normalized = normalized.replace(/\\/+$/, '');
  }
  return normalized || '/';
}

function resolveApiPath(requestUrl, host = 'localhost') {
  const parsed = new URL(requestUrl || '/', `http://${host || 'localhost'}`);
  const rewrittenPath = parsed.searchParams.get('__route');
  const rawPath = rewrittenPath && rewrittenPath.startsWith('/api/')
    ? rewrittenPath
    : parsed.pathname;
  return normalizeApiPath(rawPath);
}

function isPublicApiRequest(inputPath, method) {
  const pathname = normalizeApiPath(inputPath);
  const verb = String(method || 'GET').toUpperCase();

  if (pathname === '/api/auth/login' && verb === 'POST') return true;
  if (pathname === '/api/auth/me' && (verb === 'GET' || verb === 'HEAD')) return true;
  if (pathname === '/api/messages' && verb === 'POST') return true;
  if (verb !== 'GET' && verb !== 'HEAD') return false;

  return pathname === '/api/gallery' ||
    /^\\/api\\/gallery\\/[^/]+$/.test(pathname) ||
    pathname === '/api/videos' ||
    /^\\/api\\/videos\\/[^/]+$/.test(pathname) ||
    pathname === '/api/contact-info' ||
    pathname === '/api/estimator-config' ||
    pathname === '/api/courses' ||
    /^\\/api\\/courses\\/[^/]+$/.test(pathname) ||
    pathname === '/api/blob-proxy';
}

module.exports = {
  isPublicApiRequest,
  normalizeApiPath,
  resolveApiPath
};
