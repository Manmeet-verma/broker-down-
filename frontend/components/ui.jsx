'use client';

import { useEffect, useState } from 'react';
import { cls } from '@/lib/utils';

/* ------------------------------------------------ Badge ------------------------------------------------ */
const BADGE_COLORS = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  yellow: 'bg-amber-100 text-amber-800 border-amber-300',
  red: 'bg-red-100 text-red-800 border-red-300',
  gray: 'bg-slate-100 text-slate-600 border-slate-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  purple: 'bg-purple-100 text-purple-800 border-purple-300'
};

export function Badge({ color = 'gray', children, className }) {
  return (
    <span className={cls('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', BADGE_COLORS[color] || BADGE_COLORS.gray, className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const meta = {
    valid: { label: 'Valid', color: 'green' },
    expiring: { label: 'Expiring Soon', color: 'yellow' },
    expired: { label: 'Expired', color: 'red' },
    not_done: { label: 'Not Done', color: 'gray' },
    active: { label: 'Active', color: 'green' },
    inactive: { label: 'Inactive', color: 'gray' },
    under_finance: { label: 'Under Finance', color: 'blue' },
    sold: { label: 'Sold / Transferred', color: 'gray' },
    on_leave: { label: 'On Leave', color: 'yellow' },
    suspended: { label: 'Suspended', color: 'red' },
    pending: { label: 'Pending', color: 'yellow' },
    accepted: { label: 'Accepted', color: 'green' },
    rejected: { label: 'Rejected', color: 'red' },
    resolved: { label: 'Resolved', color: 'blue' },
    low: { label: 'Low', color: 'blue' },
    medium: { label: 'Medium', color: 'yellow' },
    high: { label: 'High', color: 'orange' },
    critical: { label: 'Critical', color: 'red' },
    day: { label: 'Day', color: 'blue' },
    night: { label: 'Night', color: 'purple' },
    morning: { label: 'Morning', color: 'yellow' },
    evening: { label: 'Evening', color: 'orange' },
    general: { label: 'General', color: 'gray' },
    other: { label: 'Other', color: 'gray' }
  }[status] || { label: String(status || '').replace(/_/g, ' ') || 'Unknown', color: 'gray' };

  return <Badge color={meta.color}>{meta.label}</Badge>;
}

/* ------------------------------------------------ Card ------------------------------------------------ */
export function Card({ title, subtitle, actions, children, className, pad = true }) {
  return (
    <div className={cls('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------ Form controls ------------------------------------------------ */
export function Field({ label, required, error, hint, children, className }) {
  return (
    <label className={cls('block', className)}>
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>}
      {error && <span className="mt-0.5 block text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400';

export function Input(props) {
  const { error, ...rest } = props;
  return <input {...rest} className={cls(inputBase, error && 'border-red-400', rest.className)} />;
}

export function Select(props) {
  const { error, children, ...rest } = props;
  return (
    <select {...rest} className={cls(inputBase, 'pr-8', error && 'border-red-400', rest.className)}>
      {children}
    </select>
  );
}

export function Textarea(props) {
  const { error, ...rest } = props;
  return <textarea {...rest} className={cls(inputBase, 'min-h-[80px]', error && 'border-red-400', rest.className)} />;
}

/* ------------------------------------------------ Buttons ------------------------------------------------ */
export function Button({ variant = 'primary', size = 'md', loading, disabled, className, children, ...rest }) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-200',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-200',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100'
  };
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm'
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cls(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------ Spinner ------------------------------------------------ */
export function Spinner({ className }) {
  return (
    <svg className={cls('animate-spin text-current', className || 'h-5 w-5')} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="h-8 w-8 text-blue-600" />
    </div>
  );
}

/* ------------------------------------------------ Empty state ------------------------------------------------ */
export function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center">
      <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-xs text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------ Modal ------------------------------------------------ */
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={cls('relative w-full scale-in rounded-xl bg-white shadow-2xl', wide ? 'max-w-3xl' : 'max-w-md')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ Confirm ------------------------------------------------ */
export function Confirm({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger, onConfirm, onClose, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------ Toast ------------------------------------------------ */
export function toast() {
  return null; // replaced by provider below
}

export function ToastProvider() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const { type = 'success', message } = e.detail || {};
      const id = Math.random().toString(36).slice(2);
      setItems((prev) => [...prev, { id, type, message }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className={cls('pointer-events-auto fade-in rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg', colors[t.type] || colors.success)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export const notify = (message, type = 'success') =>
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
