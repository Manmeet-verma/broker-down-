'use client';

import { useRef, useState, useCallback } from 'react';

export default function CameraCapture({ onCapture, accept = 'image/*', label = 'Take Photo', className = '' }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onCapture(file, url);
  }, [onCapture]);

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={accept} capture="environment" className="hidden" onChange={handleChange} />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Captured" className="h-32 w-32 rounded-lg object-cover" />
          <button type="button" onClick={() => { setPreview(null); inputRef.current?.click(); }}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-xs text-white hover:bg-red-600">Retake</button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          {label}
        </button>
      )}
    </div>
  );
}
