import { readFileSync, existsSync } from 'node:fs';
import admin from 'firebase-admin';
import { ENV } from './env.js';

let cachedAdmin = null;

function loadCredentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return JSON.parse(raw);
  if (existsSync(ENV.serviceAccountPath)) {
    return JSON.parse(readFileSync(ENV.serviceAccountPath, 'utf8'));
  }
  throw new Error(
    'Firebase credentials not found. Set the FIREBASE_SERVICE_ACCOUNT env var to your service account JSON, ' +
      `or place the file at ${ENV.serviceAccountPath}.`
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
  return cachedAdmin;
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
      return Reflect.apply(instance, instance, args);
    }
  });
}

export const adminInstance = lazy(getAdmin);
export const db = lazy(() => getAdmin().firestore());
export const auth = lazy(() => getAdmin().auth());
export const bucket = lazy(() => getAdmin().storage().bucket());
