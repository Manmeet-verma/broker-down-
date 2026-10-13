'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Field, Input, Select, Textarea, Modal, notify } from './ui';
import { useMasterData } from '@/lib/useMasterData';
import { useAuth } from '@/lib/auth';
import FileUpload from './FileUpload';
import MultiFileUpload from './MultiFileUpload';
import { stateNames, cityOptions, PAYMENT_MODES } from '@/lib/states';

function Section({ title, children }) {
  return (
    <div className="space-y-4">{children}</div>
  );
}

function YesNo({ label, value, onChange, id }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <label className="flex items-center gap-1.5 text-sm"><input type="radio" name={id} checked={value === true} onChange={() => onChange(true)} className="h-4 w-4 text-blue-600" /> Yes</label>
      <label className="flex items-center gap-1.5 text-sm"><input type="radio" name={id} checked={value === false} onChange={() => onChange(false)} className="h-4 w-4 text-blue-600" /> No</label>
    </div>
  );
}

function CalcField({ label, value, onChange, suffix }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">{label}:</span>
      <span className="text-sm font-semibold text-slate-900">{value || 0} {suffix || ''}</span>
    </div>
  );
}

const TABS = [
  'Basic Details', 'Ownership', 'Purchase Record', 'Insurance',
  'Pollution Certificate', 'Finance', 'Taxes', 'Working Site', 'Vehicle Movement'
];

const emptyForm = {
  categoryId: '', categoryName: '', subcategoryId: '', subcategoryName: '', type: 'company',
  vehicleNumber: '', serialNumber: '', applicableNoType: 'serial',
  applicableSerialNo: '', applicableRcNo: '',
  engineNumber: '', chassisNumber: '', make: '', model: '',
  ownershipId: '', ownershipName: '', ownershipChanged: false, ownershipChangeReason: '', ownershipNewName: '',
  supplySupplierName: '', supplyAddress: '', supplyGstNo: '', supplyEmail: '', supplyPhone: '',
  supplySalesValue: '', supplyGstPercent: '', supplyGstAmount: '', supplyTotalAmount: '', supplyTcs: '', supplyOtherLabel: '', supplyOtherAmount: '',
  supplyBuyerName: '', supplyBuyerGstNo: '', supplyPaymentMethod: '',
  invoiceInvoiceNo: '', invoiceInvoiceDate: '', invoiceBuyerBilling: '', invoiceBuyerGstNo: '', invoiceBuyerAddress: '', invoiceRcValidFrom: '', invoiceRcValidTo: '',
  insuranceApplicable: true, insuranceCompanyId: '', insuranceCompanyName: '', insurancePremiumAmount: '', insuranceGstPercent: '', insuranceGstAmount: '', insuranceTotalAmount: '',
  insuranceTypeId: '', insuranceTypeName: '', insurancePeriod: '', insuranceValidFrom: '', insuranceValidTo: '',
  insuranceKind: 'general', insuranceTransitReason: '', insuranceSourceLocation: '', insuranceDestinationLocation: '',
  insuranceInvoiceNo: '', insuranceInvoiceGstAmount: '', insuranceInvoiceTotalValue: '',
  pollutionApplicable: true, pollutionPeriod: '', pollutionPeriodEnd: '', equipmentNocRequired: false,
  statePeriodApplicable: false, statePeriodPeriod: '', statePeriodPeriodEnd: '',
  nationalPermitApplicable: false, nationalPermitPeriod: '', nationalPermitPeriodEnd: '',
  equipmentFinanced: false, equipmentFree: true,
  financeFinancedBy: '', financeFinancedAmount: '', financeEarnestMoney: '', financeTotalPercent: '',
  financeInstallmentCountId: '', financeInstallmentCount: '', financeInstallmentFree: false, financeEmailFinancer: '',
  workingSiteReason: '', workingSiteOrderBy: '',
  transmitInsurance: false, evApplicable: false, challanApplicable: false, billApplicable: false,
  trallowApplicable: false, trallowNo: '', trallowName: '', trallowFreightAmount: '',
  customTabs: {},
  taxes: [],
  movements: []
};

