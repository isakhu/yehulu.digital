'use strict';

const crypto = require('node:crypto');
const {
  createSessionToken,
  hashPassword,
  isSessionSecretConfigured,
  verifyPassword
} = require('./auth');
const {
  getAuthenticatedUser,
  getUsers,
  isValidEmail,
  safeUser,
  saveUsers
} = require('./accounts');

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }

  return new Promise(resolve => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (_) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function response(status, body) {
  return { status, body };
}

function normaliseProfileInput(body, user) {
  const name = String(body.name === undefined ? user.name : body.name).trim();
  const email = String(body.email === undefined ? user.email : body.email).trim().toLowerCase();

  if (!name || name.length > 100) return { error: 'Name must contain 1–100 characters.' };
  if (!isValidEmail(email)) return { error: 'Enter a valid email address.' };

  return { name, email };
}

async function handleAccountApi(pathname, method, req, authenticatedUser) {
  if (pathname === '/api/auth/login' && method === 'POST') {
    if (!isSessionSecretConfigured()) {
      return response(503, { error: 'Admin login is not configured. Set ADMIN_PASSWORD_HASH and SESSION_SECRET.' });
    }

    const body = await readRequestBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const users = await getUsers();
    const user = users.find(item =>
      item.email.toLowerCase() === email && verifyPassword(password, item.passwordHash)
    );

    if (!user) return response(401, { error: 'Invalid email or password.' });

    return response(200, {
      token: createSessionToken(user),
      user: safeUser(user)
    });
  }

  if (pathname === '/api/auth/me' && (method === 'GET' || method === 'HEAD')) {
    const user = authenticatedUser || await getAuthenticatedUser(req);
    return user
      ? response(200, { user: safeUser(user) })
      : response(401, { error: 'Not authenticated.' });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    return response(200, { success: true });
  }

  if (pathname === '/api/admin/users' && (method === 'GET' || method === 'HEAD')) {
    const users = await getUsers();
    return response(200, users.map(safeUser));
  }

  if (pathname === '/api/admin/users' && method === 'POST') {
    const body = await readRequestBody(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!name || name.length > 100) return response(400, { error: 'Name must contain 1–100 characters.' });
    if (!isValidEmail(email)) return response(400, { error: 'Enter a valid email address.' });
    if (password.length < 12) return response(400, { error: 'New passwords must contain at least 12 characters.' });

    const users = await getUsers();
    if (users.some(user => user.email.toLowerCase() === email)) {
      return response(409, { error: 'An account with this email already exists.' });
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: hashPassword(password),
      role: 'ADMIN',
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await saveUsers(users);
    return response(201, { user: safeUser(user) });
  }

  if (pathname === '/api/admin/profile' && method === 'PUT') {
    if (!authenticatedUser) return response(401, { error: 'Authentication required.' });

    const body = await readRequestBody(req);
    const profile = normaliseProfileInput(body, authenticatedUser);
    if (profile.error) return response(400, { error: profile.error });

    const users = await getUsers();
    const index = users.findIndex(user => user.id === authenticatedUser.id);
    if (index === -1) return response(404, { error: 'Account not found.' });

    if (users.some(user => user.id !== authenticatedUser.id && user.email.toLowerCase() === profile.email)) {
      return response(409, { error: 'An account with this email already exists.' });
    }

    const newPassword = body.newPassword === undefined ? '' : String(body.newPassword);
    let passwordHash = authenticatedUser.passwordHash;
    if (newPassword) {
      const currentPassword = String(body.currentPassword || '');
      if (!verifyPassword(currentPassword, authenticatedUser.passwordHash)) {
        return response(400, { error: 'Your current password is incorrect.' });
      }
      if (newPassword.length < 12) {
        return response(400, { error: 'New passwords must contain at least 12 characters.' });
      }
      passwordHash = hashPassword(newPassword);
    }

    users[index] = { ...users[index], ...profile, passwordHash };
    await saveUsers(users);
    return response(200, { success: true, user: safeUser(users[index]) });
  }

  const userMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch) {
    if (method === 'PUT') {
      const body = await readRequestBody(req);
      const users = await getUsers();
      const index = users.findIndex(user => user.id === userMatch[1]);
      if (index === -1) return response(404, { error: 'Account not found.' });

      const profile = normaliseProfileInput(body, users[index]);
      if (profile.error) return response(400, { error: profile.error });
      if (users.some(user => user.id !== userMatch[1] && user.email.toLowerCase() === profile.email)) {
        return response(409, { error: 'An account with this email already exists.' });
      }

      const newPassword = body.newPassword === undefined ? '' : String(body.newPassword);
      if (newPassword && newPassword.length < 12) {
        return response(400, { error: 'New passwords must contain at least 12 characters.' });
      }

      users[index] = {
        ...users[index],
        ...profile,
        ...(newPassword ? { passwordHash: hashPassword(newPassword) } : {})
      };
      await saveUsers(users);
      return response(200, { user: safeUser(users[index]) });
    }

    if (method === 'DELETE') {
      if (!authenticatedUser) return response(401, { error: 'Authentication required.' });
      if (userMatch[1] === authenticatedUser.id) {
        return response(400, { error: 'You cannot delete the account you are currently using.' });
      }

      const users = await getUsers();
      const filtered = users.filter(user => user.id !== userMatch[1]);
      if (filtered.length === users.length) return response(404, { error: 'Account not found.' });
      if (filtered.length === 0) return response(400, { error: 'At least one administrator account must remain.' });

      await saveUsers(filtered);
      return response(200, { success: true, deletedId: userMatch[1] });
    }
  }

  return null;
}

module.exports = { handleAccountApi };
