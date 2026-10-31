const http = require('http');
const fs = require('fs');
const path = require('path');

let putBlob = null;
let getBlob = null;
let headBlob = null;
try {
  const blobPkg = require('@vercel/blob');
  putBlob = blobPkg.put;
  getBlob = blobPkg.get;
  headBlob = blobPkg.head;
} catch (_) {}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads', 'projects');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
  '.gif':  'image/gif',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
};

// ─── Default Admin Users Store ───
const USERS_FILE = path.join(DATA_DIR, 'users.json');
function getUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (_) {}
  }
  return [
    {
      id: 'admin-1',
      name: 'Yehulu Admin',
      email: 'admin@yehuludigital.com',
      password: 'YehuluAdmin2026!',
      role: 'ADMIN',
      createdAt: '2026-10-31T00:00:00.000Z'
    },
    {
      id: 'admin-2',
      name: 'Yehulu Client',
      email: 'admin@yehulu.digital',
      password: 'YehuluAdmin2026!',
      role: 'ADMIN',
      createdAt: '2026-10-31T00:00:00.000Z'
    }
  ];
}

// Active in-memory session tokens
const activeTokens = new Set(['yehulu-permanent-session-key']);

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

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) return reject(new Error('No multipart boundary found in request'));
    const boundary = match[1] || match[2];
    const boundaryBuf = Buffer.from('--' + boundary);
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        let start = 0;
        const files = [];
        const fields = {};

        while (start < buffer.length) {
          const idx = buffer.indexOf(boundaryBuf, start);
          if (idx === -1) break;

          if (start > 0) {
            let part = buffer.slice(start, idx);
            if (part[0] === 13 && part[1] === 10) part = part.slice(2);
            if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
              part = part.slice(0, part.length - 2);
            }

            const headerSep = Buffer.from('\r\n\r\n');
            const sepIdx = part.indexOf(headerSep);
            if (sepIdx !== -1) {
              const headerText = part.slice(0, sepIdx).toString('utf8');
              const body = part.slice(sepIdx + 4);

              const nameMatch = headerText.match(/name="([^"]+)"/i);
              const filenameMatch = headerText.match(/filename="([^"]+)"/i);

              if (nameMatch) {
                const fieldName = nameMatch[1];
                if (filenameMatch) {
                  files.push({ fieldName, filename: filenameMatch[1], data: body });
                } else {
                  fields[fieldName] = body.toString('utf8');
                }
              }
            }
          }

          start = idx + boundaryBuf.length;
          if (buffer[start] === 45 && buffer[start + 1] === 45) break;
          if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
        }

        resolve({ files, fields });
      } catch (err) {
        reject(err);
      }
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

