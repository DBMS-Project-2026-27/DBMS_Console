import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'pantrygraph_session';
const SESSION_SECONDS = 12 * 60 * 60;
const attempts = new Map();

function isAuthRequired() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.APP_PASSWORD);
}

function isAuthConfigured() {
  return typeof process.env.APP_PASSWORD === 'string' && process.env.APP_PASSWORD.length >= 24;
}

function sessionSignature(expiresAt) {
  return createHmac('sha256', process.env.APP_PASSWORD).update(`pantrygraph-session:${expiresAt}`).digest('hex');
}

function readCookie(request, name) {
  const cookies = request.headers.cookie || '';
  for (const item of cookies.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) return decodeURIComponent(item.slice(separator + 1).trim());
  }
  return '';
}

function hasValidSession(request) {
  if (!isAuthConfigured()) return false;
  const value = readCookie(request, COOKIE_NAME);
  const separator = value.indexOf('.');
  if (separator < 1) return false;
  const expiresAt = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^\d{10,}$/.test(expiresAt) || Number(expiresAt) <= Math.floor(Date.now() / 1000) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sessionSignature(expiresAt), 'hex'));
}

function cookieOptions(request) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production' || request.secure) parts.push('Secure');
  return parts.join('; ');
}

export function authStatus(request) {
  const required = isAuthRequired();
  const configured = !required || isAuthConfigured();
  return { required, configured, authenticated: !required || (configured && hasValidSession(request)) };
}

export function setSessionCookie(request, response) {
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const signature = sessionSignature(expiresAt);
  const parts = [`${COOKIE_NAME}=${expiresAt}.${signature}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${SESSION_SECONDS}`];
  if (process.env.NODE_ENV === 'production' || request.secure) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(request, response) {
  response.setHeader('Set-Cookie', cookieOptions(request));
}

export function verifyAppPassword(candidate) {
  const expected = process.env.APP_PASSWORD;
  if (!isAuthConfigured() || typeof candidate !== 'string') return false;
  const candidateHash = createHash('sha256').update(candidate).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function isAuthRequiredForRequest() {
  return isAuthRequired();
}

export function isAuthConfiguredForRequest() {
  return isAuthConfigured();
}

export function validSessionForRequest(request) {
  return hasValidSession(request);
}

export function allowLoginAttempt(request) {
  const now = Date.now();
  const key = request.ip || 'unknown';
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (current.count >= 10) return false;
  current.count += 1;
  return true;
}

export function resetLoginAttempts(request) {
  attempts.delete(request.ip || 'unknown');
}
