const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js':   'application/javascript; charset=UTF-8',
  '.css':  'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
};

// ─── In-memory messages store (persists until server restart) ───
let messages = [];

// ─── Helpers ───
function sendJSON(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => { res.writeHead(500); res.end('Internal error'); });
  res.writeHead(200, { 'Content-Type': contentType });
  stream.pipe(res);
}

function serveJsonFile(filePath, res, fallback = []) {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(data);
  } else {
    sendJSON(res, 200, fallback);
  }
}

// ─── Server ───
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('Request error:', err);
    try { res.writeHead(500); res.end('Internal Server Error'); } catch(_) {}
  });
});

async function handleRequest(req, res) {
  const parsed   = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;
  const method   = req.method.toUpperCase();

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ══════════════════════════════════════════════
  //  API ROUTES
  // ══════════════════════════════════════════════

  // ── GET /api/courses ──
  if (pathname === '/api/courses' && method === 'GET') {
    return serveJsonFile(path.join(DATA_DIR, 'courses.json'), res, []);
  }

  // ── GET /api/gallery ──
  if (pathname === '/api/gallery' && method === 'GET') {
    return serveJsonFile(path.join(DATA_DIR, 'gallery.json'), res, []);
  }

  // ── GET /api/videos ──
  if (pathname === '/api/videos' && method === 'GET') {
    return serveJsonFile(path.join(DATA_DIR, 'videos.json'), res, []);
  }

  // ── GET /api/contact-info ──
  if (pathname === '/api/contact-info' && method === 'GET') {
    return serveJsonFile(path.join(DATA_DIR, 'contact-info.json'), res, {});
  }

  // ── GET /api/estimator-config ──
  if (pathname === '/api/estimator-config' && method === 'GET') {
    return serveJsonFile(path.join(DATA_DIR, 'estimator-config.json'), res, {});
  }

  // ── GET /api/auth/me ── (not authenticated locally)
  if (pathname === '/api/auth/me' && method === 'GET') {
    return sendJSON(res, 401, { error: 'Not authenticated' });
  }

  // ── POST /api/messages ── (Contact form submissions)
  if (pathname === '/api/messages' && method === 'POST') {
    const body = await readBody(req);

    if (!body.name || !body.email || !body.message) {
      return sendJSON(res, 400, { error: 'name, email and message are required' });
    }

    const entry = {
      id:        Date.now().toString(),
      name:      body.name    || '',
      email:     body.email   || '',
      phone:     body.phone   || '',
      company:   body.company || '',
      service:   body.service || '',
      message:   body.message || '',
      createdAt: new Date().toISOString(),
      read:      false,
    };

    messages.push(entry);

    // Persist to disk
    const msgFile = path.join(DATA_DIR, 'messages.json');
    try {
      const existing = fs.existsSync(msgFile)
        ? JSON.parse(fs.readFileSync(msgFile, 'utf8'))
        : [];
      existing.push(entry);
      fs.writeFileSync(msgFile, JSON.stringify(existing, null, 2), 'utf8');
    } catch (e) {
      console.error('Could not persist message to disk:', e.message);
    }

    console.log(`[MESSAGE] From: ${entry.name} <${entry.email}> | Service: ${entry.service}`);
    return sendJSON(res, 200, { success: true, id: entry.id });
  }

  // ── GET /api/messages __ (admin view)
  if (pathname === '/api/messages' && method === 'GET') {
    const msgFile = path.join(DATA_DIR, 'messages.json');
    return serveJsonFile(msgFile, res, []);
  }

  // ── Any unknown /api/* ──
  if (pathname.startsWith('/api/')) {
    return sendJSON(res, 404, { error: 'Not found' });
  }

  // ══════════════════════════════════════════════
  //  STATIC FILE SERVING
  // ══════════════════════════════════════════════
  let decodedPath = pathname;
  try { decodedPath = decodeURIComponent(pathname); } catch (_) {}
  let relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\//, '');
  let filePath     = path.join(PUBLIC_DIR, relativePath);

  // Exact file match
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveStaticFile(filePath, res);
  }

  // Try with .html extension (e.g. /about → about.html)
  if (fs.existsSync(filePath + '.html') && fs.statSync(filePath + '.html').isFile()) {
    return serveStaticFile(filePath + '.html', res);
  }

  // SPA Fallback — serve index.html for all React-Router routes
  const indexFile = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexFile)) {
    return serveStaticFile(indexFile, res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
}

const syncGallery = require('./sync-gallery');

server.listen(PORT, () => {
  try {
    syncGallery();
  } catch (e) {
    console.error('Gallery sync notice:', e.message);
  }
  console.log('');
  console.log('  ┌───────────────────────────────────────────┐');
  console.log('  │        YEHULU DIGITAL — LOCAL SERVER       │');
  console.log('  ├───────────────────────────────────────────┤');
  console.log(`  │  Local:  http://localhost:${PORT}             │`);
  console.log('  │  Status: Running ✓                        │');
  console.log('  └───────────────────────────────────────────┘');
  console.log('');
});
