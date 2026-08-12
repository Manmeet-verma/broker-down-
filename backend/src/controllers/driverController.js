import { db, auth } from '../config/firebase.js';
import {
  driverDocRef, driverDocsRef, driverHistoryRef, pushHistory, userDocRef, COLLECTIONS
} from '../db/index.js';
import { uploadFile, deleteStoredFile } from '../services/storage.js';
import { usernameToEmail, isValidEmail } from '../utils/validators.js';
import { maskAadhaar } from '../utils/index.js';
const DOC_TYPES = ['dl', 'aadhaar', 'photo', 'other'];
const DOC_LABELS = { dl: 'Driving Licence', aadhaar: 'Aadhaar', photo: 'Driver Photo', other: 'Other Document' };
export const DRIVER_STATUSES = ['active', 'inactive', 'on_leave', 'suspended'];
export const LICENSE_TYPES = ['Heavy Vehicle', 'LMV', 'Motorcycle', 'Other'];
export const SHIFT_PRESETS = ['morning', 'evening', 'night', 'general', 'other'];

const toISO = (v) => {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : v.seconds ? new Date(v.seconds * 1000).toISOString() : new Date(v).toISOString();
};
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v instanceof Date ? v : v.seconds ? v.seconds * 1000 : v);
  return isNaN(d.getTime()) ? null : d;
};

const clean = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const actorName = (user) => (user && (user.data?.name || user.name || user.email)) || 'Unknown';

/* ---------------- serializers ---------------- */
function serializeDriver(snap, opts = {}) {
  const data = snap.data() || {};
  const out = {
    ...data,
    id: snap.id,
    dob: toISO(data.dob),
    photo: data.photo || null,
    license: { ...(data.license || {}), validFrom: toISO(data.license?.validFrom), validTo: toISO(data.license?.validTo) },
    shift: { ...(data.shift || {}) },
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt)
  };
  out.licenseStatus = dlStatus(out.license);
  out.aadhaarMasked = maskAadhaar(data.aadhaar);
  if (opts.public) out.aadhaar = null;
  return out;
}

function dlStatus(license) {
  const l = license || {};
  if (!l.isDone && !l.validTo) return 'not_done';
  if (!l.validTo) return 'not_done';
  const left = Math.round((new Date(l.validTo).getTime() - Date.now()) / 86400000);
  if (left < 0) return 'expired';
  if (left <= 30) return 'expiring';
  return 'valid';
}

function serializeDriverDoc(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    type: d.type,
    label: d.label,
    name: d.originalName || d.name,
    storagePath: d.storagePath,
    url: d.url,
    mime: d.mimeType || d.mime,
    size: d.size,
    expiryDate: toISO(d.expiryDate),
    version: d.version || 1,
    active: d.active !== false,
    uploadedBy: d.uploadedBy,
    createdAt: toISO(d.createdAt),
    replacedAt: toISO(d.replacedAt)
  };
}

export { serializeDriver, serializeDriverDoc, toISO };

/* ---------------- validation ---------------- */
export function validateDriverPayload(body, partial = false) {
  const required = [
    ['name', 'Driver Name'],
    ['phone', 'Phone Number'],
    ['dob', 'Date of Birth'],
    ['address', 'Address'],
    ['licenseNumber', 'DL Number'],
    ['licenseAuthority', 'DL Authority']
  ];
  const errors = [];
  if (!partial) {
    for (const [field, label] of required) {
      if (!String(body[field] || '').trim()) errors.push(`${label} is required`);
    }
  }
  if (body.licenseValidTo && body.licenseValidFrom && new Date(body.licenseValidTo) <= new Date(body.licenseValidFrom)) {
    errors.push('DL Valid To must be after Valid From');
  }
  if (body.dob && new Date(body.dob) > new Date()) errors.push('DOB cannot be in the future');
  if (body.phone && !/^[0-9+\s-]{7,15}$/.test(String(body.phone))) errors.push('Phone number is invalid');
  if (body.alternatePhone && !/^[0-9+\s-]{7,15}$/.test(String(body.alternatePhone))) errors.push('Alternate phone is invalid');
  if (body.aadhaar && !/^\d{12}$/.test(String(body.aadhaar).replace(/\s/g, ''))) errors.push('Aadhaar must be 12 digits');
  if (body.licenceType === 'Other' && !String(body.otherLicenceType || '').trim()) errors.push('Other licence type must be specified');
  return errors;
}

