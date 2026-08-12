import { ENV } from '../config/env.js';

export const EXPIRY_WARNING_DAYS = Number(process.env.EXPIRY_WARNING_DAYS || 30);
export const MAX_FILE = Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;

export const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const ROLES = ['admin', 'user'];
export const USER_STATUSES = ['active', 'inactive', 'on_leave', 'suspended'];
export const LICENCE_TYPES = ['Heavy Vehicle', 'LMV', 'Motorcycle', 'Other'];
export const SHIFT_TYPES = ['day', 'night'];
export const ISSUE_STATUSES = ['pending', 'accepted', 'rejected', 'resolved'];
export const VEHICLE_STATUSES = ['active', 'inactive', 'under_finance', 'sold'];

export const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value.seconds ? value.seconds * 1000 : value);
  return isNaN(d.getTime()) ? null : d;
};

export const toISO = (value) => {
  const d = parseDate(value);
  return d ? d.toISOString() : null;
};

export const fmtDate = (value) => {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const daysLeft = (date) => {
  const d = parseDate(date);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
};

/** 'valid' | 'expiring' | 'expired' | 'not_done' */
export const docStatus = (validTo, done = false, warningDays = EXPIRY_WARNING_DAYS) => {
  if (!done) return 'not_done';
  const left = daysLeft(validTo);
  if (left === null) return 'not_done';
  if (left < 0) return 'expired';
  if (left <= warningDays) return 'expiring';
  return 'valid';
};

export const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return '—';
  const digits = String(aadhaar).replace(/\D/g, '');
  return digits.length < 4 ? 'XXXX' : `XXXX XXXX ${digits.slice(-4)}`;
};