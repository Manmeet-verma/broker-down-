'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthGuard } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageLoading, EmptyState, Badge } from '@/components/ui';
import { PageHeader } from '@/components/common';

const WORKFLOW_META = {
  inputter: { label: 'Draft', color: 'gray', desc: 'Not yet submitted for review' },
  recommended: { label: 'Recommended', color: 'blue', desc: 'Reviewed by recommender' },
  verified: { label: 'Verified', color: 'purple', desc: 'Verified by verifier' },
  approved: { label: 'Approved', color: 'green', desc: 'Approved by admin' },
  rejected: { label: 'Rejected', color: 'red', desc: 'Sent back for corrections' }
};

export default function InputterDashboard() {
  const { user, loading } = useAuthGuard('inputter');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    setLoadingData(true);
    Promise.all([
      api.get('/vehicles').catch(() => ({ vehicles: [] })),
      api.get('/drivers').catch(() => ({ drivers: [] }))
    ])
      .then(([vd, dd]) => {
        setVehicles(vd.vehicles || []);
        setDrivers(dd.drivers || []);
      })
      .finally(() => setLoadingData(false));
  }, [loading]);

  if (loading || loadingData) return <PageLoading />;

  const uid = user?.uid;
  const myVehicles = vehicles.filter((v) => v.createdBy === uid);
  const myDrivers = drivers.filter((d) => d.createdBy === uid);

  const countStage = (list) =>
    list.reduce((acc, item) => {
      const s = item.workflowStage || 'inputter';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

  const vStages = countStage(myVehicles);
  const dStages = countStage(myDrivers);

  const pendingVehicles = (vStages.inputter || 0) + (vStages.recommended || 0) + (vStages.verified || 0);
  const pendingDrivers = (dStages.inputter || 0) + (dStages.recommended || 0) + (dStages.verified || 0);
  const approvedVehicles = vStages.approved || 0;
  const approvedDrivers = dStages.approved || 0;

  const recent = [...myVehicles, ...myDrivers]
    .map((item) => ({
      id: item.id,
      kind: item.vehicleNumber ? 'vehicle' : 'driver',
      title: item.vehicleNumber ? `${item.vehicleNumber} · ${item.make || ''} ${item.model || ''}` : (item.name || item.fullName || 'Driver'),
      sub: item.vehicleNumber ? 'Vehicle' : 'Driver',
      stage: item.workflowStage || 'inputter',
      createdAt: item.createdAt,
      href: item.vehicleNumber ? `/inputter/vehicles` : `/inputter/drivers`
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 8);

  const stats = [
    { label: 'My Vehicles', value: myVehicles.length, icon: '🚐', href: '/inputter/vehicles', color: 'text-blue-600' },
    { label: 'My Drivers', value: myDrivers.length, icon: '👤', href: '/inputter/drivers', color: 'text-purple-600' },
    { label: 'Pending Review', value: pendingVehicles + pendingDrivers, icon: '⏳', href: '/inputter/vehicles', color: 'text-amber-600' },
    { label: 'Approved', value: approvedVehicles + approvedDrivers, icon: '✅', href: '/inputter/vehicles', color: 'text-emerald-600' }
  ];

  const fleetStages = [
    { key: 'inputter', count: vStages.inputter || 0 },
    { key: 'recommended', count: vStages.recommended || 0 },
    { key: 'verified', count: vStages.verified || 0 },
    { key: 'approved', count: vStages.approved || 0 },
    { key: 'rejected', count: vStages.rejected || 0 }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Inputter Dashboard" subtitle={`Welcome back, ${user?.name || user?.email}`}>
        <Link href="/inputter/vehicles/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Add Vehicle
        </Link>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-500">{s.label}</div>
              <span className="text-lg">{s.icon}</span>
            </div>
            <div className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workflow pipeline */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Vehicle Submission Pipeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">Your vehicle entries by workflow stage</p>
          <div className="mt-4 space-y-3">
            {fleetStages.map((s) => {
              const meta = WORKFLOW_META[s.key];
              const pct = myVehicles.length ? Math.round((s.count / myVehicles.length) * 100) : 0;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-sm">
                    <Badge color={meta.color}>{meta.label}</Badge>
                    <span className="font-semibold text-slate-700">{s.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Flow: <span className="font-medium text-slate-600">Inputter</span> → Recommender → Verifier → Admin
          </p>
        </div>

        {/* Recent submissions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Recent Submissions</h3>
          <p className="text-xs text-slate-500 mt-0.5">Your latest vehicle & driver entries</p>
          {recent.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              message="Create your first vehicle or driver entry to get started."
              action={<Link href="/inputter/vehicles/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ Add Vehicle</Link>}
            />
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {recent.map((r) => {
                const meta = WORKFLOW_META[r.stage] || WORKFLOW_META.inputter;
                return (
                  <li key={`${r.kind}-${r.id}`} className="py-3">
                    <Link href={r.href} className="flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg -mx-2 px-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{r.title}</div>
                        <div className="text-xs text-slate-500">{r.sub} · {new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
