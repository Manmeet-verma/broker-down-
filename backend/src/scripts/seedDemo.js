import { auth, db } from '../config/firebase.js';
import { ENV } from '../config/env.js';
import { userDocRef, COLLECTIONS, pushHistory } from '../db/index.js';
import { usernameToEmail } from '../utils/validators.js';

const emailUid = (email) => email.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);

const DAY = 86400000;
const dateIn = (daysFromNow) => new Date(Date.now() + daysFromNow * DAY);
const isoDate = (d) => d.toISOString().slice(0, 10);

const VEHICLES = [
  {
    vehicleNumber: 'PB10AB1234', company: 'TruckLine Logistics', customerNumber: 'CUST-1001',
    typeOfEquipment: 'Truck - 14 ft', rcNumber: 'PB10-2019-884512', poNumber: 'PO-22014',
    engineNumber: 'ENG-4JX-889021', chassisNumber: 'CHS-4JX-4412-9981', make: 'Tata', model: 'LPT 1613',
    loadingSite: 'Ludhiana - Grain Market', status: 'active',
    rc: { number: 'PB10-2019-884512', validFrom: dateIn(-400), validTo: dateIn(400), done: true },
    insurance: { company: 'New India Assurance', policyNo: 'NI-2026-551204', validFrom: dateIn(-120), validTo: dateIn(240), done: true },
    pollution: { number: 'PUC-PB10-6641', validFrom: dateIn(-150), validTo: dateIn(210), done: true },
    permit: { number: 'PER-ND-88213', validFrom: dateIn(-500), validTo: dateIn(500), done: true },
    tax: { type: 'State Tax', receiptNo: 'TAX-22688', validFrom: dateIn(-200), validTo: dateIn(160), done: true },
    finance: { company: 'Chola Finance', agent: 'R. Verma', phone: '9876543210', email: 'finance@cholafin.com', gst: '06AAACF1050B1ZM', notes: 'EMI cleared Apr 2026' }
  },
  {
    vehicleNumber: 'DL1GC3345', company: 'TruckLine Logistics', customerNumber: 'CUST-1002',
    typeOfEquipment: 'Truck - 19 ft', rcNumber: 'DL1-2021-339102', poNumber: 'PO-22015',
    engineNumber: 'ENG-6LX-102233', chassisNumber: 'CHS-6LX-7710-3345', make: 'Ashok Leyland', model: 'Ecomet 1914',
    loadingSite: 'Delhi - Azadpur Mandi', status: 'active',
    rc: { number: 'DL1-2021-339102', validFrom: dateIn(-300), validTo: dateIn(500), done: true },
    insurance: { company: 'ICICI Lombard', policyNo: 'ICL-2026-88017', validFrom: dateIn(-250), validTo: dateIn(115), done: true },
    pollution: { number: 'PUC-DL1-2208', validFrom: dateIn(-100), validTo: dateIn(20), done: true },
    permit: { number: 'PER-NCR-77110', validFrom: dateIn(-600), validTo: dateIn(600), done: true },
    tax: { type: 'State Tax', receiptNo: 'TAX-44190', validFrom: dateIn(-300), validTo: dateIn(60), done: true },
    finance: { company: '', agent: '', phone: '', email: '', gst: '', notes: '' }
  },
  {
    vehicleNumber: 'HR38AB7788', company: 'FastTrack Carriers', customerNumber: 'CUST-1101',
    typeOfEquipment: 'Container Trailer', rcNumber: 'HR38-2020-551277', poNumber: 'PO-22100',
    engineNumber: 'ENG-5SA-445012', chassisNumber: 'CHS-5SA-9008-7788', make: 'Eicher', model: 'Pro 3015',
    loadingSite: 'Gurugram - IMT Manesar', status: 'under_finance',
    rc: { number: 'HR38-2020-551277', validFrom: dateIn(-700), validTo: dateIn(-40), done: true },
    insurance: { company: 'Bajaj Allianz', policyNo: 'BA-2025-11092', validFrom: dateIn(-400), validTo: dateIn(-30), done: true },
    pollution: { number: 'PUC-HR38-9911', validFrom: dateIn(-30), validTo: dateIn(5), done: true },
    permit: { number: '', validFrom: null, validTo: null, done: false },
    tax: { type: '', receiptNo: '', validFrom: null, validTo: null, done: false },
    finance: { company: 'Shriram Finance', agent: 'A. Khatri', phone: '9811223344', email: 'khatri@shriram.com', gst: '06AACFS3048P1Z2', notes: 'EMI ongoing till Mar 2028' }
  },
  {
    vehicleNumber: 'PB65CD9988', company: 'FastTrack Carriers', customerNumber: 'CUST-1102',
    typeOfEquipment: 'Truck - 32 ft', rcNumber: 'PB65-2018-120044', poNumber: 'PO-22101',
    engineNumber: 'ENG-8CN-778812', chassisNumber: 'CHS-8CN-3300-9988', make: 'BharatBenz', model: '2823R',
    loadingSite: 'Jalandhar - Sodal Road', status: 'active',
    rc: { number: 'PB65-2018-120044', validFrom: dateIn(-900), validTo: dateIn(100), done: true },
    insurance: { company: 'HDFC ERGO', policyNo: 'HE-2026-33021', validFrom: dateIn(-80), validTo: dateIn(280), done: true },
    pollution: { number: 'PUC-PB65-4417', validFrom: dateIn(-120), validTo: dateIn(8), done: true },
    permit: { number: 'PER-PB-55001', validFrom: dateIn(-100), validTo: dateIn(30), done: true },
    tax: { type: 'State Tax', receiptNo: 'TAX-88215', validFrom: dateIn(-250), validTo: dateIn(110), done: true },
    finance: { company: '', agent: '', phone: '', email: '', gst: '', notes: '' }
  },
  {
    vehicleNumber: 'UP16AT1122', company: 'TruckLine Logistics', customerNumber: 'CUST-1003',
    typeOfEquipment: 'Truck - 22 ft', rcNumber: 'UP16-2022-771044', poNumber: 'PO-22016',
    engineNumber: 'ENG-3KX-662310', chassisNumber: 'CHS-3KX-1144-1122', make: 'Mahindra', model: 'Blazo X 31',
    loadingSite: 'Ghaziabad - Tronica City', status: 'inactive',
    rc: { number: 'UP16-2022-771044', validFrom: dateIn(-200), validTo: dateIn(560), done: true },
    insurance: { company: 'Reliance General', policyNo: 'RG-2025-44116', validFrom: dateIn(-500), validTo: dateIn(-60), done: true },
    pollution: { number: '', validFrom: null, validTo: null, done: false },
    permit: { number: 'PER-UP-22130', validFrom: dateIn(-300), validTo: dateIn(300), done: true },
    tax: { type: 'State Tax', receiptNo: 'TAX-11024', validFrom: dateIn(-100), validTo: dateIn(260), done: true },
    finance: { company: '', agent: '', phone: '', email: '', gst: '', notes: '' }
  }
];

