import { useState, type FormEvent } from 'react';
import { ApiError, post, put } from '../../shared/ui/api.js';
import { Alert, Button, Card, CardHeader, Cluster, Dialog, FormActions, Stack, TextField } from '../../shared/ui/components/index.js';
import { Text } from '../../shared/ui/primitives/index.js';
import type { EventDetail } from './EventShell.js';

/** Event settings: the Emails section (L2-036) and the danger zone's link regeneration (L2-011) from the event-settings mock. */
export function SettingsTab({ event, onSaved, showToast }: { event: EventDetail; onSaved: () => void; showToast: (m: string) => void }) {
  return (
    <Stack>
      <h2>Settings</h2>
      <SenderCard event={event} onSaved={onSaved} showToast={showToast} />
      <DangerZone eventId={event.id} />
    </Stack>
  );
}

function SenderCard({ event, onSaved, showToast }: { event: EventDetail; onSaved: () => void; showToast: (m: string) => void }) {
  const [form, setForm] = useState({ senderName: event.senderName, replyTo: event.replyTo });
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
      const res = await put<{ event: EventDetail }>(`/api/events/${event.id}/sender`, form);
      setForm({ senderName: res.event.senderName, replyTo: res.event.replyTo }); // the saved values, line breaks removed
      setErrors({});
      showToast('Changes saved');
      onSaved();
    } catch (err) {
      const apiErr = err as ApiError;
      const fieldErrors = apiErr.errors ?? {};
      setErrors(fieldErrors); // the stored setting is unchanged (L2-036 AC2)
      if (!Object.keys(fieldErrors).length) setFailure(apiErr.message);
      const first = Object.keys(fieldErrors)[0];
      if (first) document.getElementById(`set-${first}`)?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <CardHeader title="Emails" subtitle="Who invitations and reminders come from." />
      <Stack as="form" onSubmit={submit} noValidate aria-label="Emails">
        {failure && (
          <Alert tone="danger" live title="Couldn't save your changes" actions={<Button type="submit">Try again</Button>}>
            {failure} Your edits are still here.
          </Alert>
        )}
        <TextField label="Sender name" id="set-senderName" optional hint="Defaults to your name." error={errors.senderName} value={form.senderName} onChange={set('senderName')} readOnly={busy} />
        <TextField label="Reply-to address" id="set-replyTo" type="email" optional hint="Guests' replies to an email come to this address." error={errors.replyTo} value={form.replyTo} onChange={set('replyTo')} readOnly={busy} />
        <FormActions>
          <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
        </FormActions>
      </Stack>
    </Card>
  );
}

function DangerZone({ eventId }: { eventId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<string>();
  return (
    <Card as="section">
      <CardHeader title="Danger zone" />
      <Stack>
        {done && <Alert tone="success" live title="Invitation links reset">{done}</Alert>}
        <Cluster justify="between">
          <div>
            <Text variant="label">Regenerate invitation links</Text>
            <Text variant="body-sm" tone="muted">Every link and code stops working until the next email.</Text>
          </div>
          <Button variant="danger" onClick={() => { setDone(undefined); setConfirming(true); }}>Regenerate</Button>
        </Cluster>
      </Stack>
      {confirming && <RegenerateDialog eventId={eventId} onClose={() => setConfirming(false)} onDone={(message) => { setConfirming(false); setDone(message); }} />}
    </Card>
  );
}

/** Reset invitation links? (regenerate-links mock). The result names no link values (L2-011 AC3). */
function RegenerateDialog({ eventId, onClose, onDone }: { eventId: number; onClose: () => void; onDone: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function regenerate() {
    if (busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const res = await post<{ message: string }>(`/api/events/${eventId}/invitation-links/regenerate`);
      onDone(res.message);
    } catch (err) {
      setFailure((err as ApiError).message); // the old links keep working (L2-011 AC4)
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Reset invitation links?"
      description="Use this only if a link has leaked."
      tone="danger"
      busy={busy}
      initialFocus="footer"
      onClose={onClose}
      footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="danger" onClick={regenerate} disabled={busy} loading={busy}>{busy ? 'Resetting links…' : 'Reset links'}</Button></>}
    >
      {failure && (
        <Alert tone="danger" live title="Links weren't reset" actions={<Button size="sm" onClick={regenerate}>Try again</Button>}>
          {failure} Nothing changed: the current links still work.
        </Alert>
      )}
      <p>Every invitation link and code stops working. New links are sent with the next email. People who already replied keep their answers.</p>
    </Dialog>
  );
}
