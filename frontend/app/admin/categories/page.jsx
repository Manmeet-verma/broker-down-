'use client';
import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';
import MasterDataPage from '@/components/MasterDataPage';
export default function Page() {
  const { loading } = useAuthGuard('admin');
  if (loading) return <PageLoading />;
  return <MasterDataPage collection="categories" title="Categories" subtitle="Manage vehicle categories" />;
}