'use strict';

const crypto = require('node:crypto');

const TELEGRAM_HOSTS = new Set(['t.me', 'telegram.me', 'www.t.me', 'www.telegram.me']);
const COURSE_STATUSES = new Set(['PUBLISHED', 'DRAFT', 'ARCHIVED']);

function isValidTelegramUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' &&
      TELEGRAM_HOSTS.has(parsed.hostname.toLowerCase()) &&
      parsed.pathname.length > 1;
  } catch (_) {
    return false;
  }
}

function buildCourseRecord(input, existing = null) {
  const body = input && typeof input === 'object' ? input : {};
  const getValue = (key, fallback = '') => (
    body[key] === undefined ? String(existing && existing[key] || fallback) : String(body[key] || '')
  );

  const title = getValue('title').trim();
  const telegramUrl = getValue('telegramUrl').trim();
  const status = getValue('status', 'PUBLISHED').trim().toUpperCase();
  const thumbnail = getValue('thumbnail').trim();

  if (!title || title.length > 160) {
    return { error: 'Course title is required and must be 160 characters or fewer.' };
  }
  if (!isValidTelegramUrl(telegramUrl)) {
    return { error: 'Enter a valid HTTPS Telegram link (t.me or telegram.me).' };
  }
  if (!COURSE_STATUSES.has(status)) {
    return { error: 'Status must be PUBLISHED, DRAFT, or ARCHIVED.' };
  }
  if (thumbnail && !/^https:\/\//i.test(thumbnail) && !/^\/(uploads\/|api\/blob-proxy\?)/i.test(thumbnail)) {
    return { error: 'Thumbnail must be an HTTPS URL or a local uploaded asset path.' };
  }

  const now = new Date().toISOString();
  return {
    course: {
      id: existing ? existing.id : `course-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      title,
      description: getValue('description').trim().slice(0, 5000),
      thumbnail,
      category: getValue('category', 'GENERAL').trim().toUpperCase().slice(0, 80) || 'GENERAL',
      instructor: getValue('instructor', 'Yehulu Digital').trim().slice(0, 120),
      telegramUrl,
      status,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    }
  };
}

module.exports = { buildCourseRecord, isValidTelegramUrl };
