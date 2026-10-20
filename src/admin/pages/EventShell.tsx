import { useEffect } from 'react';
import { get } from '../../shared/ui/api.js';
import { ErrorState, Skeleton, Toast } from '../../shared/ui/components.js';
import { useLoad, useToast } from '../../shared/ui/hooks.js';
import { EmailsTab } from './Emails.js';
import { GuestsTab } from './Guests.js';
import { PageTab } from './PageComposer.js';
import { ResponsesTab } from './Responses.js';

export interface EventDetail {
  id: number;
  name: string;
  date: string;
  startTime: string;
  venue: string;
  status: string;
  inviteOpen: string;
  inviteClose: string;
}

const TABS = [
  ['overview', 'Overview'],
  ['guests', 'Guests'],
  ['page', 'Page'],
  ['emails', 'Emails'],
  ['responses', 'Responses'],
] as const;

export function EventShell({ eventId, tab }: { eventId: number; tab: string }) {
  const { data, error, loading, reload } = useLoad(() => get<{ event: EventDetail }>(`/api/events/${eventId}`), [eventId]);
  const { toast, show } = useToast();

  useEffect(() => {
    const flash = sessionStorage.getItem('flash');
    if (flash) {
      sessionStorage.removeItem('flash');
      show(flash);
    }
  }, [show]);

  if (loading) return <Skeleton />;
  if (error || !data) return <ErrorState message={error ?? 'Event not found'} onRetry={reload} />;
  const event = data.event;

  return (
    <div className="stack">
      <h1>{event.name}</h1>
      <p className="text-muted">{event.date} · {event.status}</p>
      <nav className="tabs" aria-label="Event sections">
        {TABS.map(([key, label]) => (
          <a key={key} href={`#/events/${eventId}/${key}`} aria-current={tab === key ? 'page' : undefined}>{label}</a>
        ))}
      </nav>
      {tab === 'overview' && (
        <dl className="card stack">
          <div><dt>Date</dt><dd>{event.date} at {event.startTime}</dd></div>
          <div><dt>Venue</dt><dd>{event.venue || 'Not set'}</dd></div>
          <div><dt>Replies accepted</dt><dd>{event.inviteOpen} to {event.inviteClose}</dd></div>
        </dl>
      )}
      {tab === 'guests' && <GuestsTab eventId={eventId} showToast={show} />}
      {tab === 'page' && <PageTab eventId={eventId} />}
      {tab === 'emails' && <EmailsTab event={event} showToast={show} />}
      {tab === 'responses' && <ResponsesTab eventId={eventId} />}
      <Toast message={toast} />
    </div>
  );
}
