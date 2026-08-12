'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { fmtDateTime, cls } from '@/lib/utils';
import { Button, Card, PageLoading, StatusBadge, Modal, Textarea, notify } from '@/components/ui';
import { PageHeader, InfoRow } from '@/components/common';
import { ImageGrid, FullscreenImage } from '@/components/Lightbox';

export default function IssueDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusAction, setStatusAction] = useState('accepted');
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);
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

  const setStatus = async () => {
    setActing(true);
    try {
      await api.patch(`/issues/${id}/status`, { status: statusAction, note });
      notify(`Issue ${statusAction}`);
      setStatusOpen(false);
      setNote('');
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActing(false);
    }
  };

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
        subtitle={`${issue.vehicleNumber} · ${issue.category} · Reported ${fmtDateTime(issue.createdAt)} by ${issue.driverName || issue.reportedBy?.name || '—'}`}
        actions={
          <>
            <StatusBadge status={issue.status} />
            <StatusBadge status={issue.priority} />
            <Button variant="secondary" onClick={() => router.push('/admin/issues')}>Back</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Problem Description">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{issue.description}</p>
            {issue.images?.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Photos ({issue.images.length})</h4>
                <ImageGrid images={issue.images} onImageClick={(i) => setLightbox(i)} />
              </div>
            )}
          </Card>

          <Card title="Conversation" pad={false}>
            <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto p-5 scrollbar-thin">
              {messages.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">No messages yet. Send a message to the driver.</p>
              )}
              {messages.map((m) => {
                const isAdmin = m.senderRole === 'admin';
                return (
                  <div key={m.id} className={cls('flex', isAdmin ? 'justify-end' : 'justify-start')}>
                    <div className={cls('max-w-[80%] rounded-xl px-4 py-2.5 text-sm', m.system ? 'bg-slate-100 text-slate-600' : isAdmin ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800')}>
                      <div className="mb-0.5 text-[11px] font-semibold opacity-70">
                        {m.system ? 'System' : `${m.senderName} (${isAdmin ? 'Admin' : 'Driver'})`}
                      </div>
                      {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
                      {m.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.attachments.map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noreferrer" className={cls('inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold', isAdmin ? 'bg-white/20 hover:bg-white/30' : 'bg-white hover:bg-slate-200')}>
                              {a.name}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className={cls('mt-1 text-[10px]', isAdmin ? 'text-white/60' : 'text-slate-400')}>{fmtDateTime(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input type="file" multiple accept="image/*,.pdf" onChange={(e) => setMsgFiles([...msgFiles, ...Array.from(e.target.files)])}
                  className="hidden" id="issue-attach" />
                <label htmlFor="issue-attach" className="flex shrink-0 cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Attach{msgFiles.length ? ` (${msgFiles.length})` : ''}
                </label>
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a message…" className="min-h-[42px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <Button onClick={send} loading={sending}>Send</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Issue Details">
            <InfoRow label="Status" value={<StatusBadge status={issue.status} />} />
            <InfoRow label="Priority" value={<StatusBadge status={issue.priority} />} />
            <InfoRow label="Vehicle" value={issue.vehicleNumber} />
            <InfoRow label="Driver" value={issue.driverName || '—'} />
            <InfoRow label="Category" value={issue.category} />
            <InfoRow label="Reported By" value={issue.reportedBy?.name} />
            <InfoRow label="Reported At" value={fmtDateTime(issue.createdAt)} />
            {issue.resolutionNote && <InfoRow label="Resolution Note" value={issue.resolutionNote} />}
          </Card>

          {issue.status === 'pending' && (
            <Card title="Take Action">
              <p className="mb-3 text-xs text-slate-500">Accept the issue to start work, or reject it with a reason. The driver is notified automatically.</p>
              <div className="flex gap-2">
                <Button variant="success" className="flex-1" onClick={() => { setStatusAction('accepted'); setStatusOpen(true); }}>Accept</Button>
                <Button variant="danger" className="flex-1" onClick={() => { setStatusAction('rejected'); setStatusOpen(true); }}>Reject</Button>
              </div>
            </Card>
          )}
          {issue.status === 'accepted' && (
            <Card title="Work in Progress">
              <Button variant="success" className="w-full" onClick={() => { setStatusAction('resolved'); setStatusOpen(true); }}>Mark as Resolved</Button>
            </Card>
          )}
        </div>
      </div>

      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title={statusAction === 'accepted' ? 'Accept Issue' : statusAction === 'resolved' ? 'Resolve Issue' : 'Reject Issue'}>
        <p className="mb-3 text-sm text-slate-600">
          {statusAction === 'accepted' ? 'This will notify the driver that the issue is accepted.' :
           statusAction === 'resolved' ? 'Confirm the issue is resolved.' :
           'This will notify the driver. Provide a reason for rejection.'}
        </p>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={statusAction === 'rejected' ? 'Reason for rejection (recommended)' : 'Message to driver (optional)'} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setStatusOpen(false)}>Cancel</Button>
          <Button variant={statusAction === 'rejected' ? 'danger' : 'success'} onClick={setStatus} loading={acting}>
            {statusAction === 'accepted' ? 'Accept Issue' : statusAction === 'resolved' ? 'Mark Resolved' : 'Reject Issue'}
          </Button>
        </div>
      </Modal>

      <FullscreenImage images={issue.images || []} index={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
