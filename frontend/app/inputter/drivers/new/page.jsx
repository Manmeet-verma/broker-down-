'use client';

import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';
import { PageHeader } from '@/components/common';

export default function InputterNewDriver() {
  const { loading } = useAuthGuard('inputter');
  if (loading) return <PageLoading />;
  return (
    <div>
      <PageHeader title="Add Driver" subtitle="Enter driver details" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
        Driver form coming soon...
      </div>
    </div>
  );
}