function toDateInput(value) {
  if (!value) return '';
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function vehicleToForm(vehicle) {
  const v = vehicle || {};
  const ownership = v.ownership || {};
  const supply = v.supply || {};
  const invoice = v.invoice || {};
  const insurance = v.insurance || {};
  const insuranceType = v.insuranceType || {};
  const agent = v.agentDetails || {};
  const pollution = v.pollution || {};
  const statePeriod = v.statePeriod || {};
  const nationalPermit = v.nationalPermit || {};
  const finance = v.finance || {};
  const workingSite = v.workingSite || {};
  const trallow = v.trallow || {};

  return {
    ...emptyForm,
    categoryId: v.categoryId ?? emptyForm.categoryId,
    categoryName: v.categoryName ?? emptyForm.categoryName,
    subcategoryId: v.subcategoryId ?? emptyForm.subcategoryId,
    subcategoryName: v.subcategoryName ?? emptyForm.subcategoryName,
    type: v.type || emptyForm.type,
    vehicleNumber: v.vehicleNumber ?? emptyForm.vehicleNumber,
    serialNumber: v.serialNumber ?? emptyForm.serialNumber,
    applicableNoType: v.applicableNoType || emptyForm.applicableNoType,
    applicableSerialNo: v.applicableSerialNo ?? emptyForm.applicableSerialNo,
    applicableRcNo: v.applicableRcNo ?? emptyForm.applicableRcNo,
    engineNumber: v.engineNumber ?? emptyForm.engineNumber,
    chassisNumber: v.chassisNumber ?? emptyForm.chassisNumber,
    make: v.make ?? emptyForm.make,
    model: v.model ?? emptyForm.model,
    ownershipId: v.ownershipId ?? ownership.id ?? emptyForm.ownershipId,
    ownershipName: v.ownershipName ?? ownership.name ?? emptyForm.ownershipName,
    supplySupplierName: supply.supplierName ?? emptyForm.supplySupplierName,
    supplyAddress: supply.address ?? emptyForm.supplyAddress,
    supplyGstNo: supply.gstNo ?? emptyForm.supplyGstNo,
    supplyEmail: supply.email ?? emptyForm.supplyEmail,
    supplyPhone: supply.phone ?? emptyForm.supplyPhone,
    supplySalesValue: supply.salesValue ?? emptyForm.supplySalesValue,
    supplyGstPercent: supply.gstPercent ?? emptyForm.supplyGstPercent,
    supplyGstAmount: supply.gstAmount ?? emptyForm.supplyGstAmount,
    supplyTotalAmount: supply.totalAmount ?? emptyForm.supplyTotalAmount,
    supplyTcs: supply.tcs ?? emptyForm.supplyTcs,
    supplyOtherLabel: supply.otherLabel ?? emptyForm.supplyOtherLabel,
    supplyOtherAmount: supply.otherAmount ?? emptyForm.supplyOtherAmount,
    supplyBuyerName: supply.buyerName ?? invoice.buyerBilling ?? emptyForm.supplyBuyerName,
    supplyBuyerGstNo: supply.buyerGstNo ?? invoice.buyerGstNo ?? emptyForm.supplyBuyerGstNo,
    supplyPaymentMethod: supply.paymentMethod ?? emptyForm.supplyPaymentMethod,
    invoiceInvoiceNo: invoice.invoiceNo ?? emptyForm.invoiceInvoiceNo,
    invoiceInvoiceDate: toDateInput(invoice.invoiceDate) || emptyForm.invoiceInvoiceDate,
    invoiceBuyerBilling: invoice.buyerBilling ?? emptyForm.invoiceBuyerBilling,
    invoiceBuyerGstNo: invoice.buyerGstNo ?? emptyForm.invoiceBuyerGstNo,
    invoiceBuyerAddress: invoice.buyerAddress ?? emptyForm.invoiceBuyerAddress,
    invoiceRcValidFrom: toDateInput(invoice.rcValidFrom) || emptyForm.invoiceRcValidFrom,
    invoiceRcValidTo: toDateInput(invoice.rcValidTo) || emptyForm.invoiceRcValidTo,
    insuranceApplicable: insurance.applicable ?? emptyForm.insuranceApplicable,
    insuranceCompanyId: insurance.companyId ?? emptyForm.insuranceCompanyId,
    insuranceCompanyName: insurance.companyName ?? emptyForm.insuranceCompanyName,
    insurancePremiumAmount: insurance.premiumAmount ?? emptyForm.insurancePremiumAmount,
    insuranceGstPercent: insurance.gstPercent ?? emptyForm.insuranceGstPercent,
    insuranceGstAmount: insurance.gstAmount ?? emptyForm.insuranceGstAmount,
    insuranceTotalAmount: insurance.totalAmount ?? emptyForm.insuranceTotalAmount,
    insuranceTypeId: insuranceType.id ?? emptyForm.insuranceTypeId,
    insuranceTypeName: insuranceType.name ?? emptyForm.insuranceTypeName,
    insurancePeriod: v.insurancePeriod ?? emptyForm.insurancePeriod,
    insuranceValidFrom: toDateInput(insurance.validFrom) || emptyForm.insuranceValidFrom,
    insuranceValidTo: toDateInput(insurance.validTo) || emptyForm.insuranceValidTo,
    insuranceKind: insurance.kind ?? emptyForm.insuranceKind,
    insuranceTransitReason: insurance.transitReason ?? emptyForm.insuranceTransitReason,
    insuranceSourceLocation: insurance.sourceLocation ?? emptyForm.insuranceSourceLocation,
    insuranceDestinationLocation: insurance.destinationLocation ?? emptyForm.insuranceDestinationLocation,
    insuranceInvoiceNo: insurance.invoiceNo ?? agent.invoiceNo ?? emptyForm.insuranceInvoiceNo,
    insuranceInvoiceGstAmount: insurance.invoiceGstAmount ?? agent.gstAmount ?? emptyForm.insuranceInvoiceGstAmount,
    insuranceInvoiceTotalValue: insurance.invoiceTotalValue ?? agent.totalValue ?? emptyForm.insuranceInvoiceTotalValue,
    pollutionApplicable: pollution.applicable ?? emptyForm.pollutionApplicable,
    pollutionPeriod: pollution.period ?? emptyForm.pollutionPeriod,
    pollutionPeriodEnd: toDateInput(pollution.validTo) || emptyForm.pollutionPeriodEnd,
    equipmentNocRequired: v.equipmentNocRequired ?? emptyForm.equipmentNocRequired,
    statePeriodApplicable: statePeriod.applicable ?? emptyForm.statePeriodApplicable,
    statePeriodPeriod: statePeriod.period ?? emptyForm.statePeriodPeriod,
    statePeriodPeriodEnd: toDateInput(statePeriod.validTo) || emptyForm.statePeriodPeriodEnd,
    nationalPermitApplicable: nationalPermit.applicable ?? emptyForm.nationalPermitApplicable,
    nationalPermitPeriod: nationalPermit.period ?? emptyForm.nationalPermitPeriod,
    nationalPermitPeriodEnd: toDateInput(nationalPermit.validTo) || emptyForm.nationalPermitPeriodEnd,
    equipmentFinanced: v.equipmentFinanced ?? emptyForm.equipmentFinanced,
    equipmentFree: v.equipmentFree ?? emptyForm.equipmentFree,
    financeFinancedBy: finance.financedBy ?? emptyForm.financeFinancedBy,
    financeFinancedAmount: finance.financedAmount ?? emptyForm.financeFinancedAmount,
    financeEarnestMoney: finance.earnestMoney ?? emptyForm.financeEarnestMoney,
    financeTotalPercent: finance.totalPercent ?? emptyForm.financeTotalPercent,
    financeInstallmentCountId: finance.installmentCountId ?? emptyForm.financeInstallmentCountId,
    financeInstallmentCount: finance.installmentCount ?? emptyForm.financeInstallmentCount,
    financeInstallmentFree: finance.installmentFree ?? emptyForm.financeInstallmentFree,
    financeEmailFinancer: finance.emailFinancer ?? emptyForm.financeEmailFinancer,
    workingSiteReason: workingSite.reason ?? emptyForm.workingSiteReason,
    workingSiteOrderBy: workingSite.orderBy ?? emptyForm.workingSiteOrderBy,
    transmitInsurance: v.transmitInsurance ?? emptyForm.transmitInsurance,
    evApplicable: v.evApplicable ?? emptyForm.evApplicable,
    challanApplicable: v.challanApplicable ?? emptyForm.challanApplicable,
    billApplicable: v.billApplicable ?? emptyForm.billApplicable,
    trallowApplicable: trallow.applicable ?? emptyForm.trallowApplicable,
    trallowNo: trallow.trallowNo ?? emptyForm.trallowNo,
    trallowName: trallow.trallowName ?? emptyForm.trallowName,
    trallowFreightAmount: trallow.freightAmount ?? emptyForm.trallowFreightAmount,
    customTabs: (v.customTabs && typeof v.customTabs === 'object') ? v.customTabs : {},
    taxes: Array.isArray(v.taxes) ? v.taxes : [],
    movements: Array.isArray(v.movements) ? v.movements : []
  };
}

export default function VehicleForm({ initial, vehicleId }) {
  const router = useRouter();
  const [form, setForm] = useState(initial || emptyForm);
  const [tab, setTab] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState({});
  const [fileLists, setFileLists] = useState({});

  const categories = useMasterData('categories');
  const ownerships = useMasterData('ownershipNames');
  const insuranceTypes = useMasterData('insuranceTypes');
  const installmentCounts = useMasterData('installmentCounts');
  const vehicleTabs = useMasterData('vehicleTabs');
  const { user } = useAuth();

  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  const [tabOpen, setTabOpen] = useState(false);
  const [tabName, setTabName] = useState('');
  const [tabFields, setTabFields] = useState([{ label: '', type: 'text' }]);
  const [tabSaving, setTabSaving] = useState(false);

  const parentCategories = categories.items.filter((c) => !c.parentId);
  const subcategories = categories.items.filter((c) => c.parentId === form.categoryId);
  const customTabs = vehicleTabs.items;

  const allTabs = [
    ...TABS.map((name, i) => ({ name, index: i })),
    ...customTabs.map((t, i) => ({ name: t.name, index: TABS.length + i, def: t }))
  ];

  const createCategory = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      const res = await api.post('/categories', { name: catName.trim() });
      const created = res?.item;
      notify('Category created');
      setCatOpen(false);
      setCatName('');
      await categories.reload();
      if (created) {
        setForm((f) => ({ ...f, categoryId: created.id, categoryName: created.name, subcategoryId: '', subcategoryName: '' }));
      }
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setCatSaving(false);
    }
  };

  const createTab = async () => {
    const fields = tabFields
      .map((f) => ({ label: f.label.trim(), type: f.type }))
      .filter((f) => f.label);
    if (!tabName.trim()) { notify('Tab name is required', 'error'); return; }
    if (!fields.length) { notify('Add at least one field', 'error'); return; }
    setTabSaving(true);
    try {
      const res = await api.post('/vehicleTabs', { name: tabName.trim(), fields });
      notify('Tab created');
      setTabOpen(false);
      setTabName('');
      setTabFields([{ label: '', type: 'text' }]);
      await vehicleTabs.reload();
      if (res?.item) {
        const fresh = await api.get('/vehicleTabs');
        const idx = (fresh.items || []).findIndex((t) => t.id === res.item.id);
        if (idx >= 0) setTab(TABS.length + idx);
      }
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setTabSaving(false);
    }
  };

  const setCustomValue = (tabId, label, val) => {
    setForm((f) => ({
      ...f,
      customTabs: {
        ...(f.customTabs || {}),
        [tabId]: { ...((f.customTabs || {})[tabId] || {}), [label]: val }
      }
    }));
  };

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const set = (key) => (e) => {
    const val = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((er) => ({ ...er, [key]: '' }));
  };

  const setNested = (section, key, val) => {
    setForm((f) => ({ ...f, [`${section}${key.charAt(0).toUpperCase() + key.slice(1)}`]: val }));
  };

  const setFile = (key, file) => {
    setFiles((f) => ({ ...f, [key]: file }));
  };

  const autoCalcSupply = useCallback(() => {
    const val = Number(form.supplySalesValue) || 0;
    const gst = Number(form.supplyGstPercent) || 0;
    const gstAmt = (val * gst / 100).toFixed(2);
    const total = (val + Number(gstAmt)).toFixed(2);
    setForm((f) => ({ ...f, supplyGstAmount: gstAmt, supplyTotalAmount: total }));
  }, [form.supplySalesValue, form.supplyGstPercent]);

  const autoCalcInsurance = useCallback(() => {
    const prem = Number(form.insurancePremiumAmount) || 0;
    const gst = Number(form.insuranceGstPercent) || 0;
    const gstAmt = (prem * gst / 100).toFixed(2);
    const total = (prem + Number(gstAmt)).toFixed(2);
    setForm((f) => ({ ...f, insuranceGstAmount: gstAmt, insuranceTotalAmount: total }));
  }, [form.insurancePremiumAmount, form.insuranceGstPercent]);

  useEffect(() => { autoCalcSupply(); }, [form.supplySalesValue, form.supplyGstPercent]);
  useEffect(() => { autoCalcInsurance(); }, [form.insurancePremiumAmount, form.insuranceGstPercent]);

  const supplyGrandTotal = (
    Number(form.supplyTotalAmount || 0) + Number(form.supplyTcs || 0) + Number(form.supplyOtherAmount || 0)
  ).toFixed(2);

  const addTax = () => {
    setForm((f) => ({ ...f, taxes: [...(f.taxes || []), { type: '', period: '', amount: '', pdfName: '' }] }));
  };

  const updateTax = (i, key, val) => {
    setForm((f) => {
      const taxes = [...(f.taxes || [])];
      taxes[i] = { ...taxes[i], [key]: val };
      return { ...f, taxes };
    });
  };

  const removeTax = (i) => {
    setForm((f) => ({ ...f, taxes: f.taxes.filter((_, idx) => idx !== i) }));
  };

  const addMovement = () => {
    setForm((f) => ({
      ...f,
      movements: [...(f.movements || []), {
        sourceState: '', sourceCity: '', destinationState: '', destinationCity: '',
        projectState: '', projectCity: '', mode: 'trallow',
        trallowNo: '', driverName: '', driverNo: '', transporterName: '', transporterContact: '', fare: '',
        advance: '', dieselLitres: '', dieselAmount: '', totalPayable: '', paidAmount: '',
        paidOwn: false, modeOfPayment: '', reasonType: '', orderedBy: ''
      }]
    }));
  };

  const updateMovement = (i, key, val) => {
    setForm((f) => {
      const movements = [...(f.movements || [])];
      const patch = { [key]: val };
      if (key === 'sourceState' || key === 'destinationState' || key === 'projectState') {
        const cityKey = key.replace('State', 'City');
        patch[cityKey] = '';
      }
      movements[i] = { ...movements[i], ...patch };
      return { ...f, movements };
    });
  };

  const removeMovement = (i) => {
    setForm((f) => ({ ...f, movements: (f.movements || []).filter((_, idx) => idx !== i) }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleNumber?.trim()) {
      setErrors({ vehicleNumber: 'Vehicle number is required' });
      notify('Please fill required fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      for (const [key, val] of Object.entries(form)) {
        if (key === 'taxes') {
          fd.append('taxes', JSON.stringify(val || []));
        } else if (key === 'movements') {
          fd.append('movements', JSON.stringify(val || []));
        } else if (key === 'customTabs') {
          fd.append('customTabs', JSON.stringify(val || {}));
        } else if (typeof val === 'boolean') {
          fd.append(key, String(val));
        } else if (val !== null && val !== undefined && val !== '') {
          fd.append(key, String(val));
        }
      }
      for (const [key, file] of Object.entries(files)) {
        if (file) fd.append(key, file);
      }
      for (const [key, list] of Object.entries(fileLists)) {
        for (const f of list || []) if (f) fd.append(key, f);
      }

      if (vehicleId) {
        await api.upload(`/vehicles/${vehicleId}`, fd);
        notify('Vehicle updated');
        router.push(`/inputter/vehicles`);
      } else {
        const res = await api.upload('/vehicles', fd);
        notify('Vehicle created');
        router.push(`/inputter/vehicles`);
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderTab = () => {
    switch (tab) {
      case 0: return (
        <Section title="Basic Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Category" required>
              <div className="flex items-center gap-2">
                <select value={form.categoryId} onChange={(e) => {
                  const opt = categories.items.find(c => c.id === e.target.value);
                  setForm(f => ({ ...f, categoryId: e.target.value, categoryName: opt?.name || '', subcategoryId: '', subcategoryName: '' }));
                }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Select category</option>
                  {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {user?.role === 'admin' && (
                  <button type="button" onClick={() => setCatOpen(true)} title="Create category"
                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    +
                  </button>
                )}
              </div>
            </Field>
            {subcategories.length > 0 && (
              <Field label="Subcategory">
                <select value={form.subcategoryId} onChange={(e) => {
                  const opt = subcategories.find(c => c.id === e.target.value);
                  setForm(f => ({ ...f, subcategoryId: e.target.value, subcategoryName: opt?.name || '' }));
                }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Select subcategory</option>
                  {subcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Ownership" required>
              <Select value={form.type} onChange={set('type')}>
                <option value="company">In Favor of Company</option>
                <option value="personal">Personal</option>
              </Select>
            </Field>
            <Field label="Vehicle Number" required error={errors.vehicleNumber}>
              <Input value={form.vehicleNumber} onChange={set('vehicleNumber')} placeholder="PB10AB1234" className="font-mono uppercase" />
            </Field>
            <Field label="Serial Number">
              <Input value={form.serialNumber} onChange={set('serialNumber')} placeholder="Serial no." />
            </Field>
            <Field label="Applicable No. Type">
              <Select value={form.applicableNoType} onChange={set('applicableNoType')}>
                <option value="serial">Serial No.</option>
                <option value="rc">RC No.</option>
                <option value="both">Both</option>
              </Select>
            </Field>
            {(form.applicableNoType === 'serial' || form.applicableNoType === 'both') && (
              <Field label="Applicable Serial No.">
                <Input value={form.applicableSerialNo} onChange={set('applicableSerialNo')} placeholder="Serial no." />
              </Field>
            )}
            {(form.applicableNoType === 'rc' || form.applicableNoType === 'both') && (
              <Field label="Applicable RC No.">
                <Input value={form.applicableRcNo} onChange={set('applicableRcNo')} placeholder="RC no." />
              </Field>
            )}
            <Field label="Engine Number" required>
              <Input value={form.engineNumber} onChange={set('engineNumber')} placeholder="Engine no." />
            </Field>
            <Field label="Chassis Number" required>
              <Input value={form.chassisNumber} onChange={set('chassisNumber')} placeholder="Chassis no." />
            </Field>
            <Field label="Make" required>
              <Input value={form.make} onChange={set('make')} placeholder="Tata, Ashok Leyland..." />
            </Field>
            <Field label="Model" required>
              <Input value={form.model} onChange={set('model')} placeholder="Model" />
            </Field>
            <Field label="RC Valid From">
              <Input type="date" value={form.invoiceRcValidFrom} onChange={set('invoiceRcValidFrom')} />
            </Field>
            <Field label="RC Valid To">
              <Input type="date" value={form.invoiceRcValidTo} onChange={set('invoiceRcValidTo')} />
            </Field>
          </div>
          <Field label="RC Documents (attach multiple)">
            <MultiFileUpload files={fileLists.rc || []} onChange={(l) => setFileLists(s => ({ ...s, rc: l }))} label="Attach RC Document" />
          </Field>
        </Section>
      );

      case 1: return (
        <Section title="Ownership">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ownership Name">
              <select value={form.ownershipId} onChange={(e) => {
                const opt = ownerships.items.find(o => o.id === e.target.value);
                setForm(f => ({ ...f, ownershipId: e.target.value, ownershipName: opt?.name || '' }));
              }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Select ownership</option>
                {ownerships.items.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <YesNo label="Change Ownership?" value={form.ownershipChanged} onChange={(v) => setForm(f => ({ ...f, ownershipChanged: v }))} id="ownChange" />
            {form.ownershipChanged && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="New Ownership Name" required>
                  <select value={form.ownershipNewName} onChange={set('ownershipNewName')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select new ownership</option>
                    {ownerships.items.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                </Field>
                <Field label="Reason for Change" required>
                  <Input value={form.ownershipChangeReason} onChange={set('ownershipChangeReason')} placeholder="Reason" />
                </Field>
              </div>
            )}
          </div>
          <Field label="Ownership Document (PDF/JPG)">
            <FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach Ownership Document" onChange={(f) => setFile('ownership', f)} />
          </Field>
        </Section>
      );

      case 2: return (
        <Section title="Purchase Record">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Supplier Name">
              <Input value={form.supplySupplierName} onChange={set('supplySupplierName')} placeholder="Supplier name" />
            </Field>
            <Field label="Address">
              <Input value={form.supplyAddress} onChange={set('supplyAddress')} placeholder="Supplier address" />
            </Field>
            <Field label="GST No. (Supplier)">
              <Input value={form.supplyGstNo} onChange={set('supplyGstNo')} placeholder="Supplier GSTIN" className="font-mono uppercase" />
            </Field>
            <Field label="Email ID">
              <Input type="email" value={form.supplyEmail} onChange={set('supplyEmail')} placeholder="supplier@email.com" />
            </Field>
            <Field label="Phone No.">
              <Input value={form.supplyPhone} onChange={set('supplyPhone')} placeholder="Phone number" />
            </Field>
            <Field label="Payment Method">
              <Select value={form.supplyPaymentMethod} onChange={set('supplyPaymentMethod')}>
                <option value="">Select method</option>
                <option value="financed">Financed</option>
                <option value="without_financed">Without Financed</option>
              </Select>
            </Field>
            <Field label="Sale Value (Basic)">
              <Input type="number" value={form.supplySalesValue} onChange={set('supplySalesValue')} placeholder="0.00" />
            </Field>
            <Field label="GST / Basic (%)">
              <Input type="number" value={form.supplyGstPercent} onChange={set('supplyGstPercent')} placeholder="18" />
            </Field>
            <Field label="TCS">
              <Input type="number" value={form.supplyTcs} onChange={set('supplyTcs')} placeholder="0.00" />
            </Field>
            <Field label="Name of Buyer">
              <Input value={form.supplyBuyerName} placeholder="Buyer name"
                onChange={(e) => setForm((f) => ({ ...f, supplyBuyerName: e.target.value, invoiceBuyerBilling: e.target.value }))} />
            </Field>
            <Field label="GST No. (Buyer)">
              <Input value={form.supplyBuyerGstNo} placeholder="Buyer GSTIN" className="font-mono uppercase"
                onChange={(e) => setForm((f) => ({ ...f, supplyBuyerGstNo: e.target.value, invoiceBuyerGstNo: e.target.value }))} />
            </Field>
            <Field label="Invoice Number">
              <Input value={form.invoiceInvoiceNo} onChange={set('invoiceInvoiceNo')} placeholder="Invoice no." />
            </Field>
            <Field label="Invoice Date">
              <Input type="date" value={form.invoiceInvoiceDate} onChange={set('invoiceInvoiceDate')} />
            </Field>
            <Field label="Billing Address" className="sm:col-span-2">
              <Textarea value={form.invoiceBuyerAddress} onChange={set('invoiceBuyerAddress')} placeholder="Buyer billing address" rows={2} />
            </Field>
            <Field label="Other Label">
              <Input value={form.supplyOtherLabel} onChange={set('supplyOtherLabel')} placeholder="Label" />
            </Field>
            <Field label="Other Amount">
              <Input type="number" value={form.supplyOtherAmount} onChange={set('supplyOtherAmount')} placeholder="0.00" />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-6 rounded-lg bg-slate-50 p-4">
            <CalcField label="GST Amount" value={form.supplyGstAmount} suffix="₹" />
            <CalcField label="Total Amount" value={form.supplyTotalAmount} suffix="₹" />
            <CalcField label="Grand Total" value={supplyGrandTotal} suffix="₹" />
          </div>
          <Field label="Invoice PDF">
            <FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach Invoice" onChange={(f) => setFile('invoice', f)} />
          </Field>
        </Section>
      );

      case 3: return (
        <Section title="Insurance">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Insurance Company">
              <Input value={form.insuranceCompanyName} onChange={set('insuranceCompanyName')} placeholder="Company name" />
            </Field>
            <Field label="Insurance Category">
              <select value={form.insuranceKind} onChange={(e) => setForm(f => ({ ...f, insuranceKind: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="general">General Insurance</option>
                <option value="transit">Transit Insurance</option>
              </select>
            </Field>
            <Field label="Insurance Type">
              <select value={form.insuranceTypeId} onChange={(e) => {
                const opt = insuranceTypes.items.find(t => t.id === e.target.value);
                setForm(f => ({ ...f, insuranceTypeId: e.target.value, insuranceTypeName: opt?.name || '' }));
              }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Select type</option>
                {insuranceTypes.items.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Premium Amount">
              <Input type="number" value={form.insurancePremiumAmount} onChange={set('insurancePremiumAmount')} placeholder="0.00" />
            </Field>
            <Field label="GST %">
              <Input type="number" value={form.insuranceGstPercent} onChange={set('insuranceGstPercent')} placeholder="18" />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-6 rounded-lg bg-slate-50 p-4">
            <CalcField label="GST Amount" value={form.insuranceGstAmount} suffix="₹" />
            <CalcField label="Total Amount" value={form.insuranceTotalAmount} suffix="₹" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Period of Insurance">
              <Input value={form.insurancePeriod} onChange={set('insurancePeriod')} placeholder="e.g. 1 year" />
            </Field>
            <Field label="Valid From">
              <Input type="date" value={form.insuranceValidFrom} onChange={set('insuranceValidFrom')} />
            </Field>
            <Field label="Valid To">
              <Input type="date" value={form.insuranceValidTo} onChange={set('insuranceValidTo')} />
            </Field>
          </div>
          {form.insuranceKind === 'transit' && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">Transit Insurance Details</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Reason">
                  <Input value={form.insuranceTransitReason} onChange={set('insuranceTransitReason')} placeholder="Reason for transit" />
                </Field>
                <Field label="Source Location">
                  <Input value={form.insuranceSourceLocation} onChange={set('insuranceSourceLocation')} placeholder="Source location" />
                </Field>
                <Field label="Destination Location">
                  <Input value={form.insuranceDestinationLocation} onChange={set('insuranceDestinationLocation')} placeholder="Destination location" />
                </Field>
              </div>
              <Field label="Documents of Transit">
                <MultiFileUpload files={fileLists.transitDoc || []} onChange={(l) => setFileLists(s => ({ ...s, transitDoc: l }))} label="Attach Transit Document" />
              </Field>
            </div>
          )}
          <div className="mt-3 rounded-lg border border-slate-200 p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Insurance Invoice</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Invoice No. of Insurance">
                <Input value={form.insuranceInvoiceNo} onChange={set('insuranceInvoiceNo')} placeholder="Invoice no." />
              </Field>
              <Field label="Invoice GST Amount">
                <Input type="number" value={form.insuranceInvoiceGstAmount} onChange={set('insuranceInvoiceGstAmount')} placeholder="0.00" />
              </Field>
              <Field label="Invoice Total Value">
                <Input type="number" value={form.insuranceInvoiceTotalValue} onChange={set('insuranceInvoiceTotalValue')} placeholder="0.00" />
              </Field>
            </div>
          </div>
          <Field label="Insurance PDF">
            <FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach Insurance Document" onChange={(f) => setFile('insurance', f)} />
          </Field>
        </Section>
      );

      case 4: return (
        <Section title="Certificates">
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 p-4">
              <YesNo label="Pollution Certificate Applicable" value={form.pollutionApplicable} onChange={(v) => setForm(f => ({ ...f, pollutionApplicable: v }))} id="poll" />
              <div className="mt-3 border-t border-slate-100 pt-3">
                <YesNo label="Equipment NOC Required" value={form.equipmentNocRequired} onChange={(v) => setForm(f => ({ ...f, equipmentNocRequired: v }))} id="nocReq" />
              </div>
              {form.pollutionApplicable && (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Period"><Input value={form.pollutionPeriod} onChange={set('pollutionPeriod')} placeholder="e.g. 6 months" /></Field>
                  <Field label="Valid Until"><Input type="date" value={form.pollutionPeriodEnd} onChange={set('pollutionPeriodEnd')} /></Field>
                  <Field label="Pollution PDF"><FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach Certificate" onChange={(f) => setFile('pollution', f)} /></Field>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <YesNo label="State Period Applicable" value={form.statePeriodApplicable} onChange={(v) => setForm(f => ({ ...f, statePeriodApplicable: v }))} id="stateP" />
              {form.statePeriodApplicable && (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Period"><Input value={form.statePeriodPeriod} onChange={set('statePeriodPeriod')} placeholder="e.g. 1 year" /></Field>
                  <Field label="Valid Until"><Input type="date" value={form.statePeriodPeriodEnd} onChange={set('statePeriodPeriodEnd')} /></Field>
                  <Field label="State Permit PDF"><FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach Permit" onChange={(f) => setFile('statePeriod', f)} /></Field>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <YesNo label="National Permit (NP) Applicable" value={form.nationalPermitApplicable} onChange={(v) => setForm(f => ({ ...f, nationalPermitApplicable: v }))} id="np" />
              {form.nationalPermitApplicable && (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Period"><Input value={form.nationalPermitPeriod} onChange={set('nationalPermitPeriod')} placeholder="e.g. 1 year" /></Field>
                  <Field label="Valid Until"><Input type="date" value={form.nationalPermitPeriodEnd} onChange={set('nationalPermitPeriodEnd')} /></Field>
                  <Field label="NP PDF"><FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach NP Document" onChange={(f) => setFile('nationalPermit', f)} /></Field>
                </div>
              )}
            </div>
          </div>
        </Section>
      );

      case 5: return (
        <Section title="Finance Details">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <YesNo label="Equipment is Financed" value={form.equipmentFinanced} onChange={(v) => setForm(f => ({ ...f, equipmentFinanced: v, equipmentFree: !v }))} id="fin" />
              <YesNo label="Equipment is Free" value={form.equipmentFree} onChange={(v) => setForm(f => ({ ...f, equipmentFree: v, equipmentFinanced: !v }))} id="free" />
            </div>
            {form.equipmentFinanced && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Financed By"><Input value={form.financeFinancedBy} onChange={set('financeFinancedBy')} placeholder="Finance company" /></Field>
                <Field label="Financed Amount"><Input type="number" value={form.financeFinancedAmount} onChange={set('financeFinancedAmount')} placeholder="0.00" /></Field>
                <Field label="Earnest Money"><Input type="number" value={form.financeEarnestMoney} onChange={set('financeEarnestMoney')} placeholder="0.00" /></Field>
                <Field label="Total % of Financed"><Input type="number" value={form.financeTotalPercent} onChange={set('financeTotalPercent')} placeholder="%" /></Field>
                <Field label="Total Installments">
                  <select value={form.financeInstallmentCountId} onChange={(e) => {
                    const opt = installmentCounts.items.find(c => c.id === e.target.value);
                    setForm(f => ({ ...f, financeInstallmentCountId: e.target.value, financeInstallmentCount: opt?.name || '' }));
                  }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select count</option>
                    {installmentCounts.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Email ID Financer"><Input type="email" value={form.financeEmailFinancer} onChange={set('financeEmailFinancer')} placeholder="email@financer.com" /></Field>
                <Field label="Loan Schedule PDF"><FileUpload accept=".pdf" label="Attach Loan Schedule" onChange={(f) => setFile('loanSchedule', f)} /></Field>
              </div>
            )}
            {form.equipmentFree && (
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">No due documents required.</div>
            )}
          </div>
        </Section>
      );

      case 6: return (
        <Section title="Taxes">
          <div className="space-y-3">
            {(form.taxes || []).map((tax, i) => (
              <div key={i} className="flex items-end gap-3 rounded-lg border border-slate-200 p-3">
                <div className="flex-1"><Field label="Tax Type"><Input value={tax.type ?? ''} onChange={(e) => updateTax(i, 'type', e.target.value)} placeholder="Road Tax, Green Tax..." /></Field></div>
                <div className="flex-1"><Field label="Period"><Input value={tax.period ?? ''} onChange={(e) => updateTax(i, 'period', e.target.value)} placeholder="e.g. 1 year" /></Field></div>
                <div className="flex-1"><Field label="Amount"><Input type="number" value={tax.amount ?? ''} onChange={(e) => updateTax(i, 'amount', e.target.value)} placeholder="0.00" /></Field></div>
                <div className="flex-1"><Field label="PDF"><FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach" onChange={(f) => setFile(`tax_${i}`, f)} /></Field></div>
                <button type="button" onClick={() => removeTax(i)} className="mb-1 rounded p-2 text-red-500 hover:bg-red-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addTax}>+ Add Tax</Button>
          </div>
        </Section>
      );

      case 7: return (
        <Section title="Working Site Update">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Reason (Shifting site, etc.)"><Textarea value={form.workingSiteReason} onChange={set('workingSiteReason')} placeholder="Reason for site update" rows={2} /></Field>
            <Field label="Ordered By"><Input value={form.workingSiteOrderBy} onChange={set('workingSiteOrderBy')} placeholder="Name / Authority" /></Field>
          </div>
        </Section>
      );

      case 8: return (
        <Section title="Vehicle Movement">
          <div className="space-y-4">
            {(form.movements || []).map((m, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Movement {i + 1}</h4>
                  <button type="button" onClick={() => removeMovement(i)} className="rounded p-2 text-red-500 hover:bg-red-50">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Source — State">
                    <select value={m.sourceState ?? ''} onChange={(e) => updateMovement(i, 'sourceState', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="">Select state</option>
                      {stateNames.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Source — City">
                    <select value={m.sourceCity ?? ''} onChange={(e) => updateMovement(i, 'sourceCity', e.target.value)} disabled={!m.sourceState} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50">
                      <option value="">{m.sourceState ? 'Select city' : 'Select state first'}</option>
                      {cityOptions(m.sourceState, m.sourceCity).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Destination — State">
                    <select value={m.destinationState ?? ''} onChange={(e) => updateMovement(i, 'destinationState', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="">Select state</option>
                      {stateNames.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Destination — City">
                    <select value={m.destinationCity ?? ''} onChange={(e) => updateMovement(i, 'destinationCity', e.target.value)} disabled={!m.destinationState} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50">
                      <option value="">{m.destinationState ? 'Select city' : 'Select state first'}</option>
                      {cityOptions(m.destinationState, m.destinationCity).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Project — State">
                    <select value={m.projectState ?? ''} onChange={(e) => updateMovement(i, 'projectState', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="">Select state</option>
                      {stateNames.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Project — City">
                    <select value={m.projectCity ?? ''} onChange={(e) => updateMovement(i, 'projectCity', e.target.value)} disabled={!m.projectState} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50">
                      <option value="">{m.projectState ? 'Select city' : 'Select state first'}</option>
                      {cityOptions(m.projectState, m.projectCity).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Movement By">
                    <select value={m.mode ?? 'trallow'} onChange={(e) => updateMovement(i, 'mode', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="trallow">Trallow</option>
                      <option value="own">By Own</option>
                    </select>
                  </Field>
                </div>
                {m.mode === 'trallow' && (
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Trallow No.">
                      <Input value={m.trallowNo ?? ''} onChange={(e) => updateMovement(i, 'trallowNo', e.target.value)} placeholder="Trallow no." />
                    </Field>
                    <Field label="Driver Name">
                      <Input value={m.driverName ?? ''} onChange={(e) => updateMovement(i, 'driverName', e.target.value)} placeholder="Driver name" />
                    </Field>
                    <Field label="Driver No.">
                      <Input value={m.driverNo ?? ''} onChange={(e) => updateMovement(i, 'driverNo', e.target.value)} placeholder="Driver phone" />
                    </Field>
                    <Field label="Transporter Name">
                      <Input value={m.transporterName ?? ''} onChange={(e) => updateMovement(i, 'transporterName', e.target.value)} placeholder="Transporter name" />
                    </Field>
                    <Field label="Contact No.">
                      <Input value={m.transporterContact ?? ''} onChange={(e) => updateMovement(i, 'transporterContact', e.target.value)} placeholder="Contact no." />
                    </Field>
                    <Field label="Fare (₹)">
                      <Input type="number" value={m.fare ?? ''} onChange={(e) => updateMovement(i, 'fare', e.target.value)} placeholder="0.00" />
                    </Field>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Advance (₹)">
                    <Input type="number" value={m.advance ?? ''} onChange={(e) => updateMovement(i, 'advance', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Diesel (Litres)">
                    <Input type="number" value={m.dieselLitres ?? ''} onChange={(e) => updateMovement(i, 'dieselLitres', e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Diesel Amount (₹)">
                    <Input type="number" value={m.dieselAmount ?? ''} onChange={(e) => updateMovement(i, 'dieselAmount', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Amount Debited (Total Payable ₹)">
                    <Input type="number" value={m.totalPayable ?? ''} onChange={(e) => updateMovement(i, 'totalPayable', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Paid Amount (₹)">
                    <Input type="number" value={m.paidAmount ?? ''} onChange={(e) => updateMovement(i, 'paidAmount', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Mode of Payment">
                    <select value={m.modeOfPayment ?? ''} onChange={(e) => updateMovement(i, 'modeOfPayment', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="">Select mode</option>
                      {PAYMENT_MODES.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
                    </select>
                  </Field>
                  <Field label="Reason Type">
                    <Input value={m.reasonType ?? ''} onChange={(e) => updateMovement(i, 'reasonType', e.target.value)} placeholder="Reason type" />
                  </Field>
                  <Field label="Order By (Transit)">
                    <Input value={m.orderedBy ?? ''} onChange={(e) => updateMovement(i, 'orderedBy', e.target.value)} placeholder="Ordered by" />
                  </Field>
                  <Field label="Paid Own">
                    <div className="pt-1.5">
                      <YesNo label="" value={!!m.paidOwn} onChange={(v) => updateMovement(i, 'paidOwn', v)} id={`movPaidOwn-${i}`} />
                    </div>
                  </Field>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addMovement}>+ Add Movement</Button>
          </div>
        </Section>
      );

      default: {
        const customDef = customTabs[tab - TABS.length];
        if (!customDef) return null;
        const values = (form.customTabs || {})[customDef.id] || {};
        return (
          <Section title={customDef.name}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(customDef.fields || []).map((fld, fi) => (
                <Field key={`${customDef.id}-${fi}`} label={fld.label}>
                  {fld.type === 'textarea' ? (
                    <Textarea value={values[fld.label] ?? ''} onChange={(e) => setCustomValue(customDef.id, fld.label, e.target.value)} placeholder={fld.label} />
                  ) : (
                    <Input
                      type={fld.type === 'number' ? 'number' : fld.type === 'date' ? 'date' : 'text'}
                      value={values[fld.label] ?? ''}
                      onChange={(e) => setCustomValue(customDef.id, fld.label, e.target.value)}
                      placeholder={fld.label}
                    />
                  )}
                </Field>
              ))}
            </div>
          </Section>
        );
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {allTabs.map((t) => (
          <button key={t.name} type="button" onClick={() => setTab(t.index)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${tab === t.index ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t.name}
          </button>
        ))}
        {user?.role === 'admin' && (
          <button type="button" onClick={() => setTabOpen(true)} title="Create a new tab"
            className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600">
            + Add Tab
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">{allTabs[tab]?.name || TABS[tab]}</h3>
        {renderTab()}
      </div>

      <div className="flex justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          {tab > 0 && <Button type="button" variant="secondary" onClick={() => setTab(tab - 1)}>Previous</Button>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          {tab < allTabs.length - 1 ? (
            <Button type="button" onClick={() => setTab(tab + 1)}>Next</Button>
          ) : (
            <Button type="submit" loading={saving}>{vehicleId ? 'Update Vehicle' : 'Create Vehicle'}</Button>
          )}
        </div>
      </div>

      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Create Category">
        <div className="space-y-4">
          <Field label="Category Name" required>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Excavator"
              onKeyDown={(e) => e.key === 'Enter' && createCategory()} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCatOpen(false)}>Cancel</Button>
            <Button onClick={createCategory} loading={catSaving}>Create Category</Button>
          </div>
        </div>
      </Modal>

      <Modal open={tabOpen} onClose={() => setTabOpen(false)} title="Create Tab" wide>
        <div className="space-y-4">
          <Field label="Tab Name" required>
            <Input value={tabName} onChange={(e) => setTabName(e.target.value)} placeholder="e.g. Attachments, Site Info..." />
          </Field>
          <div>
            <span className="mb-2 block text-xs font-semibold text-slate-600">Fields</span>
            <div className="space-y-2">
              {tabFields.map((fld, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={fld.label} placeholder={`Field ${i + 1} label`}
                    onChange={(e) => setTabFields((arr) => arr.map((f, idx) => idx === i ? { ...f, label: e.target.value } : f))} />
                  <select value={fld.type}
                    onChange={(e) => setTabFields((arr) => arr.map((f, idx) => idx === i ? { ...f, type: e.target.value } : f))}
                    className="w-36 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="textarea">Long text</option>
                  </select>
                  {tabFields.length > 1 && (
                    <button type="button" onClick={() => setTabFields((arr) => arr.filter((_, idx) => idx !== i))}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setTabFields((arr) => [...arr, { label: '', type: 'text' }])}
              className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600">
              + Add Field
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTabOpen(false)}>Cancel</Button>
            <Button onClick={createTab} loading={tabSaving}>Create Tab</Button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
