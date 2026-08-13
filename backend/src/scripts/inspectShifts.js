import { db } from '../config/firebase.js';
import { COLLECTIONS } from '../db/index.js';

const snap = await db.collection(COLLECTIONS.shifts).get();
for (const d of snap.docs) {
  const data = d.data();
  const dRef = data.driverId ? await db.collection(COLLECTIONS.drivers).doc(data.driverId).get() : null;
  const vRef = data.vehicleId ? await db.collection(COLLECTIONS.vehicles).doc(data.vehicleId).get() : null;
  console.log({
    shift: d.id,
    date: data.date,
    active: data.active,
    shiftType: data.shiftType,
    driverId: data.driverId || null,
    driverExists: !!dRef?.exists,
    vehicleId: data.vehicleId || null,
    vehicleExists: !!vRef?.exists
  });
}
process.exit(0);