import { db } from '../config/firebase.js';
import {
  vehicleDocRef, vehicleDocsRef, vehicleHistoryRef, pushHistory, COLLECTIONS
} from '../db/index.js';
import { uploadFile, deleteStoredFile, readStoredFile } from '../services/storage.js';

const DOC_TYPES = ['invoice', 'rc', 'insurance', 'pollution', 'noc', 'permit', 'tax', 'other'];
const DOC_LABELS = {
  invoice: 'Invoice', rc: 'RC', insurance: 'Insurance', pollution: 'Pollution Certificate',
  noc: 'N/P / NOC', permit: 'State Permit', tax: 'Tax Receipt', other: 'Other'
};

const toISO = (v) => {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : v.seconds ? new Date(v.seconds * 1000).toISOString() : new Date(v).toISOString();
};

const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string' && v.trim() !== '') return new Date(v);
  if (v.seconds) return new Date(v.seconds * 1000);
  return null;
};

/* --------------------------------------------- serializers */
function serializeVehicle(snap) {
  const data = snap.data() || {};
  const out = { ...data, id: snap.id };

  for (const k of ['rc', 'insurance', 'pollution', 'permit', 'tax']) {
    out[k] = { ...(data[k] || {}) };
    out[k].validFrom = toISO(out[k].validFrom);
    out[k].validTo = toISO(out[k].validTo);
  }
  out.finance = { ...(data.finance || {}) };
  out.createdAt = toISO(data.createdAt);
  out.updatedAt = toISO(data.updatedAt);
  out.docsStatus = computedStatus(out);
  return out;
}

function serializeVehicleDoc(doc) {
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
    note: d.note,
    version: d.version || 1,
    active: d.active !== false,
    uploadedBy: d.uploadedBy,
    createdAt: toISO(d.createdAt),
    replacedAt: toISO(d.replacedAt)
  };
}

function computedStatus(v) {
  return {
    rc: docStatusOf(v.rc),
    insurance: docStatusOf(v.insurance),
    pollution: docStatusOf(v.pollution),
    permit: docStatusOf(v.permit),
    tax: docStatusOf(v.tax)
  };
}

function docStatusOf(section) {
  const s = section || {};
  if (!s.done) return 'not_done';
  if (!s.validTo) return 'not_done';
  const left = Math.round((new Date(s.validTo).getTime() - Date.now()) / 86400000);
  if (left < 0) return 'expired';
  if (left <= 30) return 'expiring';
  return 'valid';
}

