import { db } from '../config/firebase.js';

export const COLLECTIONS = {
  users: 'users',
  vehicles: 'vehicles',
  drivers: 'drivers',
  shifts: 'shifts',
  issues: 'issues'
};

export const vehicleDocRef = (vehicleId) =>
  db.collection(COLLECTIONS.vehicles).doc(vehicleId);

export const vehicleDocsRef = (vehicleId) =>
  db.collection(COLLECTIONS.vehicles).doc(vehicleId).collection('documents');

export const vehicleHistoryRef = (vehicleId) =>
  db.collection(COLLECTIONS.vehicles).doc(vehicleId).collection('history');

export const driverDocRef = (driverId) =>
  db.collection(COLLECTIONS.drivers).doc(driverId);

export const driverDocsRef = (driverId) =>
  db.collection(COLLECTIONS.drivers).doc(driverId).collection('documents');

export const driverHistoryRef = (driverId) =>
  db.collection(COLLECTIONS.drivers).doc(driverId).collection('history');

export const shiftDocRef = (shiftId) => db.collection(COLLECTIONS.shifts).doc(shiftId);

export const issueDocRef = (issueId) => db.collection(COLLECTIONS.issues).doc(issueId);

export const issueMessagesRef = (issueId) =>
  db.collection(COLLECTIONS.issues).doc(issueId).collection('messages');

export const userDocRef = (uid) => db.collection(COLLECTIONS.users).doc(uid);

/** Write a history entry. Prints a plain object, safe for Firestore. */
export const pushHistory = async (ref, entry) => {
  const clean = {
    action: entry.action,
    details: entry.details || '',
    actorId: entry.actorId || null,
    actorName: entry.actorName || 'System',
    createdAt: entry.createdAt || new Date()
  };
  await ref.add(clean);
  return clean;
};

export const now = () => new Date();