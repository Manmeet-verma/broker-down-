import { db } from '../config/firebase.js';
import {
  vehicleDocRef, vehicleDocsRef, vehicleHistoryRef, pushHistory, COLLECTIONS
} from '../db/index.js';
import { uploadFile, deleteStoredFile, readStoredFile } from '../services/storage.js';

const DOC_TYPES = ['invoice', 'rc', 'insurance', 'pollution', 'noc', 'permit', 'tax', 'other', 'ownership', 'loan_schedule', 'joining_form'];
const DOC_LABELS = {
  invoice: 'Invoice', rc: 'RC', insurance: 'Insurance', pollution: 'Pollution Certificate',
  noc: 'N/P / NOC', permit: 'State Permit', tax: 'Tax Receipt', other: 'Other',
  ownership: 'Ownership', loan_schedule: 'Loan Schedule', joining_form: 'Joining Form'
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

function serializeVehicle(snap) {
  const data = snap.data() || {};
  const out = { ...data, id: snap.id };

  for (const k of ['rc', 'insurance', 'pollution', 'permit', 'tax']) {
    out[k] = { ...(data[k] || {}) };
    out[k].validFrom = toISO(out[k].validFrom);
    out[k].validTo = toISO(out[k].validTo);
  }
  out.finance = { ...(data.finance || {}) };
  out.supply = { ...(data.supply || {}) };
  out.invoice = { ...(data.invoice || {}) };
  out.agentDetails = { ...(data.agentDetails || {}) };
  out.trallow = { ...(data.trallow || {}) };
  out.workingSite = { ...(data.workingSite || {}) };
  out.ownershipHistory = (data.ownershipHistory || []).map(h => ({
    ...h, changedAt: toISO(h.changedAt)
  }));
  out.taxes = (data.taxes || []).map(t => ({ ...t }));
  out.createdAt = toISO(data.createdAt);
  out.updatedAt = toISO(data.updatedAt);
  out.docsStatus = computedStatus(out);
  return out;
}

function serializeVehicleDoc(doc) {
  const d = doc.data();
  return {
    id: doc.id, type: d.type, label: d.label, name: d.originalName || d.name,
    storagePath: d.storagePath, url: d.url, mime: d.mimeType || d.mime,
    size: d.size, expiryDate: toISO(d.expiryDate), note: d.note,
    version: d.version || 1, active: d.active !== false,
    uploadedBy: d.uploadedBy, createdAt: toISO(d.createdAt), replacedAt: toISO(d.replacedAt)
  };
}

function computedStatus(v) {
  return {
    rc: docStatusOf(v.rc),
    insurance: docStatusOf(v.insurance),
    pollution: docStatusOf(v.pollution),
    permit: docStatusOf(v.permit),
    tax: docStatusOf(v.tax),
    nationalPermit: docStatusOf(v.nationalPermit)
  };
}

function docStatusOf(section) {
  const s = section || {};
  if (s.done === false) return 'not_done';
  if (!s.validTo && !s.period) return 'not_done';
  const date = s.validTo || s.period;
  if (!date) return 'not_done';
  const left = Math.round((new Date(date).getTime() - Date.now()) / 86400000);
  if (left < 0) return 'expired';
  if (left <= 30) return 'expiring';
  return 'valid';
}

function buildVehicleDoc(body, actor) {
  const p = (v) => String(v || '').trim();
  const n = (v) => v ? Number(v) : null;
  const b = (v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1;
  const bd = (v, fallback) => (v === undefined || v === null || v === '' ? fallback : b(v));

  return {
    categoryId: p(body.categoryId), categoryName: p(body.categoryName),
    type: p(body.type) || 'company',
    vehicleNumber: p(body.vehicleNumber), serialNumber: p(body.serialNumber),
    applicableNoType: p(body.applicableNoType) || 'serial',
    applicableSerialNo: p(body.applicableSerialNo), applicableRcNo: p(body.applicableRcNo),
    engineNumber: p(body.engineNumber), chassisNumber: p(body.chassisNumber),
    make: p(body.make), model: p(body.model),
    ownershipId: p(body.ownershipId), ownershipName: p(body.ownershipName),
    ownershipHistory: body.ownershipHistory || [],

    supply: {
      supplierName: p(body.supplySupplierName),
      salesValue: n(body.supplySalesValue),
      gstPercent: n(body.supplyGstPercent),
      gstAmount: n(body.supplyGstAmount),
      totalAmount: n(body.supplyTotalAmount),
      tcs: n(body.supplyTcs),
      otherLabel: p(body.supplyOtherLabel),
      otherAmount: n(body.supplyOtherAmount)
    },

    invoice: {
      invoiceNo: p(body.invoiceInvoiceNo),
      invoiceDate: p(body.invoiceInvoiceDate),
      buyerBilling: p(body.invoiceBuyerBilling),
      buyerGstNo: p(body.invoiceBuyerGstNo),
      buyerAddress: p(body.invoiceBuyerAddress),
      rcValidFrom: p(body.invoiceRcValidFrom),
      rcValidTo: p(body.invoiceRcValidTo)
    },

    insurance: {
      companyId: p(body.insuranceCompanyId),
      companyName: p(body.insuranceCompanyName),
      premiumAmount: n(body.insurancePremiumAmount),
      gstPercent: n(body.insuranceGstPercent),
      gstAmount: n(body.insuranceGstAmount),
      totalAmount: n(body.insuranceTotalAmount),
      applicable: bd(body.insuranceApplicable, true),
      validFrom: toDate(body.insuranceValidFrom),
      validTo: toDate(body.insuranceValidTo)
    },

    insuranceType: { id: p(body.insuranceTypeId), name: p(body.insuranceTypeName) },
    insurancePeriod: p(body.insurancePeriod),

    agentDetails: {
      name: p(body.agentName), code: p(body.agentCode), email: p(body.agentEmail),
      invoiceNo: p(body.agentInvoiceNo), gstAmount: n(body.agentGstAmount),
      totalValue: n(body.agentTotalValue)
    },

    pollution: {
      applicable: bd(body.pollutionApplicable, true),
      period: p(body.pollutionPeriod),
      validTo: toDate(body.pollutionPeriodEnd)
    },

    statePeriod: {
      applicable: b(body.statePeriodApplicable),
      period: p(body.statePeriodPeriod),
      validTo: toDate(body.statePeriodPeriodEnd)
    },

    nationalPermit: {
      applicable: b(body.nationalPermitApplicable),
      period: p(body.nationalPermitPeriod),
      validTo: toDate(body.nationalPermitPeriodEnd)
    },

    equipmentFinanced: b(body.equipmentFinanced),
    equipmentFree: bd(body.equipmentFree, true),
    finance: {
      financedBy: p(body.financeFinancedBy),
      financedAmount: n(body.financeFinancedAmount),
      earnestMoney: n(body.financeEarnestMoney),
      totalPercent: n(body.financeTotalPercent),
      installmentCountId: p(body.financeInstallmentCountId),
      installmentCount: p(body.financeInstallmentCount),
      installmentFree: b(body.financeInstallmentFree),
      emailFinancer: p(body.financeEmailFinancer)
    },

    taxes: body.taxes || [],

    workingSite: {
      reason: p(body.workingSiteReason),
      orderBy: p(body.workingSiteOrderBy)
    },

    transmitInsurance: b(body.transmitInsurance),
    evApplicable: b(body.evApplicable),
    challanApplicable: b(body.challanApplicable),
    billApplicable: b(body.billApplicable),

    trallow: {
      applicable: b(body.trallowApplicable),
      trallowNo: p(body.trallowNo),
      trallowName: p(body.trallowName),
      freightAmount: n(body.trallowFreightAmount)
    },

    workflowStage: 'inputter',
    workflowHistory: [],
    status: 'active',

    createdBy: actor?.uid || null,
    updatedBy: actor?.uid || null
  };
}

const actorName = (user) => (user && (user.data?.name || user.name || user.email)) || 'Unknown';

export async function listVehicles(req, res) {
  const { search = '', status = '', workflow = '', page = 1, limit = 50 } = req.query;
  let snapshot;

  if (req.user.role !== 'admin') {
    const driverId = req.user.data?.driverId;
    const shifts = driverId
      ? await db.collection(COLLECTIONS.shifts).where('driverId', '==', driverId).where('active', '==', true).get()
      : { docs: [] };
    const ids = shifts.docs.map((s) => s.data().vehicleId).filter(Boolean);
    if (!ids.length && req.user.role !== 'admin') return res.json({ vehicles: [], total: 0, page: 1, pages: 1 });
    if (ids.length) {
      const parts = await Promise.all(ids.slice(0, 30).map((id) => db.collection(COLLECTIONS.vehicles).doc(id).get()));
      snapshot = { docs: parts.filter((d) => d.exists), size: parts.filter((d) => d.exists).length };
    } else {
      snapshot = await db.collection(COLLECTIONS.vehicles).where('deleted', '==', false).get();
    }
  } else {
    snapshot = await db.collection(COLLECTIONS.vehicles).where('deleted', '==', false).get();
  }

  let vehicles = snapshot.docs.map(serializeVehicle);
  const q = String(search || '').trim().toLowerCase();
  if (q) {
    vehicles = vehicles.filter((v) =>
      [v.vehicleNumber, v.serialNumber, v.engineNumber, v.chassisNumber, v.company, v.make, v.model,
       v.insurance?.companyName, v.categoryName, v.ownershipName].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }
  if (status) vehicles = vehicles.filter((v) => v.status === status || Object.values(v.docsStatus || {}).includes(status));
  if (workflow) vehicles = vehicles.filter((v) => (v.workflowStage || 'inputter') === workflow);

  vehicles.forEach((v) => { v.overview = overviewOf(v); });

  const total = vehicles.length;
  const pages = Math.max(1, Math.ceil(total / Number(limit)));
  const p = Math.min(Math.max(1, Number(page)), pages);
  const startPos = (p - 1) * Number(limit);
  res.json({ vehicles: vehicles.slice(startPos, startPos + Number(limit)), total, page: p, pages });
}

function overviewOf(v) {
  const st = Object.values(v.docsStatus || {});
  const expired = st.filter((s) => s === 'expired').length;
  const expiring = st.filter((s) => s === 'expiring').length;
  if (v.status === 'sold') return { status: 'sold', label: 'Sold / Transferred' };
  if (v.status === 'inactive') return { status: 'inactive', label: 'Inactive' };
  if (expired >= 2) return { status: 'expired', label: 'Multiple Documents Expired' };
  if (expired === 1) return { status: 'expired', label: 'Document Expired' };
  if (expiring > 0) return { status: 'expiring', label: 'Documents Expiring' };
  return { status: 'active', label: 'Active' };
}

export async function createVehicle(req, res) {
  const body = { ...req.body };
  if (req.files && req.files.length) {
    for (const f of req.files) {
      if (body[f.fieldname]) continue;
      const stored = await uploadFile(f.buffer, {
        folder: `vehicles/temp/documents`, originalName: f.originalname, mimeType: f.mimetype
      });
      if (!body._pendingUploads) body._pendingUploads = [];
      body._pendingUploads.push({ field: f.fieldname, ...stored });
    }
  }

  const vn = String(body.vehicleNumber || '').trim().toUpperCase();
  if (!vn) return res.status(400).json({ error: 'Vehicle number is required' });

  const doc = buildVehicleDoc({ ...body, vehicleNumber: vn }, req.user);
  const ref = await db.collection(COLLECTIONS.vehicles).add({
    ...doc, deleted: false, createdAt: new Date(), updatedAt: new Date()
  });

  if (body._pendingUploads) {
    for (const upload of body._pendingUploads) {
      const newFolder = `vehicles/${ref.id}/documents`;
      const newPath = upload.path.replace('vehicles/temp/', `vehicles/${ref.id}/`);
      const docRef = vehicleDocsRef(ref.id).doc();
      await docRef.set({
        type: upload.field, label: DOC_LABELS[upload.field] || upload.field,
        originalName: upload.originalName, storagePath: newPath,
        url: upload.url, mimeType: upload.mimeType, size: upload.size,
        version: 1, active: true, uploadedBy: actorName(req.user), createdAt: new Date()
      });
    }
  }

  await pushHistory(vehicleHistoryRef(ref.id), {
    action: 'Vehicle created', details: `${vn} was added by ${actorName(req.user)}`,
    actorId: req.user.uid, actorName: actorName(req.user)
  });
  res.status(201).json({ vehicle: serializeVehicle(await ref.get()) });
}

export async function getVehicle(req, res) {
  const { id } = req.params;
  const snap = await vehicleDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' });

  const [docsS, histS] = await Promise.all([
    vehicleDocsRef(id).orderBy('createdAt', 'desc').get(),
    vehicleHistoryRef(id).orderBy('createdAt', 'desc').limit(500).get()
  ]);

  const vehicle = serializeVehicle(snap);
  vehicle.documents = docsS.docs.filter((d) => d.data().active !== false).map(serializeVehicleDoc);
  vehicle.archivedDocuments = docsS.docs.filter((d) => d.data().active === false).map(serializeVehicleDoc);
  vehicle.history = histS.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) }));
  res.json({ vehicle });
}

