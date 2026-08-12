'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, vehicleOverview } from '@/lib/utils';
import { Card, EmptyState, PageLoading, StatusBadge } from '@/components/ui';
import { PageHeader, InfoRow, ExpiryPill } from '@/components/common';

export default function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vehicles?limit=100').then(({ vehicles }) => { setVehicles(vehicles); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="My Vehicles" subtitle="Vehicles assigned to you via active shifts" />
      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles assigned" message="Contact your admin to assign you a vehicle." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => {
            const ov = vehicleOverview(v);
            const docs = [
              { key: 'rc', label: 'RC', status: v.docsStatus?.rc, validTo: v.rc?.validTo },
              { key: 'insurance', label: 'Insurance', status: v.docsStatus?.insurance, validTo: v.insurance?.validTo },
              { key: 'pollution', label: 'Pollution', status: v.docsStatus?.pollution, validTo: v.pollution?.validTo },
              { key: 'permit', label: 'Permit', status: v.docsStatus?.permit, validTo: v.permit?.validTo },
              { key: 'tax', label: 'Tax', status: v.docsStatus?.tax, validTo: v.tax?.validTo }
            ];
            return (
              <Card key={v.id} title={v.vehicleNumber} subtitle={`${v.make || ''} ${v.model || ''} · ${v.typeOfEquipment || ''}`}
                actions={<StatusBadge status={ov.status} />}>
                <div className="space-y-2">
                  {docs.map((d) => (
                    <div key={d.key} className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0">
                      <span className="text-xs font-medium text-slate-500">{d.label}</span>
                      <ExpiryPill status={d.status} validTo={d.validTo} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <InfoRow label="RC Number" value={v.rcNumber} />
                  <InfoRow label="Engine No." value={v.engineNumber} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
