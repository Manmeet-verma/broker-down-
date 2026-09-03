'use client';

import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';
import { PageHeader } from '@/components/common';

export default function RecommenderDashboard() {
  const { user, loading } = useAuthGuard('recommender');
  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Reviewer Dashboard" subtitle={`Welcome, ${user?.name}`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Pending Review</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">-</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Recommended</div>
          <div className="mt-1 text-2xl font-bold text-green-600">-</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Rejected</div>
          <div className="mt-1 text-2xl font-bold text-red-600">-</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Vehicles</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">-</div>
        </div>
      </div>
    </div>
  );
}