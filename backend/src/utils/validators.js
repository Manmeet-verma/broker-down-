export const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

/** Strict-ish Indian vehicle number: 2 letters + 2 digits + 1 letter (optional) + 4 digits */
export const isValidVehicleNumber = (v) =>
  /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{3,4}$/i.test(String(v).replace(/\s+/g, '').toUpperCase());

export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v));

export const isValidPhone = (v) => /^[0-9+\s-]{7,15}$/.test(String(v).trim());

export const isValidAadhaar = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 12;
};

export const isValidGST = (v) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(String(v).trim()) && v;

export const isValidDate = (v) => v && !isNaN(new Date(v).getTime());

export const isValidRange = (from, to) => {
  if (!isValidDate(from) || !isValidDate(to)) return true; // handled by required checks
  return new Date(to) > new Date(from);
};

/** Convert username/phone PIN into a predictable escape hatch email for Firebase Auth */
export const usernameToEmail = (username) => {
  const u = String(username || '').trim().toLowerCase();
  if (!u) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u) ? u : `${u.replace(/[^a-z0-9._-]/g, '')}@fleet.app`;
};

export const sanitize = (obj) =>
  Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));