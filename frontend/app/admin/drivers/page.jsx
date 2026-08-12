'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fmtDate, daysLeft, maskAadhaar, cls } from '@/lib/utils';
import { Button, EmptyState, PageLoading, StatusBadge } from '@/components/ui';
import { PageHeader, SearchInput, Pagination, Th, Td, TableCard } from '@/components/common';

export default function DriverList() {
  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [vehicleMap, setVehicleMap] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/drivers?page=${page}&limit=15${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}`);
      setDrivers(res.drivers);
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
      const active = shifts.filter((s) => s.active);
      const map = {};
      active.forEach((s) => { if (s.driverId) map[s.driverId] = s.vehicleNumber || '—'; });
      setVehicleMap(map);
    }).catch(() => {});
  }, []);

  const sorted = useMemo(() => [...drivers].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [drivers]);

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle={`${total} driver${total === 1 ? '' : 's'} registered`}
        actions={<Link href="/admin/drivers/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Create User / Driver</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name / ID / phone / DL number…" className="w-full sm:w-80" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
          <option value="suspended">Suspended</option>
          <option value="valid">Licence Valid</option>
          <option value="expiring">Licence Expiring</option>
          <option value="expired">Licence Expired</option>
        </select>
      </div>

      <TableCard>
        {loading ? (
          <PageLoading />
        ) : sorted.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No drivers found" message="Create a driver/user account to get started." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Driver</Th>
                  <Th>Driver ID</Th>
                  <Th>Phone</Th>
                  <Th>DL Number</Th>
                  <Th>DL Type</Th>
                  <Th>DL Validity</Th>
                  <Th>Assigned Vehicle</Th>
                  <Th>Shift</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => {
                  const dl = d.license || {};
                  const left = daysLeft(dl.validTo);
                  return (
                    <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <Td>
                        <Link href={`/admin/drivers/${d.id}`} className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {d.photo?.url ? <img src={d.photo.url} alt="" className="h-full w-full object-cover" /> : (d.name?.charAt(0)?.toUpperCase() || 'D')}
                          </div>
                          <span className="font-semibold text-blue-700 hover:underline">{d.name}</span>
                        </Link>
                      </Td>
                      <Td className="font-mono text-xs">{d.id.slice(0, 8)}</Td>
                      <Td>{d.phone || '—'}</Td>
                      <Td className="font-mono text-xs">{dl.number || '—'}</Td>
                      <Td>{dl.type || '—'}</Td>
                      <Td>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={d.licenseStatus} />
                          {dl.validTo && (
                            <span className={cls('text-[11px]', d.licenseStatus === 'expired' ? 'text-red-600' : d.licenseStatus === 'expiring' ? 'text-amber-600' : 'text-slate-400')}>
                              {fmtDate(dl.validTo)}{left !== null && left >= 0 ? ` · ${left}d left` : ''}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>{vehicleMap[d.id] || '—'}</Td>
                      <Td>{d.shift?.preset ? d.shift.preset : '—'}</Td>
                      <Td><StatusBadge status={d.status} /></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/drivers/${d.id}`} title="View" className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm9 0s-4 6.5-9 6.5S3 12 3 12s4-6.5 9-6.5 9 6.5 9 6.5z" /></svg>
                          </Link>
                          <Link href={`/admin/drivers/${d.id}`} title="Assign Vehicle" className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m-12 6h12m0 0l-4-4m4 4l-4 4M4 3h8a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" /></svg>
                          </Link>
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
    </div>
  );
}
