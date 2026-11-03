'use strict';

const { handleAccountApi } = require('../../lib/account-api');
const { getAuthenticatedUser } = require('../../lib/accounts');

module.exports = async function currentAdminHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET, HEAD' });
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  try {
    const user = await getAuthenticatedUser(req);
    const result = await handleAccountApi('/api/auth/me', req.method, req, user);
    res.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(JSON.stringify(result.body));
  } catch (error) {
    console.error('Admin session handler error:', error);
    if (res.headersSent) return res.destroy(error);
    res.writeHead(Number(error.statusCode) || 500, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({ error: 'Session check could not be completed.' }));
  }
};
