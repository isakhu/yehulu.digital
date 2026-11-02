require('./lib/load-env')();

const http = require('http');
const { getAuthenticatedUser } = require('./lib/accounts');
const { handleAccountApi } = require('./lib/account-api');
const { buildCourseRecord } = require('./lib/courses');
const { readRequestBuffer } = require('./lib/request-body');
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

// ─── Helpers ───
function sendJSON(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return readRequestBuffer(req, 1024 * 1024).then(data => {
    try { return JSON.parse(data.toString('utf8')); }
    catch (_) { return {}; }
  });
}

function parseMultipart(req) {
  const maxBytes = 25 * 1024 * 1024 + 256 * 1024;
  return readRequestBuffer(req, maxBytes).then(buffer => {
    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) throw new Error('No multipart boundary found in request');
    const boundary = match[1] || match[2];
    const boundaryBuf = Buffer.from('--' + boundary);
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

    return { files, fields };
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

function isPublicApiRequest(pathname, method) {
  if (pathname === '/api/auth/login' && method === 'POST') return true;
  if (pathname === '/api/auth/me' && (method === 'GET' || method === 'HEAD')) return true;
  if (pathname === '/api/messages' && method === 'POST') return true;
  if (method !== 'GET' && method !== 'HEAD') return false;

  return pathname === '/api/gallery' ||
    /^\/api\/gallery\/[^/]+$/.test(pathname) ||
    pathname === '/api/videos' ||
    /^\/api\/videos\/[^/]+$/.test(pathname) ||
    pathname === '/api/contact-info' ||
    pathname === '/api/estimator-config' ||
    pathname === '/api/courses' ||
    /^\/api\/courses\/[^/]+$/.test(pathname) ||
    pathname === '/api/blob-proxy';
}

// ─── Server ───
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('Request error:', err);
    if (res.headersSent) {
      res.destroy(err);
      return;
    }
    const status = Number(err.statusCode) || 500;
    sendJSON(res, status, {
      error: status === 413 ? err.message : 'Internal Server Error'
    });
  });
});