/* --------------------------------------------- validation */
function validateVehiclePayload(body) {
  const required = [
    ['vehicleNumber', 'Vehicle Number'],
    ['rcNumber', 'RC Number'],
    ['engineNumber', 'Engine Number'],
    ['chassisNumber', 'Chassis Number'],
    ['make', 'Make'],
    ['model', 'Model']
  ];
  const errors = [];
  for (const [field, label] of required) {
    if (!String(body[field] || '').trim()) errors.push(`${label} is required`);
  }
  const vn = String(body.vehicleNumber || '').replace(/\s+/g, '').toUpperCase();
  if (vn && !/^[A-Z]{2}\d{1,2}[A-Z]{0,2}\d{3,4}$/.test(vn)) {
    errors.push('Vehicle Number must be a valid Indian registration, e.g. PB10AB1234');
  }
  const email = String(body.financeEmail || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push('Finance email is invalid');
  const phone = String(body.financePhone || '').trim();
  if (phone && !/^[0-9+\s-]{7,15}$/.test(phone)) errors.push('Finance phone is invalid');
  return { errors, vehicleNumber: vn };
}

function buildSections(body) {
  return {
    rc: {
      number: String(body.rcNumber || '').trim(),
      validFrom: toDate(body.rcValidFrom),
      validTo: toDate(body.rcValidTo),
      done: true
    },
    insurance: {
      company: String(body.insuranceCompany || '').trim(),
      policyNo: String(body.insurancePolicyNo || '').trim(),
      validFrom: toDate(body.insuranceValidFrom),
      validTo: toDate(body.insuranceValidTo),
      done: !body.insuranceNotDone,
      reason: body.insuranceNotDone ? String(body.insuranceReason || '').trim() : ''
    },
    pollution: {
      number: String(body.pollutionNumber || '').trim(),
      validFrom: toDate(body.pollutionValidFrom),
      validTo: toDate(body.pollutionValidTo),
      done: !body.pollutionNotDone
    },
    permit: {
      number: String(body.permitNumber || '').trim(),
      validFrom: toDate(body.permitValidFrom),
      validTo: toDate(body.permitValidTo),
      done: !body.permitNotDone
    },
    tax: {
      type: String(body.taxType || '').trim(),
      receiptNo: String(body.taxReceiptNumber || '').trim(),
      validFrom: toDate(body.taxValidFrom),
      validTo: toDate(body.taxValidTo),
      done: !body.taxNotDone
    },
    finance: {
      company: String(body.financeCompany || '').trim(),
      agent: String(body.financeAgent || '').trim(),
      phone: String(body.financePhone || '').trim(),
      email: String(body.financeEmail || '').trim(),
      gst: String(body.financeGst || '').trim().toUpperCase(),
      notes: String(body.financeNotes || '').trim()
    }
  };
}

function buildVehicleDoc(body, actor) {
  const sections = buildSections(body);
  return {
    vehicleNumber: body.vehicleNumber,
    company: String(body.company || '').trim(),
    customerNumber: String(body.customerNumber || '').trim(),
    typeOfEquipment: String(body.typeOfEquipment || '').trim(),
    rcNumber: String(body.rcNumber || '').trim(),
    poNumber: String(body.poNumber || '').trim(),
    engineNumber: String(body.engineNumber || '').trim(),
    chassisNumber: String(body.chassisNumber || '').trim(),
    make: String(body.make || '').trim(),
    model: String(body.model || '').trim(),
    loadingSite: String(body.loadingSite || '').trim(),
    status: body.status || 'active',
    ...sections,
    createdBy: actor?.uid || null,
    updatedBy: actor?.uid || null
  };
}

const actorName = (user) => (user && (user.data?.name || user.name || user.email)) || 'Unknown';

/* --------------------------------------------- handlers */
export async function listVehicles(req, res) {
  const { search = '', status = '', page = 1, limit = 20 } = req.query;
  let snapshot;

  if (req.user.role === 'user') {
    const driverId = req.user.data?.driverId;
    const shifts = driverId
      ? await db.collection(COLLECTIONS.shifts).where('driverId', '==', driverId).where('active', '==', true).get()
      : { docs: [] };
    const ids = shifts.docs.map((s) => s.data().vehicleId).filter(Boolean);
    if (!ids.length) return res.json({ vehicles: [], total: 0, page: 1, pages: 1 });
    const parts = await Promise.all(
      ids.slice(0, 10).map((id) => db.collection(COLLECTIONS.vehicles).doc(id).get())
    );
    snapshot = { docs: parts.filter((d) => d.exists), size: parts.filter((d) => d.exists).length };
  } else {
    snapshot = await db.collection(COLLECTIONS.vehicles).where('deleted', '==', false).get();
  }

  let vehicles = snapshot.docs.map(serializeVehicle);

  const q = String(search || '').trim().toLowerCase();
  if (q) {
    vehicles = vehicles.filter((v) =>
      [v.vehicleNumber, v.rcNumber, v.engineNumber, v.chassisNumber, v.company, v.customerNumber,
        v.make, v.model, v.rc?.number, v.insurance?.policyNo].join(' ').toLowerCase().includes(q));
  }
  if (status) {
    vehicles = vehicles.filter((v) => {
      if (v.status === status || v.overview?.status === status) return true;
      return Object.values(v.docsStatus).some((s) => s === status);
    });
  }
  vehicles.forEach((v) => {
    v.overview = overviewOf(v);
  });

  const total = vehicles.length;
  const pages = Math.max(1, Math.ceil(total / Number(limit)));
  const p = Math.min(Math.max(1, Number(page)), pages);
  const startPos = (p - 1) * Number(limit);
  res.json({ vehicles: vehicles.slice(startPos, startPos + Number(limit)), total, page: p, pages });
}

function overviewOf(v) {
  const st = Object.values(v.docsStatus);
  const expired = st.filter((s) => s === 'expired').length;
  const expiring = st.filter((s) => s === 'expiring').length;
  if (v.status === 'sold') return { status: 'sold', label: 'Sold / Transferred' };
  if (v.status === 'inactive') return { status: 'inactive', label: 'Inactive' };
  if (expired >= 2) return { status: 'expired', label: 'Multiple Documents Expired' };
  if (expired === 1) {
    const key = Object.keys(v.docsStatus).find((k) => v.docsStatus[k] === 'expired');
    return { status: 'expired', label: `${key[0].toUpperCase()}${key.slice(1)} Expired` };
  }
  if (expiring > 0) return { status: 'expiring', label: 'Documents Expiring' };
  if (v.status === 'under_finance' || (v.finance && v.finance.company)) {
    return { status: 'under_finance', label: 'Under Finance' };
  }
  return { status: 'active', label: 'Active' };
}

export async function createVehicle(req, res) {
  const { errors, vehicleNumber } = validateVehiclePayload(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const doc = buildVehicleDoc({ ...req.body, vehicleNumber }, req.user);
  const ref = await db.collection(COLLECTIONS.vehicles).add({
    ...doc, deleted: false, createdAt: new Date(), updatedAt: new Date()
  });
  await pushHistory(vehicleHistoryRef(ref.id), {
    action: 'Vehicle created',
    details: `${doc.vehicleNumber} was added`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.status(201).json({ vehicle: serializeVehicle(await ref.get()) });
}

export async function getVehicle(req, res) {
  const { id } = req.params;
  const snap = await vehicleDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' });

  const [docsS, histS] = await Promise.all([
    vehicleDocsRef(id).orderBy('createdAt', 'desc').get(),
    vehicleHistoryRef(id).orderBy('createdAt', 'desc').limit(200).get()
  ]);

  const vehicle = serializeVehicle(snap);
  const documents = docsS.docs.filter((d) => d.data().active !== false).map(serializeVehicleDoc);
  const archivedDocuments = docsS.docs.filter((d) => d.data().active === false).map(serializeVehicleDoc);
  const history = histS.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) }));

  res.json({ vehicle: { ...vehicle, documents, archivedDocuments, history } });
}

