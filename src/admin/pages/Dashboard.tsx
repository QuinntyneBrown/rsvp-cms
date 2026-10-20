import { get } from '../../shared/ui/api.js';
import { Badge, Button, Card, CardHeader, EmptyState, Grid, List, ListItem, PageHeader, Skeleton, Stack, Stat } from '../../shared/ui/components/index.js';
import { firstName, formatDate, formatDay } from '../../shared/ui/format.js';
import { useLoad } from '../../shared/ui/hooks.js';

interface Summary {
  invitees: number;
  attending: number;
  waiting: number;
  emailsScheduled: number;
}

interface UpcomingEvent {
  id: number;
  name: string;
  date: string;
  invitees: number;
  attending: number;
  status: string;
}

const greeting = (hour: number) => (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

/** The dashboard the organiser lands on after signing in (L2-001 AC1): summary tiles and upcoming events (L2-051, L2-052). */
export function DashboardPage({ name }: { name: string }) {
  // Two requests, so each section loads and fails on its own.
  const summary = useLoad(() => get<Summary>('/api/dashboard/summary'), []);
  const upcoming = useLoad(() => get<{ events: UpcomingEvent[] }>('/api/dashboard/upcoming-events'), []);
  const now = new Date();
  const count = upcoming.data?.events.length;

  return (
    <Stack>
      <PageHeader
        title={`${greeting(now.getHours())}, ${firstName(name)}`}
        subtitle={[formatDay(now.toISOString().slice(0, 10)), count === undefined ? '' : `${count} upcoming ${count === 1 ? 'event' : 'events'}`].filter(Boolean).join(' · ')}
        actions={<Button variant="primary" href="#/events/new">New event</Button>}
      />

      <section aria-label="Summary">
        {summary.loading && <Skeleton rows={2} variant="rect" label="Loading the summary" />}
        {summary.error && (
          <EmptyState tone="error" compact title="We couldn't load the summary" text={summary.error} actions={<Button onClick={summary.reload}>Try again</Button>} />
        )}
        {summary.data && !summary.error && (
          <Grid auto compact>
            <Stat card label="Invitees across events" value={summary.data.invitees} />
            <Stat card label="Attending so far" value={summary.data.attending} />
            <Stat card label="Waiting for a reply" value={summary.data.waiting} />
            <Stat card label="Emails scheduled" value={summary.data.emailsScheduled} />
          </Grid>
        )}
      </section>

      <Card as="section" variant="flush">
        <CardHeader title="Upcoming events" />
        {upcoming.loading && <Skeleton rows={3} label="Loading upcoming events" />}
        {upcoming.error && (
          <EmptyState tone="error" compact title="We couldn't load your events" text={upcoming.error} actions={<Button onClick={upcoming.reload}>Try again</Button>} />
        )}
        {upcoming.data && upcoming.data.events.length === 0 && (
          <EmptyState
            compact
            headingLevel={3}
            title="Create your first event"
            text="Add the people you want to invite, publish the page, then schedule the invitation. Guests RSVP on the page itself."
            actions={<Button variant="primary" href="#/events/new">New event</Button>}
          />
        )}
        {upcoming.data && upcoming.data.events.length > 0 && (
          <List aria-label="Upcoming events">
            {upcoming.data.events.map((e) => (
              <ListItem
                key={e.id}
                href={`#/events/${e.id}`}
                title={e.name}
                meta={`${formatDate(e.date)} · ${e.invitees} invitees · ${e.attending} attending`}
                trailing={<Badge tone={e.status === 'Draft' ? 'neutral' : 'success'}>{e.status}</Badge>}
              />
            ))}
          </List>
        )}
      </Card>
    </Stack>
  );
}
