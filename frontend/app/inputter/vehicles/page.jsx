'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthGuard } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageLoading, EmptyState } from '@/components/ui';
import { PageHeader, SearchInput } from '@/components/common';
import { StatusBadge } from '@/components/ui';

export default function InputterVehicles() {
  const { loading } = useAuthGuard('inputter');
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading) {
      api.get('/vehicles').then((d) => setVehicles(d.vehicles || [])).catch(() => {}).finally(() => setLoadingData(false));
    }
  }, [loading]);

  if (loading || loadingData) return <PageLoading />;

  const filtered = vehicles.filter((v) => {
    if (!search) return true;
    return [v.vehicleNumber, v.make, v.model, v.company].join(' ').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Vehicles" subtitle="Manage your vehicle entries">
        <Link href="/inputter/vehicles/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Add Vehicle
        </Link>
      </PageHeader>
      <SearchInput value={search} onChange={setSearch} placeholder="Search vehicles..." />
      {filtered.length === 0 ? (
        <EmptyState message="No vehicles found. Click Add Vehicle to create one." />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle No</th>
                <th className="px-4 py-3">Make / Model</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{v.vehicleNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{v.make} {v.model}</td>
                  <td className="px-4 py-3 text-slate-600">{v.company || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.overview?.status || v.status} /></td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{v.workflowStage || 'inputter'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}