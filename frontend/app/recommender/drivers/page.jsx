'use client';

import { useEffect, useState } from 'react';
import { useAuthGuard } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageLoading, EmptyState } from '@/components/ui';
import { PageHeader, SearchInput } from '@/components/common';
import { StatusBadge } from '@/components/ui';

export default function RecommenderDrivers() {
  const { loading } = useAuthGuard('recommender');
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading) api.get('/drivers').then((d) => setDrivers(d.drivers || [])).catch(() => {}).finally(() => setLoadingData(false));
  }, [loading]);

  if (loading || loadingData) return <PageLoading />;

  const filtered = drivers.filter((d) => !search || [d.name, d.phone].join(' ').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Review Drivers" subtitle="Drivers pending review" />
      <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
      {filtered.length === 0 ? <EmptyState message="No drivers to review." /> : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                  <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}