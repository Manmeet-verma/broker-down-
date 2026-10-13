import ExcelJS from 'exceljs';
import { db } from '../config/firebase.js';
import { vehicleDocRef } from '../db/index.js';

const toISO = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  if (v.seconds) return new Date(v.seconds * 1000).toISOString();
  return null;
};

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object' && v.seconds) return toISO(v);
  return String(v);
};

function addSectionSheet(wb, title, rows) {
  const ws = wb.addWorksheet(title);
  ws.columns = [{ header: 'Field', key: 'field', width: 32 }, { header: 'Value', key: 'value', width: 48 }];
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  return ws;
}

function vehicleRows(v) {
  return [
    { field: 'Vehicle Number', value: fmt(v.vehicleNumber) },
    { field: 'Category', value: fmt(v.categoryName) },
    { field: 'Subcategory', value: fmt(v.subcategoryName) },
    { field: 'Type', value: fmt(v.type) },
    { field: 'Serial Number', value: fmt(v.serialNumber) },
    { field: 'Applicable No. Type', value: fmt(v.applicableNoType) },
    { field: 'Applicable Serial No.', value: fmt(v.applicableSerialNo) },
    { field: 'Applicable RC No.', value: fmt(v.applicableRcNo) },
    { field: 'Engine Number', value: fmt(v.engineNumber) },
    { field: 'Chassis Number', value: fmt(v.chassisNumber) },
    { field: 'Make', value: fmt(v.make) },
    { field: 'Model', value: fmt(v.model) },
    { field: 'RC Valid From', value: fmt((v.invoice || {}).rcValidFrom) },
    { field: 'RC Valid To', value: fmt((v.invoice || {}).rcValidTo) },
    { field: 'Status', value: fmt(v.status) },
    { field: 'Equipment NOC Required', value: v.equipmentNocRequired ? 'Yes' : 'No' },
    { field: 'Created At', value: fmt(v.createdAt) }
  ];
}

