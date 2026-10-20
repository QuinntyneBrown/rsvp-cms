import { useState } from 'react';
import type { Block } from '../domain/blocks.js';
import { get } from '../shared/ui/api.js';
import { BlockView } from '../shared/ui/blocks.js';
import { ErrorState, Skeleton, Toast } from '../shared/ui/components.js';
import { useLoad, useToast } from '../shared/ui/hooks.js';
import { ReplySummary, RsvpForm, type Reply } from './RsvpForm.js';

interface Invite {
  state: 'open' | 'not-open' | 'closed';
  guest: { name: string; places: number };
  event: { name: string; date: string; inviteOpen: string; inviteClose: string };
  reply: Reply | null;
  blocks?: Block[];
}

export function InvitePage({ token }: { token: string }) {
  const { data, error, loading, reload } = useLoad(() => get<Invite>(`/api/public/invite/${encodeURIComponent(token)}`), [token]);
  const [reply, setReply] = useState<Reply | null | undefined>(undefined);
  const { toast, show } = useToast();

  if (loading) return <Skeleton rows={6} />;
  if (error && !data) {
    return error.includes("doesn't work") ? (
      <div className="card stack" role="alert">
        <h1>This invitation link doesn't work</h1>
        <p>Check the link in your invitation email, or ask your host for a new one.</p>
        <a href="/">Enter your invitation code</a>
      </div>
    ) : (
      <ErrorState message={error} onRetry={reload} />
    );
  }
  if (!data) return null;

  const current = reply === undefined ? data.reply : reply;

  if (data.state === 'not-open') {
    return (
      <div className="card stack">
        <h1>{data.event.name}</h1>
        <p>Codes are accepted from {data.event.inviteOpen}.</p>
      </div>
    );
  }

  const rsvpSlot =
    data.state === 'closed' ? (
      <div className="card stack">
        <h2>Replies closed on {data.event.inviteClose}</h2>
        {current ? <ReplySummary reply={current} /> : <p>We didn't receive a reply from you.</p>}
      </div>
    ) : (
      <RsvpForm token={token} places={data.guest.places} reply={current} onSaved={(r, msg) => { setReply(r); show(msg); }} />
    );

  const blocks = data.blocks ?? [];
  return (
    <div className="stack">
      <p>Hello, {data.guest.name}</p>
      {blocks.map((b) => <BlockView key={b.id} block={b} rsvpSlot={rsvpSlot} />)}
      {!blocks.some((b) => b.type === 'rsvp') && rsvpSlot}
      <Toast message={toast} />
    </div>
  );
}