export async function updateVehicle(req, res) {
  const { id } = req.params;
  const snap = await vehicleDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' });

  const body = { ...req.body };
  const vn = String(body.vehicleNumber || snap.data().vehicleNumber || '').trim().toUpperCase();
  const doc = buildVehicleDoc({ ...body, vehicleNumber: vn }, req.user);

  const changes = [];
  const oldData = snap.data();
  for (const key of ['categoryId', 'type', 'vehicleNumber', 'make', 'model', 'ownershipName']) {
    if (doc[key] !== oldData[key]) changes.push(key);
  }
  if (changes.length) {
    await pushHistory(vehicleHistoryRef(id), {
      action: 'Vehicle updated', details: `Updated: ${changes.join(', ')}`,
      actorId: req.user.uid, actorName: actorName(req.user)
    });
  }

  await vehicleDocRef(id).update({ ...doc, updatedAt: new Date(), updatedBy: req.user.uid });
  res.json({ vehicle: serializeVehicle(await vehicleDocRef(id).get()) });
}

export async function deleteVehicle(req, res) {
  const { id } = req.params;
  const snap = await vehicleDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' });

  await vehicleDocRef(id).update({ deleted: true, deletedAt: new Date(), updatedBy: req.user.uid });
  await pushHistory(vehicleHistoryRef(id), {
    action: 'Vehicle archived', details: `${snap.data().vehicleNumber} was archived`,
    actorId: req.user.uid, actorName: actorName(req.user)
  });
  res.json({ ok: true });
}

