'use strict';

const crypto = require('node:crypto');
const readline = require('node:readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the initial client admin password: ', (password) => {
  rl.close();
  if (!password) {
    console.error('A password is required.');
    process.exitCode = 1;
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const sessionSecret = crypto.randomBytes(48).toString('base64url');

  console.log('\nAdd these values to the Yehulu Digital Vercel project environment:');
  console.log('ADMIN_USERNAME=mihreteab');
  console.log('ADMIN_PASSWORD_HASH=scrypt$' + salt + '$' + hash);
  console.log('SESSION_SECRET=' + sessionSecret);

  if (password.length < 12) {
    console.log('\nSecurity note: this password is short. Replace it with a unique password of at least 12 characters after the first sign-in.');
  }
});
