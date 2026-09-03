import { auth, db } from '../config/firebase.js';
import { userDocRef } from '../db/index.js';

const DEMO_ACCOUNTS = [
  {
    email: 'admin@demo.com',
    password: 'Admin@123',
    name: 'Super Admin',
    role: 'admin',
    username: 'admin'
  },
  {
    email: 'inputter@demo.com',
    password: 'Input@123',
    name: 'Data Inputter',
    role: 'inputter',
    username: 'inputter'
  },
  {
    email: 'recommender@demo.com',
    password: 'Recommend@123',
    name: 'Reviewer',
    role: 'recommender',
    username: 'recommender'
  },
  {
    email: 'verifier@demo.com',
    password: 'Verify@123',
    name: 'Verifier',
    role: 'verifier',
    username: 'verifier'
  }
];

async function seedDemoAccounts() {
  console.log('Seeding demo accounts...\n');

  for (const account of DEMO_ACCOUNTS) {
    const uid = account.email.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    
    try {
      // Check if user doc already exists
      const existing = await userDocRef(uid).get();
      if (existing.exists) {
        console.log(`  [SKIP] ${account.email} already exists`);
        continue;
      }

      // Create Firebase Auth user
      let fbUid = uid;
      try {
        const fbUser = await auth.createUser({
          email: account.email,
          password: account.password,
          displayName: account.name
        });
        fbUid = fbUser.uid;
        await auth.setCustomUserClaims(fbUser.uid, { role: account.role });
        console.log(`  [OK] Created Firebase Auth: ${account.email}`);
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
          const found = await auth.getUserByEmail(account.email);
          fbUid = found.uid;
          await auth.setCustomUserClaims(found.uid, { role: account.role });
          console.log(`  [OK] Firebase Auth exists, claims set: ${account.email}`);
        } else {
          throw err;
        }
      }

      // Create user document
      await userDocRef(fbUid).set({
        uid: fbUid,
        email: account.email,
        username: account.username,
        name: account.name,
        phone: null,
        role: account.role,
        status: 'active',
        createdBy: 'system-seed',
        createdAt: new Date()
      });
      console.log(`  [OK] User doc created: ${account.email}`);
    } catch (err) {
      console.error(`  [FAIL] ${account.email}: ${err.message}`);
    }
  }

  console.log('\n--- Demo Accounts Summary ---');
  console.log('Email                | Password      | Role');
  console.log('---------------------|---------------|------------');
  for (const a of DEMO_ACCOUNTS) {
    console.log(`${a.email.padEnd(21)}| ${a.password.padEnd(14)}| ${a.role}`);
  }
  console.log('\nDone!');
}

seedDemoAccounts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
