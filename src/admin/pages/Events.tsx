import { get } from '../../shared/ui/api.js';
import { ErrorState, Skeleton } from '../../shared/ui/components.js';
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
    <div className="stack">
      <div className="cluster cluster--between">
        <h1>Events</h1>
        <a className="btn btn--primary" href="#/events/new">New event</a>
      </div>
      {loading && <Skeleton />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.events.length === 0 && (
        <div className="card stack">
          <h2>No events yet</h2>
          <p className="text-muted">Create your first event to start inviting guests.</p>
        </div>
      )}
      {data && data.events.length > 0 && (
        <ul className="stack" aria-label="Events">
          {data.events.map((e) => (
            <li key={e.id} className="card">
              <a href={`#/events/${e.id}`}>{e.name}</a> · {e.date} · {e.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
