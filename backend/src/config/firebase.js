import { readFileSync, existsSync } from 'node:fs';
import { ENV } from './env.js';

let firebaseAdmin = null;

async function initAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  const admin = await import('firebase-admin').then(m => m.default);

  if (admin.apps.length) {
    firebaseAdmin = admin;
    return admin;
  }

  let credentials;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw) {
      credentials = JSON.parse(raw);
    } else if (existsSync(ENV.serviceAccountPath)) {
      credentials = JSON.parse(readFileSync(ENV.serviceAccountPath, 'utf8'));
    } else {
      throw new Error('No FIREBASE_SERVICE_ACCOUNT env var and file not found');
    }
  } catch (err) {
    console.error('[FATAL] Cannot load service account:', err.message);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    databaseURL: ENV.firebaseDatabaseURL,
    storageBucket: ENV.storageBucket || undefined
  });

  firebaseAdmin = admin;
  return admin;
}

const adminInstance = await initAdmin();

export { adminInstance };
export const db = adminInstance.firestore();
export const auth = adminInstance.auth();
export const bucket = adminInstance.storage().bucket();