export async function workflowAction(req, res) {
  const { id } = req.params;
  const { action, note } = req.body;
  const snap = await vehicleDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' });

  const data = snap.data();
  const stage = data.workflowStage || 'inputter';
  const role = req.user.role;
  let newStage = stage;

  if (action === 'recommend' && (role === 'recommender' || role === 'admin') && stage === 'inputter') {
    newStage = 'recommended';
  } else if (action === 'verify' && (role === 'verifier' || role === 'admin') && stage === 'recommended') {
    newStage = 'verified';
  } else if (action === 'approve' && role === 'admin' && stage === 'verified') {
    newStage = 'approved';
  } else if (action === 'reject' && ['recommender', 'verifier', 'admin'].includes(role)) {
    newStage = 'inputter';
  } else {
    return res.status(400).json({ error: `Cannot ${action} at stage ${stage} with role ${role}` });
  }

  const historyEntry = {
    stage: newStage, action, note: note || '',
    by: actorName(req.user), byId: req.user.uid, at: new Date()
  };

  const currentHistory = data.workflowHistory || [];
  await vehicleDocRef(id).update({
    workflowStage: newStage, workflowHistory: [...currentHistory, historyEntry],
    updatedAt: new Date(), updatedBy: req.user.uid
  });

  await pushHistory(vehicleHistoryRef(id), {
    action: `Workflow: ${action}`, details: `Stage changed to ${newStage}${note ? ': ' + note : ''}`,
    actorId: req.user.uid, actorName: actorName(req.user)
  });

  res.json({ ok: true, workflowStage: newStage });
}

