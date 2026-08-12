'use client';

import React, { useEffect, useState } from 'react';

/** Grid of clickable images that open the FullscreenImage viewer. */
export function ImageGrid({ images, onImageClick }) {
  if (!images || !images.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {images.map((img, i) => (
        <button
          key={img.path || img.url || i}
          type="button"
          onClick={() => onImageClick(i)}
          className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
        >
          <img src={img.url} alt={img.name || 'image'} className="h-full w-full object-cover transition group-hover:scale-105" />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/30">
            <svg className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m-3-3h6" />
            </svg>
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Fullscreen image viewer. `images` = [{url,name}], `index` = starting index.
 * Arrow keys navigate, Esc closes.
 */
export function FullscreenImage({ images, index, onClose }) {
  const [idx, setIdx] = useState(index);

  useEffect(() => setIdx(index), [index]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  if (!images || !images.length || index === null || index === undefined || index < 0) return null;
  const img = images[idx];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4">
        <div className="text-sm font-medium text-white">
          {img.name || 'Image'} <span className="text-slate-400">({idx + 1} / {images.length})</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-white hover:bg-white/10">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="absolute left-3 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25 disabled:opacity-30"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <img src={img.url} alt={img.name || 'image'} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        <button
          onClick={() => setIdx((i) => Math.min(images.length - 1, i + 1))}
          disabled={idx === images.length - 1}
          className="absolute right-3 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25 disabled:opacity-30"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 p-4">
        {images.map((im, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-2 rounded-full transition ${i === idx ? 'w-6 bg-white' : 'w-2 bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}
