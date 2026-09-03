import { db } from '../config/firebase.js';
import { pushHistory, COLLECTIONS } from '../db/index.js';

const MASTER_COLLECTIONS = [
  'categories', 'ownershipNames', 'insuranceTypes',
  'licenseTypes', 'installmentCounts', 'states'
];

function toISO(v) {
  if (!v) return null;
  return v.seconds ? new Date(v.seconds * 1000).toISOString() : new Date(v).toISOString();
}

function serializeDoc(snap) {
  return { id: snap.id, ...snap.data(), createdAt: toISO(snap.data().createdAt) };
}

function makeController(collectionName) {
  return {
    async list(req, res) {
      const snap = await db.collection(collectionName).orderBy('name', 'asc').get();
      const items = snap.docs
        .map(serializeDoc)
        .filter((d) => d.active !== false);
      res.json({ items });
    },

    async create(req, res) {
      const { name } = req.body;
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });

      const existing = await db.collection(collectionName).where('name', '==', String(name).trim()).get();
      if (!existing.empty) return res.status(409).json({ error: 'Item already exists' });

      const ref = await db.collection(collectionName).add({
        name: String(name).trim(),
        active: true,
        createdBy: req.user.uid,
        createdAt: new Date()
      });
      res.status(201).json({ item: serializeDoc(await ref.get()) });
    },

    async update(req, res) {
      const { id } = req.params;
      const { name } = req.body;
      const snap = await db.collection(collectionName).doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: 'Not found' });

      const updates = { updatedAt: new Date(), updatedBy: req.user.uid };
      if (name) updates.name = String(name).trim();
      await db.collection(collectionName).doc(id).update(updates);
      res.json({ item: serializeDoc(await db.collection(collectionName).doc(id).get()) });
    },

    async remove(req, res) {
      const { id } = req.params;
      const snap = await db.collection(collectionName).doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: 'Not found' });
      await db.collection(collectionName).doc(id).update({ active: false, deletedAt: new Date() });
      res.json({ ok: true });
    }
  };
}

function makeStateController() {
  return {
    async listStates(req, res) {
      const snap = await db.collection('states').orderBy('name', 'asc').get();
      const items = snap.docs.map(serializeDoc).filter((d) => d.active !== false);
      res.json({ items });
    },

    async listDistricts(req, res) {
      const { stateId } = req.params;
      const snap = await db.collection('states').doc(stateId).collection('districts')
        .orderBy('name', 'asc').get();
      const items = snap.docs.map(serializeDoc).filter((d) => d.active !== false);
      res.json({ items });
    },

    async createState(req, res) {
      const { name } = req.body;
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
      const ref = await db.collection('states').add({
        name: String(name).trim(), active: true, createdBy: req.user.uid, createdAt: new Date()
      });
      res.status(201).json({ item: serializeDoc(await ref.get()) });
    },

    async createDistrict(req, res) {
      const { stateId } = req.params;
      const { name } = req.body;
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
      const stateSnap = await db.collection('states').doc(stateId).get();
      if (!stateSnap.exists) return res.status(404).json({ error: 'State not found' });
      const ref = await db.collection('states').doc(stateId).collection('districts').add({
        name: String(name).trim(), active: true, createdBy: req.user.uid, createdAt: new Date()
      });
      res.status(201).json({ item: serializeDoc(await ref.get()) });
    },

    async removeState(req, res) {
      const { id } = req.params;
      await db.collection('states').doc(id).update({ active: false });
      res.json({ ok: true });
    },

    async removeDistrict(req, res) {
      const { stateId, id } = req.params;
      await db.collection('states').doc(stateId).collection('districts').doc(id).update({ active: false });
      res.json({ ok: true });
    }
  };
}

export const masterDataControllers = {};
for (const col of MASTER_COLLECTIONS) {
  masterDataControllers[col] = makeController(col);
}
export const stateController = makeStateController();
