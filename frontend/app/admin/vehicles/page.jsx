'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fmtDate, vehicleOverview, cls } from '@/lib/utils';
import { Button, EmptyState, PageLoading, StatusBadge, Confirm, notify } from '@/components/ui';
import { PageHeader, SearchInput, Pagination, Th, Td, TableCard } from '@/components/common';

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expiring', label: 'Documents Expiring' },
  { value: 'expired', label: 'Documents Expired' },
  { value: 'under_finance', label: 'Under Finance' },
  { value: 'sold', label: 'Sold / Transferred' }
];

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortKey, setSortKey] = useState('vehicleNumber');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [driverMap, setDriverMap] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/vehicles?page=${page}&limit=15${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}`);
      setVehicles(res.vehicles);
      setTotal(res.total);
      setPage(res.page);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [search]);

  useEffect(() => {
    api.get('/shifts').then(({ shifts }) => {
      const map = {};
      shifts.forEach((s) => {
        if (s.vehicleId && s.driverName) map[s.vehicleId] = s.driverName;
      });
      setDriverMap(map);
    }).catch(() => {});
  }, []);

  const sorted = useMemo(() => {
    const arr = [...vehicles];
    arr.sort((a, b) => {
      let x = a[sortKey], y = b[sortKey];
      if (x === undefined) x = '';
      if (y === undefined) y = '';
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * (sortDir === 'asc' ? 1 : -1);
    });
    return arr;
  }, [vehicles, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/vehicles/${confirmDelete.id}`);
      notify(`Vehicle ${confirmDelete.vehicleNumber} archived`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle={`${total} vehicle${total === 1 ? '' : 's'} in the fleet`}
        actions={<Link href="/admin/vehicles/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Add Vehicle</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search vehicle / RC / engine / chassis / driver…" className="w-full sm:w-80" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <TableCard>
        {loading ? (
          <PageLoading />
        ) : sorted.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No vehicles found" message="Try changing the search or filter, or add a new vehicle." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th onClick={() => toggleSort('vehicleNumber')} className="cursor-pointer select-none">Vehicle No. {sortKey === 'vehicleNumber' && (sortDir === 'asc' ? '↑' : '↓')}</Th>
                  <Th onClick={() => toggleSort('typeOfEquipment')} className="cursor-pointer select-none">Equipment</Th>
                  <Th onClick={() => toggleSort('make')} className="cursor-pointer select-none">Make / Model</Th>
                  <Th>RC</Th>
                  <Th>Insurance</Th>
                  <Th>Pollution</Th>
                  <Th>Permit</Th>
                  <Th>Tax</Th>
                  <Th>Driver</Th>
                  <Th>Overall Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((v) => {
                  const ov = vehicleOverview(v);
                  return (
                    <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <Td className="font-bold text-blue-700">
                        <Link href={`/admin/vehicles/${v.id}`} className="hover:underline">{v.vehicleNumber}</Link>
                      </Td>
                      <Td>{v.typeOfEquipment || '—'}</Td>
                      <Td>{v.make || '—'} {v.model || ''}</Td>
                      <Td><StatusBadge status={v.docsStatus?.rc} /></Td>
                      <Td><StatusBadge status={v.docsStatus?.insurance} /></Td>
                      <Td><StatusBadge status={v.docsStatus?.pollution} /></Td>
                      <Td><StatusBadge status={v.docsStatus?.permit} /></Td>
                      <Td><StatusBadge status={v.docsStatus?.tax} /></Td>
                      <Td>{driverMap[v.id] || '—'}</Td>
                      <Td><StatusBadge status={ov.status} /></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/vehicles/${v.id}`} title="View" className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm9 0s-4 6.5-9 6.5S3 12 3 12s4-6.5 9-6.5 9 6.5 9 6.5z" /></svg>
                          </Link>
                          <Link href={`/admin/vehicles/${v.id}/edit`} title="Edit" className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                          <button onClick={() => setConfirmDelete(v)} title="Delete" className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={Math.max(1, Math.ceil(total / 15))} total={total} onChange={setPage} />
      </TableCard>

      <Confirm
        open={!!confirmDelete}
        title="Archive vehicle?"
        message={`Vehicle ${confirmDelete?.vehicleNumber} will be archived. You can restore it later if needed.`}
        confirmLabel="Archive"
        danger
        loading={deleting}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
