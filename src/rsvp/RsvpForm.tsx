import { useState, type FormEvent } from 'react';
import { LIMITS, MEALS } from '../domain/rsvp.js';
import { ApiError, post } from '../shared/ui/api.js';
import { Dialog, Field } from '../shared/ui/components.js';

export interface Reply {
  attending: boolean;
  partySize: number;
  meal: string | null;
  guestNames: string[];
  dietary: string;
  song: string;
  message: string;
}

type Choice = 'yes' | 'no' | '';

export function RsvpForm(props: { token: string; places: number; reply: Reply | null; onSaved: (r: Reply, msg: string) => void }) {
  const [editing, setEditing] = useState(!props.reply);
  const r = props.reply;
  const [choice, setChoice] = useState<Choice>(r ? (r.attending ? 'yes' : 'no') : '');
  const [partySize, setPartySize] = useState(r?.attending ? r.partySize : 1);
  const [meal, setMeal] = useState(r?.meal ?? '');
  const [names, setNames] = useState<string[]>(r?.guestNames ?? []);
  const [dietary, setDietary] = useState(r?.dietary ?? '');
  const [song, setSong] = useState(r?.song ?? '');
  const [message, setMessage] = useState(r?.message ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [regrets, setRegrets] = useState(false);

  if (props.reply && !editing) {
    return (
      <div className="card stack" aria-label="Your reply">
        <h2>Thank you for replying</h2>
        <ReplySummary reply={props.reply} />
        <div><button className="btn" type="button" onClick={() => setEditing(true)}>Change reply</button></div>
      </div>
    );
  }

  const body = () =>
    choice === 'yes'
      ? { attending: true, partySize, meal, guestNames: names.slice(0, partySize - 1), dietary, song }
      : { attending: false, message };

  async function send(msg: string) {
    if (busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const res = await post<{ reply: Reply }>(`/api/public/invite/${encodeURIComponent(props.token)}/rsvp`, body());
      setRegrets(false);
      props.onSaved(res.reply, msg);
      setEditing(false);
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {}); // answers stay in place so the guest can retry
      if (!apiErr.errors || !Object.keys(apiErr.errors).length) setFailure(apiErr.message);
      const first = Object.keys(apiErr.errors ?? {})[0];
      if (first) setTimeout(() => document.getElementById(`rsvp-${first.replace('.', '-')}`)?.focus(), 0);
      setRegrets(false);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!choice) {
      setErrors({ attending: "Choose whether you're coming" });
      document.getElementById('rsvp-attending')?.focus();
      return;
    }
    setErrors({});
    if (choice === 'no') setRegrets(true);
    else void send('Your reply is saved');
  }

  const extra = Math.max(partySize - 1, 0);

  return (
    <form className="card stack" onSubmit={submit} noValidate aria-label="RSVP">
      <h2>Will you join us?</h2>
      {failure && <p role="alert" className="field__error">{failure} <button className="btn" type="submit">Try again</button></p>}
      <fieldset className="stack">
        <legend>Your reply</legend>
        <label className="choice"><input id="rsvp-attending" type="radio" name="attending" checked={choice === 'yes'} onChange={() => setChoice('yes')} /><span className="choice__text">Joyfully accepting</span></label>
        <label className="choice"><input type="radio" name="attending" checked={choice === 'no'} onChange={() => setChoice('no')} /><span className="choice__text">Regretfully declining</span></label>
        {errors.attending && <p className="field__error" role="alert">{errors.attending}</p>}
      </fieldset>

      {choice === 'yes' && (
        <>
          {props.places > 1 && (
            <Field label="Party size" id="rsvp-partySize" error={errors.partySize}>
              <select className="select" id="rsvp-partySize" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}>
                {Array.from({ length: props.places }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n === 1 ? 'Just me' : n === 2 ? 'Me and one guest' : `Me and ${n - 1} guests`}</option>
                ))}
              </select>
            </Field>
          )}
          {Array.from({ length: extra }, (_, i) => (
            <Field key={i} label={`Guest's name${extra > 1 ? ` ${i + 1}` : ''}`} id={`rsvp-guestNames-${i}`} error={errors[`guestNames.${i}`]}>
              <input className="input" id={`rsvp-guestNames-${i}`} value={names[i] ?? ''} onChange={(e) => { const n = [...names]; n[i] = e.target.value; setNames(n); }} />
            </Field>
          ))}
          <Field label="Meal" id="rsvp-meal" error={errors.meal}>
            <select className="select" id="rsvp-meal" value={meal} onChange={(e) => setMeal(e.target.value)}>
              <option value="">Choose a meal</option>
              {MEALS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Dietary needs" id="rsvp-dietary" optional error={errors.dietary} counter={`${LIMITS.dietary - dietary.length} characters left`}>
            <textarea className="textarea" id="rsvp-dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} />
          </Field>
          <Field label="Song request" id="rsvp-song" optional error={errors.song} counter={`${LIMITS.song - song.length} characters left`}>
            <input className="input" id="rsvp-song" value={song} onChange={(e) => setSong(e.target.value)} />
          </Field>
        </>
      )}
      {choice === 'no' && (
        <Field label="Message" id="rsvp-message" optional error={errors.message} counter={`${LIMITS.message - message.length} characters left`}>
          <textarea className="textarea" id="rsvp-message" value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
      )}

      <div className="form-actions">
        <button className="btn btn--primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Sending…' : 'Send my RSVP'}</button>
        {props.reply && <button className="btn btn--ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>}
      </div>

      {regrets && (
        <Dialog title="Send your regrets?" onClose={() => setRegrets(false)}>
          <p>We'll let your hosts know you can't make it. Add a message if you like.</p>
          <Field label="Message" id="rsvp-regrets-message" optional counter={`${LIMITS.message - message.length} characters left`}>
            <textarea className="textarea" id="rsvp-regrets-message" value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <div className="form-actions">
            <button className="btn" type="button" onClick={() => setRegrets(false)}>Keep my reply</button>
            <button className="btn btn--primary" type="button" disabled={busy} aria-busy={busy} onClick={() => send('Your regrets are sent')}>{busy ? 'Sending…' : 'Send my regrets'}</button>
          </div>
        </Dialog>
      )}
    </form>
  );
}

export function ReplySummary({ reply }: { reply: Reply }) {
  return (
    <dl className="stack" aria-label="Your reply">
      <div><dt>Your reply</dt><dd>{reply.attending ? 'Joyfully accepting' : 'Regretfully declining'}</dd></div>
      {reply.attending && <div><dt>Party size</dt><dd>{reply.partySize}</dd></div>}
      {reply.attending && <div><dt>Meal</dt><dd>{reply.meal}</dd></div>}
      {reply.message && <div><dt>Message</dt><dd>{reply.message}</dd></div>}
    </dl>
  );
}
