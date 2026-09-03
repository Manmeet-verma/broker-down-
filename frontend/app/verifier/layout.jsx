'use client';

import { useAuthGuard } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { PageLoading } from '@/components/ui';

export default function VerifierLayout({ children }) {
  const { loading } = useAuthGuard('verifier');
  if (loading) return <PageLoading />;
  return <Shell>{children}</Shell>;
}