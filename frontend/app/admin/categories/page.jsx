'use client';
import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';
import CategoriesPage from '@/components/CategoriesPage';
export default function Page() {
  const { loading } = useAuthGuard('admin');
  if (loading) return <PageLoading />;
  return <CategoriesPage />;
}
