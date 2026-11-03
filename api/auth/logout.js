'use strict';

const { handleAccountApi } = require('../../lib/account-api');
const { getAuthenticatedUser } = require('../../lib/accounts');

module.exports = async function logoutHandler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' });
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  try {
    const user = await getAuthenticatedUser(req);
    const result = await handleAccountApi('/api/auth/logout', 'POST', req, user);
    res.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify(result.body));
  } catch (error) {
    console.error('Admin logout handler error:', error);
    if (res.headersSent) return res.destroy(error);
    res.writeHead(Number(error.statusCode) || 500, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({ error: 'Logout could not be completed.' }));
  }
};