async function handleRequest(req, res) {
  const parsed   = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;
  const method   = req.method.toUpperCase();

  // The website and API are same-origin; do not enable arbitrary cross-origin access.

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let authenticatedUser = null;
  if (pathname.startsWith('/api/') && !isPublicApiRequest(pathname, method)) {
    authenticatedUser = await getAuthenticatedUser(req);
    if (!authenticatedUser) return sendJSON(res, 401, { error: 'Authentication required. Please sign in as an administrator.' });
  }

  const accountResponse = await handleAccountApi(pathname, method, req, authenticatedUser);
  if (accountResponse) {
    Object.entries(accountResponse.headers || {}).forEach(([name, value]) => res.setHeader(name, value));
    return sendJSON(res, accountResponse.status, accountResponse.body);
  }

  // Shared authentication and account routes are handled above.

  // ── GET /api/blob-proxy (Streaming support for private blob stores) ──
  if (pathname === '/api/blob-proxy' && (method === 'GET' || method === 'HEAD')) {
    const targetPath = parsed.searchParams.get('pathname') || parsed.searchParams.get('url');
    if (!targetPath) {
      return sendJSON(res, 400, { error: 'Missing pathname or url parameter' });
    }
    if (!/^projects\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp|gif|mp4|webm|mov)$/i.test(targetPath)) {
      return sendJSON(res, 400, { error: 'Only project media files can be requested.' });
    }
    try {
      if (getBlob) {
        const result = await getBlob(targetPath, { access: 'private' });
        if (!result) return sendJSON(res, 404, { error: 'Blob not found' });
        const contentType = result.blob?.contentType || 'image/jpeg';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff'
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
      const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov']);
      if (!allowedExtensions.has(ext)) return sendJSON(res, 400, { error: 'Unsupported file type. Upload an image or supported video file.' });
      if (file.data.length > 25 * 1024 * 1024) return sendJSON(res, 413, { error: 'The upload exceeds the 25 MB limit.' });
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

  if (pathname === '/api/messages' && method === 'POST') {
    const body = await readBody(req);
    if (!body.name || !body.email || !body.message) {
      return sendJSON(res, 400, { error: 'name, email and message are required' });
    }

    const msgFile = path.join(DATA_DIR, 'messages.json');
    const msgs = readJsonFile(msgFile, []);
    const entry = {
      id: Date.now().toString(),
      name: String(body.name).trim().slice(0, 120),
      email: String(body.email).trim().slice(0, 254),
      phone: String(body.phone || '').trim().slice(0, 40),
      company: String(body.company || '').trim().slice(0, 120),
      service: String(body.service || '').trim().slice(0, 100),
      message: String(body.message).trim().slice(0, 5000),
      createdAt: new Date().toISOString(),
      status: 'NEW',
      read: false
    };

    msgs.unshift(entry);
    writeJsonFile(msgFile, msgs);
    console.log(`[MESSAGE] New inquiry received from ${entry.email}`);
    return sendJSON(res, 201, { success: true, id: entry.id });
  }

  if (pathname === '/api/messages' && (method === 'GET' || method === 'HEAD')) {
    return serveJsonFile(path.join(DATA_DIR, 'messages.json'), res, []);
  }

  const msgMatch = pathname.match(/^\/api\/messages\/([^/]+)$/);
  if (msgMatch) {
    const id = msgMatch[1];
    const msgFile = path.join(DATA_DIR, 'messages.json');
    const msgs = readJsonFile(msgFile, []);
    const index = msgs.findIndex(message => message.id === id);
    if (index === -1) return sendJSON(res, 404, { error: 'Message not found' });

    if (method === 'PATCH') {
      const body = await readBody(req);
      const updated = { ...msgs[index] };
      if (typeof body.status === 'string') updated.status = body.status.trim().toUpperCase().slice(0, 40);
      if (typeof body.read === 'boolean') updated.read = body.read;
      updated.updatedAt = new Date().toISOString();
      msgs[index] = updated;
      writeJsonFile(msgFile, msgs);
      return sendJSON(res, 200, updated);
    }

    if (method === 'DELETE') {
      msgs.splice(index, 1);
      writeJsonFile(msgFile, msgs);
      return sendJSON(res, 200, { success: true, deletedId: id });
    }
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

  if (pathname === '/api/admin/courses' && (method === 'GET' || method === 'HEAD')) {
    return sendJSON(res, 200, readJsonFile(path.join(DATA_DIR, 'courses.json'), []));
  }

  if (pathname === '/api/admin/courses' && method === 'POST') {
    const body = await readBody(req);
    const result = buildCourseRecord(body);
    if (result.error) return sendJSON(res, 400, { error: result.error });
    const coursesFile = path.join(DATA_DIR, 'courses.json');
    const courses = readJsonFile(coursesFile, []);
    courses.unshift(result.course);
    writeJsonFile(coursesFile, courses);
    return sendJSON(res, 201, result.course);
  }

  const adminCourseMatch = pathname.match(/^\/api\/admin\/courses\/([^/]+)$/);
  if (adminCourseMatch) {
    const coursesFile = path.join(DATA_DIR, 'courses.json');
    const courses = readJsonFile(coursesFile, []);
    const index = courses.findIndex(course => course.id === adminCourseMatch[1]);
    if (index === -1) return sendJSON(res, 404, { error: 'Course not found' });

    if (method === 'PUT') {
      const body = await readBody(req);
      const result = buildCourseRecord(body, courses[index]);
      if (result.error) return sendJSON(res, 400, { error: result.error });
      courses[index] = result.course;
      writeJsonFile(coursesFile, courses);
      return sendJSON(res, 200, result.course);
    }

    if (method === 'DELETE') {
      courses.splice(index, 1);
      writeJsonFile(coursesFile, courses);
      return sendJSON(res, 200, { success: true, deletedId: adminCourseMatch[1] });
    }
  }

  if (pathname === '/api/courses' && (method === 'GET' || method === 'HEAD')) {
    const courses = readJsonFile(path.join(DATA_DIR, 'courses.json'), []);
    return sendJSON(res, 200, courses.filter(course => course.status === 'PUBLISHED'));
  }

  const publicCourseMatch = pathname.match(/^\/api\/courses\/([^/]+)$/);
  if (publicCourseMatch && (method === 'GET' || method === 'HEAD')) {
    const courses = readJsonFile(path.join(DATA_DIR, 'courses.json'), []);
    const course = courses.find(item => item.id === publicCourseMatch[1]);
    if (!course || (course.status !== 'PUBLISHED' && !await getAuthenticatedUser(req))) {
      return sendJSON(res, 404, { error: 'Course not found' });
    }
    return sendJSON(res, 200, course);
  }

  // ── Unknown /api/* ──
  if (pathname.startsWith('/api/')) {
    return sendJSON(res, 404, { error: 'Endpoint not found' });
  }

  // ══════════════════════════════════════════════
  //  7. STATIC FILE SERVING & SPA FALLBACK
  // ══════════════════════════════════════════════
  // Services is a standalone page so its cards do not depend on homepage DOM filtering.
  if (pathname === '/services' || pathname === '/services.html') {
    const servicesPage = path.join(PUBLIC_DIR, 'services.html');
    if (fs.existsSync(servicesPage)) return serveStaticFile(servicesPage, res);
  }

  // Keep legacy About URLs on the focused homepage; no separate About section is shown.
  if (pathname === '/about' || pathname === '/about.html') {
    res.writeHead(301, { Location: '/' });
    res.end();
    return;
  }

  let decodedPath = pathname;
  try { decodedPath = decodeURIComponent(pathname); } catch (_) {}
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\//, '');
  const filePath = path.resolve(PUBLIC_DIR, relativePath);
  const pathFromPublic = path.relative(PUBLIC_DIR, filePath);
  if (
    decodedPath.includes('\0') ||
    pathFromPublic === '..' ||
    pathFromPublic.startsWith(`..${path.sep}`) ||
    path.isAbsolute(pathFromPublic)
  ) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  // Exact file match
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveStaticFile(filePath, res);
  }

  // Try with .html extension (e.g. /about → about.html)
  const htmlFilePath = path.resolve(PUBLIC_DIR, `${relativePath}.html`);
  const htmlPathFromPublic = path.relative(PUBLIC_DIR, htmlFilePath);
  if (
    htmlPathFromPublic !== '..' &&
    !htmlPathFromPublic.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(htmlPathFromPublic) &&
    fs.existsSync(htmlFilePath) &&
    fs.statSync(htmlFilePath).isFile()
  ) {
    return serveStaticFile(htmlFilePath, res);
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
  console.log('  │  Admin access: configure .env before signing in       │');
  console.log('  │  Status:   Running ✓ (Protected Admin API)            │');
  console.log('  └────────────────────────────────────────────────────────┘');
  console.log('');
});
