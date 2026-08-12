import { docStatus } from '../utils/index.js';

const DOC_INFO = [
  { key: 'rc', label: 'RC' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'pollution', label: 'Pollution' },
  { key: 'permit', label: 'State Permit' },
  { key: 'tax', label: 'Tax' }
];

export function computedDocStatuses(vehicle) {
  const v = vehicle || {};
  return {
    rc: docStatus(v.rc?.validTo, !!v.rc?.done),
    insurance: docStatus(v.insurance?.validTo, !!v.insurance?.done),
    pollution: docStatus(v.pollution?.validTo, !!v.pollution?.done),
    permit: docStatus(v.permit?.validTo, !!v.permit?.done),
    tax: docStatus(v.tax?.validTo, !!v.tax?.done)
  };
}

/** Returns { key, label } of the overall status incl. auto document detection */
export function computedOverview(vehicle) {
  const v = vehicle || {};
  const docs = computedDocStatuses(v);
  const base = String(v.status || 'active');

  const expiredDocs = DOC_INFO.filter((d) => docs[d.key] === 'expired').map((d) => d.label);
  const expiringCount = DOC_INFO.filter((d) => docs[d.key] === 'expiring').length;

  let key;
  let label;

  if (base === 'sold') {
    key = 'sold';
    label = 'Sold / Transferred';
  } else if (base === 'inactive') {
    key = 'inactive';
    label = 'Inactive';
  } else if (expiredDocs.length >= 2) {
    key = 'expired';
    label = 'Multiple Documents Expired';
  } else if (expiredDocs.length === 1) {
    key = 'expired';
    label = `${expiredDocs[0]} Expired`;
  } else if (expiringCount > 0) {
    key = 'expiring';
    label = 'Documents Expiring';
  } else if (base === 'under_finance' || !!v.finance?.company) {
    key = 'under_finance';
    label = 'Under Finance';
  } else {
    key = 'active';
    label = 'Active';
  }

  return {
    status: key,
    label,
    expiredDocs,
    expiringCount,
    docs
  };
}

/** Items needing attention: {doc, label, validTo, vehicleNumber, vehicleId} */
export function attentionItems(vehicles) {
  const items = [];
  for (const vehicle of vehicles) {
    if (!vehicle || !vehicle.id) continue;
    for (const d of DOC_INFO) {
      const st = docStatus(vehicle[d.key]?.validTo, !!vehicle[d.key]?.done);
      if (st === 'expired' || st === 'expiring') {
        items.push({
          vehicleId: vehicle.id,
          vehicleNumber: vehicle.vehicleNumber,
          document: d.label,
          status: st,
          validTo: vehicle[d.key]?.validTo || null
        });
      }
    }
  }
  return items.sort((a, b) => new Date(a.validTo || 0) - new Date(b.validTo || 0));
}