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

  const exact = [
    isAbsolute(ENV.serviceAccountPath) ? ENV.serviceAccountPath : join(process.cwd(), ENV.serviceAccountPath),
    join(PKG_ROOT, 'service-account.json'),
    join(PKG_ROOT, 'serviceAccount.json'),
    join(PKG_ROOT, 'service_account.json')
  ];
  for (const file of exact) {
    if (file && existsSync(file)) {
      const json = readServiceAccountFile(file);
      if (json) return logSource(json, file);
    }
  }

  // The file may have been uploaded into the wrong sub-folder of the app
  // (shared hosts run from a different cwd than the deploy dir). Search the
  // app tree — and one level above it — instead of failing on a fixed path.
  const roots = [
    { dir: PKG_ROOT, depth: 3 },
    { dir: process.cwd(), depth: 3 },
    { dir: dirname(PKG_ROOT), depth: 1 }
  ].filter((r, i, all) => r.dir && all.findIndex((o) => o.dir === r.dir) === i);

  const searched = [];
  const budget = { left: 400 };
  for (const root of roots) {
    const found = scanForCredentials(root.dir, root.depth, budget, searched);
    if (found) return logSource(found.json, found.file);
  }

  throw credentialsError(
    'Firebase credentials not found. Upload service-account.json into the app folder (next to package.json) ' +
      `or set the FIREBASE_SERVICE_ACCOUNT env var. Searched: ${roots.map((r) => `${r.dir} (depth ${r.depth})`).join('; ')}` +
      (searched.length ? ` — ${searched.length} files inspected` : '')
  );
}

function readServiceAccountFile(file) {
  try {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    if (json?.project_id && json?.private_key) return json;
  } catch (_) { /* broken file — keep looking */ }
  return null;
}

function logSource(json, file) {
  console.error(`[firebase] service account loaded from ${file} (project ${json.project_id})`);
  return json;
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'out', '.vercel', 'coverage']);

function scanForCredentials(dir, depth, budget, searched) {
  if (depth < 0 || budget.left <= 0) return null;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/service.?account.*\.json$/i.test(entry.name)) continue;
    if (/example|sample|template/i.test(entry.name)) continue;
    budget.left -= 1;
    const file = join(dir, entry.name);
    searched.push(file);
    const json = readServiceAccountFile(file);
    if (json) return { json, file };
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    budget.left -= 1;
    if (budget.left <= 0) return null;
    const found = scanForCredentials(join(dir, entry.name), depth - 1, budget, searched);
    if (found) return found;
  }
  return null;
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
