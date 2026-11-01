const fs = require('fs');
const path = require('path');
const { getAuthenticatedUser } = require('../lib/accounts');
const { handleAccountApi } = require('../lib/account-api');
const { readJSON: readStoredJSON, writeJSON: writeStoredJSON } = require('../lib/data-store');
const { buildCourseRecord } = require('../lib/courses');

let putBlob = null;
let getBlob = null;
let headBlob = null;
try {
  const blobPkg = require('@vercel/blob');
  putBlob = blobPkg.put;
  getBlob = blobPkg.get;
  headBlob = blobPkg.head;
} catch (_) {}

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads', 'projects');

// In-memory cache for Vercel serverless environment
let cachedGallery = null;
let cachedVideos = null;
let cachedCourses = null;

function sendJSON(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch (_) { return resolve({}); }
    }
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (_) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) return reject(new Error('No multipart boundary found'));
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
              const mimeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i);

              if (nameMatch) {
                const fieldName = nameMatch[1];
                if (filenameMatch) {
                  files.push({
                    fieldName,
                    filename: filenameMatch[1],
                    contentType: mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream',
                    data: body
                  });
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

async function getGalleryData() {
  if (cachedGallery && cachedGallery.length) return cachedGallery;

  // Try fetching updated gallery.json from Vercel Blob store if token is present
  if (process.env.BLOB_READ_WRITE_TOKEN && headBlob) {
    try {
      const meta = await headBlob('data/gallery.json');
      if (meta && (meta.url || meta.downloadUrl)) {
        const fetchRes = await fetch(meta.downloadUrl || meta.url, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
        });
        if (fetchRes.ok) {
          const remoteData = await fetchRes.json();
          if (Array.isArray(remoteData) && remoteData.length) {
            cachedGallery = remoteData;
            return cachedGallery;
          }
        }
      }
    } catch (_) {}
  }

  // Fallback to local data/gallery.json bundled in repo
  const file = path.join(DATA_DIR, 'gallery.json');
  if (fs.existsSync(file)) {
    try { cachedGallery = JSON.parse(fs.readFileSync(file, 'utf8')); return cachedGallery; } catch (_) {}
  }
  return [];
}

async function getVideosData() {
  if (cachedVideos && cachedVideos.length) return cachedVideos;

  // Try fetching updated videos.json from Vercel Blob store
  if (process.env.BLOB_READ_WRITE_TOKEN && headBlob) {
    try {
      const meta = await headBlob('data/videos.json');
      if (meta && (meta.url || meta.downloadUrl)) {
        const fetchRes = await fetch(meta.downloadUrl || meta.url, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
        });
        if (fetchRes.ok) {
          const remoteData = await fetchRes.json();
          if (Array.isArray(remoteData) && remoteData.length) {
            cachedVideos = remoteData;
            return cachedVideos;
          }
        }
      }
    } catch (_) {}
  }

  const file = path.join(DATA_DIR, 'videos.json');
  if (fs.existsSync(file)) {
    try { cachedVideos = JSON.parse(fs.readFileSync(file, 'utf8')); return cachedVideos; } catch (_) {}
  }
  return [];
}

async function persistGallery(gallery) {
  cachedGallery = gallery;
  // If local disk is writable:
  try {
    const file = path.join(DATA_DIR, 'gallery.json');
    fs.writeFileSync(file, JSON.stringify(gallery, null, 2), 'utf8');
  } catch (_) {}

  // If Vercel Blob is configured (try public first, fallback to private):
  if (putBlob && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await putBlob('data/gallery.json', JSON.stringify(gallery), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json'
      });
    } catch (e) {
      try {
        await putBlob('data/gallery.json', JSON.stringify(gallery), {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json'
        });
      } catch (err2) {
        console.warn('Vercel Blob gallery sync notice:', err2.message);
      }
    }
  }
}

