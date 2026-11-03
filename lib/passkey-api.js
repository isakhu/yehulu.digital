'use strict';

const crypto = require('node:crypto');
const dataStore = require('./data-store');
const {
  createSessionToken,
  isSessionSecretConfigured
} = require('./auth');
const {
  getAuthenticatedUser,
  getUsers,
  safeUser
} = require('./accounts');

const STATE_FILE = 'passkey-state.json';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

let webAuthnModulePromise;

function getWebAuthn() {
  if (!webAuthnModulePromise) {
    webAuthnModulePromise = import('@simplewebauthn/server');
  }
  return webAuthnModulePromise;
}

function response(status, body, headers = {}) {
  return { status, body, headers };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }

  const { readRequestBuffer } = require('./request-body');
  const data = await readRequestBuffer(req, 1024 * 1024);
  try { return JSON.parse(data.toString('utf8') || '{}'); } catch (_) { return {}; }
}

async function readState() {
  const state = await dataStore.readJSON(STATE_FILE, {});
  return {
    credentials: Array.isArray(state.credentials) ? state.credentials : [],
    registrationChallenge: state.registrationChallenge || null,
    authenticationChallenge: state.authenticationChallenge || null,
    setupCompleted: state.setupCompleted === true
  };
}

async function saveState(state) {
  await dataStore.writeJSON(STATE_FILE, state);
}

function getRequestContext(req) {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  const isLocal = process.env.NODE_ENV !== 'production' &&
    (host === 'localhost' || host === '127.0.0.1');

  const rpID = process.env.ADMIN_WEBAUTHN_RP_ID || (isLocal ? 'localhost' : 'yehulu-digital.vercel.app');
  const expectedOrigin = process.env.ADMIN_WEBAUTHN_ORIGIN || (isLocal ? 'http://localhost:3000' : 'https://yehulu-digital.vercel.app');
  const originHost = new URL(expectedOrigin).hostname.toLowerCase();

  if (host !== originHost) {
    throw Object.assign(new Error('Open the official Yehulu Digital website to use this passkey.'), { statusCode: 403 });
  }

  const requestOrigin = req.headers.origin;
  if (requestOrigin && requestOrigin !== expectedOrigin) {
    throw Object.assign(new Error('This sign-in request came from an untrusted website.'), { statusCode: 403 });
  }

  return { rpID, expectedOrigin };
}

