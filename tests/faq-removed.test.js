'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('FAQ accordion is removed from the public website', () => {
  assert.doesNotMatch(html, /injectFaqSection|toggleFaq|yehulu-faq-section/);
  assert.doesNotMatch(html, /FREQUENTLY ASKED|COMMON QUESTIONS|faq-card|faq-trigger|faq-content/);
});
