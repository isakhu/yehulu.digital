'use strict';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_CLIENTS = 10000;
const attemptsByClient = new Map();

function clientKey(req) {
  const forwardedFor = process.env.VERCEL === '1' && req.headers
    ? req.headers['x-forwarded-for']
    : '';
  const forwardedAddress = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : '';
  return forwardedAddress || req.socket?.remoteAddress || 'unknown';
}

function consumeLoginAttempt(req, now = Date.now()) {
  const key = clientKey(req);
  let entry = attemptsByClient.get(key);

  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    entry = { startedAt: now, count: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return Math.max(1, Math.ceil((entry.startedAt + WINDOW_MS - now) / 1000));
  }

  entry.count += 1;
  attemptsByClient.delete(key);
  attemptsByClient.set(key, entry);

  if (attemptsByClient.size > MAX_CLIENTS) {
    const oldestKey = attemptsByClient.keys().next().value;
    attemptsByClient.delete(oldestKey);
  }

  return null;
}

function clearLoginAttempts(req) {
  attemptsByClient.delete(clientKey(req));
}

module.exports = { clearLoginAttempts, consumeLoginAttempt };