export async function getExpiringDocuments(req, res) {
  const { days = 30 } = req.params;
  const snapshot = await db.collection(COLLECTIONS.vehicles).where('deleted', '==', false).get();
  const vehicles = snapshot.docs.map(serializeVehicle);
  const cutoff = Number(days);
  const expiring = [];

  for (const v of vehicles) {
    const docs = ['rc', 'insurance', 'pollution', 'permit', 'tax', 'nationalPermit'];
    for (const doc of docs) {
      const section = v[doc];
      if (!section) continue;
      const date = section.validTo || section.period;
      if (!date) continue;
      const daysLeft = Math.round((new Date(date).getTime() - Date.now()) / 86400000);
      if (daysLeft <= cutoff) {
        expiring.push({
          vehicleId: v.id, vehicleNumber: v.vehicleNumber, documentType: doc,
          validTo: date, daysLeft, status: daysLeft < 0 ? 'expired' : 'expiring'
        });
      }
    }
  }
  expiring.sort((a, b) => a.daysLeft - b.daysLeft);
  res.json({ expiring });
}

export async function vehicleHistory(req, res) {
  const { id } = req.params;
  const hist = await vehicleHistoryRef(id).orderBy('createdAt', 'desc').limit(500).get();
  res.json({ history: hist.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) })) });
}

