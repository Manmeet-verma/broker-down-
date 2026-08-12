import { db } from '../config/firebase.js';
import { shiftDocRef, COLLECTIONS } from '../db/index.js';

export const SHIFT_TYPES = ['day', 'night'];

const toISO = (v) => (v ? (v.seconds ? new Date(v.seconds * 1000).toISOString() : new Date(v).toISOString()) : null);

const serializeShift = (doc) => {
  const d = doc.data();
  return { id: doc.id, ...d, createdAt: toISO(d.createdAt), updatedAt: toISO(d.updatedAt) };
};

/** POST /api/shifts — admin assigns driver + vehicle + shift type (day/night) */
export async function createShift(req, res) {
  const { driverId, vehicleId, shiftType, date } = req.body;
  if (!driverId || !vehicleId) return res.status(400).json({ error: 'Driver and Vehicle are required' });
  if (!SHIFT_TYPES.includes(shiftType)) return res.status(400).json({ error: 'Shift type must be day or night' });

  const [dS, vS] = await Promise.all([db.collection(COLLECTIONS.drivers).doc(driverId).get(), db.collection(COLLECTIONS.vehicles).doc(vehicleId).get()]);
  if (!dS.exists) return res.status(404).json({ error: 'Driver not found' });
  if (!vS.exists) return res.status(404).json({ error: 'Vehicle not found' });

  const ref = await db.collection(COLLECTIONS.shifts).add({
    driverId,
    vehicleId,
    shiftType,
    date: date || null,
    active: true,
    assignedBy: req.user.email,
    createdBy: req.user.uid,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  res.status(201).json({ shift: serializeShift(await ref.get()) });
}

/** GET /api/shifts — admin: all; user: own active shifts */
export async function listShifts(req, res) {
  let snap;
  if (req.user.role === 'user') {
    const driverId = req.user.data?.driverId;
    if (!driverId) return res.json({ shifts: [], total: 0 });
    snap = await db.collection(COLLECTIONS.shifts).where('driverId', '==', driverId).get();
  } else {
    snap = await db.collection(COLLECTIONS.shifts).orderBy('createdAt', 'desc').limit(200).get();
  }
  const shifts = await serializeAll(snap);
  res.json({ shifts, total: shifts.length });
}

/** GET /api/shifts/:id */
export async function getShift(req, res) {
  const { id } = req.params;
  const snap = await shiftDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Shift not found' });
  const shift = serializeShift(snap);
  const enriched = await serializeAll([shift]);
  res.json({ shift: enriched[0] });
}

/** PUT /api/shifts/:id */
export async function updateShift(req, res) {
  const { id } = req.params;
  const snap = await shiftDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Shift not found' });
  const { driverId, vehicleId, shiftType, date, active } = req.body;
  const upd = {};
  if (driverId) upd.driverId = driverId;
  if (vehicleId) upd.vehicleId = vehicleId;
  if (shiftType) {
    if (!SHIFT_TYPES.includes(shiftType)) return res.status(400).json({ error: 'Shift type must be day or night' });
    upd.shiftType = shiftType;
  }
  if (date !== undefined) upd.date = date || null;
  if (active !== undefined) upd.active = !!active;
  upd.updatedAt = new Date();
  upd.updatedBy = req.user.uid;
  await shiftDocRef(id).update(upd);
  res.json({ shift: serializeShift(await shiftDocRef(id).get()) });
}

/** DELETE /api/shifts/:id — admin ends/unassigns a shift */
export async function deleteShift(req, res) {
  const { id } = req.params;
  const snap = await shiftDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Shift not found' });
  await shiftDocRef(id).update({ active: false, endedAt: new Date(), endedBy: req.user.uid });
  res.json({ ok: true });
}

async function serializeShiftDoc(doc) {
  const d = doc.data();
  return { id: doc.id, ...d, createdAt: toISO(d.createdAt), updatedAt: toISO(d.updatedAt) };
}

async function serializeAll(snapshotOrList) {
  const docs = Array.isArray(snapshotOrList) ? snapshotOrList : snapshotOrList.docs.map(serializeShiftDoc);
  return serializeList(docs);
}

async function serializeList(shifts) {
  const idsD = [...new Set(shifts.map((s) => s.driverId))];
  const idsV = [...new Set(shifts.map((s) => s.vehicleId))];
  const names = { drivers: {}, vehicles: {} };
  if (idsD.length) {
    const snaps = await Promise.all(
      idsD.slice(0, 10).map((id) => db.collection(COLLECTIONS.drivers).doc(id).get())
    );
    snaps.forEach((d) => d.exists && (names.drivers[d.id] = d.data().name || 'Unknown'));
  }
  if (idsV.length) {
    const snaps = await Promise.all(
      idsV.slice(0, 10).map((id) => db.collection(COLLECTIONS.vehicles).doc(id).get())
    );
    snaps.forEach((d) => d.exists && (names.vehicles[d.id] = d.data().vehicleNumber || 'Unknown'));
  }
  return shifts.map((s) => ({ ...s, driverName: names.drivers[s.driverId] || 'Unknown', vehicleNumber: names.vehicles[s.vehicleId] || 'Unknown' }));
}