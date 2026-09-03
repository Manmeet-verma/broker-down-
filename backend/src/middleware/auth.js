import { auth, db } from '../config/firebase.js';

/** Verify Firebase ID token and attach { uid, email, role, user } to req */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = await auth.verifyIdToken(token);
    let userDoc = null;
    try {
      const snap = await db.collection('users').doc(decoded.uid).get();
      userDoc = snap.exists ? snap.data() : null;
    } catch (_) { /* ignore */ }

    const role = userDoc?.role || decoded.role || 'inputter';
    req.user = { uid: decoded.uid, email: decoded.email || userDoc?.email, role, data: userDoc };
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  }
  next();
};

export const requireAdmin = allowRoles('admin');
export const requireInputter = allowRoles('inputter', 'admin');
export const requireRecommender = allowRoles('recommender', 'admin');
export const requireVerifier = allowRoles('verifier', 'admin');
export const requireWorkflowUser = allowRoles('inputter', 'recommender', 'verifier', 'admin');