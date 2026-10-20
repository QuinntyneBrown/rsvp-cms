import { useState, type FormEvent } from 'react';
import { LIMITS, MEALS } from '../domain/rsvp.js';
import { ApiError, post } from '../shared/ui/api.js';
import {
  Alert, Button, Card, DescriptionList, Dialog, ErrorSummary, FormActions, RadioGroup, Select, Stack, TextField, Textarea,
} from '../shared/ui/components/index.js';
import { firstName, formatClose, formatDate, formatDay, formatInstant, formatTime } from '../shared/ui/format.js';
import { Text } from '../shared/ui/primitives/index.js';

export interface Reply {
  attending: boolean;
  partySize: number;
  meal: string | null;
  guestNames: string[];
  dietary: string;
  song: string;
  message: string;
  updatedAt?: string;
}

export interface InviteEvent {
  name: string;
  type: string;
  date: string;
  startTime: string;
  venue: string;
  inviteOpen: string;
  inviteClose: string;
  host: string;
}

type Choice = 'yes' | 'no' | '';

/** The id of the control that shows the error for a server field key such as 'meal' or 'guestNames.0'. */
const fieldId = (key: string) => (key === 'attending' ? 'rsvp-attending' : `rsvp-${key.replace('.', '-')}`);

const charsLeft = (limit: number, value: string) => `${limit - value.length} characters left`;

