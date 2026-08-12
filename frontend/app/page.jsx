'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      window.location.href = user ? (user.role === 'admin' ? '/admin' : '/driver') : '/login';
    }
  }, [user, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
