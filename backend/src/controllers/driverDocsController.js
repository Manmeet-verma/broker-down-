import { driverDocRef, driverDocsRef, driverHistoryRef, pushHistory } from '../db/index.js';
import { uploadFile, deleteStoredFile, readStoredFile } from '../services/storage.js';
import { actorName, toISO } from './driverController.js';

const DOC_TYPES = ['dl', 'aadhaar', 'photo', 'other'];
const DOC_LABELS = { dl: 'Driving Licence', aadhaar: 'Aadhaar', photo: 'Driver Photo', other: 'Other Document' };

export async function uploadDriverDocument(req, res) {
  const { id } = req.params;
  const v = await driverDocRef(id).get();
  if (!v.exists) return res.status(404).json({ error: 'Driver not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const type = req.body.type || 'other';
  if (!DOC_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid document type' });

  const stored = await uploadFile(req.file.buffer, {
    folder: `drivers/${id}/documents`,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype
  });

  const ref = driverDocsRef(id).doc();
  await ref.set({
    type,
    label: DOC_LABELS[type] || type,
    originalName: stored.originalName,
    storagePath: stored.path,
    url: stored.url,
    mimeType: stored.mimeType,
    size: stored.size,
    expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
    version: 1,
    active: true,
    uploadedBy: actorName(req.user),
    createdAt: new Date()
  });
  await pushHistory(driverHistoryRef(id), {
    action: 'Document uploaded',
    details: `${stored.originalName} uploaded`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.status(201).json({ document: serializeDriverDoc(await ref.get()) });
}

export async function replaceDriverDocument(req, res) {
  const { id, docId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const oldRef = driverDocsRef(id).doc(docId);
  const oldSnap = await oldRef.get();
  if (!oldSnap.exists) return res.status(404).json({ error: 'Document not found' });

  const stored = await uploadFile(req.file.buffer, {
    folder: `drivers/${id}/documents`,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype
  });

  const old = oldSnap.data();
  await oldRef.update({ active: false, replacedAt: new Date() });

  const ref = driverDocsRef(id).doc();
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
    expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : old.expiryDate || null,
    createdAt: new Date()
  });
  await pushHistory(driverHistoryRef(id), {
    action: 'Document replaced',
    details: `Replaced ${old.originalName} with ${stored.originalName}`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.status(201).json({ document: serializeDriverDoc(await ref.get()) });
}

export async function deleteDriverDocument(req, res) {
  const { id, docId } = req.params;
  const ref = driverDocsRef(id).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Document not found' });

  await ref.update({ active: false, deletedAt: new Date() });
  await deleteStoredFile(snap.data().storagePath);
  await pushHistory(driverHistoryRef(id), {
    action: 'Document deleted',
    details: `Deleted ${snap.data().originalName}`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.json({ ok: true });
}

/* photo replacement (special case, stored on driver.photo) */
export async function replaceDriverPhoto(req, res) {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const snap = await driverDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Driver not found' });

  const stored = await uploadFile(req.file.buffer, {
    folder: `drivers/${id}/photos`,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype
  });
  if (snap.data().photo?.path) await deleteStoredFile(snap.data().photo.path);

  await driverDocRef(id).update({
    photo: { name: stored.originalName, path: stored.path, url: stored.url },
    updatedAt: new Date(),
    updatedBy: req.user.uid
  });
  await pushHistory(driverHistoryRef(id), {
    action: 'Driver photo updated',
    details: 'Driver photo replaced by admin',
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  res.json({ driver: serializeDriver(await driverDocRef(id).get()) });
}

function serializeDriverDoc(doc) {
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
    version: d.version || 1,
    active: d.active !== false,
    uploadedBy: d.uploadedBy,
    createdAt: toISO(d.createdAt),
    replacedAt: toISO(d.replacedAt)
  };
}

export async function driverHistory(req, res) {
  const { id } = req.params;
  const hist = await driverHistoryRef(id).orderBy('createdAt', 'desc').limit(300).get();
  res.json({ history: hist.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) })) });
}

/** GET /api/drivers/:id/documents/:docId/download — streams the stored file */
export async function downloadDriverDocument(req, res) {
  const { id, docId } = req.params;
  const snap = await driverDocsRef(id).doc(docId).get();
  if (!snap.exists) return res.status(404).json({ error: 'Document not found' });

  const stored = await readStoredFile(snap.data().storagePath);
  if (!stored) return res.status(404).json({ error: 'File no longer exists in storage' });

  res.setHeader('Content-Type', stored.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${stored.originalName.replace(/"/g, '')}"`);
  res.send(stored.buffer);
}