export async function uploadDocument(req, res) {
  const { id } = req.params;
  const v = await vehicleDocRef(id).get();
  if (!v.exists) return res.status(404).json({ error: 'Vehicle not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const type = req.body.type || 'other';
  const stored = await uploadFile(req.file.buffer, {
    folder: `vehicles/${id}/documents`, originalName: req.file.originalname, mimeType: req.file.mimetype
  });

  const ref = vehicleDocsRef(id).doc();
  await ref.set({
    type, label: DOC_LABELS[type] || type, originalName: stored.originalName,
    storagePath: stored.path, url: stored.url, mimeType: stored.mimeType, size: stored.size,
    expiryDate: toDate(req.body.expiryDate), note: String(req.body.note || '').trim(),
    version: 1, active: true, uploadedBy: actorName(req.user), createdAt: new Date()
  });
  await pushHistory(vehicleHistoryRef(id), {
    action: 'Document uploaded', details: `${stored.originalName} uploaded`,
    actorId: req.user.uid, actorName: actorName(req.user)
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
    folder: `vehicles/${id}/documents`, originalName: req.file.originalname, mimeType: req.file.mimetype
  });

  const old = oldSnap.data();
  await oldRef.update({ active: false, replacedAt: new Date() });

  const ref = vehicleDocsRef(id).doc();
  await ref.set({
    ...old, originalName: stored.originalName, storagePath: stored.path,
    url: stored.url, mimeType: stored.mimeType, size: stored.size,
    version: (old.version || 1) + 1, active: true, previousDocId: docId,
    uploadedBy: actorName(req.user), expiryDate: old.expiryDate || toDate(req.body.expiryDate),
    note: req.body.note !== undefined ? String(req.body.note).trim() : old.note, createdAt: new Date()
  });
  await pushHistory(vehicleHistoryRef(id), {
    action: 'Document replaced', details: `Replaced ${old.originalName} with ${stored.originalName}`,
    actorId: req.user.uid, actorName: actorName(req.user)
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
    action: 'Document deleted', details: `Deleted ${snap.data().originalName}`,
    actorId: req.user.uid, actorName: actorName(req.user)
  });
  res.json({ ok: true });
}

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