const DRIVERS = [
  {
    name: 'Harjit Singh', pin: '2211', dob: dateIn(-10400), phone: '9876543201', alternatePhone: '',
    aadhaar: '601122334455', address: 'Village Dhandra, Ludhiana, Punjab', vehicleCategory: 'Heavy Vehicle',
    license: { number: 'PB10-2018-441290', authority: 'RTO Ludhiana', validFrom: dateIn(-1600), validTo: dateIn(400), type: 'Heavy Vehicle', otherType: '', isDone: true },
    shift: { preset: 'morning', startTime: '06:00', endTime: '14:00' },
    status: 'active', username: 'harjit', password: 'Driver@123'
  },
  {
    name: 'Ramesh Kumar', pin: '3344', dob: dateIn(-9800), phone: '9876543202', alternatePhone: '9812345678',
    aadhaar: '602233445566', address: 'Narela, Delhi - 110040', vehicleCategory: 'Heavy Vehicle',
    license: { number: 'DL1-2019-882401', authority: 'RTO Delhi', validFrom: dateIn(-1400), validTo: dateIn(300), type: 'Heavy Vehicle', otherType: '', isDone: true },
    shift: { preset: 'night', startTime: '22:00', endTime: '06:00' },
    status: 'active', username: 'ramesh', password: 'Driver@123'
  },
  {
    name: 'Mandeep Kaur', pin: '4455', dob: dateIn(-7600), phone: '9876543203', alternatePhone: '',
    aadhaar: '603344556677', address: 'Sector 45, Gurugram, Haryana', vehicleCategory: 'LMV',
    license: { number: 'HR38-2021-118822', authority: 'RTO Gurugram', validFrom: dateIn(-1000), validTo: dateIn(-20), type: 'LMV', otherType: '', isDone: true },
    shift: { preset: 'evening', startTime: '14:00', endTime: '22:00' },
    status: 'active', username: 'mandeep', password: 'Driver@123'
  },
  {
    name: 'Sukhwinder Singh', pin: '5566', dob: dateIn(-11500), phone: '9876543204', alternatePhone: '',
    aadhaar: '604455667788', address: 'Model Town, Jalandhar, Punjab', vehicleCategory: 'Heavy Vehicle',
    license: { number: 'PB65-2017-665501', authority: 'RTO Jalandhar', validFrom: dateIn(-2400), validTo: dateIn(-200), type: 'Heavy Vehicle', otherType: '', isDone: true },
    shift: { preset: 'morning', startTime: '06:00', endTime: '14:00' },
    status: 'on_leave', username: 'sukhwinder', password: 'Driver@123'
  }
];

