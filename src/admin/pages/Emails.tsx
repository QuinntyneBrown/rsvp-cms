import { useState, type FormEvent } from 'react';
import { ApiError, get, post } from '../../shared/ui/api.js';
import {
  Alert, Badge, Button, Card, Cluster, DescriptionList, Link, Dialog, EmptyState, ErrorSummary, FormActions, RadioGroup, Skeleton, Stack,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TextField, Well,
} from '../../shared/ui/components/index.js';
import { formatDay, formatTime } from '../../shared/ui/format.js';
import { useLoad } from '../../shared/ui/hooks.js';
import { Text } from '../../shared/ui/primitives/index.js';
import type { EventDetail } from './EventShell.js';

interface EmailRow {
  id: number;
  kind: string;
  audience: string;
  sendAt: string;
  recipients: number;
  status: string;
  subject: string;
}

interface EmailList {
  emails: EmailRow[];
  counts: { all: number; nonResponders: number };
  /** Who the emails come from: Event settings, else the organiser (L2-036). */
  sender: { from: string; replyTo: string | null };
}

const STATUS_TONE: Record<string, 'info' | 'success' | 'danger' | 'neutral'> = { Scheduled: 'info', Sent: 'success', Failed: 'danger' };

/** '2026-11-01T09:00' → 'Sun 1 Nov · 9:00 am', as the emails mock writes send times. */
const formatSendAt = (sendAt: string) => `${formatDay(sendAt.slice(0, 10))} · ${formatTime(sendAt.slice(11, 16))}`;

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

