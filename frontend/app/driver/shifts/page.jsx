'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { EmptyState, PageLoading, StatusBadge } from '@/components/ui';
import { PageHeader, Th, Td, TableCard } from '@/components/common';

export default function MyShifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shifts').then(({ shifts }) => { setShifts(shifts); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="My Shifts" subtitle="Your day/night shift assignments" />
      <TableCard>
        {shifts.length === 0 ? (
          <div className="p-6"><EmptyState title="No shifts assigned" message="Your admin will assign your shifts." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Vehicle</Th>
                  <Th>Shift</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Assigned At</Th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <Td className="font-mono text-xs font-bold text-blue-700">{s.vehicleNumber}</Td>
                    <Td><StatusBadge status={s.shiftType} /></Td>
                    <Td>{s.date ? fmtDate(s.date) : '—'}</Td>
                    <Td><StatusBadge status={s.active ? 'active' : 'inactive'} /></Td>
                    <Td className="text-xs">{fmtDateTime(s.createdAt)}</Td>
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
