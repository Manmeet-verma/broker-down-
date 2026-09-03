'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Field, Input, Select, Textarea, notify } from './ui';
import { useMasterData } from '@/lib/useMasterData';
import FileUpload from './FileUpload';

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
  'Basic Details', 'Ownership', 'Supply', 'Invoice', 'Insurance', 'Agent',
  'Certificates', 'Finance', 'Taxes', 'Working Site', 'Applicables', 'Trallow'
];

const emptyForm = {
  categoryId: '', categoryName: '', type: 'company',
  vehicleNumber: '', serialNumber: '', applicableNoType: 'serial',
  applicableSerialNo: '', applicableRcNo: '',
  engineNumber: '', chassisNumber: '', make: '', model: '',
  ownershipId: '', ownershipName: '', ownershipChanged: false, ownershipChangeReason: '', ownershipNewName: '',
  supplySupplierName: '', supplySalesValue: '', supplyGstPercent: '', supplyGstAmount: '', supplyTotalAmount: '', supplyTcs: '', supplyOtherLabel: '', supplyOtherAmount: '',
  invoiceInvoiceNo: '', invoiceInvoiceDate: '', invoiceBuyerBilling: '', invoiceBuyerGstNo: '', invoiceBuyerAddress: '', invoiceRcValidFrom: '', invoiceRcValidTo: '',
  insuranceApplicable: true, insuranceCompanyId: '', insuranceCompanyName: '', insurancePremiumAmount: '', insuranceGstPercent: '', insuranceGstAmount: '', insuranceTotalAmount: '',
  insuranceTypeId: '', insuranceTypeName: '', insurancePeriod: '', insuranceValidFrom: '', insuranceValidTo: '',
  agentName: '', agentCode: '', agentEmail: '', agentInvoiceNo: '', agentGstAmount: '', agentTotalValue: '',
  pollutionApplicable: true, pollutionPeriod: '', pollutionPeriodEnd: '',
  statePeriodApplicable: false, statePeriodPeriod: '', statePeriodPeriodEnd: '',
  nationalPermitApplicable: false, nationalPermitPeriod: '', nationalPermitPeriodEnd: '',
  equipmentFinanced: false, equipmentFree: true,
  financeFinancedBy: '', financeFinancedAmount: '', financeEarnestMoney: '', financeTotalPercent: '',
  financeInstallmentCountId: '', financeInstallmentCount: '', financeInstallmentFree: false, financeEmailFinancer: '',
  workingSiteReason: '', workingSiteOrderBy: '',
  transmitInsurance: false, evApplicable: false, challanApplicable: false, billApplicable: false,
  trallowApplicable: false, trallowNo: '', trallowName: '', trallowFreightAmount: '',
  taxes: []
};

