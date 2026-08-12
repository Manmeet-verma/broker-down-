'use client';

import { Shell } from '@/components/Shell';
import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';

export default function AdminLayout({ children }) {
  const { loading } = useAuthGuard('admin');
  if (loading) return <PageLoading />;
  return <Shell role="admin">{children}</Shell>;
}
