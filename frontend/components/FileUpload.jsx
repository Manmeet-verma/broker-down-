'use client';

import { useRef, useState } from 'react';

export default function FileUpload({ onChange, accept = '.pdf,.jpg,.jpeg,.png', label = 'Upload File', capture = false, preview = true, className = '' }) {
  const inputRef = useRef(null);
  const [fileInfo, setFileInfo] = useState(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileInfo({ name: file.name, size: file.size, type: file.type });
    if (preview && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFileInfo((prev) => ({ ...prev, url }));
    }
    onChange?.(file);
  };

  const remove = () => {
    setFileInfo(null);
    if (inputRef.current) inputRef.current.value = '';
    onChange?.(null);
  };

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={accept} capture={capture ? 'environment' : undefined}
        className="hidden" onChange={handleChange} />
      {fileInfo ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {fileInfo.url ? (
            <img src={fileInfo.url} alt="" className="h-14 w-14 rounded object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded bg-blue-100 text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">{fileInfo.name}</div>
            <div className="text-xs text-slate-400">{(fileInfo.size / 1024).toFixed(1)} KB</div>
          </div>
          <button type="button" onClick={remove} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
            {label}
          </button>
          {accept.includes('image') && (
            <button type="button" onClick={() => { inputRef.current.setAttribute('capture', 'environment'); inputRef.current?.click(); inputRef.current.removeAttribute('capture'); }}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 hover:border-green-400 hover:bg-green-50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              Camera
            </button>
          )}
        </div>
      )}
    </div>
  );
}
