import bcrypt from 'bcryptjs';
import { auth, db } from '../config/firebase.js';
import { userDocRef } from '../db/index.js';
import { usernameToEmail, isValidEmail } from '../utils/validators.js';

const userUid = (email) => email.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);

/**
 * POST /api/auth/login — verify Firebase ID token, return session user.
 */
export async function login(req, res) {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const snap = await userDocRef(decoded.uid).get();
    let user = snap.exists ? snap.data() : null;

    if (!user) {
      const fb = await auth.getUser(decoded.uid);
      user = {
        uid: decoded.uid,
        email: fb.email,
        username: fb.email,
        name: fb.displayName || fb.email || 'User',
        role: decoded.role || 'inputter',
        status: 'active',
        createdAt: new Date()
      };
      await userDocRef(decoded.uid).set(user);
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'This account is suspended. Contact Admin.' });
    }

    res.json({ user: serializeUser(user) });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token: ' + err.message });
  }
}

/** GET /api/auth/me */
export async function me(req, res) {
  const snap = await userDocRef(req.user.uid).get();
  const u = snap.exists ? snap.data() : { uid: req.user.uid, name: req.user.email, username: req.user.email, role: req.user.role };
  res.json({ user: serializeUser(u, true) });
}

/**
 * POST /api/auth/create-user  (admin only)
 * Creates Firebase Auth account + users doc. Driver profile linked via driverId.
 */
export async function createUser(req, res) {
  const { username, password, role, name, phone, status } = req.body;
  const allowed = ['admin', 'inputter', 'recommender', 'verifier'];
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (!allowed.includes(role || 'inputter')) return res.status(400).json({ error: 'Invalid role' });
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const email = usernameToEmail(username);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Username must be a valid email address or phone number' });
  }

  const existing = await userDocRef(userUid(email)).get();
  if (existing.exists) return res.status(409).json({ error: 'Username already taken' });

  try {
    const fbUser = await auth.createUser({ email, password, displayName: name || String(username) });
    await auth.setCustomUserClaims(fbUser.uid, { role: role || 'user' });

    const userData = {
      uid: fbUser.uid,
      email,
      username: String(username).trim(),
      name: name || String(username).trim(),
      phone: phone || null,
      role: role || 'user',
      status: status || 'active',
      driverId: req.body.driverId || null,
      createdBy: req.user.uid,
      createdAt: new Date()
    };
    await userDocRef(fbUser.uid).set(userData);
    res.status(201).json({ user: serializeUser(userData) });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    return res.status(500).json({ error: err.message });
  }
}

/** GET /api/auth/users — list accounts (admin) */
export async function listUsers(req, res) {
  const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(200).get();
  res.json({ users: snap.docs.map((d) => serializeUser(d.data(), true)) });
}

/** PATCH /api/auth/users/:uid — manage status / role (admin) */
export async function updateUser(req, res) {
  const { uid } = req.params;
  const { status, role, name, phone } = req.body;
  const data = {};
  if (status) data.status = status;
  if (role && ['admin', 'inputter', 'recommender', 'verifier'].includes(role)) {
    data.role = role;
    await auth.setCustomUserClaims(uid, { role });
  }
  if (name) data.name = name;
  if (phone) data.phone = phone;
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' });

  await userDocRef(uid).update({ ...data, updatedBy: req.user.uid, updatedAt: new Date() });
  const snap = await userDocRef(uid).get();
  res.json({ user: serializeUser(snap.data(), true) });
}

function serializeUser(u, withSensitive = false) {
  const out = {
    uid: u?.uid,
    username: u?.username,
    name: u?.name,
    email: u?.email,
    phone: u?.phone,
    role: u?.role,
    status: u?.status,
    driverId: u?.driverId || null,
    createdAt: toISOFromFirestore(u?.createdAt)
  };
  return out;
}

function toISOFromFirestore(v) {
  if (!v) return null;
  return v.seconds ? new Date(v.seconds * 1000).toISOString() : new Date(v).toISOString();
}