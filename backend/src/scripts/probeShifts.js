import { db } from '../config/firebase.js';
import { COLLECTIONS } from '../db/index.js';

const snap = await db.collection(COLLECTIONS.shifts).orderBy('createdAt', 'desc').limit(200).get();
console.log('snapshot size:', snap.size);
for (const doc of snap.docs) {
  const d = doc.data();
  console.log('RAW doc.id=', doc.id, 'driverId=', d.driverId, 'vehicleId=', d.vehicleId, 'date=', d.date, 'createdAt=', d.createdAt, 'keys=', Object.keys(d).join(','));
}
process.exit(0);