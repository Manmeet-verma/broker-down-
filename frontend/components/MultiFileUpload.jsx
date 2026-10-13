'use client';

import { useRef, useState } from 'react';

export default function MultiFileUpload({ files = [], onChange, accept = '.pdf,.jpg,.jpeg,.png', label = 'Add Documents', maxMB = 5 }) {
  const inputRef = useRef(null);
  const [err, setErr] = useState('');

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    const ok = [];
    let error = '';
    for (const f of picked) {
      if (f.size > maxMB * 1024 * 1024) error = `${f.name} exceeds ${maxMB}MB limit`;
      else ok.push(f);
    }
    setErr(error);
    if (ok.length) onChange?.([...files, ...ok]);
    e.target.value = '';
  };

  const removeAt = (i) => onChange?.(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={handleFiles} />
      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-100 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">{f.name}</div>
              <div className="text-xs text-slate-400">{(f.size / 1024).toFixed(1)} KB</div>
            </div>
            <button type="button" onClick={() => removeAt(i)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {label}
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
