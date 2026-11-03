'use strict';

const { handleAccountApi } = require('../../lib/account-api');

module.exports = async function loginHandler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' });
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  try {
    const result = await handleAccountApi('/api/auth/login', 'POST', req, null);
    if (!result) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Login endpoint not found.' }));
      return;
    }
    for (const [name, value] of Object.entries(result.headers || {})) {
      res.setHeader(name, value);
    }
    res.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify(result.body));
  } catch (error) {
    console.error('Admin login handler error:', error);
    if (res.headersSent) return res.destroy(error);
    res.writeHead(Number(error.statusCode) || 500, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify({
      error: Number(error.statusCode) === 413 ? error.message : 'Login service could not complete the request.'
    }));
  }
};
