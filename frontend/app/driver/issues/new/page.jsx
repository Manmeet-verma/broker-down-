'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { fmtDateTime, cls, readableBytes } from '@/lib/utils';
import { Button, Card, EmptyState, Field, Input, PageLoading, Select, Textarea, notify } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES } from '@/lib/constants';

export default function NewIssue() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ vehicleId: '', category: 'Engine Problem', title: '', description: '', priority: 'medium' });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/vehicles?limit=100').then(({ vehicles }) => setVehicles(vehicles)).catch(() => {});
  }, []);

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const allowed = files.filter((f) => f.type.startsWith('image/'));
    const rejected = files.length - allowed.length;
    if (rejected) notify(`${rejected} file(s) skipped — only images are allowed`, 'error');
    const remaining = [...images, ...allowed].slice(0, 6);
    setImages(remaining);
    const prev = remaining.map((f) => URL.createObjectURL(f));
    setPreviews(prev);
  };

  const removeImage = (i) => {
    const next = images.filter((_, idx) => idx !== i);
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const submit = async () => {
    if (!form.vehicleId) return notify('Select a vehicle', 'error');
    if (!form.title.trim()) return notify('Give the problem a short title', 'error');
    if (!form.description.trim()) return notify('Describe the problem', 'error');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach((f) => fd.append('images', f));
      const res = await api.upload('/issues', fd);
      notify('Problem reported to Admin');
      router.push(`/driver/issues/${res.issue.id}`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Report a Problem" subtitle="Describe the issue with your vehicle — attach up to 6 photos" />
      <div className="max-w-2xl">
        <Card title="Problem / Issue Details">
          <div className="space-y-4">
            <Field label="Vehicle" required>
              <Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">Select your vehicle…</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.make || ''} {v.model || ''}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {ISSUE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {ISSUE_PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Short Title" required>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Engine overheating while climbing" />
            </Field>
            <Field label="Describe the Problem" required>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain what happened, when, and any details that can help the admin…" />
            </Field>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Photos (up to 6, tap to view full screen)</label>
              <input type="file" multiple accept="image/*" onChange={onFiles} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previews.map((p, i) => (
                    <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200">
                      <img src={p} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition group-hover:opacity-100">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
              <Button onClick={submit} loading={saving}>Submit to Admin</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