/** Scheduled and sent emails (L2-030) with the schedule and preview dialogs. */
export function EmailsTab({ event }: { event: EventDetail; showToast: (m: string) => void }) {
  const list = useLoad(() => get<EmailList>(`/api/events/${event.id}/emails`), [event.id]);
  const [scheduling, setScheduling] = useState(false);
  const [preview, setPreview] = useState<EmailRow | null>(null);

  return (
    <Stack>
      <Cluster justify="between">
        <div>
          <h2>Scheduled and sent emails</h2>
          {list.data && (
            <Text variant="caption" tone="muted">
              From {list.data.sender.from} · replies go to {list.data.sender.replyTo ?? 'you'}. <Link href={`#/events/${event.id}/settings`}>Change in Settings</Link>
            </Text>
          )}
        </div>
        <Button variant="primary" onClick={() => setScheduling(true)}>Schedule invitations</Button>
      </Cluster>
      {list.loading && <Skeleton rows={4} label="Loading emails" />}
      {list.error && (
        <EmptyState
          tone="error"
          title="We couldn't load your emails"
          text={`Nothing was sent or changed. ${list.error}`}
          actions={<Button onClick={list.reload}>Try again</Button>}
        />
      )}
      {list.data && list.data.emails.length === 0 && (
        <Card>
          <EmptyState
            compact
            title="No emails scheduled"
            headingLevel={3}
            text="Schedule the invitation to send the first email."
            actions={<Button variant="primary" onClick={() => setScheduling(true)}>Schedule invitations</Button>}
          />
        </Card>
      )}
      {list.data && list.data.emails.length > 0 && (
        <Table caption="Scheduled and sent emails" captionHidden>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Email</TableHeaderCell><TableHeaderCell>Audience</TableHeaderCell><TableHeaderCell>Send time</TableHeaderCell>
              <TableHeaderCell numeric>Recipients</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell><TableHeaderCell labelHidden>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.data.emails.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Text as="div">{m.kind}</Text>
                  <Text as="div" variant="body-sm" tone="muted">{m.subject}</Text>
                </TableCell>
                <TableCell>{m.audience}</TableCell>
                <TableCell>{formatSendAt(m.sendAt)}</TableCell>
                <TableCell numeric>{m.recipients}</TableCell>
                <TableCell><Badge tone={STATUS_TONE[m.status] ?? 'neutral'}>{m.status}</Badge></TableCell>
                <TableCell actions><Button variant="ghost" size="sm" onClick={() => setPreview(m)}>Preview</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {scheduling && (
        <ScheduleDialog
          event={event}
          counts={list.data?.counts}
          onScheduled={list.reload}
          onClose={() => setScheduling(false)}
        />
      )}
      {preview && <PreviewDialog eventId={event.id} email={preview} onClose={() => setPreview(null)} />}
    </Stack>
  );
}

/** Schedule invitations (L2-029, L2-036), in the states of the invite-send mocks. */
function ScheduleDialog(props: { event: EventDetail; counts?: EmailList['counts']; onScheduled: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ audience: 'all', subject: `You're invited to ${props.event.name}`, sendOn: props.event.inviteOpen });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ sendTime: string; recipients: number } | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const res = await post<{ sendTime: string; email: { recipients: number } }>(`/api/events/${props.event.id}/emails`, form);
      setDone({ sendTime: res.sendTime, recipients: res.email.recipients });
      props.onScheduled();
    } catch (err) {
      const apiErr = err as ApiError;
      const fieldErrors = apiErr.errors ?? {};
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFailure(apiErr.message); // nothing was scheduled (L2-029 AC5)
      const first = Object.keys(fieldErrors)[0];
      if (first) setTimeout(() => document.getElementById(`em-${first}`)?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }

  // Success: the send time, then Done (L2-029 AC4).
  if (done) {
    return (
      <Dialog title="Invitations scheduled" description="Nothing more to do until the invitations go out." onClose={props.onClose} footer={<Button variant="primary" onClick={props.onClose}>Done</Button>}>
        <Alert tone="success" title={`Scheduled for ${formatDay(done.sendTime.slice(0, 10))} at ${formatTime(done.sendTime.slice(11, 16))}`}>
          {people(done.recipients)} will receive the invitation.
        </Alert>
      </Dialog>
    );
  }

  const summary = Object.entries(errors).map(([key, message]) => ({ fieldId: `em-${key}`, message }));
  const counts = props.counts;

  return (
    <Dialog title="Schedule invitations" description="Choose who gets the first email and when it goes out." onClose={props.onClose} busy={busy}>
      <Stack as="form" onSubmit={submit} noValidate>
        {summary.length > 1 && <ErrorSummary errors={summary} autoFocus={false} />}
        {failure && (
          <Alert tone="danger" live title="Couldn't schedule the invitation" actions={<Button type="submit">Try again</Button>}>
            {failure} Nothing was scheduled.
          </Alert>
        )}
        <RadioGroup
          legend="Recipients"
          name="em-audience"
          id="em-audience"
          disabled={busy}
          options={[
            { value: 'all', label: counts ? `All ${counts.all} invitees` : 'All invitees', description: 'Each person gets a personal link' },
            { value: 'non-responders', label: "Only people who haven't replied", description: counts ? people(counts.nonResponders) : undefined },
          ]}
          value={form.audience}
          onChange={(audience) => setForm({ ...form, audience })}
        />
        <TextField label="Subject" id="em-subject" error={errors.subject} counter={`${form.subject.length}/150`} value={form.subject} onChange={set('subject')} readOnly={busy} />
        <TextField label="Send on" id="em-sendOn" type="date" error={errors.sendOn} hint="Emails go out at 9:00 am." value={form.sendOn} onChange={set('sendOn')} readOnly={busy} />
        <FormActions>
          <Button onClick={props.onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Scheduling…' : 'Schedule invitation'}</Button>
        </FormActions>
      </Stack>
    </Dialog>
  );
}

/** The exact email a guest receives (L2-031), from the email-preview mock. */
function PreviewDialog(props: { eventId: number; email: EmailRow; onClose: () => void }) {
  const { data, error, loading, reload } = useLoad(
    () => get<{ from: string; replyTo: string | null; subject: string; body: string }>(`/api/events/${props.eventId}/emails/${props.email.id}/preview`),
    [props.eventId, props.email.id],
  );
  return (
    <Dialog
      title={`Preview: ${props.email.kind.toLowerCase()}`}
      description="This is what a guest will see in the email, shown with a sample guest."
      size="lg"
      onClose={props.onClose}
      footer={<Button onClick={props.onClose}>Close</Button>}
    >
      {loading && <Skeleton rows={6} label="Loading the preview" />}
      {error && <EmptyState tone="error" compact title="We couldn't load the preview" text={error} actions={<Button onClick={reload}>Try again</Button>} />}
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
