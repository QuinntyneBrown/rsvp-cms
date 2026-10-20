import { useState, type FormEvent } from 'react';
import { EVENT_TYPE_HINTS, EVENT_TYPES } from '../../domain/events.js';
import { ApiError, post } from '../../shared/ui/api.js';
import { Alert, Breadcrumb, Button, Card, ErrorSummary, FormActions, PageHeader, RadioGroup, Stack, TextField } from '../../shared/ui/components/index.js';
import { go } from '../router.js';

const EMPTY = { type: 'Birthday', name: '', date: '', startTime: '', venue: '' };
type Field = keyof typeof EMPTY;

/** New event (L2-006), laid out as the event-new mock. */
export function NewEventPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: Field) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

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
      const fieldErrors = apiErr.errors ?? {};
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setServerError(apiErr.message); // values stay in the form (L2-006 AC5)
      setBusy(false);
      const first = Object.keys(fieldErrors)[0];
      if (first) document.querySelector<HTMLElement>(first === 'type' ? '#ev-type input' : `#ev-${first}`)?.focus();
    }
  }

  const summary = Object.entries(errors).map(([key, message]) => ({ fieldId: `ev-${key}`, message }));

  return (
    <Stack>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Events', href: '#/events' }, { label: 'New event', current: true }]} />}
        title="New event"
        subtitle="Start with the occasion. You can change everything later."
      />
      <Card>
        <Stack as="form" onSubmit={submit} noValidate aria-label="New event">
          {summary.length > 1 && <ErrorSummary errors={summary} autoFocus={false} />}
          {serverError && <Alert tone="danger" live title="We couldn't create the event" actions={<Button type="submit">Try again</Button>}>{serverError}</Alert>}
          <RadioGroup
            legend="Event type"
            name="ev-type"
            id="ev-type"
            options={EVENT_TYPES.map((t) => ({ value: t, label: t, description: EVENT_TYPE_HINTS[t] }))}
            value={form.type}
            onChange={(type) => setForm({ ...form, type })}
            error={errors.type}
          />
          <TextField label="Event name" id="ev-name" hint="Shown on the public page and in every email." error={errors.name} counter={`${form.name.length}/120`} value={form.name} onChange={set('name')} />
          <TextField label="Date" id="ev-date" type="date" error={errors.date} value={form.date} onChange={set('date')} />
          <TextField label="Start time" id="ev-startTime" type="time" error={errors.startTime} value={form.startTime} onChange={set('startTime')} />
          <TextField label="Venue" id="ev-venue" optional error={errors.venue} value={form.venue} onChange={set('venue')} />
          <FormActions>
            <Button variant="ghost" href="#/events">Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Creating event…' : 'Create event'}</Button>
          </FormActions>
        </Stack>
      </Card>
    </Stack>
  );
}
