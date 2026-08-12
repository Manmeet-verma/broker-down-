import path from 'node:path';
import { bucket } from '../config/firebase.js';

/** Upload a Buffer to Firebase Storage under `folder/name.ext`. Returns public-ish metadata. */
export async function uploadFile(buffer, { folder, originalName, mimeType }) {
  const ext = path.extname(originalName) || '';
  const safeBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_ ]/g, '_');
  const name = `${Date.now()}_${safeBase.replace(/\s+/g, '_')}${ext.toLowerCase()}`;
  const file = bucket.file(`${folder}/${name}`);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: { originalName }
    }
  });

  await file.makePublic(); // served via storage.googleapis.com URL

  return {
    path: `${folder}/${name}`,
    name: name,
    originalName,
    mimeType,
    url: `https://storage.googleapis.com/${bucket.name}/${folder}/${name}`,
    size: buffer.length
  };
}

/** Stream download / replace support: fetch file content and metadata */
export async function readStoredFile(storagePath) {
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [content] = await file.download();
  const [meta] = await file.getMetadata();
  return {
    buffer: content,
    contentType: meta.contentType || 'application/octet-stream',
    size: content.length,
    originalName: meta.metadata?.originalName || path.basename(storagePath)
  };
}

export async function deleteStoredFile(storagePath) {
  if (!storagePath) return;
  try {
    await bucket.file(storagePath).delete();
  } catch (_) { /* already gone */ }
}