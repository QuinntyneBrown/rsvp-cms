import { useState, type ReactNode } from 'react';
import type { Block } from '../domain/blocks.js';
import { ApiError, get } from '../shared/ui/api.js';
import { BlockView } from '../shared/ui/blocks.js';
import { Button, Card, EmptyState, Link, Skeleton, Stack, Toast, ToastRegion } from '../shared/ui/components/index.js';
import { formatDay } from '../shared/ui/format.js';
import { useLoad, useToast } from '../shared/ui/hooks.js';
import { Text } from '../shared/ui/primitives/index.js';
import { GuestLayout } from './GuestLayout.js';
import { ReplySummary, RsvpForm, type InviteEvent, type Reply } from './RsvpForm.js';

interface Invite {
  state: 'open' | 'not-open' | 'closed';
  guest: { name: string; places: number };
  event: InviteEvent;
  reply: Reply | null;
  blocks?: Block[];
}

interface Invalid {
  state: 'invalid';
  /** The organiser, named only for a link replaced by regeneration. */
  host: string;
}

const INVALID = "This invitation link doesn't work";

/** A guest's personal invitation page at /i/<token> (L2-038, L2-039). */
export function InvitePage({ token }: { token: string }) {
  // An invalid link is a state of the page, not an error: it may name the organiser to ask (L2-038 AC2).
  const { data, error, loading, reload } = useLoad(
    () =>
      get<Invite>(`/api/public/invite/${encodeURIComponent(token)}`).catch((e: ApiError): Invalid => {
        if (e.status === 404) return { state: 'invalid', host: typeof e.body.host === 'string' ? e.body.host : '' };
        throw e;
      }),
    [token],
  );
  const [reply, setReply] = useState<Reply | null | undefined>(undefined);
  const { toast, show } = useToast();

  if (loading) {
    return <GuestLayout><Skeleton rows={6} label="Loading your invitation" /></GuestLayout>;
  }
  if (data?.state === 'invalid') {
    return (
      <GuestLayout host={data.host || undefined}>
        <Card>
          <EmptyState
            headingLevel={1}
            title={INVALID}
            text={`Check the link in your invitation email, or ask ${data.host || 'your host'} for a new one.`}
            actions={<Link href="/" variant="standalone">Enter an invitation code</Link>}
          />
        </Card>
      </GuestLayout>
    );
  }
  if (error || !data) {
    return (
      <GuestLayout>
        <Card>
          <EmptyState
            tone="error"
            headingLevel={1}
            title="We couldn't find your invitation right now"
            text="Your reply is safe. Try again in a moment."
            actions={<Button onClick={reload}>Try again</Button>}
          />
        </Card>
      </GuestLayout>
    );
  }

  const { event, guest } = data;
  const current = reply === undefined ? data.reply : reply;
  const layout = (children: ReactNode) => (
    <GuestLayout title={event.name} href={`/i/${encodeURIComponent(token)}`} host={event.host}>
      {children}
      <ToastRegion>{toast && <Toast tone="success" title={toast} />}</ToastRegion>
    </GuestLayout>
  );

  // Draft or not yet open: nothing of the page is shown (L2-039 AC2, AC4).
  if (data.state === 'not-open') {
    return layout(
      <Card>
        <Stack>
          <h1>{event.name} is coming together</h1>
          <p>Codes are accepted from {formatDay(event.inviteOpen)}.</p>
          <Text tone="muted">Your invitation email arrives that morning. Come back then to reply.</Text>
        </Stack>
      </Card>,
    );
  }

  const rsvpSlot =
    data.state === 'closed' ? (
      <Card>
        <Stack>
          <h2>Replies closed on {formatDay(event.inviteClose)}</h2>
          {current ? <ReplySummary reply={current} /> : <p>We didn't receive a reply from you.</p>}
          {event.host && <Text tone="muted">Contact {event.host} if you need to change your answer.</Text>}
        </Stack>
      </Card>
    ) : (
      <RsvpForm token={token} guest={guest} event={event} reply={current} onSaved={(r, msg) => { setReply(r); show(msg); }} />
    );

  const blocks = data.blocks ?? [];
  return layout(
    <Stack>
      {blocks.map((b) => <BlockView key={b.id} block={b} rsvpSlot={rsvpSlot} />)}
      {!blocks.some((b) => b.type === 'rsvp') && rsvpSlot}
    </Stack>,
  );
}
