'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/utils';
import { Button, EmptyState, PageLoading, StatusBadge, Confirm, notify, Modal, Input, Field } from '@/components/ui';
import { PageHeader, SearchInput, Th, Td, TableCard } from '@/components/common';

export default function AccountsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '', role: 'user', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [suspend, setSuspend] = useState(null);

  const load = () => {
    api.get('/auth/users').then(({ users }) => { setUsers(users); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) =>
    [u.name, u.username, u.email, u.phone].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const create = async () => {
    setSaving(true);
    try {
      await api.post('/auth/create-user', form);
      notify('Account created');
      setCreateOpen(false);
      setForm({ username: '', password: '', name: '', phone: '', role: 'user', status: 'active' });
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    try {
      const next = suspend.status === 'active' ? 'suspended' : 'active';
      await api.patch(`/auth/users/${suspend.uid}`, { status: next });
      notify(`Account ${next === 'suspended' ? 'suspended' : 'reactivated'}`);
      setSuspend(null);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="User Accounts"
        subtitle={`${users.length} account${users.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Link href="/admin/drivers/new" className="rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Create Driver</Link>
            <Button onClick={() => setCreateOpen(true)}>+ Create Account</Button>
          </>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, username, email…" className="w-full sm:w-80" />
      </div>

      <TableCard>
        {loading ? (
          <PageLoading />
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState title="No accounts found" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Username / Email</Th>
                  <Th>Phone</Th>
                  <Th>Role</Th>
                  <Th>Driver ID</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.uid} className="border-t border-slate-100 hover:bg-slate-50">
                    <Td className="font-semibold">{u.name}</Td>
                    <Td className="text-xs">{u.username || u.email}</Td>
                    <Td>{u.phone || '—'}</Td>
                    <Td><StatusBadge status={u.role === 'admin' ? 'active' : 'pending'} /> <span className="ml-1 text-xs font-semibold">{u.role === 'admin' ? 'Admin' : 'Driver/User'}</span></Td>
                    <Td className="font-mono text-xs">{u.driverId ? u.driverId.slice(0, 8) : '—'}</Td>
                    <Td><StatusBadge status={u.status} /></Td>
                    <Td className="text-xs">{fmtDateTime(u.createdAt)}</Td>
                    <Td className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => setSuspend(u)}>
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User Account">
        <div className="space-y-4">
          <Field label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Username / Email" required hint="Used for login"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Password / PIN" required hint="Min 6 characters"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="user">Driver / User</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={create} loading={saving}>Create Account</Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!suspend}
        title={suspend?.status === 'active' ? 'Suspend account?' : 'Reactivate account?'}
        message={`${suspend?.name} will be ${suspend?.status === 'active' ? 'blocked from logging in' : 'allowed to log in again'}.`}
        confirmLabel={suspend?.status === 'active' ? 'Suspend' : 'Activate'}
        danger={suspend?.status === 'active'}
        onConfirm={toggleStatus}
        onClose={() => setSuspend(null)}
      />
    </div>
  );
}
