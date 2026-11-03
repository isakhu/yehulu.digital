'use strict';

const dataStore = require('./data-store');
const {
  hashPassword,
  isValidPasswordHash,
  verifySessionToken
} = require('./auth');

let cachedUsers = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5000;

function buildBootstrapAdmin() {
  const configuredHash = process.env.ADMIN_PASSWORD_HASH || '';
  const passwordHash = isValidPasswordHash(configuredHash)
    ? configuredHash
    : process.env.ADMIN_PASSWORD
      ? hashPassword(process.env.ADMIN_PASSWORD)
      : '';
  if (!isValidPasswordHash(passwordHash)) return null;

  return {
    id: 'admin-1',
    username: (process.env.ADMIN_USERNAME || 'mihreteab').trim().toLowerCase(),
    name: (process.env.ADMIN_NAME || 'Yehulu Admin').trim(),
    email: (process.env.ADMIN_EMAIL || 'admin@yehuludigital.com').trim().toLowerCase(),
    passwordHash,
    role: 'ADMIN',
    tokenVersion: 0,
    createdAt: new Date().toISOString()
  };
}

async function getUsers() {
  if (cachedUsers && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedUsers;
  }

  let stored;
  try {
    stored = await dataStore.readJSON('users.json', []);
  } catch (error) {
    const bootstrapAdmin = buildBootstrapAdmin();
    if (!bootstrapAdmin) throw error;

    // Signing in with the configured owner account must not depend on CMS Blob.
    cachedUsers = [bootstrapAdmin];
    cachedAt = Date.now();
    console.warn('Private user storage is unavailable; using the configured admin account:', error.message);
    return cachedUsers;
  }
  if (Array.isArray(stored) && stored.length > 0) {
    cachedUsers = stored;
    cachedAt = Date.now();
    return cachedUsers;
  }

  const bootstrapAdmin = buildBootstrapAdmin();
  cachedUsers = bootstrapAdmin ? [bootstrapAdmin] : [];
  cachedAt = Date.now();
  // The bootstrap account comes from environment variables; no storage write is needed.
  return cachedUsers;
}

async function saveUsers(users) {
  await dataStore.writeJSON('users.json', users);
  cachedUsers = users;
  cachedAt = Date.now();
  return users;
}

function getHeader(req, name) {
  const headers = req && req.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  const value = headers[name.toLowerCase()] || headers[name] || '';
  return Array.isArray(value) ? value[0] || '' : String(value || '');
}

function getSessionCookie(req) {
  const cookieHeader = getHeader(req, 'cookie');
  const cookie = cookieHeader.split(';').map(part => part.trim())
    .find(part => part.startsWith('yehulu_admin_session='));
  if (!cookie) return '';
  const value = cookie.slice('yehulu_admin_session='.length);
  try { return decodeURIComponent(value); } catch (_) { return value; }
}

async function getAuthenticatedUser(req) {
  const authorization = getHeader(req, 'authorization');
  const bearerToken = authorization.replace(/^Bearer\s+/i, '').trim();
  const cookieToken = getSessionCookie(req);
  const tokens = [...new Set([bearerToken, cookieToken].filter(Boolean))];
  if (tokens.length === 0) return null;

  const users = await getUsers();
  for (const token of tokens) {
    const payload = verifySessionToken(token);
    if (!payload) continue;
    const user = users.find(item =>
      item.id === payload.sub &&
      item.role === 'ADMIN' &&
      (Number(item.tokenVersion) || 0) === (Number(payload.ver) || 0)
    );
    if (user) return user;
  }
  return null;
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username || '',
    name: user.name,
    email: user.email,
    role: user.role || 'ADMIN',
    createdAt: user.createdAt
  };
}

function isValidEmail(email) {
  return typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = {
  getAuthenticatedUser,
  getUsers,
  isValidEmail,
  safeUser,
  saveUsers
};
