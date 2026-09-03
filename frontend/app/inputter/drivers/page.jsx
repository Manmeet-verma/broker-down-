'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthGuard } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageLoading, EmptyState } from '@/components/ui';
import { PageHeader, SearchInput } from '@/components/common';
import { StatusBadge } from '@/components/ui';

export default function InputterDrivers() {
  const { loading } = useAuthGuard('inputter');
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading) {
      api.get('/drivers').then((d) => setDrivers(d.drivers || [])).catch(() => {}).finally(() => setLoadingData(false));
    }
  }, [loading]);

  if (loading || loadingData) return <PageLoading />;

  const filtered = drivers.filter((d) => {
    if (!search) return true;
    return [d.name, d.phone, d.license?.number].join(' ').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Drivers" subtitle="Manage your driver entries">
        <Link href="/inputter/drivers/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Add Driver
        </Link>
      </PageHeader>
      <SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." />
      {filtered.length === 0 ? (
        <EmptyState message="No drivers found. Click Add Driver to create one." />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">DL No</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                  <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{d.license?.number || '-'}</td>
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