export const WARNING_DAYS = 30;

export const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value.seconds ? value.seconds * 1000 : value);
  return isNaN(d.getTime()) ? null : d;
};

export const fmtDate = (value) => {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (value) => {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
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
export const docStatus = (validTo, done = false, warningDays = WARNING_DAYS) => {
  if (!done) return 'not_done';
  const left = daysLeft(validTo);
  if (left === null) return 'not_done';
  if (left < 0) return 'expired';
  if (left <= warningDays) return 'expiring';
  return 'valid';
};

export const vehicleOverview = (v) => {
  if (!v) return { status: 'active', label: 'Active' };
  const docs = ['rc', 'insurance', 'pollution', 'permit', 'tax'].map((k) => ({
    key: k,
    status: docStatus(v[k]?.validTo, !!v[k]?.done)
  }));
  const expired = docs.filter((d) => d.status === 'expired');
  const expiring = docs.filter((d) => d.status === 'expiring');
  const labelOf = (k) => ({ rc: 'RC', insurance: 'Insurance', pollution: 'Pollution', permit: 'Permit', tax: 'Tax' }[k]);

  if (v.status === 'sold') return { status: 'sold', label: 'Sold / Transferred' };
  if (v.status === 'inactive') return { status: 'inactive', label: 'Inactive' };
  if (expired.length >= 2) return { status: 'expired', label: 'Multiple Documents Expired' };
  if (expired.length === 1) return { status: 'expired', label: `${labelOf(expired[0].key)} Expired` };
  if (expiring.length > 0) return { status: 'expiring', label: 'Documents Expiring' };
  if (v.status === 'under_finance' || v.finance?.company) return { status: 'under_finance', label: 'Under Finance' };
  return { status: 'active', label: 'Active' };
};

export const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return '—';
  const digits = String(aadhaar).replace(/\D/g, '');
  return digits.length < 4 ? 'XXXX' : `XXXX XXXX ${digits.slice(-4)}`;
};

export const cls = (...parts) => parts.filter(Boolean).join(' ');

export const downloadDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const readableBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
