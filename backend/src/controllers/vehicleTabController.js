import { db } from '../config/firebase.js';

const toISO = (v) => {
  if (!v) return null;
  return v.seconds ? new Date(v.seconds * 1000).toISOString() : new Date(v).toISOString();
};

function serializeTab(snap) {
  const d = snap.data() || {};
  return { id: snap.id, ...d, createdAt: toISO(d.createdAt) };
}

const FIELD_TYPES = ['text', 'number', 'date', 'textarea'];

export async function listVehicleTabs(req, res) {
  const snap = await db.collection('vehicleTabs').orderBy('name', 'asc').get();
  const items = snap.docs.map(serializeTab).filter((t) => t.active !== false);
  res.json({ items });
}

export async function createVehicleTab(req, res) {
  const { name, fields } = req.body;
  const trimmed = String(name || '').trim();
  if (!trimmed) return res.status(400).json({ error: 'Tab name is required' });

  const list = Array.isArray(fields) ? fields : [];
  if (!list.length) return res.status(400).json({ error: 'At least one field is required' });

  const cleanFields = [];
  for (const f of list) {
    const label = String(f?.label || '').trim();
    if (!label) return res.status(400).json({ error: 'Every field needs a label' });
    const type = FIELD_TYPES.includes(f?.type) ? f.type : 'text';
    cleanFields.push({ label, type });
  }

  const existing = await db.collection('vehicleTabs').where('name', '==', trimmed).get();
  if (!existing.empty) return res.status(409).json({ error: 'A tab with this name already exists' });

  const ref = await db.collection('vehicleTabs').add({
    name: trimmed,
    fields: cleanFields,
    active: true,
    createdBy: req.user.uid,
    createdAt: new Date()
  });
  res.status(201).json({ item: serializeTab(await ref.get()) });
}

export async function removeVehicleTab(req, res) {
  const snap = await db.collection('vehicleTabs').doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Not found' });
  await snap.ref.update({ active: false, deletedAt: new Date() });
  res.json({ ok: true });
}
