'use client';

import { useState, Fragment } from 'react';
import { api } from '@/lib/api';
import { useMasterData } from '@/lib/useMasterData';
import { Button, Input, PageLoading, EmptyState, notify } from '@/components/ui';
import { PageHeader } from '@/components/common';

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex gap-1">
      <button onClick={onEdit} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
      <button onClick={onDelete} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}

export default function CategoriesPage() {
  const { items, loading, reload } = useMasterData('categories');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [subFor, setSubFor] = useState(null);
  const [subName, setSubName] = useState('');
  const [subSaving, setSubSaving] = useState(false);

  const parents = items.filter((i) => !i.parentId);
  const subsOf = (pid) => items.filter((i) => i.parentId === pid);

  const addParent = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/categories', { name: name.trim() });
      notify('Category added');
      setName('');
      reload();
    } catch (e) { notify(e.message, 'error'); }
    setSaving(false);
  };

  const addSub = async (parentId) => {
    if (!subName.trim()) return;
    setSubSaving(true);
    try {
      await api.post('/categories', { name: subName.trim(), parentId });
      notify('Subcategory added');
      setSubName('');
      setSubFor(null);
      reload();
    } catch (e) { notify(e.message, 'error'); }
    setSubSaving(false);
  };

  const update = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/categories/${id}`, { name: editName.trim() });
      notify('Category updated');
      setEditId(null);
      reload();
    } catch (e) { notify(e.message, 'error'); }
  };

  const remove = async (id, n) => {
    if (!confirm(`Delete "${n}"?`)) return;
    try {
      await api.del(`/categories/${id}`);
      notify('Category deleted');
      reload();
    } catch (e) { notify(e.message, 'error'); }
  };

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Categories" subtitle="Manage vehicle categories and subcategories" />
      <div className="mb-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name..." className="max-w-sm"
          onKeyDown={(e) => e.key === 'Enter' && addParent()} />
        <Button onClick={addParent} loading={saving}>Add</Button>
      </div>
      {parents.length === 0 ? (
        <EmptyState message="No categories entries yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 w-64">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parents.map((parent) => {
                const subs = subsOf(parent.id);
                return (
                  <Fragment key={parent.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {editId === parent.id ? (
                          <div className="flex gap-2">
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs"
                              onKeyDown={(e) => e.key === 'Enter' && update(parent.id)} />
                            <Button size="sm" onClick={() => update(parent.id)}>Save</Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-900">{parent.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{parent.createdAt ? new Date(parent.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">
                        {editId !== parent.id && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setSubFor(subFor === parent.id ? null : parent.id); setSubName(''); }}
                              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              + Subcategory
                            </button>
                            <RowActions
                              onEdit={() => { setEditId(parent.id); setEditName(parent.name); }}
                              onDelete={() => remove(parent.id, parent.name)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                    {subFor === parent.id && (
                      <tr className="bg-slate-50/60">
                        <td className="px-4 py-2.5" colSpan={2}>
                          <div className="flex items-center gap-2 pl-4">
                            <span className="text-xs text-slate-400">└</span>
                            <Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder={`New subcategory under ${parent.name}...`} className="max-w-sm"
                              onKeyDown={(e) => e.key === 'Enter' && addSub(parent.id)} />
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => addSub(parent.id)} loading={subSaving}>Add</Button>
                            <Button size="sm" variant="secondary" onClick={() => setSubFor(null)}>Cancel</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {subs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          {editId === sub.id ? (
                            <div className="flex items-center gap-2 pl-4">
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs"
                                onKeyDown={(e) => e.key === 'Enter' && update(sub.id)} />
                              <Button size="sm" onClick={() => update(sub.id)}>Save</Button>
                              <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <span className="pl-4 text-sm text-slate-600">
                              <span className="mr-1.5 text-slate-300">└</span>{sub.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2.5">
                          {editId !== sub.id && (
                            <RowActions
                              onEdit={() => { setEditId(sub.id); setEditName(sub.name); }}
                              onDelete={() => remove(sub.id, sub.name)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
