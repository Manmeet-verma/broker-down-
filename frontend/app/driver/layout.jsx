'use client';

import { Shell } from '@/components/Shell';
import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';

export default function DriverLayout({ children }) {
  const { loading } = useAuthGuard('user');
  if (loading) return <PageLoading />;
  return <Shell role="user">{children}</Shell>;
}
