'use client';

import { useAuthGuard } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { PageLoading } from '@/components/ui';

export default function RecommenderLayout({ children }) {
  const { loading } = useAuthGuard('recommender');
  if (loading) return <PageLoading />;
  return <Shell>{children}</Shell>;
}