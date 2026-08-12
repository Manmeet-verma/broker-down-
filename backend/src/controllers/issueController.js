import { db } from '../config/firebase.js';
import { COLLECTIONS, issueDocRef, issueMessagesRef, pushHistory } from '../db/index.js';
import { uploadFile } from '../services/storage.js';

export const ISSUE_STATUSES = ['pending', 'accepted', 'rejected', 'resolved'];
export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const ISSUE_CATEGORIES = [
  'Engine Problem', 'Electrical / Wiring', 'Tyre / Wheel', 'Brakes', 'Body / Damage',
  'Battery', 'Transmission / Gearbox', 'Clutch', 'Cooling System', 'Fuel System',
  'Lights / Horn', 'GPS / Tracking', 'Loading / Unloading', 'Document Problem', 'Other'
];

const toISO = (v) => (v ? (v.seconds ? new Date(v.seconds * 1000).toISOString() : new Date(v).toISOString()) : null);

const actorName = (user) => (user && (user.data?.name || user.name || user.email)) || 'Unknown';

const serializeAttachment = (a) => ({ name: a?.name || '', url: a?.url || '', path: a?.path || '', mime: a?.mime || '', size: a?.size || 0 });

function serializeMessage(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    text: d.text || '',
    attachments: (d.attachments || []).map(serializeAttachment),
    senderId: d.senderId,
    senderName: d.senderName,
    senderRole: d.senderRole,
    system: !!d.system,
    createdAt: toISO(d.createdAt)
  };
}

function serializeIssue(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    vehicleId: d.vehicleId,
    vehicleNumber: d.vehicleNumber || null,
    driverId: d.driverId || null,
    driverName: d.driverName || null,
    shiftId: d.shiftId || null,
    category: d.category || 'Other',
    title: d.title || '',
    description: d.description || '',
    priority: d.priority || 'medium',
    status: d.status || 'pending',
    images: (d.images || []).map((i) => ({ name: i.name, url: i.url, path: i.path })),
    reportedBy: d.reportedBy || null,
    resolvedBy: d.resolvedBy || null,
    acceptedBy: d.acceptedBy || null,
    resolutionNote: d.resolutionNote || '',
    createdAt: toISO(d.createdAt),
    updatedAt: toISO(d.updatedAt)
  };
}

