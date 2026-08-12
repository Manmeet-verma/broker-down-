export const DOC_LABELS = {
  rc: 'RC',
  insurance: 'Insurance',
  pollution: 'Pollution Certificate',
  permit: 'State Permit',
  tax: 'Tax Receipt'
};

export const DOC_TYPES = {
  invoice: 'Invoice',
  rc: 'RC',
  insurance: 'Insurance',
  pollution: 'Pollution Certificate',
  noc: 'N/P / NOC',
  permit: 'State Permit',
  tax: 'Tax Receipt',
  other: 'Other'
};

export const DRIVER_DOC_TYPES = {
  dl: 'Driving Licence',
  aadhaar: 'Aadhaar',
  photo: 'Driver Photo',
  other: 'Other Document'
};

export const STATUS_META = {
  valid: { label: 'Valid', color: 'green' },
  expiring: { label: 'Expiring Soon', color: 'yellow' },
  expired: { label: 'Expired', color: 'red' },
  not_done: { label: 'Not Done', color: 'gray' },
  active: { label: 'Active', color: 'green' },
  inactive: { label: 'Inactive', color: 'gray' },
  under_finance: { label: 'Under Finance', color: 'blue' },
  sold: { label: 'Sold / Transferred', color: 'gray' },
  on_leave: { label: 'On Leave', color: 'yellow' },
  suspended: { label: 'Suspended', color: 'red' },
  pending: { label: 'Pending', color: 'yellow' },
  accepted: { label: 'Accepted', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  resolved: { label: 'Resolved', color: 'blue' },
  low: { label: 'Low', color: 'blue' },
  medium: { label: 'Medium', color: 'yellow' },
  high: { label: 'High', color: 'orange' },
  critical: { label: 'Critical', color: 'red' },
  day: { label: 'Day', color: 'blue' },
  night: { label: 'Night', color: 'purple' }
};

export const VEHICLE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'under_finance', label: 'Under Finance' },
  { value: 'sold', label: 'Sold / Transferred' }
];

export const LICENSE_TYPES = ['Heavy Vehicle', 'LMV', 'Motorcycle', 'Other'];
export const VEHICLE_CATEGORIES = ['Heavy Vehicle', 'Car / LMV', 'Motorcycle', 'Other'];
export const DRIVER_STATUSES = ['active', 'inactive', 'on_leave', 'suspended'];
export const SHIFT_PRESETS = ['morning', 'evening', 'night', 'general', 'other'];
export const SHIFT_TYPES = ['day', 'night'];
export const ISSUE_STATUSES = ['pending', 'accepted', 'rejected', 'resolved'];
export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const ISSUE_CATEGORIES = [
  'Engine Problem', 'Electrical / Wiring', 'Tyre / Wheel', 'Brakes', 'Body / Damage',
  'Battery', 'Transmission / Gearbox', 'Clutch', 'Cooling System', 'Fuel System',
  'Lights / Horn', 'GPS / Tracking', 'Loading / Unloading', 'Document Problem', 'Other'
];
