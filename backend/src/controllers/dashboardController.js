import { db } from '../config/firebase.js';
import { COLLECTIONS } from '../db/index.js';
import { docStatus } from '../utils/index.js';
import { computedDocStatuses, attentionItems } from '../services/vehicleStatus.js';
import { serializeDriver } from './driverController.js';

const DOC_INFO = [
  { key: 'rc', label: 'RC' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'pollution', label: 'Pollution' },
  { key: 'permit', label: 'State Permit' },
  { key: 'tax', label: 'Tax' }
];

function countByStatus(vehicles, key) {
  return vehicles.reduce(
    (acc, v) => {
      const s = docStatus(v[key]?.validTo, !!v[key]?.done);
      if (s === 'expired') acc.expired += 1;
      if (s === 'expiring') acc.expiring += 1;
      if (s === 'valid') acc.valid += 1;
      if (s === 'not_done') acc.notDone += 1;
      return acc;
    },
    { valid: 0, expiring: 0, expired: 0, notDone: 0 }
  );
}

/** GET /api/dashboard — summary cards, attention list, per-doc counts */
export async function dashboard(req, res) {
  const isUser = req.user.role === 'user';
  let vehicles = [];

  if (isUser) {
    const driverId = req.user.data?.driverId;
    const shifts = driverId
      ? await db.collection(COLLECTIONS.shifts).where('driverId', '==', driverId).where('active', '==', true).get()
      : { docs: [] };
    const ids = [...new Set(shifts.docs.map((s) => s.data().vehicleId).filter(Boolean))];
    const snaps = await Promise.all(
      ids.slice(0, 10).map((id) => db.collection(COLLECTIONS.vehicles).doc(id).get())
    );
    vehicles = snaps.filter((d) => d.exists).map((d) => ({ id: d.id, ...d.data() }));
  } else {
    const snap = await db.collection(COLLECTIONS.vehicles).where('deleted', '==', false).get();
    vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const summary = {};
  for (const d of DOC_INFO) summary[d.key] = countByStatus(vehicles, d.key);

  const active = vehicles.filter((v) => v.status === 'active' && !v.deleted).length;
  const inactive = vehicles.filter((v) => v.status === 'inactive' && !v.deleted).length;
  const underFinance = vehicles.filter((v) => v.status === 'under_finance' || !!v.finance?.company).length;
  const sold = vehicles.filter((v) => v.status === 'sold' && !v.deleted).length;

  const attention = attentionItems(vehicles);

  const payload = {
    totalVehicles: vehicles.length,
    activeVehicles: active,
    inactiveVehicles: inactive,
    underFinance,
    sold,
    summary,
    attention,
    expiringSoon: attention.filter((a) => a.status === 'expiring').length,
    expiredNow: attention.filter((a) => a.status === 'expired').length
  };

  if (isUser) {
    payload.driverId = req.user.data?.driverId || null;
    payload.myIssues = 0;
  } else {
    const [issuesS, driversS, shiftsS] = await Promise.all([
      db.collection(COLLECTIONS.issues).where('status', 'in', ['pending', 'accepted']).get(),
      db.collection(COLLECTIONS.drivers).get(),
      db.collection(COLLECTIONS.shifts).where('active', '==', true).get()
    ]);
    payload.pendingIssues = issuesS.docs.filter((d) => d.data().status === 'pending').length;
    payload.openIssues = issuesS.docs.length;
    payload.totalDrivers = driversS.docs.length;
    payload.drivers = driversS.docs.map((d) => serializeDriver(d, { public: false }));
    payload.activeShifts = shiftsS.docs.length;
  }

  res.json(payload);
}
