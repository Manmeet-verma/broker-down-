'use client';
import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';
import MasterDataPage from '@/components/MasterDataPage';
export default function Page() {
  const { loading } = useAuthGuard('admin');
  if (loading) return <PageLoading />;
  return <MasterDataPage collection="installmentCounts" title="Installment Counts" subtitle="Manage installment count options" />;
}