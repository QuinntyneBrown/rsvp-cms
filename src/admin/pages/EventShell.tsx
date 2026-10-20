import { useEffect } from 'react';
import { get } from '../../shared/ui/api.js';
import { Button, Card, DescriptionList, EmptyState, PageHeader, Skeleton, Stack, Tabs, Toast } from '../../shared/ui/components/index.js';
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
  if (error || !data) return <EmptyState tone="error" title={error ?? 'Event not found'} actions={<Button onClick={reload}>Try again</Button>} />;
  const event = data.event;

  return (
    <Stack>
      <PageHeader title={event.name} subtitle={`${event.date} · ${event.status}`} />
      <Tabs
        variant="links"
        label="Event sections"
        tabs={TABS.map(([key, label]) => ({ href: `#/events/${eventId}/${key}`, label, current: tab === key }))}
      />
      {tab === 'overview' && (
        <Card>
          <DescriptionList
            items={[
              { term: 'Date', description: `${event.date} at ${event.startTime}` },
              { term: 'Venue', description: event.venue || 'Not set' },
              { term: 'Replies accepted', description: `${event.inviteOpen} to ${event.inviteClose}` },
            ]}
          />
        </Card>
      )}
      {tab === 'guests' && <GuestsTab eventId={eventId} showToast={show} />}
      {tab === 'page' && <PageTab eventId={eventId} />}
      {tab === 'emails' && <EmailsTab event={event} showToast={show} />}
      {tab === 'responses' && <ResponsesTab eventId={eventId} />}
      <Toast message={toast} />
    </Stack>
  );
}
