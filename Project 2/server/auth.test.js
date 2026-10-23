import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authStatus,
  setSessionCookie,
  validSessionForRequest,
  verifyAppPassword,
} from './auth.js';

test('app access requires a configured long password in production', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousPassword = process.env.APP_PASSWORD;
  process.env.NODE_ENV = 'production';
  delete process.env.APP_PASSWORD;
  try {
    assert.deepEqual(authStatus({ headers: {} }), { required: true, configured: false, authenticated: false });
    assert.equal(verifyAppPassword('anything'), false);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousPassword === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = previousPassword;
  }
});

test('app password creates a signed, secure, HttpOnly session cookie', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousPassword = process.env.APP_PASSWORD;
  process.env.NODE_ENV = 'production';
  process.env.APP_PASSWORD = 'a-long-test-password-with-at-least-24-characters';
  try {
    assert.equal(verifyAppPassword(process.env.APP_PASSWORD), true);
    assert.equal(verifyAppPassword('incorrect'), false);
    const request = { headers: {}, secure: true };
    const response = { setHeader(name, value) { this[name] = value; } };
    setSessionCookie(request, response);
    assert.match(response['Set-Cookie'], /HttpOnly/);
    assert.match(response['Set-Cookie'], /Secure/);
    assert.match(response['Set-Cookie'], /SameSite=Strict/);
    request.headers.cookie = response['Set-Cookie'].split(';', 1)[0];
    assert.equal(validSessionForRequest(request), true);
    assert.equal(authStatus(request).authenticated, true);
    request.headers.cookie = `${request.headers.cookie.slice(0, -1)}0`;
    assert.equal(validSessionForRequest(request), false);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousPassword === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = previousPassword;
  }
});
