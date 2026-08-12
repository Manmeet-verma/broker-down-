'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { downloadDataUrl } from '@/lib/utils';
import { Button, Field, Input, Select, Textarea, notify } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { LICENSE_TYPES, VEHICLE_CATEGORIES, DRIVER_STATUSES, SHIFT_PRESETS } from '@/lib/constants';
import { cls, readableBytes } from '@/lib/utils';

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

const empty = {
  name: '', pin: '', dob: '', phone: '', alternatePhone: '', aadhaar: '', address: '',
  licenceType: 'Heavy Vehicle', otherLicenceType: '',
  licenseNumber: '', licenseAuthority: '', licenseValidFrom: '', licenseValidTo: '',
  vehicleCategory: 'Heavy Vehicle',
  shiftPreset: 'general', shiftStartTime: '', shiftEndTime: '',
  accountUsername: '', accountPassword: '', status: 'active',
  photoDataUrl: null, photoFile: null
};

export default function CreateDriver() {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: '' }));
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors((er) => ({ ...er, photo: 'Photo must be JPG/JPEG/PNG' }));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrors((er) => ({ ...er, photo: 'Photo must be under 3MB' }));
      return;
    }
    const dataUrl = await downloadDataUrl(file);
    setForm((f) => ({ ...f, photoDataUrl: dataUrl, photoFile: file }));
  };

  const validate = () => {
    const er = {};
    const req = [['name', 'Driver Name'], ['phone', 'Phone Number'], ['dob', 'Date of Birth'], ['address', 'Address'],
      ['licenseNumber', 'DL Number'], ['licenseAuthority', 'DL Authority']];
    req.forEach(([k, label]) => { if (!String(form[k] || '').trim()) er[k] = `${label} is required`; });
    if (form.phone && !/^[0-9+\s-]{7,15}$/.test(form.phone)) er.phone = 'Invalid phone number';
    if (form.alternatePhone && !/^[0-9+\s-]{7,15}$/.test(form.alternatePhone)) er.alternatePhone = 'Invalid phone number';
    if (form.aadhaar && !/^\d{12}$/.test(String(form.aadhaar).replace(/\s/g, ''))) er.aadhaar = 'Aadhaar must be 12 digits';
    if (form.dob && new Date(form.dob) > new Date()) er.dob = 'DOB cannot be in the future';
    if (form.licenseValidFrom && form.licenseValidTo && new Date(form.licenseValidTo) <= new Date(form.licenseValidFrom)) er.licenseValidTo = 'Valid To must be after Valid From';
    if (form.licenceType === 'Other' && !form.otherLicenceType.trim()) er.otherLicenceType = 'Specify the licence type';
    if ((form.accountUsername || form.accountPassword) && !form.accountUsername) er.accountUsername = 'Username required for account';
    if ((form.accountUsername || form.accountPassword) && !form.accountPassword) er.accountPassword = 'Password required for account';
    if (form.accountPassword && form.accountPassword.length < 6) er.accountPassword = 'Min 6 characters';
    if ((form.shiftStartTime || form.shiftEndTime) && !(form.shiftStartTime && form.shiftEndTime)) er.shiftStartTime = 'Set both start and end time';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      notify('Please fix the highlighted fields', 'error');
      return null;
    }
    const payload = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') return;
      if (k === 'photoDataUrl' || k === 'photoFile') return;
      payload.append(k, v);
    });
    if (form.photoFile) payload.append('photoFile', form.photoFile);
    return payload;
  };

  const save = async (andAnother) => {
    setSaving(true);
    try {
      const payload = await submit();
      if (!payload) return;
      const res = await api.upload('/drivers', payload);
      notify(`Driver ${res.driver.name} created`);
      if (andAnother) {
        setForm(empty);
        window.scrollTo(0, 0);
      } else {
        router.push(`/admin/drivers/${res.driver.id}`);
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Create User / Driver Account" subtitle="Enter all driver and account information — saved permanently by Admin" />
      <div className="space-y-5">
        <Section title="Basic Driver Information">
          <Field label="Driver Name" required error={errors.name}>
            <Input value={form.name} onChange={set('name')} placeholder="Full name" />
          </Field>
          <Field label="PIN">
            <Input value={form.pin} onChange={set('pin')} placeholder="Employee PIN" />
          </Field>
          <Field label="Date of Birth" required error={errors.dob}>
            <Input type="date" value={form.dob} onChange={set('dob')} />
          </Field>
          <Field label="Phone Number" required error={errors.phone}>
            <Input value={form.phone} onChange={set('phone')} placeholder="+91…" />
          </Field>
          <Field label="Alternate Phone Number" error={errors.alternatePhone}>
            <Input value={form.alternatePhone} onChange={set('alternatePhone')} placeholder="+91…" />
          </Field>
          <Field label="Aadhaar Number" error={errors.aadhaar} hint="Stored securely; shown masked in lists">
            <Input value={form.aadhaar} onChange={set('aadhaar')} placeholder="12-digit Aadhaar" className="font-mono" />
          </Field>
          <Field label="Address" required error={errors.address} className="sm:col-span-2">
            <Textarea value={form.address} onChange={set('address')} placeholder="Full address" />
          </Field>
          <div>
            <Field label="Driver Photo" error={errors.photo} hint="JPG/JPEG/PNG · max 3MB">
              <input type="file" accept="image/jpeg,image/png" onChange={onPhoto} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
            </Field>
            {form.photoDataUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img src={form.photoDataUrl} alt="Preview" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                <button type="button" onClick={() => setForm((f) => ({ ...f, photoDataUrl: null, photoFile: null }))} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
              </div>
            )}
          </div>
        </Section>

        <Section title="Driving Licence Information">
          <Field label="DL Number" required error={errors.licenseNumber}>
            <Input value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="DL no." />
          </Field>
          <Field label="DL Issuing Authority" required error={errors.licenseAuthority}>
            <Input value={form.licenseAuthority} onChange={set('licenseAuthority')} placeholder="e.g. RTO Chandigarh" />
          </Field>
          <Field label="DL Valid From" required>
            <Input type="date" value={form.licenseValidFrom} onChange={set('licenseValidFrom')} />
          </Field>
          <Field label="DL Valid To" required error={errors.licenseValidTo}>
            <Input type="date" value={form.licenseValidTo} onChange={set('licenseValidTo')} />
          </Field>
          <Field label="Type of Driving Licence">
            <Select value={form.licenceType} onChange={set('licenceType')}>
              {LICENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          {form.licenceType === 'Other' && (
            <Field label="Other Licence Type" required error={errors.otherLicenceType}>
              <Input value={form.otherLicenceType} onChange={set('otherLicenceType')} placeholder="Specify licence type" />
            </Field>
          )}
        </Section>

        <Section title="Driver Category / Vehicle Assignment">
          <Field label="Vehicle Category">
            <Select value={form.vehicleCategory} onChange={set('vehicleCategory')}>
              {VEHICLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div className="flex items-end">
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Vehicles are assigned to this driver from the <strong>Shifts</strong> section.
            </p>
          </div>
        </Section>

        <Section title="Shift">
          <Field label="Shift">
            <Select value={form.shiftPreset} onChange={set('shiftPreset')}>
              {SHIFT_PRESETS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </Field>
          <Field label="Shift Start Time" error={errors.shiftStartTime}>
            <Input type="time" value={form.shiftStartTime} onChange={set('shiftStartTime')} />
          </Field>
          <Field label="Shift End Time">
            <Input type="time" value={form.shiftEndTime} onChange={set('shiftEndTime')} />
          </Field>
        </Section>

        <Section title="Account">
          <Field label="Username / Login" hint="Email or phone number">
            <Input value={form.accountUsername} onChange={set('accountUsername')} placeholder="driver@company.com or phone" />
          </Field>
          <Field label="Password / PIN" error={errors.accountPassword} hint="Min 6 characters">
            <Input type="password" value={form.accountPassword} onChange={set('accountPassword')} placeholder="••••••••" />
          </Field>
          <Field label="Role">
            <Input value="Driver / User" disabled />
          </Field>
          <Field label="Driver Status" hint="Default: Active · Only Admin can change">
            <Select value={form.status} onChange={set('status')}>
              {DRIVER_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
            </Select>
          </Field>
        </Section>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push('/admin/drivers')}>Cancel</Button>
          <Button variant="secondary" onClick={() => save(true)} loading={saving}>Save & Add Another</Button>
          <Button onClick={() => save(false)} loading={saving}>Save User</Button>
        </div>
      </div>
    </div>
  );
}