export async function exportVehicleExcel(req, res) {
  const snap = await vehicleDocRef(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Vehicle not found' });
  const v = { ...snap.data(), id: snap.id };
  const vehicleNumber = String(v.vehicleNumber || v.id).replace(/[^A-Za-z0-9_-]/g, '');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Broker Down';
  wb.created = new Date();

  addSectionSheet(wb, 'Vehicle', vehicleRows(v));

  const s = v.supply || {};
  const inv = v.invoice || {};

  addSectionSheet(wb, 'Purchase Record', [
    { field: 'Supplier Name', value: fmt(s.supplierName) },
    { field: 'Address', value: fmt(s.address) },
    { field: 'GST No. (Supplier)', value: fmt(s.gstNo) },
    { field: 'Email ID', value: fmt(s.email) },
    { field: 'Phone No.', value: fmt(s.phone) },
    { field: 'Payment Method', value: s.paymentMethod === 'financed' ? 'Financed' : s.paymentMethod === 'without_financed' ? 'Without Financed' : fmt(s.paymentMethod) },
    { field: 'Name of Buyer', value: fmt(s.buyerName) || fmt((v.invoice || {}).buyerBilling) },
    { field: 'GST No. (Buyer)', value: fmt(s.buyerGstNo) || fmt((v.invoice || {}).buyerGstNo) },
    { field: 'Sale Value (Basic)', value: fmt(s.salesValue) },
    { field: 'GST / Basic (%)', value: fmt(s.gstPercent) },
    { field: 'GST Amount', value: fmt(s.gstAmount) },
    { field: 'Total Amount', value: fmt(s.totalAmount) },
    { field: 'TCS', value: fmt(s.tcs) },
    { field: 'Other Label', value: fmt(s.otherLabel) },
    { field: 'Other Amount', value: fmt(s.otherAmount) },
    { field: 'Invoice No.', value: fmt(inv.invoiceNo) },
    { field: 'Invoice Date', value: fmt(inv.invoiceDate) },
    { field: 'Buyer Billing Name', value: fmt(inv.buyerBilling) },
    { field: 'Buyer Address', value: fmt(inv.buyerAddress) },
    { field: 'Grand Total', value: fmt(Number(s.totalAmount || 0) + Number(s.tcs || 0) + Number(s.otherAmount || 0)) }
  ]);

  const ins = v.insurance || {};
  const legacyAgent = v.agentDetails || {};
  addSectionSheet(wb, 'Insurance', [
    { field: 'Applicable', value: fmt(ins.applicable) },
    { field: 'Company', value: fmt(ins.companyName) },
    { field: 'Type', value: fmt(v.insuranceType?.name) },
    { field: 'Category', value: ins.kind === 'transit' ? 'Transit Insurance' : ins.kind === 'general' ? 'General Insurance' : fmt(ins.kind) },
    { field: 'Transit Reason', value: fmt(ins.transitReason) },
    { field: 'Source Location', value: fmt(ins.sourceLocation) },
    { field: 'Destination Location', value: fmt(ins.destinationLocation) },
    { field: 'Invoice No. of Insurance', value: fmt(ins.invoiceNo) || fmt(legacyAgent.invoiceNo) },
    { field: 'Invoice GST Amount', value: fmt(ins.invoiceGstAmount) || fmt(legacyAgent.gstAmount) },
    { field: 'Invoice Total Value', value: fmt(ins.invoiceTotalValue) || fmt(legacyAgent.totalValue) },
    { field: 'Premium Amount', value: fmt(ins.premiumAmount) },
    { field: 'GST %', value: fmt(ins.gstPercent) },
    { field: 'GST Amount', value: fmt(ins.gstAmount) },
    { field: 'Total Amount', value: fmt(ins.totalAmount) },
    { field: 'Valid From', value: fmt(ins.validFrom) },
    { field: 'Valid To', value: fmt(ins.validTo) }
  ]);

  const fin = v.finance || {};
  addSectionSheet(wb, 'Finance', [
    { field: 'Equipment Financed', value: fmt(v.equipmentFinanced) },
    { field: 'Financed By', value: fmt(fin.financedBy) },
    { field: 'Financed Amount', value: fmt(fin.financedAmount) },
    { field: 'Earnest Money', value: fmt(fin.earnestMoney) },
    { field: 'Total %', value: fmt(fin.totalPercent) },
    { field: 'Installment Count', value: fmt(fin.installmentCount) },
    { field: 'Installment Free', value: fmt(fin.installmentFree) }
  ]);

  const own = v.ownershipHistory || [];
  if (own.length) {
    const ws = wb.addWorksheet('Ownership');
    ws.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Changed At', key: 'changedAt', width: 24 },
      { header: 'Reason', key: 'reason', width: 40 }
    ];
    ws.getRow(1).font = { bold: true };
    own.forEach((h) => ws.addRow({ name: fmt(h.name || h.newName), changedAt: fmt(h.changedAt), reason: fmt(h.reason) }));
  }

  const movements = Array.isArray(v.movements) ? v.movements : [];
  if (movements.length) {
    const ws = wb.addWorksheet('Vehicle Movement');
    ws.columns = [
      { header: 'Source State', key: 'sourceState', width: 18 },
      { header: 'Source City', key: 'sourceCity', width: 16 },
      { header: 'Destination State', key: 'destinationState', width: 18 },
      { header: 'Destination City', key: 'destinationCity', width: 16 },
      { header: 'Project State', key: 'projectState', width: 18 },
      { header: 'Project City', key: 'projectCity', width: 16 },
      { header: 'Movement By', key: 'mode', width: 12 },
      { header: 'Trallow No.', key: 'trallowNo', width: 14 },
      { header: 'Driver Name', key: 'driverName', width: 18 },
      { header: 'Driver No.', key: 'driverNo', width: 14 },
      { header: 'Transporter Name', key: 'transporterName', width: 18 },
      { header: 'Contact No.', key: 'transporterContact', width: 14 },
      { header: 'Fare', key: 'fare', width: 12 },
      { header: 'Advance', key: 'advance', width: 12 },
      { header: 'Diesel (L)', key: 'dieselLitres', width: 10 },
      { header: 'Diesel Amount', key: 'dieselAmount', width: 14 },
      { header: 'Total Payable', key: 'totalPayable', width: 14 },
      { header: 'Paid Amount', key: 'paidAmount', width: 14 },
      { header: 'Paid Own', key: 'paidOwn', width: 10 },
      { header: 'Mode of Payment', key: 'modeOfPayment', width: 16 },
      { header: 'Reason Type', key: 'reasonType', width: 16 },
      { header: 'Order By (Transit)', key: 'orderedBy', width: 18 }
    ];
    ws.getRow(1).font = { bold: true };
    movements.forEach((m) => ws.addRow({
      ...m, mode: m.mode === 'own' ? 'By Own' : 'Trallow',
      paidOwn: m.paidOwn ? 'Yes' : 'No'
    }));
  }

  const taxes = Array.isArray(v.taxes) ? v.taxes : [];
  if (taxes.length) {
    const ws = wb.addWorksheet('Taxes');
    ws.columns = [
      { header: 'Type', key: 'type', width: 24 },
      { header: 'Period', key: 'period', width: 24 },
      { header: 'Amount', key: 'amount', width: 18 }
    ];
    ws.getRow(1).font = { bold: true };
    taxes.forEach((t) => ws.addRow({ type: fmt(t.type), period: fmt(t.period), amount: fmt(t.amount) }));
  }

  /* -------- custom tabs: one sheet per admin-created tab -------- */
  const custom = v.customTabs && typeof v.customTabs === 'object' ? v.customTabs : {};
  const tabIds = Object.keys(custom);
  if (tabIds.length) {
    let defs = [];
    try {
      const tabSnap = await db.collection('vehicleTabs').get();
      defs = tabSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (_) { defs = []; }

    for (const tabId of tabIds) {
      const def = defs.find((t) => t.id === tabId);
      const title = String(def?.name || 'Custom').replace(/[:\\/?*[\]]/g, ' ').slice(0, 28);
      const values = custom[tabId] || {};
      const rows = [];
      if (Array.isArray(def?.fields) && def.fields.length) {
        for (const f of def.fields) rows.push({ field: f.label, value: fmt(values[f.label]) });
      } else {
        for (const [k, val] of Object.entries(values)) rows.push({ field: k, value: fmt(val) });
      }
      if (!rows.length) rows.push({ field: '(no data)', value: '' });
      addSectionSheet(wb, title, rows);
    }
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="vehicle-${vehicleNumber}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}
