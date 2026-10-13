'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fmtDate, daysLeft, cls } from '@/lib/utils';
import { PageLoading } from '@/components/ui';

const WARNING = 90;

const TABS = [
  { key: 'rc', label: 'RC' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'pollution', label: 'Pollution' },
  { key: 'permit', label: 'State Permit' },
  { key: 'tax', label: 'Tax' },
  { key: 'dl', label: 'Driving License' }
];

function sectionLeft(section) {
  const s = section || {};
  if (s.done === false) return undefined;
  const date = s.validTo || s.period;
  if (!date) return undefined;
  const left = daysLeft(date);
  return left === null || left === undefined ? undefined : left;
}

function statusOf(left) {
  if (left === undefined) return 'not_done';
  if (left < 0) return 'expired';
  if (left <= WARNING) return 'expiring';
  return 'valid';
}

function DaysCell({ left }) {
  if (left === undefined) return <span className="text-slate-400">—</span>;
  if (left < 0) return <span className="font-semibold text-red-600">Expired {-left}d ago</span>;
  if (left <= WARNING) return <span className="font-semibold text-amber-600">{left}d left</span>;
  return <span className="text-emerald-700">{left}d left</span>;
}

function StatusPill({ status }) {
  const meta = {
    valid: 'bg-emerald-50 text-emerald-700',
    expiring: 'bg-amber-50 text-amber-700',
    expired: 'bg-red-50 text-red-700',
    not_done: 'bg-slate-100 text-slate-400'
  }[status] || 'bg-slate-100 text-slate-500';
  const label = { valid: 'Valid', expiring: 'Expiring', expired: 'Expired', not_done: 'Not Done' }[status] || status;
  return <span className={cls('inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', meta)}>{label}</span>;
}

export default function DocumentExpiryTabs() {
  const [vehicles, setVehicles] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [tab, setTab] = useState('rc');
  const [, setTick] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/vehicles?limit=1000').then((d) => d.vehicles || []),
      api.get('/drivers?limit=1000').then((d) => d.drivers || []).catch(() => [])
    ]).then(([v, dr]) => { setVehicles(v); setDrivers(dr); }).catch(() => setVehicles([]));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  if (!vehicles) return <PageLoading />;

  const buildRows = (key) => {
    if (key === 'dl') {
      return drivers.map((d) => {
        const left = sectionLeft(d.license);
        return {
          id: d.id, href: `/admin/drivers/${d.id}`, name: d.name || '—',
          type: d.license?.type || '—', ref: d.license?.number || '—',
          validTo: d.license?.validTo, left, status: statusOf(left)
        };
      });
    }
    return vehicles.map((v) => {
      const section = v[key];
      const left = sectionLeft(section);
      let type = '—';
      if (key === 'tax') type = section?.type || '—';
      if (key === 'insurance') type = section?.companyName || v.insuranceType?.name || '—';
      if (key === 'rc') type = section?.number || v.applicableRcNo || '—';
      return {
        id: v.id, href: `/admin/vehicles/${v.id}`, name: v.vehicleNumber || '—',
        type, ref: v.make ? `${v.make} ${v.model}`.trim() : '—',
        validTo: section?.validTo || null, left, status: statusOf(left)
      };
    });
  };

  const all = buildRows(tab);
  const counts = all.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const rows = all
    .filter((r) => r.status !== 'not_done')
    .sort((a, b) => (a.left ?? 99999) - (b.left ?? 99999));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">Valid {counts.valid || 0}</span>
          <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">Expiring ≤3 months {counts.expiring || 0}</span>
          <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">Expired {counts.expired || 0}</span>
          <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-500">Not Done {counts.not_done || 0}</span>
        </div>
        <span className="hidden text-[11px] text-slate-400 sm:block">Days left updates automatically</span>
      </div>

      <div className="flex flex-wrap gap-0 border-b border-slate-300 bg-slate-100 px-2 pt-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cls(
              '-mb-px rounded-t-md border border-b-0 px-3.5 py-1.5 text-xs font-semibold transition',
              tab === t.key
                ? 'border-slate-300 bg-white text-emerald-700 shadow-[inset_0_2px_0_0_#16a34a]'
                : 'border-transparent text-slate-500 hover:bg-slate-200/60 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="border border-slate-200 px-3 py-2">#</th>
              <th className="border border-slate-200 px-3 py-2">{tab === 'dl' ? 'Driver' : 'Vehicle'}</th>
              <th className="border border-slate-200 px-3 py-2">{tab === 'tax' ? 'Tax Type' : tab === 'dl' ? 'License Type' : 'Type / Company'}</th>
              <th className="border border-slate-200 px-3 py-2">{tab === 'dl' ? 'DL Number' : 'Make / Model'}</th>
              <th className="border border-slate-200 px-3 py-2">Expiry Date</th>
              <th className="border border-slate-200 px-3 py-2">Days Left</th>
              <th className="border border-slate-200 px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                  No records with an expiry date on this sheet.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className={cls('hover:bg-blue-50/50', i % 2 === 1 && 'bg-slate-50/70')}>
                  <td className="border border-slate-200 px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                  <td className="border border-slate-200 px-3 py-2">
                    <Link href={r.href} className="font-semibold text-blue-600 hover:underline">{r.name}</Link>
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">{r.type}</td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-600">{r.ref}</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono text-xs text-slate-700">{fmtDate(r.validTo)}</td>
                  <td className="border border-slate-200 px-3 py-2"><DaysCell left={r.left} /></td>
                  <td className="border border-slate-200 px-3 py-2"><StatusPill status={r.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
