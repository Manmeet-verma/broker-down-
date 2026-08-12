'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import { Card, PageLoading, StatusBadge } from '@/components/ui';
import { PageHeader } from '@/components/common';

export default function DriverDashboard() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/drivers/my').catch(() => null)])
      .then(([d, p]) => { setData(d); setProfile(p?.driver || null); })
      .catch(() => {});
  }, []);

  if (!data) return <PageLoading />;

  return (
    <div>
      <PageHeader title={`Welcome${profile ? `, ${profile.name}` : ''}!`} subtitle="Your assigned vehicles, shifts and document alerts" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Your Vehicles" subtitle="Vehicles assigned to you in active shifts">
            {data.attention.length === 0 && data.totalVehicles === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No vehicles assigned yet. Contact your admin.</p>
            ) : (
              <div className="space-y-3">
                {data.attention.map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <span className="font-bold text-blue-700">{a.vehicleNumber}</span>
                      <span className="ml-2 text-xs text-slate-500">{a.document} expires {fmtDate(a.validTo)}</span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
                {data.attention.length === 0 && data.totalVehicles > 0 && (
                  <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    All your vehicle documents are valid.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Quick Actions">
            <div className="space-y-2">
              <Link href="/driver/profile" className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">My Profile</Link>
              <Link href="/driver/issues/new" className="block rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700">Report a Problem</Link>
              <Link href="/driver/issues" className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">My Issues</Link>
              <Link href="/driver/shifts" className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">My Shifts</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
