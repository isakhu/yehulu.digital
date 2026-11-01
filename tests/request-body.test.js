'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { readRequestBuffer } = require('../lib/request-body');

test('reads request bodies up to the configured byte limit', async () => {
  const req = Readable.from([Buffer.from('a'), Buffer.from('bc')]);
  const body = await readRequestBuffer(req, 3);

  assert.equal(body.toString('utf8'), 'abc');
});

test('rejects request bodies that exceed the configured byte limit', async () => {
  const req = Readable.from([Buffer.from('é')]);
  await assert.rejects(readRequestBuffer(req, 1), error => error.statusCode === 413);
});
