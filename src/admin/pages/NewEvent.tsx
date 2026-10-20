import { useState, type FormEvent } from 'react';
import { EVENT_TYPES } from '../../domain/events.js';
import { ApiError, post } from '../../shared/ui/api.js';
import { Alert, Button, Container, FormActions, Select, Stack, TextField } from '../../shared/ui/components/index.js';
import { go } from '../router.js';

const EMPTY = { type: 'Birthday', name: '', date: '', startTime: '', venue: '' };

export function NewEventPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setServerError(undefined);
    try {
      const res = await post<{ event: { id: number } }>('/api/events', form);
      sessionStorage.setItem('flash', 'Event created'); // shown on the overview (L2-006 AC1)
      go(`events/${res.event.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      if (!apiErr.errors || Object.keys(apiErr.errors).length === 0) setServerError(apiErr.message); // values stay in the form (L2-006 AC5)
      setBusy(false);
      const first = Object.keys(apiErr.errors ?? {})[0];
      if (first) document.getElementById(`ev-${first}`)?.focus();
    }
  }

  return (
    <Container narrow>
      <Stack as="form" onSubmit={submit} noValidate aria-label="New event">
        <h1>New event</h1>
        {serverError && <Alert tone="danger" live actions={<Button type="submit">Try again</Button>}>{serverError}</Alert>}
        <Select label="Event type" id="ev-type" error={errors.type} value={form.type} onChange={set('type')}>
          {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <TextField label="Event name" id="ev-name" error={errors.name} counter={`${form.name.length}/120`} value={form.name} onChange={set('name')} />
        <TextField label="Date" id="ev-date" type="date" error={errors.date} value={form.date} onChange={set('date')} />
        <TextField label="Start time" id="ev-startTime" type="time" error={errors.startTime} value={form.startTime} onChange={set('startTime')} />
        <TextField label="Venue" id="ev-venue" optional error={errors.venue} value={form.venue} onChange={set('venue')} />
        <FormActions>
          <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Creating…' : 'Create event'}</Button>
          <Button variant="ghost" href="#/events">Cancel</Button>
        </FormActions>
      </Stack>
    </Container>
  );
}
