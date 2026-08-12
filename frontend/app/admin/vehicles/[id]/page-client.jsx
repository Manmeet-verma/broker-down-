'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, downloadFile } from '@/lib/api';
import { fmtDate, fmtDateTime, vehicleOverview, docStatus, daysLeft, readableBytes, cls } from '@/lib/utils';
import { Card, Button, Badge, PageLoading, StatusBadge, EmptyState, Confirm, Modal, notify } from '@/components/ui';
import { PageHeader, InfoRow, ExpiryPill } from '@/components/common';
import { DOC_TYPES } from '@/lib/constants';

const TABS = ['Basic Information', 'RC Details', 'Insurance', 'Pollution', 'State Permit', 'Tax', 'Finance', 'Driver', 'Documents', 'History'];

function SectionCard({ title, children, status }) {
  return (
    <Card title={title} actions={status && <StatusBadge status={status} />}>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export default function VehicleDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Basic Information');
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [upModal, setUpModal] = useState(null); // { type } open upload modal
  const [upFile, setUpFile] = useState(null);
  const [upExpiry, setUpExpiry] = useState('');
  const [upNote, setUpNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [delDoc, setDelDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    api.get(`/vehicles/${id}`).then((d) => {
      setData(d);
      setError('');
    }).catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
    api.get('/shifts').then(({ shifts }) => {
      const s = shifts.filter((x) => x.vehicleId === id);
      setShifts(s);
      const driverIds = [...new Set(s.map((x) => x.driverId).filter(Boolean))];
      if (driverIds.length) {
        Promise.all(driverIds.map((did) => api.get(`/drivers/${did}`).then(({ driver }) => driver).catch(() => null)))
          .then((list) => setDrivers(list.filter(Boolean)));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <PageLoading />;

  const { vehicle } = data;
  const ov = vehicleOverview(vehicle);
  const docs = vehicle.documents || [];
  const archived = vehicle.archivedDocuments || [];
  const history = vehicle.history || [];

  const onUpload = async () => {
    if (!upFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', upFile);
      fd.append('type', upModal.type);
      if (upExpiry) fd.append('expiryDate', upExpiry);
      if (upNote) fd.append('note', upNote);
      await api.upload(`/vehicles/${id}/documents`, fd);
      notify('Document uploaded');
      setUpModal(null); setUpFile(null); setUpExpiry(''); setUpNote('');
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
      await api.upload(`/vehicles/${id}/documents/${doc.id}/replace`, fd);
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
      await api.del(`/vehicles/${id}/documents/${delDoc.id}`);
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
      await downloadFile(`/vehicles/${id}/documents/${doc.id}/download`, doc.name);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const docStatusOf = (sec) => {
    const s = sec || {};
    return docStatus(s.validTo, !!s.done);
  };

  const renderDocRow = (doc) => (
    <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{doc.name}</span>
          <Badge color="gray">v{doc.version}</Badge>
          {doc.active === false && <Badge color="gray">Archived</Badge>}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-4 text-[11px] text-slate-500">
          <span>{DOC_TYPES[doc.type] || doc.label || doc.type}</span>
          <span>Uploaded {fmtDateTime(doc.createdAt)}</span>
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

  return (
    <div>
      <PageHeader
        title={vehicle.vehicleNumber}
        subtitle={`${vehicle.make || ''} ${vehicle.model || ''} · ${vehicle.typeOfEquipment || 'Vehicle'}`}
        actions={
          <>
            <StatusBadge status={ov.status} />
            <Button variant="secondary" onClick={() => router.push(`/admin/vehicles/${id}/edit`)}>Edit</Button>
            <Button variant="secondary" onClick={() => router.push('/admin/vehicles')}>Back</Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cls('rounded-lg px-3.5 py-2 text-sm font-semibold transition', tab === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Basic Information' && (
        <SectionCard title="Basic Information">
          <InfoRow label="Vehicle Owner / User" value={vehicle.owner} />
          <InfoRow label="Company / Customer" value={vehicle.company} />
          <InfoRow label="Customer Number" value={vehicle.customerNumber} />
          <InfoRow label="Vehicle Number" value={vehicle.vehicleNumber} />
          <InfoRow label="Type of Equipment" value={vehicle.typeOfEquipment} />
          <InfoRow label="RC Number" value={vehicle.rcNumber} />
          <InfoRow label="PO Number" value={vehicle.poNumber} />
          <InfoRow label="Engine Number" value={vehicle.engineNumber} />
          <InfoRow label="Chassis Number" value={vehicle.chassisNumber} />
          <InfoRow label="Make" value={vehicle.make} />
          <InfoRow label="Model" value={vehicle.model} />
          <InfoRow label="Loading Site / Side" value={vehicle.loadingSite} />
          <InfoRow label="Created" value={fmtDateTime(vehicle.createdAt)} />
          <InfoRow label="Last Updated" value={fmtDateTime(vehicle.updatedAt)} />
        </SectionCard>
      )}

      {tab === 'RC Details' && (
        <SectionCard title="RC Details" status={docStatusOf(vehicle.rc)}>
          <InfoRow label="RC Number" value={vehicle.rc?.number || vehicle.rcNumber} />
          <InfoRow label="Vehicle Number" value={vehicle.vehicleNumber} />
          <InfoRow label="Engine Number" value={vehicle.engineNumber} />
          <InfoRow label="Chassis Number" value={vehicle.chassisNumber} />
          <InfoRow label="Make / Model" value={`${vehicle.make} ${vehicle.model}`} />
          <InfoRow label="Type of Equipment" value={vehicle.typeOfEquipment} />
          <div className="col-span-2 rounded-lg bg-slate-50 p-3">
            <ExpiryPill status={docStatusOf(vehicle.rc)} validTo={vehicle.rc?.validTo} />
            <InfoRow label="RC Valid From" value={fmtDate(vehicle.rc?.validFrom)} />
            <InfoRow label="RC Valid To" value={fmtDate(vehicle.rc?.validTo)} />
          </div>
        </SectionCard>
      )}

      {tab === 'Insurance' && (
        <SectionCard title="Insurance" status={docStatusOf(vehicle.insurance)}>
          <InfoRow label="Insurance Company" value={vehicle.insurance?.company} />
          <InfoRow label="Policy Number" value={vehicle.insurance?.policyNo} />
          <InfoRow label="Valid From" value={fmtDate(vehicle.insurance?.validFrom)} />
          <InfoRow label="Valid To" value={fmtDate(vehicle.insurance?.validTo)} />
          <InfoRow label="Status" value={<ExpiryPill status={docStatusOf(vehicle.insurance)} validTo={vehicle.insurance?.validTo} />} />
          {vehicle.insurance?.done === false && <InfoRow label="Reason (not done)" value={vehicle.insurance?.reason} />}
        </SectionCard>
      )}

      {tab === 'Pollution' && (
        <SectionCard title="Pollution Certificate" status={docStatusOf(vehicle.pollution)}>
          <InfoRow label="Certificate Number" value={vehicle.pollution?.number} />
          <InfoRow label="Valid From" value={fmtDate(vehicle.pollution?.validFrom)} />
          <InfoRow label="Valid To" value={fmtDate(vehicle.pollution?.validTo)} />
          <InfoRow label="Status" value={<ExpiryPill status={docStatusOf(vehicle.pollution)} validTo={vehicle.pollution?.validTo} />} />
        </SectionCard>
      )}

      {tab === 'State Permit' && (
        <SectionCard title="State Permit" status={docStatusOf(vehicle.permit)}>
          <InfoRow label="Permit Number" value={vehicle.permit?.number} />
          <InfoRow label="Valid From" value={fmtDate(vehicle.permit?.validFrom)} />
          <InfoRow label="Valid To" value={fmtDate(vehicle.permit?.validTo)} />
          <InfoRow label="Status" value={<ExpiryPill status={docStatusOf(vehicle.permit)} validTo={vehicle.permit?.validTo} />} />
        </SectionCard>
      )}

      {tab === 'Tax' && (
        <SectionCard title="Tax Details" status={docStatusOf(vehicle.tax)}>
          <InfoRow label="Tax Type" value={vehicle.tax?.type} />
          <InfoRow label="Receipt Number" value={vehicle.tax?.receiptNo} />
          <InfoRow label="Valid From" value={fmtDate(vehicle.tax?.validFrom)} />
          <InfoRow label="Valid To" value={fmtDate(vehicle.tax?.validTo)} />
          <InfoRow label="Status" value={<ExpiryPill status={docStatusOf(vehicle.tax)} validTo={vehicle.tax?.validTo} />} />
        </SectionCard>
      )}

      {tab === 'Finance' && (
        <SectionCard title="Finance Details">
          <InfoRow label="Finance Company" value={vehicle.finance?.company} />
          <InfoRow label="Agent" value={vehicle.finance?.agent} />
          <InfoRow label="Phone Number" value={vehicle.finance?.phone} />
          <InfoRow label="Email ID" value={vehicle.finance?.email} />
          <InfoRow label="GST Number" value={vehicle.finance?.gst} />
          <InfoRow label="Notes" value={vehicle.finance?.notes} />
        </SectionCard>
      )}

      {tab === 'Driver' && (
        <Card title="Assigned Drivers" subtitle="Drivers linked to this vehicle via active shifts">
          {drivers.length === 0 ? (
            <EmptyState title="No driver assigned" message="Create a shift in the Shifts section to assign a driver." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {drivers.map((d) => (
                <Link key={d.id} href={`/admin/drivers/${d.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {d.name?.charAt(0)?.toUpperCase() || 'D'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{d.name}</div>
                    <div className="text-xs text-slate-500">{d.phone} · {d.license?.type || '—'}</div>
                  </div>
                  <StatusBadge status={d.licenseStatus} />
                </Link>
              ))}
            </div>
          )}
          {shifts.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Current shifts</h4>
              <div className="space-y-2">
                {shifts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{s.driverName} · {s.shiftType}</span>
                    <span className="text-xs text-slate-400">{s.date ? fmtDate(s.date) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'Documents' && (
        <Card
          title="Vehicle Documents"
          subtitle="Invoice, RC, Insurance, Pollution, NOC, Permit, Tax"
          actions={<Button size="sm" onClick={() => { setUpModal({ type: 'other', replaceId: null }); setUpFile(null); setUpExpiry(''); setUpNote(''); }}>+ Upload Document</Button>}
        >
          {docs.length === 0 ? (
            <EmptyState title="No documents uploaded" message="Upload RC, insurance, pollution, permit and tax documents for this vehicle." />
          ) : (
            <div className="space-y-2">{docs.map(renderDocRow)}</div>
          )}

          {archived.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Document History ({archived.length})</h4>
              <div className="space-y-2">{archived.map(renderDocRow)}</div>
            </div>
          )}
        </Card>
      )}

      {tab === 'History' && (
        <Card title="Vehicle History" subtitle="Every change and action recorded with date, time and user">
          {history.length === 0 ? (
            <EmptyState title="No history yet" />
          ) : (
            <div className="space-y-0">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 border-b border-slate-50 py-3 last:border-0">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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

      {/* Upload / Replace modal */}
      <Modal open={!!upModal} onClose={() => setUpModal(null)} title={upModal?.replaceId ? `Replace ${upModal.replaceName}` : 'Upload Document'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Document Type</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DOC_TYPES).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setUpModal((m) => ({ ...m, type: val }))}
                  className={cls('rounded-lg border px-3 py-1.5 text-xs font-semibold transition', upModal?.type === val ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">File (PDF, JPG, PNG, DOC/DOCX)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setUpFile(e.target.files[0])} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
            {upFile && <p className="mt-1 text-xs text-slate-500">{upFile.name} · {readableBytes(upFile.size)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Expiry Date (if applicable)</label>
              <input type="date" value={upExpiry} onChange={(e) => setUpExpiry(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Note</label>
              <input value={upNote} onChange={(e) => setUpNote(e.target.value)} placeholder="Optional note" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUpModal(null)}>Cancel</Button>
            <Button onClick={upModal?.replaceId ? onReplace : onUpload} loading={uploading} disabled={!upFile}>
              {upModal?.replaceId ? 'Replace Document' : 'Upload'}
            </Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!delDoc}
        title="Delete document?"
        message={`"${delDoc?.name}" will be removed from this vehicle.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={onDelete}
        onClose={() => setDelDoc(null)}
      />
    </div>
  );
}
