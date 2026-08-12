import { auth, db } from '../config/firebase.js';
import { ENV } from '../config/env.js';
import { userDocRef } from '../db/index.js';

const uid = ENV.adminEmail.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);

async function seedAdmin() {
  const existing = await userDocRef(uid).get();
  if (existing.exists) {
    console.log('Admin account already exists. Skipping.');
    return;
  }

  let fbUid = uid;
  try {
    const fbUser = await auth.createUser({
      email: ENV.adminEmail,
      password: ENV.adminPassword,
      displayName: ENV.adminName
    });
    fbUid = fbUser.uid;
    await auth.setCustomUserClaims(fbUser.uid, { role: 'admin' });
    console.log('Created Firebase Auth admin account.');
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const found = await auth.getUserByEmail(ENV.adminEmail);
      fbUid = found.uid;
      await auth.setCustomUserClaims(found.uid, { role: 'admin' });
      console.log('Admin email already registered; claims set.');
    } else {
      throw err;
    }
  }

  await userDocRef(fbUid).set({
    uid: fbUid,
    email: ENV.adminEmail,
    username: ENV.adminUsername,
    name: ENV.adminName,
    phone: ENV.adminPhone || null,
    role: 'admin',
    status: 'active',
    createdBy: 'system',
    createdAt: new Date()
  });
  console.log(`Admin seeded. Login with ${ENV.adminEmail} / ${ENV.adminPassword}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
