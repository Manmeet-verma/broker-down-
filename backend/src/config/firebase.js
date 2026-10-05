import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { ENV } from './env.js';

let cachedAdmin = null;

/** Thrown when no usable service account can be found — callers can detect it
 *  with isCredentialsError() and answer 503 instead of a misleading 401. */
export function credentialsError(message) {
  const err = new Error(message);
  err.code = 'FIREBASE_CREDENTIALS_MISSING';
  return err;
}

export function isCredentialsError(err) {
  return err?.code === 'FIREBASE_CREDENTIALS_MISSING';
}

// backend/ (this file lives in backend/src/config/)
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Accepts raw JSON, JSON pasted with escaped \n, or base64-encoded JSON. */
function parseServiceAccount(raw) {
  const attempts = [raw, String(raw).replace(/\\n/g, '\n')];
  try {
    const decoded = Buffer.from(String(raw).trim(), 'base64').toString('utf8');
    if (decoded.startsWith('{')) attempts.push(decoded);
  } catch (_) { /* not base64 */ }

  for (const candidate of attempts) {
    try {
      const json = JSON.parse(candidate);
      if (json?.project_id) return json;
    } catch (_) { /* try the next shape */ }
  }
  throw credentialsError(
    'FIREBASE_SERVICE_ACCOUNT is set but is not valid service-account JSON ' +
      '(paste the JSON exactly as downloaded, or base64-encode it).'
  );
}

function loadCredentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && raw.trim()) return parseServiceAccount(raw.trim());

  const candidates = [
    isAbsolute(ENV.serviceAccountPath) ? ENV.serviceAccountPath : join(process.cwd(), ENV.serviceAccountPath),
    join(PKG_ROOT, 'service-account.json'),
    join(PKG_ROOT, 'serviceAccount.json'),
    join(PKG_ROOT, 'service_account.json')
  ];

  for (const file of candidates) {
    if (file && existsSync(file)) {
      try {
        return JSON.parse(readFileSync(file, 'utf8'));
      } catch (_) { /* broken file — keep looking */ }
    }
  }

  // Last resort: any *service*account*.json sitting next to package.json —
  // hosts often rename the file or deploy it into a different working dir.
  try {
    for (const name of readdirSync(PKG_ROOT)) {
      if (/service.?account.*\.json$/i.test(name) && !/example|sample/i.test(name)) {
        try {
          const json = JSON.parse(readFileSync(join(PKG_ROOT, name), 'utf8'));
          if (json?.project_id) return json;
        } catch (_) { /* skip unreadable file */ }
      }
    }
  } catch (_) { /* directory unreadable */ }

  throw credentialsError(
    'Firebase credentials not found. Set the FIREBASE_SERVICE_ACCOUNT env var to your service account JSON ' +
      `or place the file at service-account.json (looked in: ${candidates.join(', ')}).`
  );
}

function getAdmin() {
  if (cachedAdmin) return cachedAdmin;

  if (admin.apps.length) {
    cachedAdmin = admin;
    return cachedAdmin;
  }

  admin.initializeApp({
    credential: admin.credential.cert(loadCredentials()),
    databaseURL: ENV.firebaseDatabaseURL,
    storageBucket: ENV.storageBucket || undefined
  });

  cachedAdmin = admin;
  return admin;
}

/**
 * Defers Firebase init until an SDK method is actually called. Importing this
 * module must not touch credentials: the build imports it to trace the bundle,
 * and `process.exit`/throw at import time kills the build with no useful log.
 */
function lazy(resolve) {
  return new Proxy(function () {}, {
    get(_target, prop) {
      const instance = resolve();
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    apply(_target, _thisArg, args) {
      const instance = resolve();
      return Reflect.apply(instance, _thisArg, args);
    }
  });
}

export const adminInstance = lazy(getAdmin);
export const db = lazy(() => getAdmin().firestore());
export const auth = lazy(() => getAdmin().auth());
export const bucket = lazy(() => getAdmin().storage().bucket());