/** The RSVP form, its success and already-responded states and the regrets dialog (L2-040 to L2-044). */
export function RsvpForm(props: {
  token: string;
  guest: { name: string; places: number };
  event: InviteEvent;
  reply: Reply | null;
  onSaved: (r: Reply, msg: string) => void;
}) {
  const { event, guest } = props;
  const [editing, setEditing] = useState(!props.reply);
  const [justSaved, setJustSaved] = useState(false);
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
  const [regretsFailure, setRegretsFailure] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [regrets, setRegrets] = useState(false);
  const first = firstName(guest.name);

  if (props.reply && !editing) {
    const reply = props.reply;
    const heading = justSaved
      ? reply.attending ? `Thanks, ${first}! See you on ${formatDay(event.date)}.` : `Thanks for letting us know, ${first}.`
      : `Thanks, ${first}. We have your reply.`;
    return (
      <Card as="section" aria-label="Your reply">
        <Stack>
          <h2>{heading}</h2>
          <div>
            <h3>{justSaved ? 'Your reply is saved' : 'Your reply'}</h3>
            {reply.updatedAt && <Text variant="caption" tone="muted">Sent {formatInstant(reply.updatedAt)}</Text>}
          </div>
          <ReplySummary reply={reply} />
          <Text variant="caption" tone="muted">You can change your answer until {formatClose(event.inviteClose)}.</Text>
          <FormActions align="start">
            <Button onClick={() => { setJustSaved(false); setEditing(true); }}>Change reply</Button>
            {reply.attending && (
              <Button variant="ghost" onClick={() => { setChoice('no'); setRegretsFailure(undefined); setRegrets(true); }}>Can't make it after all</Button>
            )}
          </FormActions>
        </Stack>
        {regrets && regretsDialog()}
      </Card>
    );
  }

  function body() {
    return choice === 'yes'
      ? { attending: true, partySize, meal, guestNames: names.slice(0, partySize - 1), dietary, song }
      : { attending: false, message };
  }

  async function send(msg: string) {
    if (busy) return;
    const declining = choice === 'no';
    setBusy(true);
    setFailure(undefined);
    setRegretsFailure(undefined);
    try {
      const res = await post<{ reply: Reply }>(`/api/public/invite/${encodeURIComponent(props.token)}/rsvp`, body());
      setRegrets(false);
      setErrors({});
      props.onSaved(res.reply, msg);
      setJustSaved(true);
      setEditing(false);
    } catch (err) {
      const apiErr = err as ApiError;
      const fieldErrors = apiErr.errors ?? {};
      if (declining && !Object.keys(fieldErrors).length) {
        setRegretsFailure(apiErr.message); // the dialog stays open and keeps the message (L2-044 AC4)
        return;
      }
      setRegrets(false);
      setErrors(fieldErrors); // answers stay in place so the guest can retry (L2-042 AC3)
      if (!Object.keys(fieldErrors).length) setFailure(apiErr.message);
      const ids = Object.keys(fieldErrors).map((k) => `#${CSS.escape(fieldId(k))}`);
      // querySelector returns the match that comes first in the page: the first invalid field (L2-041 AC2).
      if (ids.length) setTimeout(() => document.querySelector<HTMLElement>(ids.join(','))?.focus(), 0);
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
    if (choice === 'no') {
      setRegretsFailure(undefined);
      setRegrets(true);
    } else void send('Your reply is saved');
  }

  function cantMakeIt() {
    setChoice('no');
    setErrors({});
    setRegretsFailure(undefined);
    setRegrets(true);
  }

  function regretsDialog() {
    return (
      <Dialog
        title="Sorry you can't make it?"
        description={`We'll tell ${event.host || 'your host'}. You can change your mind until ${formatDay(event.inviteClose)}.`}
        busy={busy}
        onClose={() => setRegrets(false)}
        footer={
          <>
            <Button onClick={() => setRegrets(false)} disabled={busy}>Keep my reply</Button>
            <Button variant="primary" disabled={busy} loading={busy} onClick={() => send('Your regrets are sent')}>{busy ? 'Sending regrets…' : 'Send my regrets'}</Button>
          </>
        }
      >
        <Stack>
          {regretsFailure && (
            <Alert tone="danger" live title="Your reply wasn't sent" actions={<Button size="sm" onClick={() => send('Your regrets are sent')}>Try again</Button>}>
              {props.reply ? `Your answer is still “${props.reply.attending ? 'attending' : 'declined'}”.` : 'Nothing was sent.'} {regretsFailure}
            </Alert>
          )}
          <Textarea label="Message" id="rsvp-regrets-message" optional counter={charsLeft(LIMITS.message, message)} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Stack>
      </Dialog>
    );
  }

  const extra = Math.max(partySize - 1, 0);
  const summary = Object.entries(errors).map(([key, msg]) => ({ fieldId: fieldId(key), message: msg }));
  const when = `${formatDate(event.date)}, ${formatTime(event.startTime)}`;

  return (
    <Card>
      <Stack as="form" onSubmit={submit} noValidate aria-label="RSVP">
        <div>
          <h2>Hi {first}, will you join us?</h2>
          <Text tone="muted">{[event.name, when, event.venue].filter(Boolean).join(' · ')}</Text>
        </div>
        {summary.length > 1 && <ErrorSummary errors={summary} autoFocus={false} />}
        {failure && <Alert tone="danger" live actions={<Button type="submit">Try again</Button>}>{failure}</Alert>}
        <RadioGroup
          legend="Will you attend?"
          name="attending"
          id="rsvp-reply"
          options={[
            { value: 'yes', label: 'Joyfully accepting', id: 'rsvp-attending' },
            { value: 'no', label: 'Regretfully declining' },
          ]}
          value={choice}
          onChange={(v) => setChoice(v as Choice)}
          error={errors.attending}
        />

        {choice === 'yes' && (
          <>
            {guest.places > 1 && (
              <Select label="Party size" id="rsvp-partySize" hint={`Your invitation allows up to ${guest.places} places.`} error={errors.partySize} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}>
                {Array.from({ length: guest.places }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n === 1 ? 'Just me' : n === 2 ? 'Me and one guest' : `Me and ${n - 1} guests`}</option>
                ))}
              </Select>
            )}
            {Array.from({ length: extra }, (_, i) => (
              <TextField key={i} label={`Guest's name${extra > 1 ? ` ${i + 1}` : ''}`} id={`rsvp-guestNames-${i}`} error={errors[`guestNames.${i}`]} value={names[i] ?? ''} onChange={(e) => { const n = [...names]; n[i] = e.target.value; setNames(n); }} />
            ))}
            <Select label="Meal" id="rsvp-meal" error={errors.meal} value={meal} onChange={(e) => setMeal(e.target.value)}>
              <option value="">Choose a meal</option>
              {MEALS.map((m) => <option key={m}>{m}</option>)}
            </Select>
            <Textarea label="Dietary needs" id="rsvp-dietary" optional hint="Allergies and anything the kitchen must know." error={errors.dietary} counter={charsLeft(LIMITS.dietary, dietary)} value={dietary} onChange={(e) => setDietary(e.target.value)} />
            <TextField label="Song request" id="rsvp-song" optional error={errors.song} counter={charsLeft(LIMITS.song, song)} value={song} onChange={(e) => setSong(e.target.value)} />
          </>
        )}
        {choice === 'no' && (
          <Textarea label="Message" id="rsvp-message" optional error={errors.message} counter={charsLeft(LIMITS.message, message)} value={message} onChange={(e) => setMessage(e.target.value)} />
        )}

        <Text variant="caption" tone="muted">You can change your answer until {formatClose(event.inviteClose)}.</Text>
        <FormActions align="between">
          {props.reply ? (
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          ) : (
            <Button variant="ghost" onClick={cantMakeIt}>Can't make it?</Button>
          )}
          <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Sending your RSVP…' : 'Send my RSVP'}</Button>
        </FormActions>

        {regrets && regretsDialog()}
      </Stack>
    </Card>
  );
}

/** The saved answer, in the terms of the RSVP success mock. */
export function ReplySummary({ reply }: { reply: Reply }) {
  const others = reply.guestNames.filter(Boolean);
  const guests = others.length ? `You + ${others.join(', ')}` : reply.partySize > 1 ? `You + ${reply.partySize - 1}` : 'Just you';
  return (
    <DescriptionList
      items={[
        { term: 'Attending', description: reply.attending ? 'Joyfully accepting' : 'Regretfully declining' },
        ...(reply.attending ? [{ term: 'Guests', description: guests }, { term: 'Meal', description: reply.meal }] : []),
        ...(reply.message ? [{ term: 'Message', description: reply.message }] : []),
      ]}
    />
  );
}
