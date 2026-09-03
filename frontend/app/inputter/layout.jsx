'use client';

import { useAuthGuard } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { PageLoading } from '@/components/ui';

export default function InputterLayout({ children }) {
  const { loading } = useAuthGuard('inputter');
  if (loading) return <PageLoading />;
  return <Shell>{children}</Shell>;
}