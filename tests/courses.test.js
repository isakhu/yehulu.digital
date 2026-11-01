'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCourseRecord, isValidTelegramUrl } = require('../lib/courses');

test('accepts valid HTTPS Telegram destinations', () => {
  assert.equal(isValidTelegramUrl('https://t.me/yehulu_digital/42'), true);
  assert.equal(isValidTelegramUrl('https://telegram.me/creative_lessons'), true);
});

test('rejects unsafe or unrelated Telegram destinations', () => {
  assert.equal(isValidTelegramUrl('http://t.me/yehulu_digital/42'), false);
  assert.equal(isValidTelegramUrl('https://example.com/course'), false);
  assert.equal(isValidTelegramUrl('javascript:alert(1)'), false);
});

test('builds a published course record with a safe Telegram link', () => {
  const result = buildCourseRecord({
    title: 'Brand Design Fundamentals',
    description: 'A practical introduction to brand systems.',
    category: 'Branding',
    instructor: 'Yehulu Digital',
    telegramUrl: 'https://t.me/yehulu_digital/42',
    status: 'PUBLISHED'
  });

  assert.equal(result.error, undefined);
  assert.equal(result.course.title, 'Brand Design Fundamentals');
  assert.equal(result.course.status, 'PUBLISHED');
  assert.match(result.course.id, /^course-/);
});

test('rejects a course with a missing title or invalid destination', () => {
  assert.match(buildCourseRecord({
    telegramUrl: 'https://t.me/channel/2'
  }).error, /Course title is required/);

  assert.match(buildCourseRecord({
    title: 'Unsafe destination',
    telegramUrl: 'https://example.com/'
  }).error, /valid HTTPS Telegram link/);
});

test('rejects unknown publishing statuses and unsafe thumbnails', () => {
  assert.match(buildCourseRecord({
    title: 'Draft',
    telegramUrl: 'https://t.me/channel/2',
    status: 'PUBLIC'
  }).error, /Status must be/);

  assert.match(buildCourseRecord({
    title: 'Thumbnail check',
    telegramUrl: 'https://t.me/channel/2',
    thumbnail: 'javascript:alert(1)'
  }).error, /Thumbnail must be/);
});

test('updates retain the original course ID and creation timestamp', () => {
  const initial = buildCourseRecord({
    title: 'Original',
    telegramUrl: 'https://t.me/channel/2'
  }).course;

  const updated = buildCourseRecord({
    title: 'Updated title',
    telegramUrl: 'https://t.me/channel/3'
  }, initial).course;

  assert.equal(updated.id, initial.id);
  assert.equal(updated.createdAt, initial.createdAt);
  assert.equal(updated.title, 'Updated title');
});
