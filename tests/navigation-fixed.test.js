'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('public bottom navigation remains fixed to the viewport', () => {
  assert.match(
    html,
    /#root,\s*#yeh-progress,\s*#yeh-loader\s*\{\s*position:\s*relative;/
  );
  assert.doesNotMatch(
    html,
    /#root,\s*#yeh-progress,\s*#yeh-loader,\s*nav#floating-dock\s*\{\s*position:\s*relative;/
  );
  assert.match(
    html,
    /nav#floating-dock\s*\{\s*position:\s*fixed;\s*z-index:\s*9990;/
  );
});