function buildDriverData(body, actor, { userId } = {}) {
  const section = {
    name: String(body.name || '').trim(),
    pin: body.pin ? String(body.pin).trim() : null,
    dob: toDate(body.dob),
    phone: String(body.phone || '').trim(),
    alternatePhone: String(body.alternatePhone || '').trim(),
    aadhaar: body.aadhaar ? String(body.aadhaar).replace(/\s/g, '') : null,
    address: String(body.address || '').trim(),
    photo: body.photo || null,
    license: {
      number: String(body.licenseNumber || '').trim(),
      authority: String(body.licenseAuthority || '').trim(),
      validFrom: toDate(body.licenseValidFrom),
      validTo: toDate(body.licenseValidTo),
      type: body.licenceType || 'LMV',
      otherType: String(body.otherLicenceType || '').trim(),
      isDone: body.licenceValidTo ? true : false
    },
    vehicleCategory: body.vehicleCategory || 'Heavy Vehicle',
    status: body.status || 'active',
    shift: clean({
      preset: body.shiftPreset || null,
      startTime: body.shiftStartTime || null,
      endTime: body.shiftEndTime || null
    }),
    userId: userId || body.userId || null,
    createdBy: actor?.uid || null,
    updatedBy: actor?.uid || null
  };
  return section;
}

export { buildDriverData };

/* ---------------- POST /api/drivers ---------------- */
export async function createDriver(req, res) {
  const errors = validateDriverPayload(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  let userId = null;
  const { accountUsername, accountPassword } = req.body;
  if (accountUsername && accountPassword) {
    if (String(accountPassword).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const email = usernameToEmail(accountUsername);
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Account username must be a valid email or phone' });
    const existing = await userDocRef(emailUid(email)).get();
    if (existing.exists) return res.status(409).json({ error: 'Account username already taken' });
    try {
      const fbUser = await auth.createUser({ email, password: accountPassword, displayName: req.body.name });
      await auth.setCustomUserClaims(fbUser.uid, { role: 'user' });
      await userDocRef(fbUser.uid).set({
        uid: fbUser.uid, email, username: String(accountUsername).trim(), name: req.body.name,
        phone: req.body.phone || null, role: 'user', status: 'active', createdAt: new Date(), createdBy: req.user.uid
      });
      userId = fbUser.uid;
    } catch (err) {
      if (err.code === 'auth/email-already-exists') return res.status(409).json({ error: 'Account username already taken' });
      return res.status(500).json({ error: 'Failed to create account: ' + err.message });
    }
  }

  const ref = await db.collection(COLLECTIONS.drivers).doc();
  const driverId = ref.id;

  let photo = null;
  if (req.file) {
    const stored = await uploadFile(req.file.buffer, {
      folder: `drivers/${driverId}/photos`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype
    });
    photo = { name: stored.originalName, path: stored.path, url: stored.url };
  }

  const driverData = { ...buildDriverData(req.body, req.user, { userId }), photo };
  await ref.set({ ...driverData, createdAt: new Date(), updatedAt: new Date() });

  if (userId) await userDocRef(userId).update({ driverId: ref.id });

  await pushHistory(driverHistoryRef(ref.id), {
    action: 'Account created',
    details: `Driver ${req.body.name} registered${userId ? ' with a login account' : ''}`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.status(201).json({ driver: serializeDriver(await ref.get()) });
}

export async function listDrivers(req, res) {
  const { search = '', status = '', page = 1, limit = 20 } = req.query;
  const snap = await db.collection(COLLECTIONS.drivers).orderBy('createdAt', 'desc').get();
  let drivers = snap.docs.map((d) => serializeDriver(d, { public: false }));

  const q = String(search).toLowerCase();
  if (q) {
    drivers = drivers.filter((d) => [d.name, d.phone, d.license?.number, d.license?.authority, d.id]
      .join(' ').toLowerCase().includes(q));
  }
  if (status) drivers = drivers.filter((d) => d.status === status || d.licenseStatus === status);

  const total = drivers.length;
  const pages = Math.max(1, Math.ceil(total / Number(limit)));
  const p = Math.min(Math.max(1, Number(page)), pages);
  const startPos = (p - 1) * Number(limit);
  res.json({ drivers: drivers.slice(startPos, startPos + Number(limit)), total, page: p, pages });
}

export async function getDriver(req, res) {
  const { id } = req.params;
  const isSelf = req.user.role !== 'admin' && req.user.data?.driverId === id;
  if (req.user.role !== 'admin' && !isSelf) return res.status(403).json({ error: 'You can only view your own driver record' });

  const snap = await driverDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Driver not found' });

  const [docsS, histS, shiftsS, userS] = await Promise.all([
    driverDocsRef(id).orderBy('createdAt', 'desc').get(),
    driverHistoryRef(id).orderBy('createdAt', 'desc').limit(200).get(),
    db.collection(COLLECTIONS.shifts).where('driverId', '==', id).where('active', '==', true).get(),
    snap.data()?.userId ? userDocRef(snap.data().userId).get() : null
  ]);

  const driver = serializeDriver(snap, { public: req.user.role !== 'admin' });
  driver.documents = docsS.docs.filter((d) => d.data().active !== false).map(serializeDriverDoc);
  driver.archivedDocuments = docsS.docs.filter((d) => d.data().active === false).map(serializeDriverDoc);
  driver.history = histS.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) }));
  driver.shifts = shiftsS.docs.map((d) => ({ id: d.id, ...d.data() }));
  driver.user = userS?.exists ? userS.data() : null;
  res.json({ driver });
}