/* --------------- POST /api/issues  (driver/user reports an issue with multiple images) --------------- */
export async function createIssue(req, res) {
  const { vehicleId, title, description, category, priority } = req.body;
  if (!vehicleId) return res.status(400).json({ error: 'Vehicle is required' });
  if (!String(title || '').trim()) return res.status(400).json({ error: 'Issue title is required' });
  if (!String(description || '').trim()) return res.status(400).json({ error: 'Describe the problem' });

  const vSnap = await db.collection(COLLECTIONS.vehicles).doc(vehicleId).get();
  if (!vSnap.exists) return res.status(404).json({ error: 'Vehicle not found' });

  let driverId = req.body.driverId || req.user.data?.driverId || null;
  const driverName = req.body.driverName || req.user.data?.name || null;
  if (req.user.role === 'user' && driverId && driverId !== req.user.data?.driverId) {
    return res.status(403).json({ error: 'You can only report for yourself' });
  }

  const ref = db.collection(COLLECTIONS.issues).doc();
  const issueId = ref.id;

  const images = [];
  if (req.files && req.files.length) {
    for (const file of req.files) {
      const stored = await uploadFile(file.buffer, {
        folder: `issues/${issueId}/images`,
        originalName: file.originalname,
        mimeType: file.mimetype
      });
      images.push({ name: stored.originalName, url: stored.url, path: stored.path });
    }
  }

  await ref.set({
    vehicleId,
    vehicleNumber: vSnap.data().vehicleNumber || null,
    driverId,
    driverName,
    shiftId: req.body.shiftId || null,
    category: ISSUE_CATEGORIES.includes(category) ? category : 'Other',
    title: String(title).trim(),
    description: String(description).trim(),
    priority: ISSUE_PRIORITIES.includes(priority) ? priority : 'medium',
    status: 'pending',
    images,
    reportedBy: { uid: req.user.uid, name: actorName(req.user) },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await pushHistory(db.collection(COLLECTIONS.vehicles).doc(vehicleId).collection('history'), {
    action: 'Issue reported',
    details: `Issue "${title}" reported`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });
  if (driverId) {
    await pushHistory(db.collection(COLLECTIONS.drivers).doc(driverId).collection('history'), {
      action: 'Issue reported',
      details: `Reported "${title}" for ${vSnap.data().vehicleNumber || vehicleId}`,
      actorId: req.user.uid,
      actorName: actorName(req.user)
    });
  }

  res.status(201).json({ issue: serializeIssue(await ref.get()) });
}

/* --------------- GET /api/issues  (admin: all, user: own) --------------- */
export async function listIssues(req, res) {
  let snap;
  if (req.user.role === 'user') {
    const driverId = req.user.data?.driverId;
    if (!driverId) return res.json({ issues: [], total: 0 });
    snap = await db.collection(COLLECTIONS.issues)
      .where('driverId', '==', driverId).orderBy('createdAt', 'desc').limit(200).get();
  } else {
    snap = await db.collection(COLLECTIONS.issues).orderBy('createdAt', 'desc').limit(200).get();
  }
  const issues = snap.docs.map(serializeIssue);
  const { status = '', search = '', category = '' } = req.query;
  const filtered = issues.filter((i) => {
    if (status && i.status !== status) return false;
    if (category && i.category !== category) return false;
    if (search) {
      const q = String(search).toLowerCase();
      return [i.vehicleNumber, i.driverName, i.title, i.description].join(' ').toLowerCase().includes(q);
    }
    return true;
  });
  res.json({ issues: filtered, total: filtered.length });
}

/* --------------- GET /api/issues/:id  (with message thread) --------------- */
export async function getIssue(req, res) {
  const { id } = req.params;
  const snap = await issueDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Issue not found' });

  const driverId = snap.data().driverId;
  if (req.user.role === 'user' && driverId && driverId !== req.user.data?.driverId) {
    return res.status(403).json({ error: 'You can only view your own issues' });
  }

  const messagesS = await issueMessagesRef(id).orderBy('createdAt', 'asc').get();
  const messages = messagesS.docs.map(serializeMessage);

  res.json({ issue: serializeIssue(snap), messages });
}

/* --------------- POST /api/issues/:id/messages  (chat + optional attachments) --------------- */
export async function sendIssueMessage(req, res) {
  const { id } = req.params;
  const snap = await issueDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Issue not found' });
  if (!req.body.text && !(req.files && req.files.length)) {
    return res.status(400).json({ error: 'Message or attachment required' });
  }

  const attachments = [];
  if (req.files && req.files.length) {
    for (const file of req.files) {
      const stored = await uploadFile(file.buffer, {
        folder: `issues/${id}/messages`,
        originalName: file.originalname,
        mimeType: file.mimetype
      });
      attachments.push({ name: stored.originalName, url: stored.url, path: stored.path, mime: stored.mimeType, size: stored.size });
    }
  }

  const ref = await issueMessagesRef(id).add({
    text: String(req.body.text || '').trim(),
    attachments,
    senderId: req.user.uid,
    senderName: actorName(req.user),
    senderRole: req.user.role,
    system: false,
    createdAt: new Date()
  });

  await issueDocRef(id).update({ updatedAt: new Date() });
  res.status(201).json({ message: serializeMessage(await ref.get()) });
}

/* --------------- POST /api/issues/:id/status  (admin accept / reject + message) --------------- */
export async function updateIssueStatus(req, res) {
  const { id } = req.params;
  const { status, note } = req.body;
  if (!ISSUE_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can change issue status' });

  const snap = await issueDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Issue not found' });

  const upd = { status, updatedAt: new Date(), updatedBy: req.user.uid };
  if (note !== undefined) upd.resolutionNote = String(note || '').trim();
  if (status === 'rejected') upd.resolvedBy = { uid: req.user.uid, name: actorName(req.user) };
  if (status === 'accepted') upd.acceptedBy = { uid: req.user.uid, name: actorName(req.user) };
  await issueDocRef(id).update(upd);

  const msgRef = await issueMessagesRef(id).add({
    text: note ? `Issue ${status} by ${actorName(req.user)}. Note: ${note}` : `Issue ${status} by ${actorName(req.user)}`,
    attachments: [],
    senderId: req.user.uid,
    senderName: actorName(req.user),
    senderRole: 'admin',
    system: true,
    createdAt: new Date()
  });

  await pushHistory(db.collection(COLLECTIONS.vehicles).doc(snap.data().vehicleId).collection('history'), {
    action: `Issue ${status}`,
    details: `Issue "${snap.data().title}" ${status}${note ? ` - ${note}` : ''}`,
    actorId: req.user.uid,
    actorName: actorName(req.user)
  });

  res.json({ issue: serializeIssue(await issueDocRef(id).get()), message: serializeMessage(await msgRef.get()) });
}

/* --------------- GET /api/issues/:id/images/:idx?  (download) --------------- */
export async function issueImageMeta(req, res) {
  const { id } = req.params;
  const snap = await issueDocRef(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Issue not found' });
  res.json({ issue: serializeIssue(snap) });
}
