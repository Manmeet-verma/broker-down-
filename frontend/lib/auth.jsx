'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { api, setApiToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setApiToken(idToken);
          const { user } = await api.get('/auth/me');
          setUser(user);
        } catch {
          setUser(null);
        }
      } else {
        setApiToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    const onUnauthorized = () => {
      setUser(null);
      setApiToken(null);
      window.location.href = '/login';
    };
    window.addEventListener('api:unauthorized', onUnauthorized);
    return () => {
      unsub();
      window.removeEventListener('api:unauthorized', onUnauthorized);
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await cred.user.getIdToken();
    setApiToken(idToken);
    const { user } = await api.get('/auth/me');
    setUser(user);
    return user;
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setApiToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Redirects unauthenticated users; optionally enforces a role. */
export function useAuthGuard(role) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) window.location.href = '/login';
    if (!loading && user && role && user.role !== role) {
      // Route based on role
      const roleRoutes = {
        admin: '/admin',
        inputter: '/inputter',
        recommender: '/recommender',
        verifier: '/verifier'
      };
      window.location.href = roleRoutes[user.role] || '/login';
    }
  }, [loading, user, role]);
  return { user, loading };
}
