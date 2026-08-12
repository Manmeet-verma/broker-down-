'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, maskAadhaar } from '@/lib/utils';
import { Card, PageLoading, StatusBadge } from '@/components/ui';
import { PageHeader, InfoRow, ExpiryPill } from '@/components/common';

export default function MyProfile() {
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/drivers/my').then(({ driver }) => setDriver(driver)).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!driver) return <PageLoading />;

  const dl = driver.license || {};

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Official details set by Admin — you can view but not edit them" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <div className="flex flex-col items-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-4xl font-bold text-blue-700">
              {driver.photo?.url ? <img src={driver.photo.url} alt={driver.name} className="h-full w-full object-cover" /> : driver.name?.charAt(0)?.toUpperCase()}
            </div>
            <h3 className="mt-3 text-xl font-bold text-slate-900">{driver.name}</h3>
            <p className="text-xs text-slate-500">Driver ID: {driver.id.slice(0, 10)}</p>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={driver.status} />
              <StatusBadge status={driver.licenseStatus} />
            </div>
          </div>
        </Card>

        <Card title="Basic Information" className="lg:col-span-2">
          <InfoRow label="Name" value={driver.name} />
          <InfoRow label="Driver ID" value={driver.id} />
          <InfoRow label="Date of Birth" value={fmtDate(driver.dob)} />
          <InfoRow label="Phone Number" value={driver.phone} />
          <InfoRow label="Alternate Phone" value={driver.alternatePhone} />
          <InfoRow label="Aadhaar Number" value={maskAadhaar(driver.aadhaar)} />
          <InfoRow label="Address" value={driver.address} />
          <InfoRow label="Vehicle Category" value={driver.vehicleCategory} />
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

        {driver.shifts?.length > 0 && (
          <Card title="Assigned Vehicle" className="lg:col-span-3">
            <div className="space-y-2">
              {driver.shifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <div>
                    <span className="font-bold text-blue-700">{s.vehicleNumber || s.vehicleId}</span>
                    <span className="ml-2 text-xs text-slate-500">{s.date ? fmtDate(s.date) : 'Recurring'}</span>
                  </div>
                  <StatusBadge status={s.shiftType} />
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card title="Shift" className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <InfoRow label="Shift" value={driver.shift?.preset} />
            <InfoRow label="Timing" value={`${driver.shift?.startTime || '—'} — ${driver.shift?.endTime || '—'}`} />
          </div>
        </Card>

        <Card title="My Documents" className="lg:col-span-3">
          {driver.documents?.length ? (
            <div className="space-y-2">
              {driver.documents.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{d.name}</div>
                    <div className="text-[11px] text-slate-500">{d.label} · {fmtDate(d.createdAt)}{d.expiryDate ? ` · Expiry ${fmtDate(d.expiryDate)}` : ''}</div>
                  </div>
                  <a href={d.url} target="_blank" rel="noreferrer" className="rounded-md px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">View</a>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">No documents uploaded by Admin yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
