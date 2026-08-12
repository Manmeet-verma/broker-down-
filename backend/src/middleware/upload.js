import multer from 'multer';
import { MAX_FILE } from '../utils/index.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`Unsupported file type: ${file.mimetype || 'unknown'}`));
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE },
  fileFilter
});