const ISSUES = [
  {
    category: 'Brakes', title: 'Brake pads worn out', priority: 'high',
    description: 'Braking feels spongy on the Ludhiana-Delhi highway run. Needs immediate inspection before next trip.',
    status: 'pending'
  },
  {
    category: 'GPS / Tracking', title: 'GPS not updating location', priority: 'medium',
    description: 'Device shows the vehicle parked even while on the move. May need reboot or replacement.',
    status: 'accepted'
  },
  {
    category: 'Battery', title: 'Battery drained overnight', priority: 'critical',
    description: 'Truck would not start this morning. Jump start done, battery likely needs replacement.',
    status: 'resolved',
    acceptedBy: { uid: null, name: 'System Admin' },
    resolvedBy: { uid: null, name: 'System Admin' },
    resolutionNote: 'Battery replaced under warranty; alternator checked and working fine.',
    messages: [
      { text: 'We have booked a mechanic to your location. ETA 1 hour.', senderRole: 'admin', system: true },
      { text: 'Battery replaced, truck starting fine now.', senderRole: 'user', system: false }
    ]
  }
];

async function ensureAdmin() {
  const uid = emailUid(ENV.adminEmail);
  const existing = await userDocRef(uid).get();
  if (existing.exists) return;
  try {
    await auth.createUser({ email: ENV.adminEmail, password: ENV.adminPassword, displayName: ENV.adminName });
  } catch (err) {
    if (err.code !== 'auth/email-already-exists') throw err;
  }
  const fbUser = await auth.getUserByEmail(ENV.adminEmail);
  await auth.setCustomUserClaims(fbUser.uid, { role: 'admin' });
  await userDocRef(fbUser.uid).set({
    uid: fbUser.uid, email: ENV.adminEmail, username: ENV.adminUsername, name: ENV.adminName,
    phone: ENV.adminPhone || null, role: 'admin', status: 'active', createdBy: 'system', createdAt: new Date()
  });
  console.log('Admin account ensured.');
}

async function seedDrivers() {
  const snap = await db.collection(COLLECTIONS.drivers).get();
  if (snap.size > 0) {
    console.log(`Drivers already exist (${snap.size}). Skipping driver seeding.`);
    return snap.docs.map((d) => d.id);
  }

  const ids = [];
  for (const d of DRIVERS) {
    const ref = db.collection(COLLECTIONS.drivers).doc();
    let userId = null;
    try {
      const email = usernameToEmail(d.username);
      const fbUser = await auth.createUser({ email, password: d.password, displayName: d.name });
      await auth.setCustomUserClaims(fbUser.uid, { role: 'user' });
      await userDocRef(fbUser.uid).set({
        uid: fbUser.uid, email, username: d.username, name: d.name, phone: d.phone,
        role: 'user', status: 'active', createdAt: new Date(), createdBy: ENV.adminEmail
      });
      userId = fbUser.uid;
      console.log(`  Driver login created: ${email} / ${d.password}`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        const found = await auth.getUserByEmail(usernameToEmail(d.username));
        userId = found.uid;
      } else {
        throw err;
      }
    }

    await ref.set({
      name: d.name, pin: d.pin, dob: d.dob, phone: d.phone, alternatePhone: d.alternatePhone,
      aadhaar: d.aadhaar, address: d.address, photo: null,
      license: { ...d.license, validFrom: d.license.validFrom, validTo: d.license.validTo },
      vehicleCategory: d.vehicleCategory, status: d.status,
      shift: { preset: d.shift.preset, startTime: d.shift.startTime, endTime: d.shift.endTime },
      userId, createdBy: ENV.adminEmail, updatedBy: ENV.adminEmail,
      createdAt: new Date(), updatedAt: new Date()
    });
    if (userId) await userDocRef(userId).update({ driverId: ref.id });
    await pushHistory(db.collection(COLLECTIONS.drivers).doc(ref.id).collection('history'), {
      action: 'Account created', details: `Driver ${d.name} registered with a login account`, actorId: ENV.adminEmail
    });
    ids.push(ref.id);
  }
  console.log(`Seeded ${ids.length} drivers.`);
  return ids;
}

