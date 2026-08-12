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
    if (!existsSync(ENV.serviceAccountPath)) {
      throw new Error('file not found');
    }
    credentials = JSON.parse(readFileSync(ENV.serviceAccountPath, 'utf8'));
  } catch (err) {
    console.error('[FATAL] Cannot read service account file at', ENV.serviceAccountPath);
    console.error('Download it from Firebase Console > Project Settings > Service Accounts and save it as backend/service-account.json');
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