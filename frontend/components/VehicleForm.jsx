'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Field, Input, Select, Textarea, notify } from './ui';
import { VEHICLE_STATUSES } from '@/lib/constants';
import { cls } from '@/lib/utils';

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

const emptyForm = {
  vehicleNumber: '', owner: '', company: '', customerNumber: '', typeOfEquipment: '',
  rcNumber: '', poNumber: '', engineNumber: '', chassisNumber: '', make: '', model: '',
  loadingSite: '', status: 'active',
  rcValidFrom: '', rcValidTo: '',
  insuranceCompany: '', insurancePolicyNo: '', insuranceValidFrom: '', insuranceValidTo: '',
  insuranceNotDone: false, insuranceReason: '',
  pollutionNumber: '', pollutionValidFrom: '', pollutionValidTo: '', pollutionNotDone: false,
  permitNumber: '', permitValidFrom: '', permitValidTo: '', permitNotDone: false,
  taxType: '', taxReceiptNumber: '', taxValidFrom: '', taxValidTo: '', taxNotDone: false,
  financeCompany: '', financeAgent: '', financePhone: '', financeEmail: '', financeGst: '', financeNotes: ''
};

const dateVal = (v) => (v ? String(v).slice(0, 10) : '');

export function vehicleToForm(v) {
  const d = (o) => o || {};
  return {
    vehicleNumber: v.vehicleNumber || '', owner: v.owner || '', company: v.company || '',
    customerNumber: v.customerNumber || '', typeOfEquipment: v.typeOfEquipment || '',
    rcNumber: v.rcNumber || '', poNumber: v.poNumber || '', engineNumber: v.engineNumber || '',
    chassisNumber: v.chassisNumber || '', make: v.make || '', model: v.model || '',
    loadingSite: v.loadingSite || '', status: v.status || 'active',
    rcValidFrom: dateVal(d(v.rc).validFrom), rcValidTo: dateVal(d(v.rc).validTo),
    insuranceCompany: d(v.insurance).company || '', insurancePolicyNo: d(v.insurance).policyNo || '',
    insuranceValidFrom: dateVal(d(v.insurance).validFrom), insuranceValidTo: dateVal(d(v.insurance).validTo),
    insuranceNotDone: d(v.insurance).done === false, insuranceReason: d(v.insurance).reason || '',
    pollutionNumber: d(v.pollution).number || '', pollutionValidFrom: dateVal(d(v.pollution).validFrom),
    pollutionValidTo: dateVal(d(v.pollution).validTo), pollutionNotDone: d(v.pollution).done === false,
    permitNumber: d(v.permit).number || '', permitValidFrom: dateVal(d(v.permit).validFrom),
    permitValidTo: dateVal(d(v.permit).validTo), permitNotDone: d(v.permit).done === false,
    taxType: d(v.tax).type || '', taxReceiptNumber: d(v.tax).receiptNo || '',
    taxValidFrom: dateVal(d(v.tax).validFrom), taxValidTo: dateVal(d(v.tax).validTo),
    taxNotDone: d(v.tax).done === false,
    financeCompany: d(v.finance).company || '', financeAgent: d(v.finance).agent || '',
    financePhone: d(v.finance).phone || '', financeEmail: d(v.finance).email || '',
    financeGst: d(v.finance).gst || '', financeNotes: d(v.finance).notes || ''
  };
}

