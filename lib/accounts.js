'use strict';

const { readJSON, writeJSON } = require('./data-store');
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

  const stored = await readJSON('users.json', []);
  if (Array.isArray(stored) && stored.length > 0) {
    cachedUsers = stored;
    cachedAt = Date.now();
    return cachedUsers;
  }

  const bootstrapAdmin = buildBootstrapAdmin();
  if (!bootstrapAdmin) {
    cachedUsers = [];
    cachedAt = Date.now();
    return cachedUsers;
  }

  const users = [bootstrapAdmin];
  await writeJSON('users.json', users);
  cachedUsers = users;
  cachedAt = Date.now();
  return cachedUsers;
}

async function saveUsers(users) {
  await writeJSON('users.json', users);
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
