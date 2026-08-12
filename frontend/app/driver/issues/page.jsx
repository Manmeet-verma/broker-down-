'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/utils';
import { EmptyState, PageLoading, StatusBadge } from '@/components/ui';
import { PageHeader, Th, Td, TableCard } from '@/components/common';

export default function MyIssues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/issues').then(({ issues }) => { setIssues(issues); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="My Issues"
        subtitle="Track the status of your reported problems"
        actions={<Link href="/driver/issues/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Report Problem</Link>}
      />
      <TableCard>
        {issues.length === 0 ? (
          <div className="p-6"><EmptyState title="No issues reported" message="If a vehicle breaks down or has a problem, report it here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Status</Th>
                  <Th>Vehicle</Th>
                  <Th>Category</Th>
                  <Th>Title</Th>
                  <Th>Photos</Th>
                  <Th>Reported</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <Td><StatusBadge status={i.status} /></Td>
                    <Td className="font-mono text-xs font-bold text-blue-700">{i.vehicleNumber}</Td>
                    <Td>{i.category}</Td>
                    <Td className="max-w-[240px]">
                      <div className="truncate font-medium">{i.title}</div>
                      <div className="truncate text-xs text-slate-400">{i.description}</div>
                    </Td>
                    <Td>{i.images?.length || 0}</Td>
                    <Td className="text-xs">{fmtDateTime(i.createdAt)}</Td>
                    <Td className="text-right">
                      <Link href={`/driver/issues/${i.id}`} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">Open</Link>
                    </Td>
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