export default function VehicleForm({ initial, vehicleId }) {
  const router = useRouter();
  const [form, setForm] = useState(initial || emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: '' }));
  };

  const validate = () => {
    const er = {};
    const req = [
      ['vehicleNumber', 'Vehicle Number'], ['rcNumber', 'RC Number'], ['engineNumber', 'Engine Number'],
      ['chassisNumber', 'Chassis Number'], ['make', 'Make'], ['model', 'Model']
    ];
    req.forEach(([k, label]) => { if (!String(form[k] || '').trim()) er[k] = `${label} is required`; });
    const vn = String(form.vehicleNumber || '').replace(/\s+/g, '').toUpperCase();
    if (vn && !/^[A-Z]{2}\d{1,2}[A-Z]{0,2}\d{3,4}$/.test(vn)) er.vehicleNumber = 'Invalid registration, e.g. PB10AB1234';
    if (form.financeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.financeEmail)) er.financeEmail = 'Invalid email';
    if (form.financePhone && !/^[0-9+\s-]{7,15}$/.test(form.financePhone)) er.financePhone = 'Invalid phone';
    if (form.insuranceNotDone && !form.insuranceReason.trim()) er.insuranceReason = 'Reason is required when insurance is not done';
    if (form.rcValidFrom && form.rcValidTo && new Date(form.rcValidTo) <= new Date(form.rcValidFrom)) er.rcValidTo = 'Valid To must be after Valid From';
    if (form.insuranceValidFrom && form.insuranceValidTo && new Date(form.insuranceValidTo) <= new Date(form.insuranceValidFrom)) er.insuranceValidTo = 'Must be after Valid From';
    if (form.pollutionValidFrom && form.pollutionValidTo && new Date(form.pollutionValidTo) <= new Date(form.pollutionValidFrom)) er.pollutionValidTo = 'Must be after Valid From';
    if (form.permitValidFrom && form.permitValidTo && new Date(form.permitValidTo) <= new Date(form.permitValidFrom)) er.permitValidTo = 'Must be after Valid From';
    if (form.taxValidFrom && form.taxValidTo && new Date(form.taxValidTo) <= new Date(form.taxValidFrom)) er.taxValidTo = 'Must be after Valid From';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      notify('Please fix the highlighted fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        vehicleNumber: String(form.vehicleNumber).toUpperCase(),
        financeGst: String(form.financeGst).toUpperCase()
      };
      if (vehicleId) {
        const res = await api.put(`/vehicles/${vehicleId}`, payload);
        notify('Vehicle updated');
        router.push(`/admin/vehicles/${vehicleId}`);
      } else {
        const res = await api.post('/vehicles', payload);
        notify('Vehicle created');
        router.push(`/admin/vehicles/${res.vehicle.id}`);
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Section title="Vehicle Basic Information">
        <Field label="Vehicle Number" required error={errors.vehicleNumber}>
          <Input value={form.vehicleNumber} onChange={set('vehicleNumber')} placeholder="PB10AB1234" className="font-mono uppercase" />
        </Field>
        <Field label="Vehicle Owner / User">
          <Input value={form.owner} onChange={set('owner')} placeholder="Owner name" />
        </Field>
        <Field label="Company / Customer">
          <Input value={form.company} onChange={set('company')} placeholder="Company or customer name" />
        </Field>
        <Field label="Customer Number">
          <Input value={form.customerNumber} onChange={set('customerNumber')} placeholder="Customer no." />
        </Field>
        <Field label="Type of Equipment">
          <Input value={form.typeOfEquipment} onChange={set('typeOfEquipment')} placeholder="Truck / Trailer / Tipper…" />
        </Field>
        <Field label="RC Number" required error={errors.rcNumber}>
          <Input value={form.rcNumber} onChange={set('rcNumber')} placeholder="RC no." />
        </Field>
        <Field label="PO Number">
          <Input value={form.poNumber} onChange={set('poNumber')} placeholder="P.O. no." />
        </Field>
        <Field label="Engine Number" required error={errors.engineNumber}>
          <Input value={form.engineNumber} onChange={set('engineNumber')} placeholder="Engine no." />
        </Field>
        <Field label="Chassis Number" required error={errors.chassisNumber}>
          <Input value={form.chassisNumber} onChange={set('chassisNumber')} placeholder="Chassis no." />
        </Field>
        <Field label="Make" required error={errors.make}>
          <Input value={form.make} onChange={set('make')} placeholder="e.g. Tata, Ashok Leyland" />
        </Field>
        <Field label="Model" required error={errors.model}>
          <Input value={form.model} onChange={set('model')} placeholder="e.g. 1613" />
        </Field>
        <Field label="Loading Site / Side (optional)">
          <Input value={form.loadingSite} onChange={set('loadingSite')} placeholder="Loading site" />
        </Field>
        <Field label="Vehicle Status">
          <Select value={form.status} onChange={set('status')}>
            {VEHICLE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
      </Section>

      <Section title="RC Details">
        <Field label="RC Number" required error={errors.rcNumber}>
          <Input value={form.rcNumber} onChange={set('rcNumber')} />
        </Field>
        <Field label="RC Valid From">
          <Input type="date" value={form.rcValidFrom} onChange={set('rcValidFrom')} />
        </Field>
        <Field label="RC Valid To" error={errors.rcValidTo}>
          <Input type="date" value={form.rcValidTo} onChange={set('rcValidTo')} />
        </Field>
      </Section>

      <Section title="Insurance Details">
        <Field label="Insurance Company">
          <Input value={form.insuranceCompany} onChange={set('insuranceCompany')} />
        </Field>
        <Field label="Policy Number">
          <Input value={form.insurancePolicyNo} onChange={set('insurancePolicyNo')} />
        </Field>
        <Field label="Insurance Valid From">
          <Input type="date" value={form.insuranceValidFrom} onChange={set('insuranceValidFrom')} />
        </Field>
        <Field label="Insurance Valid To" error={errors.insuranceValidTo}>
          <Input type="date" value={form.insuranceValidTo} onChange={set('insuranceValidTo')} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.insuranceNotDone} onChange={set('insuranceNotDone')} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Insurance not done
        </label>
        {form.insuranceNotDone && (
          <Field label="Reason (mandatory)" required error={errors.insuranceReason} className="sm:col-span-2 lg:col-span-3">
            <Textarea value={form.insuranceReason} onChange={set('insuranceReason')} placeholder="Why is insurance not done?" />
          </Field>
        )}
      </Section>

      <Section title="Pollution Certificate">
        <Field label="Certificate Number">
          <Input value={form.pollutionNumber} onChange={set('pollutionNumber')} />
        </Field>
        <Field label="Valid From">
          <Input type="date" value={form.pollutionValidFrom} onChange={set('pollutionValidFrom')} />
        </Field>
        <Field label="Valid To" error={errors.pollutionValidTo}>
          <Input type="date" value={form.pollutionValidTo} onChange={set('pollutionValidTo')} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.pollutionNotDone} onChange={set('pollutionNotDone')} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Pollution certificate not done
        </label>
      </Section>

      <Section title="State Permit">
        <Field label="Permit Number">
          <Input value={form.permitNumber} onChange={set('permitNumber')} />
        </Field>
        <Field label="Permit Valid From">
          <Input type="date" value={form.permitValidFrom} onChange={set('permitValidFrom')} />
        </Field>
        <Field label="Permit Valid To" error={errors.permitValidTo}>
          <Input type="date" value={form.permitValidTo} onChange={set('permitValidTo')} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.permitNotDone} onChange={set('permitNotDone')} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Permit not done
        </label>
      </Section>

      <Section title="Tax Details">
        <Field label="Tax Type">
          <Input value={form.taxType} onChange={set('taxType')} placeholder="e.g. Road Tax" />
        </Field>
        <Field label="Tax Receipt Number">
          <Input value={form.taxReceiptNumber} onChange={set('taxReceiptNumber')} />
        </Field>
        <Field label="Tax Valid From">
          <Input type="date" value={form.taxValidFrom} onChange={set('taxValidFrom')} />
        </Field>
        <Field label="Tax Valid To" error={errors.taxValidTo}>
          <Input type="date" value={form.taxValidTo} onChange={set('taxValidTo')} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.taxNotDone} onChange={set('taxNotDone')} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Tax not done
        </label>
      </Section>

      <Section title="Finance Details">
        <Field label="Finance Company">
          <Input value={form.financeCompany} onChange={set('financeCompany')} />
        </Field>
        <Field label="Finance Agent">
          <Input value={form.financeAgent} onChange={set('financeAgent')} />
        </Field>
        <Field label="Phone Number" error={errors.financePhone}>
          <Input value={form.financePhone} onChange={set('financePhone')} placeholder="+91…" />
        </Field>
        <Field label="Email ID" error={errors.financeEmail}>
          <Input type="email" value={form.financeEmail} onChange={set('financeEmail')} />
        </Field>
        <Field label="GST Number" hint="Automatically converted to capital letters">
          <Input value={form.financeGst} onChange={(e) => set('financeGst')({ target: { ...e.target, value: e.target.value.toUpperCase() } })} placeholder="GSTIN" className="font-mono uppercase" />
        </Field>
        <Field label="Notes / Details" className="sm:col-span-2 lg:col-span-3">
          <Textarea value={form.financeNotes} onChange={set('financeNotes')} placeholder="Additional finance details" />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={saving}>{vehicleId ? 'Update Vehicle' : 'Save Vehicle'}</Button>
      </div>
    </form>
  );
}
