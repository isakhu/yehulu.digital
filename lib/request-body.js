'use strict';

function requestBodyTooLarge() {
  const error = new Error('Request body exceeds the allowed size.');
  error.statusCode = 413;
  return error;
}

function readRequestBuffer(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let receivedBytes = 0;
    let settled = false;

    req.on('data', chunk => {
      if (settled) return;
      const buffer = Buffer.from(chunk);
      receivedBytes += buffer.length;
      if (receivedBytes > maxBytes) {
        settled = true;
        reject(requestBodyTooLarge());
        return;
      }
      chunks.push(buffer);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });

    req.on('error', error => {
      if (settled) return;
      settled = true;
      reject(error);
    });

    req.on('aborted', () => {
      if (settled) return;
      settled = true;
      const error = new Error('Request body was interrupted.');
      error.statusCode = 400;
      reject(error);
    });
  });
}

module.exports = { readRequestBuffer };