async function persistVideos(videos) {
  cachedVideos = videos;
  try {
    const file = path.join(DATA_DIR, 'videos.json');
    fs.writeFileSync(file, JSON.stringify(videos, null, 2), 'utf8');
  } catch (_) {}

  if (putBlob && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await putBlob('data/videos.json', JSON.stringify(videos), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json'
      });
    } catch (e) {
      try {
        await putBlob('data/videos.json', JSON.stringify(videos), {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json'
        });
      } catch (err2) {
        console.warn('Vercel Blob video sync notice:', err2.message);
      }
    }
  }
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

async function getCoursesData() {
  if (cachedCourses !== null) return cachedCourses;
  const data = await readStoredJSON('courses.json', []);
  cachedCourses = Array.isArray(data) ? data : [];
  return cachedCourses;
}

async function persistCourses(courses) {
  cachedCourses = courses;
  await writeStoredJSON('courses.json', courses);
}

module.exports = async (req, res) => {
  const method = (req.method || 'GET').toUpperCase();
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;

  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let authenticatedUser = null;
  if (pathname.startsWith('/api/') && !isPublicApiRequest(pathname, method)) {
    authenticatedUser = await getAuthenticatedUser(req);
    if (!authenticatedUser) {
      return sendJSON(res, 401, { error: 'Authentication required. Please sign in as an administrator.' });
    }
  }

  const accountResponse = await handleAccountApi(pathname, method, req, authenticatedUser);
  if (accountResponse) return sendJSON(res, accountResponse.status, accountResponse.body);

  // ── Private media proxy (restricted to the projects/ asset namespace) ──
  // ── 2. SECURE BLOB PROXY (Supports Private Stores without 403 Forbidden) ──
  if (pathname === '/api/blob-proxy' && (method === 'GET' || method === 'HEAD')) {
    const targetPath = parsed.searchParams.get('pathname') || parsed.searchParams.get('url');
    if (!targetPath) {
      return sendJSON(res, 400, { error: 'Missing pathname or url query parameter' });
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

  // ── 3. FILE UPLOADS (Supports Public Store, Private Store Fallback, & Local Disk) ──
  if (pathname === '/api/upload' && method === 'POST') {
    try {
      const { files } = await parseMultipart(req);
      if (!files || !files.length) {
        return sendJSON(res, 400, { error: 'No file received in upload' });
      }

      const file = files[0];
      const ext = path.extname(file.filename || '').toLowerCase() || '.jpg';
      const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov']);
      if (!allowedExtensions.has(ext)) return sendJSON(res, 400, { error: 'Unsupported file type. Upload an image or supported video file.' });
      const uploadLimitBytes = process.env.VERCEL === '1' ? 4 * 1024 * 1024 : 25 * 1024 * 1024;
      if (file.data.length > uploadLimitBytes) {
        return sendJSON(res, 413, {
          error: process.env.VERCEL === '1'
            ? 'Hosted uploads are limited to 4 MB. Use an optimized image or a video link.'
            : 'The upload exceeds the 25 MB limit.'
        });
      }
      const cleanBase = path.basename(file.filename || 'asset', ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      const filename = `${Date.now()}-${cleanBase}${ext}`;
      const blobPath = `projects/${filename}`;

      // A) Vercel Blob Storage is configured
      if (putBlob && process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          // Try standard Public store upload
          const blob = await putBlob(blobPath, file.data, {
            access: 'public',
            contentType: file.contentType || 'image/jpeg'
          });
          console.log(`[VERCEL BLOB - PUBLIC] Uploaded: ${blob.url}`);
          return sendJSON(res, 200, {
            success: true,
            url: blob.url,
            filename
          });
        } catch (pubErr) {
          console.warn('[VERCEL BLOB] Public upload failed or store is private, attempting private store upload:', pubErr.message);
          // Fallback to Private store upload
          const blob = await putBlob(blobPath, file.data, {
            access: 'private',
            contentType: file.contentType || 'image/jpeg'
          });
          console.log(`[VERCEL BLOB - PRIVATE] Uploaded: ${blob.url}`);
          // Return proxy URL so frontend <img> tags can render it immediately without 403 Forbidden!
          const proxyUrl = `/api/blob-proxy?pathname=${encodeURIComponent(blobPath)}`;
          return sendJSON(res, 200, {
            success: true,
            url: proxyUrl,
            directUrl: blob.url,
            filename
          });
        }
      }

      // B) Local disk fallback
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.data);
      const localUrl = `/uploads/projects/${filename}`;
      return sendJSON(res, 200, {
        success: true,
        url: localUrl,
        filename
      });
    } catch (err) {
      console.error('Upload error:', err);
      return sendJSON(res, 500, { error: err.message || 'File upload failed' });
    }
  }

  // ── 4. GALLERY CRUD ──
  if (pathname === '/api/gallery' && (method === 'GET' || method === 'HEAD')) {
    const data = await getGalleryData();
    return sendJSON(res, 200, data);
  }

  if (pathname === '/api/gallery' && method === 'POST') {
    const body = await readBody(req);
    const gallery = await getGalleryData();
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
    gallery.unshift(newProject);
    await persistGallery(gallery);
    return sendJSON(res, 201, newProject);
  }

  const galMatch = pathname.match(/^\/api\/gallery\/([^/]+)$/);
  if (galMatch) {
    const id = galMatch[1];
    const gallery = await getGalleryData();

    if (method === 'GET' || method === 'HEAD') {
      const it = gallery.find(p => p.id === id);
      if (it) return sendJSON(res, 200, it);
      return sendJSON(res, 404, { error: 'Project not found' });
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      const idx = gallery.findIndex(p => p.id === id);
      if (idx !== -1) {
        gallery[idx] = { ...gallery[idx], ...body, updatedAt: new Date().toISOString() };
        await persistGallery(gallery);
        return sendJSON(res, 200, gallery[idx]);
      }
      return sendJSON(res, 404, { error: 'Project not found' });
    }
    if (method === 'DELETE') {
      const filtered = gallery.filter(p => p.id !== id);
      await persistGallery(filtered);
      return sendJSON(res, 200, { success: true, deletedId: id });
    }
  }

  // ── 5. VIDEOS CRUD ──
  if (pathname === '/api/videos' && (method === 'GET' || method === 'HEAD')) {
    const data = await getVideosData();
    return sendJSON(res, 200, data);
  }

  if (pathname === '/api/videos' && method === 'POST') {
    const body = await readBody(req);
    const videos = await getVideosData();
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
    await persistVideos(videos);
    return sendJSON(res, 201, newVideo);
  }

  const vidMatch = pathname.match(/^\/api\/videos\/([^/]+)$/);
  if (vidMatch) {
    const id = vidMatch[1];
    const videos = await getVideosData();

    if (method === 'GET' || method === 'HEAD') {
      const v = videos.find(item => item.id === id);
      if (v) return sendJSON(res, 200, v);
      return sendJSON(res, 404, { error: 'Video not found' });
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      const idx = videos.findIndex(item => item.id === id);
      if (idx !== -1) {
        videos[idx] = { ...videos[idx], ...body, updatedAt: new Date().toISOString() };
        await persistVideos(videos);
        return sendJSON(res, 200, videos[idx]);
      }
      return sendJSON(res, 404, { error: 'Video not found' });
    }
    if (method === 'DELETE') {
      const filtered = videos.filter(item => item.id !== id);
      await persistVideos(filtered);
      return sendJSON(res, 200, { success: true, deletedId: id });
    }
  }

  // ── 6. MESSAGES ──
  if (pathname === '/api/messages' && method === 'POST') {
    const body = await readBody(req);
    if (!body.name || !body.email || !body.message) {
      return sendJSON(res, 400, { error: 'name, email and message are required' });
    }

    const messages = await readStoredJSON('messages.json', []);
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

    messages.unshift(entry);
    await writeStoredJSON('messages.json', messages);
    return sendJSON(res, 201, { success: true, id: entry.id });
  }

  if (pathname === '/api/messages' && (method === 'GET' || method === 'HEAD')) {
    const messages = await readStoredJSON('messages.json', []);
    return sendJSON(res, 200, Array.isArray(messages) ? messages : []);
  }

  const messageMatch = pathname.match(/^\/api\/messages\/([^/]+)$/);
  if (messageMatch) {
    const messages = await readStoredJSON('messages.json', []);
    const index = messages.findIndex(message => message.id === messageMatch[1]);
    if (index === -1) return sendJSON(res, 404, { error: 'Message not found' });

    if (method === 'PATCH') {
      const body = await readBody(req);
      const updated = { ...messages[index] };
      if (typeof body.status === 'string') updated.status = body.status.trim().toUpperCase().slice(0, 40);
      if (typeof body.read === 'boolean') updated.read = body.read;
      updated.updatedAt = new Date().toISOString();
      messages[index] = updated;
      await writeStoredJSON('messages.json', messages);
      return sendJSON(res, 200, updated);
    }

    if (method === 'DELETE') {
      messages.splice(index, 1);
      await writeStoredJSON('messages.json', messages);
      return sendJSON(res, 200, { success: true, deletedId: messageMatch[1] });
    }
  }

  // ── 7. CONTACT & ESTIMATOR ──
  if (pathname === '/api/contact-info') {
    if (method === 'GET' || method === 'HEAD') {
      return sendJSON(res, 200, await readStoredJSON('contact-info.json', {}));
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      const existing = await readStoredJSON('contact-info.json', {});
      const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
      await writeStoredJSON('contact-info.json', updated);
      return sendJSON(res, 200, updated);
    }
  }

  if (pathname === '/api/estimator-config') {
    if (method === 'GET' || method === 'HEAD') {
      return sendJSON(res, 200, await readStoredJSON('estimator-config.json', {}));
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      const existing = await readStoredJSON('estimator-config.json', {});
      const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
      await writeStoredJSON('estimator-config.json', updated);
      return sendJSON(res, 200, updated);
    }
  }

  // ── 8. TELEGRAM COURSES CMS ──
  if (pathname === '/api/admin/courses' && (method === 'GET' || method === 'HEAD')) {
    return sendJSON(res, 200, await getCoursesData());
  }

  if (pathname === '/api/admin/courses' && method === 'POST') {
    const body = await readBody(req);
    const result = buildCourseRecord(body);
    if (result.error) return sendJSON(res, 400, { error: result.error });
    const courses = await getCoursesData();
    courses.unshift(result.course);
    await persistCourses(courses);
    return sendJSON(res, 201, result.course);
  }

  const adminCourseMatch = pathname.match(/^\/api\/admin\/courses\/([^/]+)$/);
  if (adminCourseMatch) {
    const courses = await getCoursesData();
    const index = courses.findIndex(course => course.id === adminCourseMatch[1]);
    if (index === -1) return sendJSON(res, 404, { error: 'Course not found' });

    if (method === 'PUT') {
      const body = await readBody(req);
      const result = buildCourseRecord(body, courses[index]);
      if (result.error) return sendJSON(res, 400, { error: result.error });
      courses[index] = result.course;
      await persistCourses(courses);
      return sendJSON(res, 200, result.course);
    }

    if (method === 'DELETE') {
      courses.splice(index, 1);
      await persistCourses(courses);
      return sendJSON(res, 200, { success: true, deletedId: adminCourseMatch[1] });
    }
  }

  if (pathname === '/api/courses' && (method === 'GET' || method === 'HEAD')) {
    const courses = await getCoursesData();
    return sendJSON(res, 200, courses.filter(course => course.status === 'PUBLISHED'));
  }

  const publicCourseMatch = pathname.match(/^\/api\/courses\/([^/]+)$/);
  if (publicCourseMatch && (method === 'GET' || method === 'HEAD')) {
    const courses = await getCoursesData();
    const course = courses.find(item => item.id === publicCourseMatch[1]);
    if (!course || (course.status !== 'PUBLISHED' && !await getAuthenticatedUser(req))) {
      return sendJSON(res, 404, { error: 'Course not found' });
    }
    return sendJSON(res, 200, course);
  }

  return sendJSON(res, 404, { error: 'Endpoint not found' });
};
