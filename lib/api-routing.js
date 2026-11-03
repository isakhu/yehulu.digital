'use strict';

function normalizeApiPath(pathname) {
  if (typeof pathname !== 'string') return '/';
  let normalized = pathname.trim();
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  if (normalized.startsWith('/api/')) {
    while (normalized.length > 5 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
  }
  return normalized || '/';
}

function resolveApiPath(requestUrl, host = 'localhost', requestQuery = null) {
  const parsed = new URL(requestUrl || '/', 'http://' + (host || 'localhost'));
  const urlRoutes = parsed.searchParams.getAll('__route');
  const queryRoute = requestQuery && requestQuery.__route;
  const queryRouteValue = Array.isArray(queryRoute)
    ? (queryRoute.length === 1 ? queryRoute[0] : null)
    : queryRoute;
  const rewrittenPath = urlRoutes.length === 1 ? urlRoutes[0] : queryRouteValue;
  const rawPath = typeof rewrittenPath === 'string' && rewrittenPath.startsWith('/api/')
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
  if (pathname === '/api/auth/passkey/status' && (verb === 'GET' || verb === 'HEAD')) return true;
  if ([
    '/api/auth/passkey/register/options',
    '/api/auth/passkey/register/verify',
    '/api/auth/passkey/authenticate/options',
    '/api/auth/passkey/authenticate/verify'
  ].includes(pathname) && verb === 'POST') return true;
  // Public content editor requested by the owner.
  if ((verb === 'GET' || verb === 'HEAD') &&
      (pathname === '/api/industries' || pathname.startsWith('/api/industries/'))) return true;
  if (pathname === '/api/upload' && verb === 'POST') return true;
  if (pathname === '/api/gallery' && verb === 'POST') return true;
  if (hasSinglePathSegment(pathname, '/api/gallery/') && ['PUT', 'DELETE'].includes(verb)) return true;
  if (pathname === '/api/videos' && verb === 'POST') return true;
  if (hasSinglePathSegment(pathname, '/api/videos/') && ['PUT', 'DELETE'].includes(verb)) return true;
  if (pathname === '/api/admin/courses' && ['GET', 'HEAD', 'POST'].includes(verb)) return true;
  if (hasSinglePathSegment(pathname, '/api/admin/courses/') && ['PUT', 'DELETE'].includes(verb)) return true;
  if (pathname === '/api/contact-info' && verb === 'PUT') return true;
  if (pathname === '/api/estimator-config' && verb === 'PUT') return true;

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