async function seedVehicles() {
  const snap = await db.collection(COLLECTIONS.vehicles).where('deleted', '==', false).get();
  if (snap.size > 0) {
    console.log(`Vehicles already exist (${snap.size}). Skipping vehicle seeding.`);
    return snap.docs.reduce((m, d) => ((m[d.data().vehicleNumber] = d.id), m), {});
  }

  const map = {};
  for (const v of VEHICLES) {
    const ref = await db.collection(COLLECTIONS.vehicles).add({
      ...v,
      createdAt: new Date(), updatedAt: new Date(), deleted: false,
      createdBy: ENV.adminEmail, updatedBy: ENV.adminEmail
    });
    await pushHistory(db.collection(COLLECTIONS.vehicles).doc(ref.id).collection('history'), {
      action: 'Vehicle created', details: `${v.vehicleNumber} was added (demo data)`, actorId: ENV.adminEmail
    });
    map[v.vehicleNumber] = ref.id;
  }
  console.log(`Seeded ${Object.keys(map).length} vehicles.`);
  return map;
}

async function seedShifts(vehicleMap, driverIds) {
  const snap = await db.collection(COLLECTIONS.shifts).get();
  if (snap.size > 0) {
    console.log(`Shifts already exist (${snap.size}). Skipping shift seeding.`);
    return;
  }

  const plan = [
    { v: 'PB10AB1234', d: 0, type: 'day' },
    { v: 'DL1GC3345', d: 1, type: 'night' },
    { v: 'HR38AB7788', d: 2, type: 'day' },
    { v: 'PB65CD9988', d: 0, type: 'day' }
  ];
  for (const p of plan) {
    await db.collection(COLLECTIONS.shifts).add({
      driverId: driverIds[p.d], vehicleId: vehicleMap[p.v], shiftType: p.type,
      date: isoDate(dateIn(0)), active: true,
      assignedBy: ENV.adminEmail, createdBy: ENV.adminEmail,
      createdAt: new Date(), updatedAt: new Date()
    });
  }
  console.log(`Seeded ${plan.length} shifts.`);
}

async function seedIssues(vehicleMap, driverIds) {
  const snap = await db.collection(COLLECTIONS.issues).get();
  if (snap.size > 0) {
    console.log(`Issues already exist (${snap.size}). Skipping issue seeding.`);
    return;
  }

  const driverOf = (vehicleNumber) => {
    const plan = { PB10AB1234: 0, DL1GC3345: 1, HR38AB7788: 2 };
    return driverIds[plan[vehicleNumber]];
  };

  let i = 0;
  for (const iss of ISSUES) {
    const vehicleNumber = ['PB10AB1234', 'DL1GC3345', 'HR38AB7788'][i++ % 3];
    const ref = db.collection(COLLECTIONS.issues).doc();
    const reportedBy = { uid: driverOf(vehicleNumber) || null, name: DRIVERS[i - 1] ? DRIVERS[i - 1].name : 'Driver' };
    await ref.set({
      vehicleId: vehicleMap[vehicleNumber],
      vehicleNumber,
      driverId: driverOf(vehicleNumber) || null,
      driverName: reportedBy.name,
      shiftId: null,
      category: iss.category, title: iss.title, description: iss.description,
      priority: iss.priority, status: iss.status, images: [],
      reportedBy,
      acceptedBy: iss.acceptedBy || null,
      resolvedBy: iss.resolvedBy || null,
      resolutionNote: iss.resolutionNote || '',
      createdAt: dateIn(-(i + 1) * 2), updatedAt: dateIn(-1)
    });
    for (const m of iss.messages || []) {
      await db.collection(COLLECTIONS.issues).doc(ref.id).collection('messages').add({
        text: m.text, attachments: [], senderId: m.senderRole === 'admin' ? ENV.adminEmail : reportedBy.uid,
        senderName: m.senderRole === 'admin' ? ENV.adminName : reportedBy.name,
        senderRole: m.senderRole, system: m.system, createdAt: dateIn(-1)
      });
    }
    await pushHistory(db.collection(COLLECTIONS.vehicles).doc(vehicleMap[vehicleNumber]).collection('history'), {
      action: 'Issue reported', details: `Issue "${iss.title}" reported`, actorId: reportedBy.uid
    });
  }
  console.log(`Seeded ${ISSUES.length} issues.`);
}

async function main() {
  console.log('Seeding demo data...');
  await ensureAdmin();
  const driverIds = await seedDrivers();
  const vehicleMap = await seedVehicles();
  await seedShifts(vehicleMap, driverIds);
  await seedIssues(vehicleMap, driverIds);
  console.log('Demo data seeding complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
