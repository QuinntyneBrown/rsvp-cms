import { useState, type FormEvent } from 'react';
import { ApiError, get, post } from '../../shared/ui/api.js';
import {
  Alert, Button, Card, Cluster, DescriptionList, Dialog, EmptyState, FormActions, Select, Skeleton, Stack,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TextField, Well,
} from '../../shared/ui/components/index.js';
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
    <Stack>
      <Cluster justify="between">
        <h2>Emails</h2>
        <Button variant="primary" onClick={() => setScheduling(true)}>Schedule invitations</Button>
      </Cluster>
      {list.loading && <Skeleton />}
      {list.error && <EmptyState tone="error" title={list.error} actions={<Button onClick={list.reload}>Try again</Button>} />}
      {list.data && list.data.emails.length === 0 && (
        <Card>
          <EmptyState compact title="No emails planned" headingLevel={3} actions={<Button variant="primary" onClick={() => setScheduling(true)}>Schedule invitations</Button>} />
        </Card>
      )}
      {list.data && list.data.emails.length > 0 && (
        <Table caption="Emails" captionHidden>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Email</TableHeaderCell><TableHeaderCell>Audience</TableHeaderCell><TableHeaderCell>Send time</TableHeaderCell>
              <TableHeaderCell numeric>Recipients</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell><TableHeaderCell labelHidden>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.data.emails.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.subject}</TableCell><TableCell>{m.audience}</TableCell><TableCell>{m.sendAt.replace('T', ' ')}</TableCell>
                <TableCell numeric>{m.recipients}</TableCell><TableCell>{m.status}</TableCell>
                <TableCell actions><Button variant="ghost" size="sm" onClick={() => setPreviewId(m.id)}>Preview</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {scheduling && <ScheduleDialog event={event} onClose={() => setScheduling(false)} onDone={(t) => { setScheduling(false); showToast(`Invitation scheduled for ${t.replace('T', ' ')}`); list.reload(); }} />}
      {previewId !== null && <PreviewDialog eventId={event.id} emailId={previewId} onClose={() => setPreviewId(null)} />}
    </Stack>
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
    <Dialog title="Schedule invitations" onClose={props.onClose} busy={busy}>
      <Stack as="form" onSubmit={submit} noValidate>
        {failure && <Alert tone="danger" live actions={<Button type="submit">Try again</Button>}>{failure}</Alert>}
        <Select label="Recipients" id="em-audience" value={form.audience} onChange={set('audience')} disabled={busy}>
          <option value="all">All invitees</option>
          <option value="non-responders">Only people who haven't replied</option>
        </Select>
        <TextField label="Subject" id="em-subject" error={errors.subject} counter={`${form.subject.length}/150`} value={form.subject} onChange={set('subject')} readOnly={busy} />
        <TextField label="Send on" id="em-sendOn" type="date" error={errors.sendOn} hint="Emails go out at 9:00 am." value={form.sendOn} onChange={set('sendOn')} readOnly={busy} />
        <TextField label="Sender name" id="em-senderName" optional value={form.senderName} onChange={set('senderName')} readOnly={busy} />
        <TextField label="Reply-to email" id="em-replyTo" type="email" optional error={errors.replyTo} value={form.replyTo} onChange={set('replyTo')} readOnly={busy} />
        <FormActions>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Scheduling…' : 'Schedule invitation'}</Button>
        </FormActions>
      </Stack>
    </Dialog>
  );
}

function PreviewDialog(props: { eventId: number; emailId: number; onClose: () => void }) {
  const { data, error, loading, reload } = useLoad(
    () => get<{ from: string; replyTo: string | null; subject: string; body: string }>(`/api/events/${props.eventId}/emails/${props.emailId}/preview`),
    [props.eventId, props.emailId],
  );
  return (
    <Dialog title="Email preview" size="lg" onClose={props.onClose} footer={<Button onClick={props.onClose}>Close</Button>}>
      {loading && <Skeleton />}
      {error && <EmptyState tone="error" compact title={error} actions={<Button onClick={reload}>Try again</Button>} />}
      {data && (
        <Stack>
          <DescriptionList
            items={[
              { term: 'From', description: data.from },
              ...(data.replyTo ? [{ term: 'Reply-to', description: data.replyTo }] : []),
              { term: 'Subject', description: data.subject },
            ]}
          />
          <Well>
            <Stack gap="sm">
              {data.body.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para.split('\n').flatMap((line, j) => (j ? [<br key={j} />, line] : [line]))}</p>
              ))}
            </Stack>
          </Well>
        </Stack>
      )}
    </Dialog>
  );
}
