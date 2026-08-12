'use client';

import Link from 'next/link';
import { cls, fmtDate, daysLeft } from '@/lib/utils';
import { Badge, Button, StatusBadge } from './ui';

/** Status pill with expiry countdown, e.g. "Expiring · 20 days left" */
export function ExpiryPill({ status, validTo }) {
  if (status === 'not_done') return <StatusBadge status="not_done" />;
  const left = daysLeft(validTo);
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge status={status} />
      {status !== 'not_done' && (
        <span className={cls('text-[11px]', status === 'expired' ? 'text-red-600' : status === 'expiring' ? 'text-amber-600' : 'text-slate-400')}>
          {status === 'expired' ? `Expired ${fmtDate(validTo)}` : status === 'expiring' ? `${left} day${left === 1 ? '' : 's'} left` : `Valid till ${fmtDate(validTo)}`}
        </span>
      )}
    </div>
  );
}

export function InfoRow({ label, value, className }) {
  return (
    <div className={cls('flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0', className)}>
      <span className="shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800 break-all">{value || '—'}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LinkButton({ href, children, variant = 'primary', className }) {
  return (
    <Link href={href} className={cls('inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition', variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50', className)}>
      {children}
    </Link>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cls('relative', className)}>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

export function Pagination({ page, pages, total, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-xs text-slate-500">Page {page} of {pages} · {total} records</span>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function Th({ children, className }) {
  return <th className={cls('whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500', className)}>{children}</th>;
}

export function Td({ children, className }) {
  return <td className={cls('whitespace-nowrap px-4 py-3 text-sm text-slate-700', className)}>{children}</td>;
}

export function TableCard({ children }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{children}</div>;
}
