'use strict';

const dataStore = require('./data-store');
const {
  isValidPasswordHash,
  verifySessionToken
} = require('./auth');

let cachedUsers = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5000;

function buildBootstrapAdmin() {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || '';
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

async function getAuthenticatedUser(req) {
  const authorization = (req.headers && req.headers.authorization) || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const users = await getUsers();
  return users.find(user =>
    user.id === payload.sub &&
    user.role === 'ADMIN' &&
    (Number(user.tokenVersion) || 0) === (Number(payload.ver) || 0)
  ) || null;
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
