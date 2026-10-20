import { get } from '../../shared/ui/api.js';
import { Button, Card, EmptyState, List, ListItem, PageHeader, Skeleton, Stack } from '../../shared/ui/components/index.js';
import { useLoad } from '../../shared/ui/hooks.js';

interface EventSummary {
  id: number;
  name: string;
  date: string;
  status: string;
}

export function EventsPage() {
  const { data, error, loading, reload } = useLoad(() => get<{ events: EventSummary[] }>('/api/events'), []);

  return (
    <Stack>
      <PageHeader title="Events" actions={<Button variant="primary" href="#/events/new">New event</Button>} />
      {loading && <Skeleton />}
      {error && <EmptyState tone="error" title={error} actions={<Button onClick={reload}>Try again</Button>} />}
      {data && data.events.length === 0 && (
        <Card>
          <EmptyState compact title="No events yet" text="Create your first event to start inviting guests." />
        </Card>
      )}
      {data && data.events.length > 0 && (
        <Card variant="flush">
          <List aria-label="Events">
            {data.events.map((e) => (
              <ListItem key={e.id} href={`#/events/${e.id}`} title={e.name} meta={`${e.date} · ${e.status}`} />
            ))}
          </List>
        </Card>
      )}
    </Stack>
  );
}
