import { useState, type FormEvent } from 'react';
import { ApiError, put } from '../../shared/ui/api.js';
import { Alert, Button, Card, CardHeader, FormActions, Stack, TextField } from '../../shared/ui/components/index.js';
import type { EventDetail } from './EventShell.js';

/** Event settings: the Emails section of the event-settings mock (L2-036). */
export function SettingsTab({ event, onSaved, showToast }: { event: EventDetail; onSaved: () => void; showToast: (m: string) => void }) {
  return (
    <Stack>
      <h2>Settings</h2>
      <SenderCard event={event} onSaved={onSaved} showToast={showToast} />
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
