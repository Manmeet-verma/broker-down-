'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fmtDateTime, cls } from '@/lib/utils';
import { EmptyState, PageLoading, StatusBadge } from '@/components/ui';
import { PageHeader, SearchInput, Th, Td, TableCard } from '@/components/common';
import { ISSUE_STATUSES } from '@/lib/constants';

export default function IssuesList() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/issues${status ? `?status=${status}` : ''}${search ? `${status ? '&' : '?'}search=${encodeURIComponent(search)}` : ''}`);
      setIssues(res.issues);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [search]);

  return (
    <div>
      <PageHeader title="Vehicle Issues" subtitle="Driver-reported problems — accept or reject and communicate" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search vehicle / driver / title…" className="w-full sm:w-80" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {ISSUE_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          {['pending', 'accepted'].map((s) => (
            <button key={s} onClick={() => setStatus(status === s ? '' : s)}
              className={cls('rounded-lg px-3 py-2 text-sm font-semibold', status === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
              {s === 'pending' ? 'Pending' : 'Open'}
            </button>
          ))}
        </div>
      </div>

      <TableCard>
        {loading ? (
          <PageLoading />
        ) : issues.length === 0 ? (
          <div className="p-6"><EmptyState title="No issues found" message="Issues reported by drivers will appear here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Status</Th>
                  <Th>Priority</Th>
                  <Th>Vehicle</Th>
                  <Th>Driver</Th>
                  <Th>Category</Th>
                  <Th>Title</Th>
                  <Th>Images</Th>
                  <Th>Reported</Th>
                </tr>
              </thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => (window.location.href = `/admin/issues/${i.id}`)}>
                    <Td><StatusBadge status={i.status} /></Td>
                    <Td><StatusBadge status={i.priority} /></Td>
                    <Td className="font-mono text-xs font-bold text-blue-700">{i.vehicleNumber}</Td>
                    <Td>{i.driverName || '—'}</Td>
                    <Td>{i.category}</Td>
                    <Td className="max-w-[220px]">
                      <div className="truncate font-medium text-slate-800">{i.title}</div>
                      <div className="truncate text-xs text-slate-400">{i.description}</div>
                    </Td>
                    <Td>{i.images?.length || 0}</Td>
                    <Td>{fmtDateTime(i.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
