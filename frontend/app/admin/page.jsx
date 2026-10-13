'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fmtDate, daysLeft, cls } from '@/lib/utils';
import { Card, PageLoading, StatusBadge } from '@/components/ui';
import { PageHeader } from '@/components/common';
import DocumentExpiryTabs from '@/components/DocumentExpiryTabs';

function StatCard({ label, value, tone, icon, to }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-amber-50 text-amber-700',
    gray: 'bg-slate-50 text-slate-700',
    purple: 'bg-purple-50 text-purple-700'
  };
  const inner = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow">
      <div className="flex items-center gap-3">
        <div className={cls('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
          {icon || <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
  return to ? <Link href={to}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(() => {});
  }, []);

  if (!data) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Vehicle Dashboard"
        subtitle="Overview of your fleet, document validity and pending issues"
        actions={
          <>
            <Link href="/admin/vehicles/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Add Vehicle</Link>
            <Link href="/admin/drivers/new" className="rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Create User / Driver</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Vehicles" value={data.totalVehicles} tone="blue" to="/admin/vehicles" />
        <StatCard label="Active" value={data.activeVehicles} tone="green" />
        <StatCard label="Inactive" value={data.inactiveVehicles} tone="gray" />
        <StatCard label="Under Finance" value={data.underFinance} tone="purple" />
        <StatCard label="Total Drivers" value={data.totalDrivers} tone="blue" to="/admin/drivers" />
        <StatCard label="Active Shifts" value={data.activeShifts} tone="green" to="/admin/shifts" />
      </div>

      <div className="mt-6">
        <Card title="Document Status" subtitle="Excel-style sheets — warnings start 3 months (90 days) before expiry">
          <DocumentExpiryTabs />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title="Documents Requiring Attention"
            subtitle="Vehicles with expiring or expired documents"
            actions={<Link href="/admin/vehicles" className="text-xs font-semibold text-blue-600 hover:underline">View all vehicles</Link>}
          >
            {data.attention.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">All documents are valid. No attention required.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Vehicle</th>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Document</th>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Expiry</th>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Days Left</th>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attention.map((a, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/vehicles/${a.vehicleId}`} className="font-semibold text-blue-600 hover:underline">{a.vehicleNumber}</Link>
                        </td>
                        <td className="px-3 py-2.5 text-sm">{a.document}</td>
                        <td className="px-3 py-2.5 text-sm">{fmtDate(a.validTo)}</td>
                        <td className="px-3 py-2.5 text-sm">
                          {(() => {
                            const left = daysLeft(a.validTo);
                            if (left === null) return '—';
                            if (left < 0) return <span className="font-semibold text-red-600">Expired {-left}d ago</span>;
                            return <span className="font-semibold text-amber-600">{left}d left</span>;
                          })()}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card title="Issues" subtitle="Driver-reported vehicle problems">
          <div className="space-y-3">
            <div className="flex justify-between rounded-lg bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-800">Pending issues</span>
              <span className="text-lg font-bold text-amber-800">{data.pendingIssues}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-blue-50 px-4 py-3">
              <span className="text-sm font-medium text-blue-800">Open (pending + accepted)</span>
              <span className="text-lg font-bold text-blue-800">{data.openIssues}</span>
            </div>
            <Link href="/admin/issues" className="block rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Manage Issues
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