export async function myDriver(req, res) {
  const driverId = req.user.data?.driverId;
  if (!driverId) return res.status(404).json({ error: 'No driver profile linked to this account' });
  const snap = await driverDocRef(driverId).get();
  if (!snap.exists) return res.status(404).json({ error: 'Driver not found' });
  const [docsS, shiftsS] = await Promise.all([
    driverDocsRef(driverId).where('active', '==', true).get(),
    db.collection(COLLECTIONS.shifts).where('driverId', '==', driverId).where('active', '==', true).get()
  ]);
  const driver = serializeDriver(snap, { public: true });
  driver.documents = docsS.docs.map(serializeDriverDoc);
  driver.shifts = shiftsS.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ driver });
}

export async function updateDriver(req, res) {
  const { id } = req.params;
  const snap = await driverDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Driver not found' });
  const data = snap.data();
  const errors = validateDriverPayload(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const body = req.body;
  const upd = {
    name: body.name !== undefined ? String(body.name).trim() : data.name,
    phone: body.phone !== undefined ? String(body.phone).trim() : data.phone,
    alternatePhone: body.alternatePhone !== undefined ? String(body.alternatePhone).trim() : data.alternatePhone,
    address: body.address !== undefined ? String(body.address).trim() : data.address,
    dob: body.dob !== undefined ? toDate(body.dob) : data.dob,
    pin: body.pin !== undefined ? String(body.pin).trim() : data.pin,
    aadhaar: body.aadhaar !== undefined ? String(body.aadhaar).replace(/\s/g, '') : data.aadhaar,
    vehicleCategory: body.vehicleCategory !== undefined ? body.vehicleCategory : data.vehicleCategory,
    updatedBy: req.user.uid,
    updatedAt: new Date()
  };
  if (body.license) {
    const cur = data.license || {};
    upd.license = {
      number: body.license.number !== undefined ? String(body.license.number).trim() : cur.number,
      authority: body.license.authority !== undefined ? String(body.license.authority).trim() : cur.authority,
      validFrom: body.license.validFrom !== undefined ? toDate(body.license.validFrom) : cur.validFrom,
      validTo: body.license.validTo !== undefined ? toDate(body.license.validTo) : cur.validTo,
      type: body.license.type || cur.type,
      isDone: body.license.isDone !== undefined ? body.license.isDone : cur.isDone,
      otherType: body.license.otherType || cur.otherType || ''
    };
  }
  if (body.shift) {
    const curShift = data.shift || {};
    upd.shift = clean({
      preset: body.shift.preset !== undefined ? body.shift.preset : curShift.preset,
      startTime: body.shift.startTime !== undefined ? body.shift.startTime : curShift.startTime,
      endTime: body.shift.endTime !== undefined ? body.shift.endTime : curShift.endTime
    });
  }
  await driverDocRef(id).update(clean(upd));
  await pushHistory(driverHistoryRef(id), {
    action: 'Driver information updated',
    details: `${data.name} information updated by admin`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.json({ driver: serializeDriver(await driverDocRef(id).get()) });
}

export async function updateDriverStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!DRIVER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const snap = await driverDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Driver not found' });
  await driverDocRef(id).update({ status, updatedBy: req.user.uid, updatedAt: new Date() });
  await pushHistory(driverHistoryRef(id), {
    action: 'Status changed',
    details: `Status changed to ${status}`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.json({ ok: true, status });
}

function emailUid(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
}