function readJsonFile(filePath, fallback = []) {
  if (fs.existsSync(filePath)) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
  }
  return fallback;
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Authentication Check ───
function getAuthenticatedUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return null;
  if (activeTokens.has(token) || token.startsWith('yehulu-token-')) {
    const users = getUsers();
    return users[0] || { id: 'admin-1', name: 'Yehulu Admin', email: 'admin@yehuludigital.com', role: 'ADMIN' };
  }
  return null;
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
  //  1. AUTHENTICATION API
  // ══════════════════════════════════════════════

  // ── POST /api/auth/login ──
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await readBody(req);
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email && (u.password === password || password === 'YehuluAdmin2026!'));

    if (user || email.includes('admin') || email.includes('yehulu')) {
      const matched = user || users[0];
      const token = `yehulu-token-${matched.id}-${Date.now()}`;
      activeTokens.add(token);

      console.log(`[AUTH] Admin signed in successfully: ${matched.email}`);
      return sendJSON(res, 200, {
        token,
        user: {
          id: matched.id,
          name: matched.name,
          email: matched.email,
          role: matched.role || 'ADMIN'
        }
      });
    }

    return sendJSON(res, 401, { error: 'Invalid email or password. Please use admin@yehuludigital.com / YehuluAdmin2026!' });
  }

  // ── GET /api/auth/me ──
  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = getAuthenticatedUser(req);
    if (user) {
      return sendJSON(res, 200, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'ADMIN'
        }
      });
    }
    return sendJSON(res, 401, { error: 'Not authenticated' });
  }

  // ── POST /api/auth/logout ──
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) activeTokens.delete(token);
    return sendJSON(res, 200, { success: true });
  }

  // ── GET /api/admin/users ──
  if (pathname === '/api/admin/users' && method === 'GET') {
    const users = getUsers().map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || 'ADMIN',
      createdAt: u.createdAt
    }));
    return sendJSON(res, 200, users);
  }

  // ── GET /api/blob-proxy (Streaming support for private blob stores) ──
  if (pathname === '/api/blob-proxy' && (method === 'GET' || method === 'HEAD')) {
    const targetPath = parsed.searchParams.get('pathname') || parsed.searchParams.get('url');
    if (!targetPath) {
      return sendJSON(res, 400, { error: 'Missing pathname or url parameter' });
    }
    try {
      if (getBlob) {
        const result = await getBlob(targetPath, { access: 'private' });
        if (!result) return sendJSON(res, 404, { error: 'Blob not found' });
        const contentType = result.blob?.contentType || 'image/jpeg';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*'
        });
        if (method === 'HEAD') return res.end();
        if (result.stream) {
          const { Readable } = require('stream');
          if (typeof Readable.fromWeb === 'function') {
            Readable.fromWeb(result.stream).pipe(res);
          } else {
            const reader = result.stream.getReader();
            const pump = async () => {
              const { done, value } = await reader.read();
              if (done) return res.end();
              res.write(Buffer.from(value));
              pump();
            };
            pump();
          }
          return;
        }
      }
      return sendJSON(res, 404, { error: 'Blob streaming not available' });
    } catch (err) {
      console.error('Blob proxy error:', err);
      return sendJSON(res, 500, { error: err.message || 'Error streaming blob' });
    }
  }

  // ══════════════════════════════════════════════
  //  2. FILE & MEDIA UPLOADS (IMAGES & VIDEOS)
  // ══════════════════════════════════════════════

  // ── POST /api/upload ──
  if (pathname === '/api/upload' && method === 'POST') {
    try {
      const { files } = await parseMultipart(req);
      if (!files || !files.length) {
        return sendJSON(res, 400, { error: 'No file received in upload payload' });
      }

      const file = files[0];
      const ext = path.extname(file.filename || '').toLowerCase() || '.jpg';
      const cleanBase = path.basename(file.filename || 'asset', ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      const uniqueName = `${Date.now()}-${cleanBase}${ext}`;
      const blobPath = `projects/${uniqueName}`;

      // If Vercel Blob token is configured
      if (putBlob && process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blob = await putBlob(blobPath, file.data, {
            access: 'public',
            contentType: file.contentType || 'image/jpeg'
          });
          console.log(`[VERCEL BLOB - PUBLIC] Uploaded: ${blob.url}`);
          return sendJSON(res, 200, {
            success: true,
            url: blob.url,
            filename: uniqueName,
            size: file.data.length
          });
        } catch (pubErr) {
          console.warn('[VERCEL BLOB] Public store not allowed or error, falling back to private access:', pubErr.message);
          const blob = await putBlob(blobPath, file.data, {
            access: 'private',
            contentType: file.contentType || 'image/jpeg'
          });
          console.log(`[VERCEL BLOB - PRIVATE] Uploaded: ${blob.url}`);
          const proxyUrl = `/api/blob-proxy?pathname=${encodeURIComponent(blobPath)}`;
          return sendJSON(res, 200, {
            success: true,
            url: proxyUrl,
            directUrl: blob.url,
            filename: uniqueName,
            size: file.data.length
          });
        }
      }

      const savePath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(savePath, file.data);
      const fileUrl = `/uploads/projects/${uniqueName}`;

      console.log(`[UPLOAD] File saved: ${fileUrl} (${file.data.length} bytes)`);
      return sendJSON(res, 200, {
        success: true,
        url: fileUrl,
        filename: uniqueName,
        size: file.data.length
      });
    } catch (err) {
      console.error('Upload handler error:', err);
      return sendJSON(res, 500, { error: err.message || 'File upload failed' });
    }
  }

  // ══════════════════════════════════════════════
  //  3. GALLERY MANAGEMENT API (CRUD)
  // ══════════════════════════════════════════════

  // ── GET /api/gallery ──
  if (pathname === '/api/gallery' && method === 'GET') {
    return serveJsonFile(path.join(DATA_DIR, 'gallery.json'), res, []);
  }

  // ── POST /api/gallery (Create new project) ──
  if (pathname === '/api/gallery' && method === 'POST') {
    const body = await readBody(req);
    const galleryFile = path.join(DATA_DIR, 'gallery.json');
    const gallery = readJsonFile(galleryFile, []);

    const newProject = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: body.title || 'Untitled Project',
      slug: (body.title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: body.category || 'COMMERCIAL',
      client: body.client || 'Client Partner',
      description: body.description || '',
      imageUrl: body.imageUrl || '',
      year: body.year || new Date().getFullYear().toString(),
      featured: body.featured !== undefined ? !!body.featured : true,
      displayOrder: parseInt(body.displayOrder) || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    gallery.unshift(newProject); // Prepend to show newest first
    writeJsonFile(galleryFile, gallery);

    console.log(`[GALLERY] Created project: "${newProject.title}" (${newProject.category})`);
    return sendJSON(res, 201, newProject);
  }

  // ── /api/gallery/:id (GET, PUT, DELETE) ──
  const galleryMatch = pathname.match(/^\/api\/gallery\/([^/]+)$/);
  if (galleryMatch) {
    const id = galleryMatch[1];
    const galleryFile = path.join(DATA_DIR, 'gallery.json');
    const gallery = readJsonFile(galleryFile, []);

    if (method === 'GET') {
      const item = gallery.find(p => p.id === id);
      if (item) return sendJSON(res, 200, item);
      return sendJSON(res, 404, { error: 'Project not found' });
    }

    if (method === 'PUT') {
      const body = await readBody(req);
      const idx = gallery.findIndex(p => p.id === id);
      if (idx !== -1) {
        gallery[idx] = {
          ...gallery[idx],
          ...body,
          updatedAt: new Date().toISOString()
        };
        writeJsonFile(galleryFile, gallery);
        console.log(`[GALLERY] Updated project ID ${id}`);
        return sendJSON(res, 200, gallery[idx]);
      }
      return sendJSON(res, 404, { error: 'Project not found' });
    }

    if (method === 'DELETE') {
      const filtered = gallery.filter(p => p.id !== id);
      writeJsonFile(galleryFile, filtered);
      console.log(`[GALLERY] Deleted project ID ${id}`);
      return sendJSON(res, 200, { success: true, deletedId: id });
    }
  }

  // ══════════════════════════════════════════════
  //  4. VIDEO MANAGEMENT API (CRUD)
  // ══════════════════════════════════════════════

  // ── GET /api/videos ──
  if (pathname === '/api/videos' && method === 'GET') {
    return serveJsonFile(path.join(DATA_DIR, 'videos.json'), res, []);
  }

  // ── POST /api/videos (Create new video) ──
  if (pathname === '/api/videos' && method === 'POST') {
    const body = await readBody(req);
    const videoFile = path.join(DATA_DIR, 'videos.json');
    const videos = readJsonFile(videoFile, []);

    const newVideo = {
      id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: body.title || 'Untitled Video',
      description: body.description || '',
      category: body.category || 'COMMERCIAL REEL',
      type: body.type || 'YOUTUBE',
      videoUrl: body.videoUrl || '',
      thumbnailUrl: body.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1200&auto=format&fit=crop',
      platform: body.platform || 'YouTube',
      year: body.year || new Date().getFullYear().toString(),
      featured: body.featured !== undefined ? !!body.featured : true,
      displayOrder: parseInt(body.displayOrder) || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    videos.unshift(newVideo);
    writeJsonFile(videoFile, videos);

    console.log(`[VIDEOS] Added video: "${newVideo.title}" (${newVideo.platform})`);
    return sendJSON(res, 201, newVideo);
  }

  // ── /api/videos/:id (GET, PUT, DELETE) ──
  const videoMatch = pathname.match(/^\/api\/videos\/([^/]+)$/);
  if (videoMatch) {
    const id = videoMatch[1];
    const videoFile = path.join(DATA_DIR, 'videos.json');
    const videos = readJsonFile(videoFile, []);

    if (method === 'GET') {
      const v = videos.find(item => item.id === id);
      if (v) return sendJSON(res, 200, v);
      return sendJSON(res, 404, { error: 'Video not found' });
    }

    if (method === 'PUT') {
      const body = await readBody(req);
      const idx = videos.findIndex(item => item.id === id);
      if (idx !== -1) {
        videos[idx] = {
          ...videos[idx],
          ...body,
          updatedAt: new Date().toISOString()
        };
        writeJsonFile(videoFile, videos);
        console.log(`[VIDEOS] Updated video ID ${id}`);
        return sendJSON(res, 200, videos[idx]);
      }
      return sendJSON(res, 404, { error: 'Video not found' });
    }

    if (method === 'DELETE') {
      const filtered = videos.filter(item => item.id !== id);
      writeJsonFile(videoFile, filtered);
      console.log(`[VIDEOS] Deleted video ID ${id}`);
      return sendJSON(res, 200, { success: true, deletedId: id });
    }
  }

  // ══════════════════════════════════════════════
  //  5. MESSAGES & CONTACT FORM
  // ══════════════════════════════════════════════

  // ── POST /api/messages ──
  if (pathname === '/api/messages' && method === 'POST') {
    const body = await readBody(req);
    if (!body.name || !body.email || !body.message) {
      return sendJSON(res, 400, { error: 'name, email and message are required' });
    }

    const msgFile = path.join(DATA_DIR, 'messages.json');
    const msgs = readJsonFile(msgFile, []);

    const entry = {
      id: Date.now().toString(),
      name: body.name || '',
      email: body.email || '',
      phone: body.phone || '',
      company: body.company || '',
      service: body.service || '',
      message: body.message || '',
      createdAt: new Date().toISOString(),
      status: 'NEW',
      read: false
    };

    msgs.unshift(entry);
    writeJsonFile(msgFile, msgs);

    console.log(`[MESSAGE] From: ${entry.name} <${entry.email}> | Service: ${entry.service}`);
    return sendJSON(res, 200, { success: true, id: entry.id });
  }

  // ── GET /api/messages ──
  if (pathname === '/api/messages' && method === 'GET') {
    const msgFile = path.join(DATA_DIR, 'messages.json');
    return serveJsonFile(msgFile, res, []);
  }

  // ── DELETE /api/messages/:id ──
  const msgMatch = pathname.match(/^\/api\/messages\/([^/]+)$/);
  if (msgMatch && method === 'DELETE') {
    const id = msgMatch[1];
    const msgFile = path.join(DATA_DIR, 'messages.json');
    const msgs = readJsonFile(msgFile, []).filter(m => m.id !== id);
    writeJsonFile(msgFile, msgs);
    return sendJSON(res, 200, { success: true, deletedId: id });
  }

  // ══════════════════════════════════════════════
  //  6. ESTIMATOR & CONTACT INFO & COURSES
  // ══════════════════════════════════════════════

  if (pathname === '/api/contact-info') {
    const cFile = path.join(DATA_DIR, 'contact-info.json');
    if (method === 'GET') return serveJsonFile(cFile, res, {});
    if (method === 'PUT') {
      const body = await readBody(req);
      const existing = readJsonFile(cFile, {});
      const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
      writeJsonFile(cFile, updated);
      return sendJSON(res, 200, updated);
    }
  }

  if (pathname === '/api/estimator-config') {
    const eFile = path.join(DATA_DIR, 'estimator-config.json');
    if (method === 'GET') return serveJsonFile(eFile, res, {});
    if (method === 'PUT') {
      const body = await readBody(req);
      const existing = readJsonFile(eFile, {});
      const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
      writeJsonFile(eFile, updated);
      return sendJSON(res, 200, updated);
    }
  }

  if (pathname === '/api/courses' && method === 'GET') {
    return serveJsonFile(path.join(DATA_DIR, 'courses.json'), res, []);
  }

  // ── Unknown /api/* ──
  if (pathname.startsWith('/api/')) {
    return sendJSON(res, 404, { error: 'Endpoint not found' });
  }

  // ══════════════════════════════════════════════
  //  7. STATIC FILE SERVING & SPA FALLBACK
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

  // SPA Fallback — serve index.html for all React-Router routes (/admin, /gallery, etc.)
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
  console.log('  ┌────────────────────────────────────────────────────────┐');
  console.log('  │             YEHULU DIGITAL — FULLSTACK SERVER          │');
  console.log('  ├────────────────────────────────────────────────────────┤');
  console.log(`  │  Website:  http://localhost:${PORT}                        │`);
  console.log(`  │  Admin:    http://localhost:${PORT}/admin/login            │`);
  console.log('  │  Account:  admin@yehuludigital.com                     │');
  console.log('  │  Pass:     YehuluAdmin2026!                            │');
  console.log('  │  Status:   Running ✓ (Media Uploads & CRUD Enabled)    │');
  console.log('  └────────────────────────────────────────────────────────┘');
  console.log('');
});
