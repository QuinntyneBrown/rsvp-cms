import { useState, type FormEvent } from 'react';
import { EVENT_TYPES } from '../../domain/events.js';
import { ApiError, post } from '../../shared/ui/api.js';
import { Field } from '../../shared/ui/components.js';
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
    <form className="stack container--narrow" onSubmit={submit} noValidate aria-label="New event">
      <h1>New event</h1>
      {serverError && (
        <p role="alert" className="field__error">
          {serverError} <button className="btn" type="submit">Try again</button>
        </p>
      )}
      <Field label="Event type" id="ev-type" error={errors.type}>
        <select className="select" id="ev-type" value={form.type} onChange={set('type')}>
          {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Event name" id="ev-name" error={errors.name} counter={`${form.name.length}/120`}>
        <input className="input" id="ev-name" value={form.name} onChange={set('name')} />
      </Field>
      <Field label="Date" id="ev-date" error={errors.date}>
        <input className="input" id="ev-date" type="date" value={form.date} onChange={set('date')} />
      </Field>
      <Field label="Start time" id="ev-startTime" error={errors.startTime}>
        <input className="input" id="ev-startTime" type="time" value={form.startTime} onChange={set('startTime')} />
      </Field>
      <Field label="Venue" id="ev-venue" optional error={errors.venue}>
        <input className="input" id="ev-venue" value={form.venue} onChange={set('venue')} />
      </Field>
      <div className="form-actions">
        <button className="btn btn--primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Creating…' : 'Create event'}</button>
        <a className="btn btn--ghost" href="#/events">Cancel</a>
      </div>
    </form>
  );
}
