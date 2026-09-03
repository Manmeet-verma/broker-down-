'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function useMasterData(collection) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/${collection}`).then((d) => setItems(d.items || [])).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [collection]);

  return { items, loading, reload: load };
}

export function useStates() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/states').then((d) => setStates(d.items || [])).catch(() => setStates([])).finally(() => setLoading(false));
  }, []);

  const getDistricts = async (stateId) => {
    try {
      const d = await api.get(`/states/${stateId}/districts`);
      return d.items || [];
    } catch { return []; }
  };

  return { states, loading, getDistricts };
}
