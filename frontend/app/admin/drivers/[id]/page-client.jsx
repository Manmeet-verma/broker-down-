'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, downloadFile } from '@/lib/api';
import { fmtDate, fmtDateTime, daysLeft, maskAadhaar, cls, readableBytes } from '@/lib/utils';
import { Card, Button, Badge, PageLoading, StatusBadge, EmptyState, Confirm, Modal, notify } from '@/components/ui';
import { PageHeader, InfoRow, ExpiryPill } from '@/components/common';
import { DRIVER_DOC_TYPES, LICENSE_TYPES, DRIVER_STATUSES, SHIFT_PRESETS } from '@/lib/constants';

const TABS = ['Profile', 'Documents', 'History'];

export default function DriverDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Profile');
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [upModal, setUpModal] = useState(null);
  const [upFile, setUpFile] = useState(null);
  const [upExpiry, setUpExpiry] = useState('');
  const [uploading, setUploading] = useState(false);
  const [delDoc, setDelDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    api.get(`/drivers/${id}`).then((d) => { setData(d); setError(''); }).catch((err) => setError(err.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <PageLoading />;

  const driver = data.driver;
  const dl = driver.license || {};
  const docs = driver.documents || [];
  const archived = driver.archivedDocuments || [];
  const history = driver.history || [];
  const shifts = driver.shifts || [];

  const openEdit = () => {
    setEditForm({
      name: driver.name || '', phone: driver.phone || '', alternatePhone: driver.alternatePhone || '',
      address: driver.address || '', dob: driver.dob ? String(driver.dob).slice(0, 10) : '',
      pin: driver.pin || '', aadhaar: driver.aadhaar || '', vehicleCategory: driver.vehicleCategory || 'Heavy Vehicle',
      license: {
        number: dl.number || '', authority: dl.authority || '',
        validFrom: dl.validFrom ? String(dl.validFrom).slice(0, 10) : '',
        validTo: dl.validTo ? String(dl.validTo).slice(0, 10) : '',
        type: dl.type || 'LMV', otherType: dl.otherType || ''
      },
      shiftPreset: driver.shift?.preset || 'general',
      shiftStartTime: driver.shift?.startTime || '', shiftEndTime: driver.shift?.endTime || ''
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await api.put(`/drivers/${id}`, {
        ...editForm,
        shift: {
          preset: editForm.shiftPreset,
          startTime: editForm.shiftStartTime,
          endTime: editForm.shiftEndTime
        }
      });
      notify('Driver information updated');
      setEditOpen(false);
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const setStatus = async (status) => {
    try {
      await api.patch(`/drivers/${id}/status`, { status });
      notify(`Status changed to ${status}`);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const onUpload = async () => {
    if (!upFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', upFile);
      fd.append('type', upModal.type);
      if (upExpiry) fd.append('expiryDate', upExpiry);
      await api.upload(`/drivers/${id}/documents`, fd);
      notify('Document uploaded');
      setUpModal(null); setUpFile(null); setUpExpiry('');
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const onReplace = async (doc) => {
    if (!upFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', upFile);
      if (upExpiry) fd.append('expiryDate', upExpiry);
      await api.upload(`/drivers/${id}/documents/${doc.id}/replace`, fd);
      notify('Document replaced — previous version kept in history');
      setUpModal(null); setUpFile(null); setUpExpiry('');
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/drivers/${id}/documents/${delDoc.id}`);
      notify('Document deleted');
      setDelDoc(null);
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const down = async (doc) => {
    try {
      await downloadFile(`/drivers/${id}/documents/${doc.id}/download`, doc.name);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const docRow = (doc) => (
    <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{doc.name}</span>
          <Badge color="gray">v{doc.version}</Badge>
          {doc.active === false && <Badge color="gray">Archived</Badge>}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-4 text-[11px] text-slate-500">
          <span>{DRIVER_DOC_TYPES[doc.type] || doc.type}</span>
          <span>{fmtDateTime(doc.createdAt)}</span>
          <span>by {doc.uploadedBy || '—'}</span>
          {doc.expiryDate && <span>Expiry: {fmtDate(doc.expiryDate)}</span>}
          {doc.size ? <span>{readableBytes(doc.size)}</span> : null}
        </div>
      </div>
      <div className="flex gap-1">
        <a href={doc.url} target="_blank" rel="noreferrer" className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">View</a>
        <button onClick={() => down(doc)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Download</button>
        <button onClick={() => { setUpModal({ type: doc.type, replaceId: doc.id, replaceName: doc.name }); setUpFile(null); setUpExpiry(''); }} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50">Replace</button>
        <button onClick={() => setDelDoc(doc)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  );

  const E = ({ k, v }) => <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{v}</div>;

  return (
    <div>
      <PageHeader
        title={driver.name}
        subtitle={`Driver ID ${driver.id.slice(0, 8)} · ${driver.phone || ''}`}
        actions={
          <>
            <StatusBadge status={driver.status} />
            <StatusBadge status={driver.licenseStatus} />
            <Button variant="secondary" onClick={openEdit}>Edit Details</Button>
            <Button variant="secondary" onClick={() => router.push('/admin/shifts')}>Assign Vehicle</Button>
            <Button variant="secondary" onClick={() => router.back()}>Back</Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cls('rounded-lg px-3.5 py-2 text-sm font-semibold transition', tab === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <div className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-3xl font-bold text-blue-700">
                {driver.photo?.url ? <img src={driver.photo.url} alt={driver.name} className="h-full w-full object-cover" /> : driver.name?.charAt(0)?.toUpperCase()}
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{driver.name}</h3>
              <p className="text-xs text-slate-500">{driver.vehicleCategory || '—'} · {driver.shift?.preset ? `Shift: ${driver.shift.preset}` : 'No shift set'}</p>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={driver.status} />
                <StatusBadge status={driver.licenseStatus} />
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Status</h4>
              <div className="flex flex-wrap gap-1.5">
                {DRIVER_STATUSES.map((s) => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={cls('rounded-lg border px-2.5 py-1 text-xs font-semibold transition', driver.status === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Basic Information" className="lg:col-span-2">
            <InfoRow label="Driver ID" value={driver.id} />
            <InfoRow label="Name" value={driver.name} />
            <InfoRow label="PIN" value={driver.pin} />
            <InfoRow label="Date of Birth" value={fmtDate(driver.dob)} />
            <InfoRow label="Phone Number" value={driver.phone} />
            <InfoRow label="Alternate Phone" value={driver.alternatePhone} />
            <InfoRow label="Aadhaar Number" value={driver.aadhaar ? maskAadhaar(driver.aadhaar) : '—'} />
            <InfoRow label="Address" value={driver.address} />
            <InfoRow label="Category" value={driver.vehicleCategory} />
            <InfoRow label="Created" value={fmtDateTime(driver.createdAt)} />
          </Card>

          <Card title="Driving Licence" className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <InfoRow label="DL Number" value={dl.number} />
              <InfoRow label="Issuing Authority" value={dl.authority} />
              <InfoRow label="Licence Type" value={dl.type === 'Other' ? dl.otherType : dl.type} />
              <InfoRow label="Validity" value={<ExpiryPill status={driver.licenseStatus} validTo={dl.validTo} />} />
              <InfoRow label="Valid From" value={fmtDate(dl.validFrom)} />
              <InfoRow label="Valid To" value={fmtDate(dl.validTo)} />
            </div>
          </Card>

          <Card title="Shift" className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <InfoRow label="Shift" value={driver.shift?.preset} />
              <InfoRow label="Shift Timing" value={`${driver.shift?.startTime || '—'} — ${driver.shift?.endTime || '—'}`} />
            </div>
          </Card>

          {shifts.length > 0 && (
            <Card title="Assigned Vehicles" className="lg:col-span-3">
              <div className="space-y-2">
                {shifts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-slate-700">{s.vehicleNumber || s.vehicleId}</span>
                    <span className="flex items-center gap-2"><StatusBadge status={s.shiftType} /><span className="text-xs text-slate-400">{s.date ? fmtDate(s.date) : 'Recurring'}</span></span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'Documents' && (
        <Card title="Driver Documents" subtitle="DL, Aadhaar, Photo and other documents"
          actions={<Button size="sm" onClick={() => { setUpModal({ type: 'other', replaceId: null }); setUpFile(null); setUpExpiry(''); }}>+ Upload Document</Button>}>
          {docs.length === 0 ? (
            <EmptyState title="No documents uploaded" message="Upload driving licence, Aadhaar or other documents for this driver." />
          ) : (
            <div className="space-y-2">{docs.map(docRow)}</div>
          )}
          {archived.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Document History ({archived.length})</h4>
              <div className="space-y-2">{archived.map(docRow)}</div>
            </div>
          )}
        </Card>
      )}

      {tab === 'History' && (
        <Card title="Driver History" subtitle="Every action recorded with date, time and admin">
          {history.length === 0 ? <EmptyState title="No history yet" /> : (
            <div>
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 border-b border-slate-50 py-3 last:border-0">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{h.action}</span>
                      <span className="text-[11px] text-slate-400">{fmtDateTime(h.createdAt)}</span>
                    </div>
                    {h.details && <div className="mt-0.5 text-xs text-slate-500">{h.details}</div>}
                    <div className="mt-0.5 text-[11px] text-slate-400">by {h.actorName || 'System'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Driver Details" wide>
        {editForm && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Driver Name *</label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Phone *</label><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Alternate Phone</label><input value={editForm.alternatePhone} onChange={(e) => setEditForm({ ...editForm, alternatePhone: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">PIN</label><input value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Date of Birth</label><input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Aadhaar Number</label><input value={editForm.aadhaar} onChange={(e) => setEditForm({ ...editForm, aadhaar: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" /></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-600">Address</label><textarea value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="min-h-[70px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Vehicle Category</label>
              <select value={editForm.vehicleCategory} onChange={(e) => setEditForm({ ...editForm, vehicleCategory: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {['Heavy Vehicle', 'Car / LMV', 'Motorcycle', 'Other'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Shift</label>
              <select value={editForm.shiftPreset} onChange={(e) => setEditForm({ ...editForm, shiftPreset: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {SHIFT_PRESETS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Shift Start</label><input type="time" value={editForm.shiftStartTime} onChange={(e) => setEditForm({ ...editForm, shiftStartTime: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Shift End</label><input type="time" value={editForm.shiftEndTime} onChange={(e) => setEditForm({ ...editForm, shiftEndTime: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-3">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Driving Licence</h4>
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">DL Number *</label><input value={editForm.license.number} onChange={(e) => setEditForm({ ...editForm, license: { ...editForm.license, number: e.target.value } })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">DL Authority *</label><input value={editForm.license.authority} onChange={(e) => setEditForm({ ...editForm, license: { ...editForm.license, authority: e.target.value } })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Valid From</label><input type="date" value={editForm.license.validFrom} onChange={(e) => setEditForm({ ...editForm, license: { ...editForm.license, validFrom: e.target.value } })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Valid To</label><input type="date" value={editForm.license.validTo} onChange={(e) => setEditForm({ ...editForm, license: { ...editForm.license, validTo: e.target.value } })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Licence Type</label>
              <select value={editForm.license.type} onChange={(e) => setEditForm({ ...editForm, license: { ...editForm.license, type: e.target.value } })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {LICENSE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            {editForm.license.type === 'Other' && (
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Other Licence Type</label><input value={editForm.license.otherType} onChange={(e) => setEditForm({ ...editForm, license: { ...editForm.license, otherType: e.target.value } })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            )}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={saveEdit} loading={savingEdit}>Save Changes</Button>
        </div>
      </Modal>

      {/* Upload modal */}
      <Modal open={!!upModal} onClose={() => setUpModal(null)} title={upModal?.replaceId ? `Replace ${upModal.replaceName}` : 'Upload Document'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Document Type</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DRIVER_DOC_TYPES).map(([val, label]) => (
                <button key={val} onClick={() => setUpModal((m) => ({ ...m, type: val }))}
                  className={cls('rounded-lg border px-3 py-1.5 text-xs font-semibold transition', upModal?.type === val ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">File (PDF, JPG, PNG)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setUpFile(e.target.files[0])} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
            {upFile && <p className="mt-1 text-xs text-slate-500">{upFile.name} · {readableBytes(upFile.size)}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Expiry Date (if applicable)</label>
            <input type="date" value={upExpiry} onChange={(e) => setUpExpiry(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUpModal(null)}>Cancel</Button>
            <Button onClick={upModal?.replaceId ? onReplace : onUpload} loading={uploading} disabled={!upFile}>{upModal?.replaceId ? 'Replace Document' : 'Upload'}</Button>
          </div>
        </div>
      </Modal>

      <Confirm open={!!delDoc} title="Delete document?" message={`"${delDoc?.name}" will be removed.`} confirmLabel="Delete" danger loading={deleting} onConfirm={onDelete} onClose={() => setDelDoc(null)} />
    </div>
  );
}
