import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  port: Number(process.env.PORT || 4000),
  firebaseDatabaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@fleet.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@1234',
  adminName: process.env.ADMIN_NAME || 'System Admin',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPhone: process.env.ADMIN_PHONE || '',
  expiryWarningDays: Number(process.env.EXPIRY_WARNING_DAYS || 30),
  maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB || 5)
};