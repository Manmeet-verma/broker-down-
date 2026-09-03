'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useMasterData } from '@/lib/useMasterData';
import { Button, Input, PageLoading, EmptyState, notify } from '@/components/ui';
import { PageHeader } from '@/components/common';

export default function MasterDataPage({ collection, title, subtitle }) {
  const { items, loading, reload } = useMasterData(collection);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/${collection}`, { name: name.trim() });
      notify(`${title} added`);
      setName('');
      reload();
    } catch (e) { notify(e.message, 'error'); }
    setSaving(false);
  };

  const update = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/${collection}/${id}`, { name: editName.trim() });
      notify(`${title} updated`);
      setEditId(null);
      reload();
    } catch (e) { notify(e.message, 'error'); }
  };

  const remove = async (id, n) => {
    if (!confirm(`Delete "${n}"?`)) return;
    try {
      await api.del(`/${collection}/${id}`);
      notify(`${title} deleted`);
      reload();
    } catch (e) { notify(e.message, 'error'); }
  };

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="mb-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${title.toLowerCase()} name...`} className="max-w-sm"
          onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} loading={saving}>Add</Button>
      </div>
      {items.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} entries yet.`} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 w-32">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {editId === item.id ? (
                      <div className="flex gap-2">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs"
                          onKeyDown={(e) => e.key === 'Enter' && update(item.id)} />
                        <Button size="sm" onClick={() => update(item.id)}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900">{item.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">
                    {editId !== item.id && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditId(item.id); setEditName(item.name); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => remove(item.id, item.name)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
