'use client';
import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';
import { PageHeader } from '@/components/common';
import DocumentExpiryTabs from '@/components/DocumentExpiryTabs';

export default function ExpiryReportPage() {
  const { loading } = useAuthGuard('admin');
  if (loading) return <PageLoading />;
  return (
    <div>
      <PageHeader
        title="Expiry Report"
        subtitle="RC, Insurance, Pollution, Permit, Tax and Driving License — warnings from 3 months (90 days) before expiry, days left counts down automatically"
      />
      <DocumentExpiryTabs />
    </div>
  );
}
