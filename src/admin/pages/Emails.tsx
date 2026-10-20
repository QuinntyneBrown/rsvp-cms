import { useState, type FormEvent } from 'react';
import { ApiError, get, post } from '../../shared/ui/api.js';
import { Dialog, ErrorState, Field, Skeleton } from '../../shared/ui/components.js';
import { useLoad } from '../../shared/ui/hooks.js';
import type { EventDetail } from './EventShell.js';

interface EmailRow {
  id: number;
  audience: string;
  sendAt: string;
  recipients: number;
  status: string;
  subject: string;
}

export function EmailsTab({ event, showToast }: { event: EventDetail; showToast: (m: string) => void }) {
  const list = useLoad(() => get<{ emails: EmailRow[] }>(`/api/events/${event.id}/emails`), [event.id]);
  const [scheduling, setScheduling] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  return (
    <div className="stack">
      <div className="cluster cluster--between">
        <h2>Emails</h2>
        <button className="btn btn--primary" type="button" onClick={() => setScheduling(true)}>Schedule invitations</button>
      </div>
      {list.loading && <Skeleton />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && list.data.emails.length === 0 && (
        <div className="card stack">
          <h3>No emails planned</h3>
          <div><button className="btn btn--primary" type="button" onClick={() => setScheduling(true)}>Schedule invitations</button></div>
        </div>
      )}
      {list.data && list.data.emails.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Email</th><th>Audience</th><th>Send time</th><th>Recipients</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.data.emails.map((m) => (
                <tr key={m.id}>
                  <td>{m.subject}</td><td>{m.audience}</td><td>{m.sendAt.replace('T', ' ')}</td><td>{m.recipients}</td><td>{m.status}</td>
                  <td><button className="btn btn--ghost" type="button" onClick={() => setPreviewId(m.id)}>Preview</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {scheduling && <ScheduleDialog event={event} onClose={() => setScheduling(false)} onDone={(t) => { setScheduling(false); showToast(`Invitation scheduled for ${t.replace('T', ' ')}`); list.reload(); }} />}
      {previewId !== null && <PreviewDialog eventId={event.id} emailId={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
}

function ScheduleDialog(props: { event: EventDetail; onClose: () => void; onDone: (sendTime: string) => void }) {
  const [form, setForm] = useState({ audience: 'all', subject: `You're invited to ${props.event.name}`, sendOn: props.event.inviteOpen, senderName: '', replyTo: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const res = await post<{ sendTime: string }>(`/api/events/${props.event.id}/emails`, form);
      props.onDone(res.sendTime);
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      if (!apiErr.errors || !Object.keys(apiErr.errors).length) setFailure(apiErr.message);
      setBusy(false);
    }
  }

  return (
    <Dialog title="Schedule invitations" onClose={props.onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        {failure && <p role="alert" className="field__error">{failure} <button className="btn" type="submit">Try again</button></p>}
        <Field label="Recipients" id="em-audience">
          <select className="select" id="em-audience" value={form.audience} onChange={set('audience')} disabled={busy}>
            <option value="all">All invitees</option>
            <option value="non-responders">Only people who haven't replied</option>
          </select>
        </Field>
        <Field label="Subject" id="em-subject" error={errors.subject} counter={`${form.subject.length}/150`}>
          <input className="input" id="em-subject" value={form.subject} onChange={set('subject')} readOnly={busy} />
        </Field>
        <Field label="Send on" id="em-sendOn" error={errors.sendOn} hint="Emails go out at 9:00 am.">
          <input className="input" id="em-sendOn" type="date" value={form.sendOn} onChange={set('sendOn')} readOnly={busy} />
        </Field>
        <Field label="Sender name" id="em-senderName" optional><input className="input" id="em-senderName" value={form.senderName} onChange={set('senderName')} readOnly={busy} /></Field>
        <Field label="Reply-to email" id="em-replyTo" optional error={errors.replyTo}><input className="input" id="em-replyTo" type="email" value={form.replyTo} onChange={set('replyTo')} readOnly={busy} /></Field>
        <div className="form-actions">
          <button className="btn" type="button" onClick={props.onClose}>Cancel</button>
          <button className="btn btn--primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Scheduling…' : 'Schedule invitation'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function PreviewDialog(props: { eventId: number; emailId: number; onClose: () => void }) {
  const { data, error, loading, reload } = useLoad(
    () => get<{ from: string; replyTo: string | null; subject: string; body: string }>(`/api/events/${props.eventId}/emails/${props.emailId}/preview`),
    [props.eventId, props.emailId],
  );
  return (
    <Dialog title="Email preview" onClose={props.onClose}>
      {loading && <Skeleton />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <dl className="stack">
          <div><dt>From</dt><dd>{data.from}</dd></div>
          {data.replyTo && <div><dt>Reply-to</dt><dd>{data.replyTo}</dd></div>}
          <div><dt>Subject</dt><dd>{data.subject}</dd></div>
          <div style={{ maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{data.body}</div>
        </dl>
      )}
      <button className="btn" type="button" onClick={props.onClose}>Close</button>
    </Dialog>
  );
}
