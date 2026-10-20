import { useEffect } from 'react';
import { get } from '../../shared/ui/api.js';
import { Badge, Breadcrumb, Button, Card, DescriptionList, EmptyState, PageHeader, Skeleton, Stack, Tabs, Toast } from '../../shared/ui/components/index.js';
import { formatDate, formatTime } from '../../shared/ui/format.js';
import { useLoad, useToast } from '../../shared/ui/hooks.js';
import { EmailsTab } from './Emails.js';
import { GuestsTab } from './Guests.js';
import { PageTab } from './PageComposer.js';
import { ResponsesTab } from './Responses.js';
import { SettingsTab } from './Settings.js';

export interface EventDetail {
  id: number;
  name: string;
  date: string;
  startTime: string;
  venue: string;
  status: string;
  inviteOpen: string;
  inviteClose: string;
  senderName: string;
  replyTo: string;
}

const TABS = [
  ['overview', 'Overview'],
  ['page', 'Page'],
  ['guests', 'Guests'],
  ['emails', 'Emails'],
  ['responses', 'Responses'],
  ['settings', 'Settings'],
] as const;

/** 'Sat 14 Nov 2026 · 7:00 pm · The Lantern Room', the event line under every event page title. */
export const eventLine = (e: EventDetail) => [`${formatDate(e.date)} · ${formatTime(e.startTime)}`, e.venue].filter(Boolean).join(' · ');

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

  if (loading) return <Skeleton rows={4} label="Loading event" />;
  if (error || !data) {
    return (
      <EmptyState
        tone="error"
        title={error === 'Event not found' || !error ? 'Event not found' : "We couldn't load this event"}
        text={error && error !== 'Event not found' ? `${error} Nothing was changed.` : 'It may have been deleted.'}
        actions={<>{error !== 'Event not found' && <Button onClick={reload}>Try again</Button>}<Button variant="ghost" href="#/events">Back to events</Button></>}
      />
    );
  }
  const event = data.event;

  return (
    <Stack>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Events', href: '#/events' }, { label: event.name, current: true }]} />}
        title={event.name}
        subtitle={eventLine(event)}
        actions={<Badge tone={event.status === 'Draft' ? 'neutral' : 'success'}>{event.status}</Badge>}
      />
      <Tabs
        variant="links"
        label="Event sections"
        tabs={TABS.map(([key, label]) => ({ href: `#/events/${eventId}/${key}`, label, current: tab === key }))}
      />
      {tab === 'overview' && (
        <Card>
          <Stack>
            <h2>Event details</h2>
            <DescriptionList
              items={[
                { term: 'When', description: `${formatDate(event.date)} · ${formatTime(event.startTime)}` },
                { term: 'Venue', description: event.venue || 'Not set' },
                { term: 'Invites open', description: `${formatDate(event.inviteOpen)}, 9:00 am` },
                { term: 'Invites close', description: `${formatDate(event.inviteClose)}, 11:59 pm` },
                { term: 'Status', description: event.status },
              ]}
            />
          </Stack>
        </Card>
      )}
      {tab === 'guests' && <GuestsTab eventId={eventId} showToast={show} />}
      {tab === 'page' && <PageTab eventId={eventId} />}
      {tab === 'emails' && <EmailsTab event={event} showToast={show} />}
      {tab === 'responses' && <ResponsesTab eventId={eventId} />}
      {tab === 'settings' && <SettingsTab event={event} onSaved={reload} showToast={show} />}
      <Toast message={toast} />
    </Stack>
  );
}
