'use strict';

function normalizeApiPath(pathname) {
  if (typeof pathname !== 'string') return '/';
  let normalized = pathname.trim();
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  if (normalized.startsWith('/api/')) {
    if (normalized.toLowerCase().endsWith('.js')) {
      normalized = normalized.slice(0, -3);
    }
    while (normalized.length > 5 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
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

function hasSinglePathSegment(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return false;
  const remainder = pathname.slice(prefix.length);
  return remainder.length > 0 && !remainder.includes('/');
}

function isPublicApiRequest(inputPath, method) {
  const pathname = normalizeApiPath(inputPath);
  const verb = String(method || 'GET').toUpperCase();

  if (pathname === '/api/auth/login' && verb === 'POST') return true;
  if (pathname === '/api/auth/me' && (verb === 'GET' || verb === 'HEAD')) return true;
  if (pathname === '/api/messages' && verb === 'POST') return true;
  if (verb !== 'GET' && verb !== 'HEAD') return false;

  return pathname === '/api/gallery' ||
    hasSinglePathSegment(pathname, '/api/gallery/') ||
    pathname === '/api/videos' ||
    hasSinglePathSegment(pathname, '/api/videos/') ||
    pathname === '/api/contact-info' ||
    pathname === '/api/estimator-config' ||
    pathname === '/api/courses' ||
    hasSinglePathSegment(pathname, '/api/courses/') ||
    pathname === '/api/blob-proxy';
}

module.exports = {
  isPublicApiRequest,
  normalizeApiPath,
  resolveApiPath
};