function tokenMatches(supplied) {
  const expected = process.env.ADMIN_PASSKEY_SETUP_TOKEN || '';
  if (!expected || typeof supplied !== 'string') return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function getAdminUser() {
  const users = await getUsers();
  return users.find(user => user && user.role === 'ADMIN') || null;
}

async function authorizeRegistration(req, body, state) {
  const currentUser = await getAuthenticatedUser(req);
  if (currentUser) return { user: currentUser, setupMode: false };

  if (
    !state.setupCompleted &&
    state.credentials.length === 0 &&
    tokenMatches(body.setupToken)
  ) {
    const user = await getAdminUser();
    if (user) return { user, setupMode: true };
  }

  return null;
}

function validChallenge(challengeRecord) {
  return Boolean(
    challengeRecord &&
    typeof challengeRecord.challenge === 'string' &&
    Number.isFinite(challengeRecord.expiresAt) &&
    challengeRecord.expiresAt > Date.now()
  );
}

async function handlePasskeyApi(pathname, method, req) {
  if (pathname === '/api/auth/passkey/status' && (method === 'GET' || method === 'HEAD')) {
    try {
      const state = await readState();
      return response(200, {
        configured: state.credentials.length > 0,
        setupAvailable: !state.setupCompleted && state.credentials.length === 0
      }, { 'Cache-Control': 'no-store' });
    } catch (_) {
      return response(503, { error: 'Secure passkey storage is not available. Contact the site administrator.' });
    }
  }

  if (pathname === '/api/auth/passkey/register/options' && method === 'POST') {
    try {
      const body = await readBody(req);
      const state = await readState();
      const authorization = await authorizeRegistration(req, body, state);
      if (!authorization) return response(401, { error: 'Device setup is not authorized.' });

      const { rpID } = getRequestContext(req);
      const { generateRegistrationOptions } = await getWebAuthn();
      const userPasskeys = state.credentials.filter(item => item.userId === authorization.user.id);
      const options = await generateRegistrationOptions({
        rpName: 'Yehulu Digital',
        rpID,
        userID: Buffer.from(authorization.user.id, 'utf8'),
        userName: authorization.user.username || authorization.user.email,
        userDisplayName: authorization.user.name || 'Yehulu Digital Admin',
        attestationType: 'none',
        excludeCredentials: userPasskeys.map(item => ({
          id: item.id,
          transports: item.transports
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
          authenticatorAttachment: 'platform'
        },
        supportedAlgorithmIDs: [-7, -257]
      });

      state.registrationChallenge = {
        challenge: options.challenge,
        userId: authorization.user.id,
        setupMode: authorization.setupMode,
        expiresAt: Date.now() + CHALLENGE_TTL_MS
      };
      await saveState(state);
      return response(200, options, { 'Cache-Control': 'no-store' });
    } catch (error) {
      return response(Number(error.statusCode) || 503, {
        error: error.statusCode ? error.message : 'Could not start device registration. Check private CMS storage and try again.'
      });
    }
  }

  if (pathname === '/api/auth/passkey/register/verify' && method === 'POST') {
    try {
      const body = await readBody(req);
      const state = await readState();
      const pending = state.registrationChallenge;
      if (!validChallenge(pending)) return response(400, { error: 'Device registration expired. Start again.' });

      const authorization = await authorizeRegistration(req, body, state);
      if (!authorization || authorization.user.id !== pending.userId) {
        return response(401, { error: 'Device registration is no longer authorized.' });
      }
      if (pending.setupMode && (!tokenMatches(body.setupToken) || state.setupCompleted || state.credentials.length > 0)) {
        return response(401, { error: 'The one-time device setup link is invalid or has already been used.' });
      }

      const { rpID, expectedOrigin } = getRequestContext(req);
      const { verifyRegistrationResponse } = await getWebAuthn();
      const verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge: pending.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: true
      });

      if (!verification.verified || !verification.registrationInfo) {
        return response(400, { error: 'Your device could not verify the new passkey. Try again.' });
      }

      const info = verification.registrationInfo;
      const credential = info.credential;
      if (!credential || !credential.id || !credential.publicKey) {
        return response(400, { error: 'The device returned incomplete passkey information.' });
      }

      const exists = state.credentials.some(item => item.id === credential.id);
      if (exists) return response(409, { error: 'This passkey is already registered.' });

      state.credentials.push({
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: Number(credential.counter) || 0,
        transports: Array.isArray(credential.transports) ? credential.transports : [],
        userId: authorization.user.id,
        deviceType: info.credentialDeviceType || 'singleDevice',
        backedUp: Boolean(info.credentialBackedUp),
        createdAt: new Date().toISOString()
      });
      if (pending.setupMode) state.setupCompleted = true;
      state.registrationChallenge = null;
      state.authenticationChallenge = null;
      await saveState(state);

      if (!isSessionSecretConfigured()) {
        return response(503, { error: 'The passkey was saved, but the admin session is not configured.' });
      }

      return response(200, {
        success: true,
        token: createSessionToken(authorization.user),
        user: safeUser(authorization.user)
      }, { 'Cache-Control': 'no-store' });
    } catch (error) {
      console.error('Passkey registration verification failed:', error);
      return response(Number(error.statusCode) || 400, {
        error: error.statusCode ? error.message : 'Passkey registration could not be verified. Please start again.'
      });
    }
  }

  if (pathname === '/api/auth/passkey/authenticate/options' && method === 'POST') {
    try {
      const state = await readState();
      if (!state.credentials.length) return response(409, { error: 'No admin device has been registered yet.', setupRequired: true });

      const { rpID } = getRequestContext(req);
      const { generateAuthenticationOptions } = await getWebAuthn();
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: state.credentials.map(item => ({
          id: item.id,
          transports: item.transports
        })),
        userVerification: 'required'
      });

      state.authenticationChallenge = {
        challenge: options.challenge,
        expiresAt: Date.now() + CHALLENGE_TTL_MS
      };
      await saveState(state);
      return response(200, options, { 'Cache-Control': 'no-store' });
    } catch (error) {
      return response(Number(error.statusCode) || 503, {
        error: error.statusCode ? error.message : 'Could not start passkey sign-in. Check private CMS storage and try again.'
      });
    }
  }

  if (pathname === '/api/auth/passkey/authenticate/verify' && method === 'POST') {
    try {
      const body = await readBody(req);
      const state = await readState();
      const pending = state.authenticationChallenge;
      if (!validChallenge(pending)) return response(400, { error: 'Your sign-in request expired. Swipe again.' });

      const credentialId = body.credential && body.credential.id;
      const storedCredential = state.credentials.find(item => item.id === credentialId);
      if (!storedCredential) return response(401, { error: 'This device is not registered for Yehulu Digital admin access.' });

      const { rpID, expectedOrigin } = getRequestContext(req);
      const { verifyAuthenticationResponse } = await getWebAuthn();
      const verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge: pending.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: storedCredential.id,
          publicKey: Buffer.from(storedCredential.publicKey, 'base64'),
          counter: Number(storedCredential.counter) || 0,
          transports: storedCredential.transports
        },
        requireUserVerification: true
      });

      if (!verification.verified) return response(401, { error: 'Your device did not verify this sign-in.' });

      const users = await getUsers();
      const user = users.find(item => item.id === storedCredential.userId && item.role === 'ADMIN');
      if (!user) return response(401, { error: 'The administrator account is no longer available.' });

      storedCredential.counter = verification.authenticationInfo.newCounter;
      state.authenticationChallenge = null;
      await saveState(state);

      if (!isSessionSecretConfigured()) {
        return response(503, { error: 'Admin sessions are not configured.' });
      }

      return response(200, {
        success: true,
        token: createSessionToken(user),
        user: safeUser(user)
      }, { 'Cache-Control': 'no-store' });
    } catch (error) {
      console.error('Passkey authentication failed:', error);
      return response(Number(error.statusCode) || 401, {
        error: error.statusCode ? error.message : 'Passkey sign-in failed. Swipe and try again.'
      });
    }
  }

  return null;
}

module.exports = { handlePasskeyApi };