export async function updateVehicle(req, res) {
  const { id } = req.params;
  const snap = await vehicleDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' });

  const { errors, vehicleNumber } = validateVehiclePayload(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const doc = buildVehicleDoc({ ...req.body, vehicleNumber }, req.user);
  await vehicleDocRef(id).update({ ...doc, updatedAt: new Date(), updatedBy: req.user.uid });
  await pushHistory(vehicleHistoryRef(id), {
    action: 'Vehicle updated',
    details: `${doc.vehicleNumber} details were updated`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.json({ vehicle: serializeVehicle(await vehicleDocRef(id).get()) });
}

export async function deleteVehicle(req, res) {
  const { id } = req.params;
  const snap = await vehicleDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' });

  await vehicleDocRef(id).update({ deleted: true, deletedAt: new Date(), updatedBy: req.user.uid });
  await pushHistory(vehicleHistoryRef(id), {
    action: 'Vehicle archived',
    details: `${snap.data().vehicleNumber} was archived`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.json({ ok: true });
}

/* ---------------- documents ---------------- */
export async function uploadDocument(req, res) {
  const { id } = req.params;
  const v = await vehicleDocRef(id).get();
  if (!v.exists) return res.status(404).json({ error: 'Vehicle not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const type = req.body.type || 'other';
  if (!DOC_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid document type' });

  const stored = await uploadFile(req.file.buffer, {
    folder: `vehicles/${id}/documents`,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype
  });

  const ref = vehicleDocsRef(id).doc();
  await ref.set({
    type,
    label: DOC_LABELS[type] || type,
    originalName: stored.originalName,
    storagePath: stored.path,
    url: stored.url,
    mimeType: stored.mimeType,
    size: stored.size,
    expiryDate: toDate(req.body.expiryDate),
    note: String(req.body.note || '').trim(),
    version: 1,
    active: true,
    uploadedBy: actorName(req.user),
    createdAt: new Date()
  });
  await pushHistory(vehicleHistoryRef(id), {
    action: 'Document uploaded',
    details: `${stored.originalName} uploaded`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.status(201).json({ document: serializeVehicleDoc(await ref.get()) });
}

export async function replaceDocument(req, res) {
  const { id, docId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const oldRef = vehicleDocsRef(id).doc(docId);
  const oldSnap = await oldRef.get();
  if (!oldSnap.exists) return res.status(404).json({ error: 'Document not found' });

  const stored = await uploadFile(req.file.buffer, {
    folder: `vehicles/${id}/documents`,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype
  });

  const old = oldSnap.data();
  await oldRef.update({ active: false, replacedAt: new Date() });

  const ref = vehicleDocsRef(id).doc();
  await ref.set({
    ...old,
    originalName: stored.originalName,
    storagePath: stored.path,
    url: stored.url,
    mimeType: stored.mimeType,
    size: stored.size,
    version: (old.version || 1) + 1,
    active: true,
    previousDocId: docId,
    uploadedBy: actorName(req.user),
    expiryDate: old.expiryDate || toDate(req.body.expiryDate),
    note: req.body.note !== undefined ? String(req.body.note).trim() : old.note,
    createdAt: new Date()
  });

  await pushHistory(vehicleHistoryRef(id), {
    action: 'Document replaced',
    details: `Replaced ${old.originalName} with ${stored.originalName}`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.status(201).json({ document: serializeVehicleDoc(await ref.get()) });
}

export async function deleteDocument(req, res) {
  const { id, docId } = req.params;
  const ref = vehicleDocsRef(id).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Document not found' });

  await ref.update({ active: false, deletedAt: new Date() });
  await deleteStoredFile(snap.data().storagePath);
  await pushHistory(vehicleHistoryRef(id), {
    action: 'Document deleted',
    details: `Deleted ${snap.data().originalName}`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.json({ ok: true });
}

export async function vehicleHistory(req, res) {
  const { id } = req.params;
  const hist = await vehicleHistoryRef(id).orderBy('createdAt', 'desc').limit(300).get();
  res.json({
    history: hist.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) }))
  });
}

/** GET /api/vehicles/:id/documents/:docId/download — streams the stored file */
export async function downloadDocument(req, res) {
  const { id, docId } = req.params;
  const snap = await vehicleDocsRef(id).doc(docId).get();
  if (!snap.exists) return res.status(404).json({ error: 'Document not found' });

  const stored = await readStoredFile(snap.data().storagePath);
  if (!stored) return res.status(404).json({ error: 'File no longer exists in storage' });

  res.setHeader('Content-Type', stored.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${stored.originalName.replace(/"/g, '')}"`);
  res.send(stored.buffer);
}