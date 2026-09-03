'use client';

import { useEffect, useState } from 'react';
import { useAuthGuard } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageLoading, EmptyState, Button, notify } from '@/components/ui';
import { PageHeader, SearchInput } from '@/components/common';

export default function VerifierVehicles() {
  const { loading } = useAuthGuard('verifier');
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const load = () => {
    api.get('/vehicles').then((d) => setVehicles(d.vehicles || [])).catch(() => {}).finally(() => setLoadingData(false));
  };

  useEffect(() => { if (!loading) load(); }, [loading]);

  const verify = async (id) => {
    try {
      await api.post(`/vehicles/${id}/workflow`, { action: 'verify' });
      notify('Vehicle verified');
      load();
    } catch (e) { notify(e.message, 'error'); }
  };

  if (loading || loadingData) return <PageLoading />;

  const pending = vehicles.filter((v) => {
    const stage = v.workflowStage || 'inputter';
    const match = stage === 'recommended';
    if (!search) return match;
    return match && [v.vehicleNumber, v.make, v.model].join(' ').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Verify Vehicles" subtitle="Vehicles pending your verification" />
      <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
      {pending.length === 0 ? (
        <EmptyState message="No vehicles pending verification." />
      ) : (
        <div className="mt-4 space-y-3">
          {pending.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <div className="font-medium text-slate-900">{v.vehicleNumber}</div>
                <div className="text-sm text-slate-500">{v.make} {v.model} · {v.company || 'N/A'}</div>
              </div>
              <Button size="sm" onClick={() => verify(v.id)}>Verify</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}