import { useState, type FormEvent } from 'react';
import { LIMITS, MEALS } from '../domain/rsvp.js';
import { ApiError, post } from '../shared/ui/api.js';
import { Alert, Button, Card, DescriptionList, Dialog, FormActions, RadioGroup, Select, Stack, TextField, Textarea } from '../shared/ui/components/index.js';

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
      <Card as="section" aria-label="Your reply">
        <Stack>
          <h2>Thank you for replying</h2>
          <ReplySummary reply={props.reply} />
          <div><Button onClick={() => setEditing(true)}>Change reply</Button></div>
        </Stack>
      </Card>
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
    <Card>
      <Stack as="form" onSubmit={submit} noValidate aria-label="RSVP">
        <h2>Will you join us?</h2>
        {failure && <Alert tone="danger" live actions={<Button type="submit">Try again</Button>}>{failure}</Alert>}
        <RadioGroup
          legend="Your reply"
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
            {props.places > 1 && (
              <Select label="Party size" id="rsvp-partySize" error={errors.partySize} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}>
                {Array.from({ length: props.places }, (_, i) => i + 1).map((n) => (
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
            <Textarea label="Dietary needs" id="rsvp-dietary" optional error={errors.dietary} counter={`${LIMITS.dietary - dietary.length} characters left`} value={dietary} onChange={(e) => setDietary(e.target.value)} />
            <TextField label="Song request" id="rsvp-song" optional error={errors.song} counter={`${LIMITS.song - song.length} characters left`} value={song} onChange={(e) => setSong(e.target.value)} />
          </>
        )}
        {choice === 'no' && (
          <Textarea label="Message" id="rsvp-message" optional error={errors.message} counter={`${LIMITS.message - message.length} characters left`} value={message} onChange={(e) => setMessage(e.target.value)} />
        )}

        <FormActions>
          <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Sending…' : 'Send my RSVP'}</Button>
          {props.reply && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
        </FormActions>

        {regrets && (
          <Dialog
            title="Send your regrets?"
            busy={busy}
            onClose={() => setRegrets(false)}
            footer={
              <>
                <Button onClick={() => setRegrets(false)}>Keep my reply</Button>
                <Button variant="primary" disabled={busy} loading={busy} onClick={() => send('Your regrets are sent')}>{busy ? 'Sending…' : 'Send my regrets'}</Button>
              </>
            }
          >
            <p>We'll let your hosts know you can't make it. Add a message if you like.</p>
            <Textarea label="Message" id="rsvp-regrets-message" optional counter={`${LIMITS.message - message.length} characters left`} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Dialog>
        )}
      </Stack>
    </Card>
  );
}

export function ReplySummary({ reply }: { reply: Reply }) {
  return (
    <DescriptionList
      items={[
        { term: 'Your reply', description: reply.attending ? 'Joyfully accepting' : 'Regretfully declining' },
        ...(reply.attending ? [{ term: 'Party size', description: reply.partySize }, { term: 'Meal', description: reply.meal }] : []),
        ...(reply.message ? [{ term: 'Message', description: reply.message }] : []),
      ]}
    />
  );
}