export default function VehicleForm({ initial, vehicleId }) {
  const router = useRouter();
  const [form, setForm] = useState(initial || emptyForm);
  const [tab, setTab] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState({});

  const categories = useMasterData('categories');
  const ownerships = useMasterData('ownershipNames');
  const insuranceTypes = useMasterData('insuranceTypes');
  const installmentCounts = useMasterData('installmentCounts');

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
        } else if (typeof val === 'boolean') {
          fd.append(key, String(val));
        } else if (val !== null && val !== undefined && val !== '') {
          fd.append(key, String(val));
        }
      }
      for (const [key, file] of Object.entries(files)) {
        if (file) fd.append(key, file);
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
              <select value={form.categoryId} onChange={(e) => {
                const opt = categories.items.find(c => c.id === e.target.value);
                setForm(f => ({ ...f, categoryId: e.target.value, categoryName: opt?.name || '' }));
              }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Select category</option>
                {categories.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Type" required>
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
          </div>
          <Field label="RC PDF / Image">
            <FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach RC Document" onChange={(f) => setFile('rc', f)} />
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
        <Section title="Supply Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Supplier Name">
              <Input value={form.supplySupplierName} onChange={set('supplySupplierName')} placeholder="Supplier name" />
            </Field>
            <Field label="Sales Value (Amount)">
              <Input type="number" value={form.supplySalesValue} onChange={set('supplySalesValue')} placeholder="0.00" />
            </Field>
            <Field label="GST %">
              <Input type="number" value={form.supplyGstPercent} onChange={set('supplyGstPercent')} placeholder="18" />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-6 rounded-lg bg-slate-50 p-4">
            <CalcField label="GST Amount" value={form.supplyGstAmount} suffix="₹" />
            <CalcField label="Total Amount" value={form.supplyTotalAmount} suffix="₹" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="TCS">
              <Input type="number" value={form.supplyTcs} onChange={set('supplyTcs')} placeholder="0.00" />
            </Field>
            <Field label="Other Label">
              <Input value={form.supplyOtherLabel} onChange={set('supplyOtherLabel')} placeholder="Label" />
            </Field>
            <Field label="Other Amount">
              <Input type="number" value={form.supplyOtherAmount} onChange={set('supplyOtherAmount')} placeholder="0.00" />
            </Field>
          </div>
        </Section>
      );

      case 3: return (
        <Section title="Invoice">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Invoice Number">
              <Input value={form.invoiceInvoiceNo} onChange={set('invoiceInvoiceNo')} placeholder="Invoice no." />
            </Field>
            <Field label="Invoice Date">
              <Input type="date" value={form.invoiceInvoiceDate} onChange={set('invoiceInvoiceDate')} />
            </Field>
            <Field label="Buyer Billing Name">
              <Input value={form.invoiceBuyerBilling} onChange={set('invoiceBuyerBilling')} placeholder="Buyer name" />
            </Field>
            <Field label="GST No. of Buyer">
              <Input value={form.invoiceBuyerGstNo} onChange={set('invoiceBuyerGstNo')} placeholder="GSTIN" className="font-mono uppercase" />
            </Field>
            <Field label="Billing Address" className="sm:col-span-2">
              <Textarea value={form.invoiceBuyerAddress} onChange={set('invoiceBuyerAddress')} placeholder="Address" rows={2} />
            </Field>
            <Field label="RC Valid From">
              <Input type="date" value={form.invoiceRcValidFrom} onChange={set('invoiceRcValidFrom')} />
            </Field>
            <Field label="RC Valid To">
              <Input type="date" value={form.invoiceRcValidTo} onChange={set('invoiceRcValidTo')} />
            </Field>
          </div>
          <Field label="Invoice PDF">
            <FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach Invoice" onChange={(f) => setFile('invoice', f)} />
          </Field>
        </Section>
      );

      case 4: return (
        <Section title="Insurance">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Insurance Company">
              <Input value={form.insuranceCompanyName} onChange={set('insuranceCompanyName')} placeholder="Company name" />
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
          <Field label="Insurance PDF">
            <FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach Insurance Document" onChange={(f) => setFile('insurance', f)} />
          </Field>
        </Section>
      );

      case 5: return (
        <Section title="Agent Details (Optional)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Agent Name">
              <Input value={form.agentName} onChange={set('agentName')} placeholder="Agent name" />
            </Field>
            <Field label="Agent Code">
              <Input value={form.agentCode} onChange={set('agentCode')} placeholder="Code" />
            </Field>
            <Field label="Agent Email">
              <Input type="email" value={form.agentEmail} onChange={set('agentEmail')} placeholder="email@example.com" />
            </Field>
            <Field label="Invoice No. of Insurance">
              <Input value={form.agentInvoiceNo} onChange={set('agentInvoiceNo')} placeholder="Invoice no." />
            </Field>
            <Field label="GST Amount">
              <Input type="number" value={form.agentGstAmount} onChange={set('agentGstAmount')} placeholder="0.00" />
            </Field>
            <Field label="Total Value">
              <Input type="number" value={form.agentTotalValue} onChange={set('agentTotalValue')} placeholder="0.00" />
            </Field>
          </div>
          <Field label="Agent Document">
            <FileUpload accept=".pdf,.jpg,.jpeg,.png" label="Attach Agent Document" onChange={(f) => setFile('agent', f)} />
          </Field>
        </Section>
      );

      case 6: return (
        <Section title="Certificates">
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 p-4">
              <YesNo label="Pollution Certificate Applicable" value={form.pollutionApplicable} onChange={(v) => setForm(f => ({ ...f, pollutionApplicable: v }))} id="poll" />
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

      case 7: return (
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

      case 8: return (
        <Section title="Taxes">
          <div className="space-y-3">
            {(form.taxes || []).map((tax, i) => (
              <div key={i} className="flex items-end gap-3 rounded-lg border border-slate-200 p-3">
                <div className="flex-1"><Field label="Tax Type"><Input value={tax.type} onChange={(e) => updateTax(i, 'type', e.target.value)} placeholder="Road Tax, Green Tax..." /></Field></div>
                <div className="flex-1"><Field label="Period"><Input value={tax.period} onChange={(e) => updateTax(i, 'period', e.target.value)} placeholder="e.g. 1 year" /></Field></div>
                <div className="flex-1"><Field label="Amount"><Input type="number" value={tax.amount} onChange={(e) => updateTax(i, 'amount', e.target.value)} placeholder="0.00" /></Field></div>
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

      case 9: return (
        <Section title="Working Site Update">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Reason (Shifting site, etc.)"><Textarea value={form.workingSiteReason} onChange={set('workingSiteReason')} placeholder="Reason for site update" rows={2} /></Field>
            <Field label="Ordered By"><Input value={form.workingSiteOrderBy} onChange={set('workingSiteOrderBy')} placeholder="Name / Authority" /></Field>
          </div>
        </Section>
      );

      case 10: return (
        <Section title="Applicables">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4"><YesNo label="Transmit Insurance" value={form.transmitInsurance} onChange={(v) => setForm(f => ({ ...f, transmitInsurance: v }))} id="ti" /></div>
            <div className="rounded-lg border border-slate-200 p-4"><YesNo label="EV Applicable" value={form.evApplicable} onChange={(v) => setForm(f => ({ ...f, evApplicable: v }))} id="ev" /></div>
            <div className="rounded-lg border border-slate-200 p-4"><YesNo label="Challan Applicable" value={form.challanApplicable} onChange={(v) => setForm(f => ({ ...f, challanApplicable: v }))} id="ch" /></div>
            <div className="rounded-lg border border-slate-200 p-4"><YesNo label="Bill Applicable" value={form.billApplicable} onChange={(v) => setForm(f => ({ ...f, billApplicable: v }))} id="bl" /></div>
          </div>
        </Section>
      );

      case 11: return (
        <Section title="Trallow Details">
          <div className="space-y-4">
            <YesNo label="Trallow Applicable" value={form.trallowApplicable} onChange={(v) => setForm(f => ({ ...f, trallowApplicable: v }))} id="trallow" />
            {form.trallowApplicable && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Trallow Number"><Input value={form.trallowNo} onChange={set('trallowNo')} placeholder="Trallow no." /></Field>
                <Field label="Trallow Name"><Input value={form.trallowName} onChange={set('trallowName')} placeholder="Trallow name" /></Field>
                <Field label="Freight Amount"><Input type="number" value={form.trallowFreightAmount} onChange={set('trallowFreightAmount')} placeholder="0.00" /></Field>
              </div>
            )}
          </div>
        </Section>
      );

      default: return null;
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map((t, i) => (
          <button key={t} type="button" onClick={() => setTab(i)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${tab === i ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">{TABS[tab]}</h3>
        {renderTab()}
      </div>

      <div className="flex justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          {tab > 0 && <Button type="button" variant="secondary" onClick={() => setTab(tab - 1)}>Previous</Button>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          {tab < TABS.length - 1 ? (
            <Button type="button" onClick={() => setTab(tab + 1)}>Next</Button>
          ) : (
            <Button type="submit" loading={saving}>{vehicleId ? 'Update Vehicle' : 'Create Vehicle'}</Button>
          )}
        </div>
      </div>
    </form>
  );
}
