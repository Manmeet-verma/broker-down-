'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

const ROLE_ROUTES = {
  admin: '/admin',
  inputter: '/inputter',
  recommender: '/recommender',
  verifier: '/verifier'
};

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      window.location.href = user ? (ROLE_ROUTES[user.role] || '/login') : '/login';
    }
  }, [user, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
