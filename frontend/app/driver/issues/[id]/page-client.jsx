'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { fmtDateTime, cls } from '@/lib/utils';
import { Button, Card, PageLoading, StatusBadge, notify } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { ImageGrid, FullscreenImage } from '@/components/Lightbox';

export default function MyIssueDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgFiles, setMsgFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const scrollRef = useRef(null);

  const load = () => {
    api.get(`/issues/${id}`).then((d) => { setData(d); setError(''); }).catch((err) => setError(err.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [data?.messages?.length]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <PageLoading />;

  const { issue, messages } = data;

  const send = async () => {
    if (!msg.trim() && msgFiles.length === 0) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('text', msg);
      msgFiles.forEach((f) => fd.append('attachments', f));
      await api.upload(`/issues/${id}/messages`, fd);
      setMsg('');
      setMsgFiles([]);
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={issue.title}
        subtitle={`${issue.vehicleNumber} · ${issue.category} · Reported ${fmtDateTime(issue.createdAt)}`}
        actions={
          <>
            <StatusBadge status={issue.status} />
            <Button variant="secondary" onClick={() => router.push('/driver/issues')}>Back</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Problem Description">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{issue.description}</p>
            {issue.images?.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Photos ({issue.images.length}) — tap to view full screen</h4>
                <ImageGrid images={issue.images} onImageClick={(i) => setLightbox(i)} />
              </div>
            )}
          </Card>

          <Card title="Conversation with Admin" pad={false}>
            <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto p-5 scrollbar-thin">
              {messages.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Waiting for the admin to respond…</p>}
              {messages.map((m) => {
                const isAdmin = m.senderRole === 'admin';
                return (
                  <div key={m.id} className={cls('flex', isAdmin ? 'justify-start' : 'justify-end')}>
                    <div className={cls('max-w-[80%] rounded-xl px-4 py-2.5 text-sm', m.system ? 'bg-slate-100 text-slate-600' : isAdmin ? 'bg-white border border-slate-200 text-slate-800' : 'bg-blue-600 text-white')}>
                      <div className="mb-0.5 text-[11px] font-semibold opacity-70">{m.system ? 'System' : `${m.senderName} (${isAdmin ? 'Admin' : 'You'})`}</div>
                      {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
                      {m.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.attachments.map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noreferrer" className={cls('inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold', isAdmin ? 'bg-slate-100 hover:bg-slate-200' : 'bg-white/20 hover:bg-white/30')}>{a.name}</a>
                          ))}
                        </div>
                      )}
                      <div className={cls('mt-1 text-[10px]', isAdmin ? 'text-slate-400' : 'text-white/60')}>{fmtDateTime(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input type="file" multiple accept="image/*,.pdf" onChange={(e) => setMsgFiles([...msgFiles, ...Array.from(e.target.files)])} className="hidden" id="issue-attach" />
                <label htmlFor="issue-attach" className="flex shrink-0 cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Attach{msgFiles.length ? ` (${msgFiles.length})` : ''}
                </label>
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Reply to admin…" className="min-h-[42px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <Button onClick={send} loading={sending}>Send</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Issue Status">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Status</span>
                <StatusBadge status={issue.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Priority</span>
                <StatusBadge status={issue.priority} />
              </div>
              {issue.resolutionNote && (
                <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <span className="font-bold">Admin note: </span>{issue.resolutionNote}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <FullscreenImage images={issue.images || []} index={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
