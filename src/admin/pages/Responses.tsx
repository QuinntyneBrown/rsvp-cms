import { useEffect, useState } from 'react';
import { get } from '../../shared/ui/api.js';
import { ErrorState, Skeleton } from '../../shared/ui/components.js';
import { useDebounced, useLoad } from '../../shared/ui/hooks.js';

interface ResponseRow {
  guestId: number;
  guest: string;
  reply: 'attending' | 'declined';
  guestsCount: number;
  meal: string | null;
  dietary: string;
  message: string;
  updatedAt: string;
}

interface ResponsesData {
  responses: ResponseRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: { attending: number; declined: number; waiting: number; guestsComing: number; meals: Record<string, number> };
}

const POLL_MS = 5000;

export function ResponsesTab({ eventId }: { eventId: number }) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(
    () => get<ResponsesData>(`/api/events/${eventId}/responses?page=${page}&status=${status}&q=${encodeURIComponent(q.trim())}`),
    [eventId, page, status, q],
  );

  // Totals refresh within 5 seconds without a reload (L2-047 AC2).
  useEffect(() => {
    const t = setInterval(reload, POLL_MS);
    return () => clearInterval(t);
  }, [reload]);

  const filtered = Boolean(q.trim() || status);
  const totals = data?.totals;

  return (
    <div className="stack">
      <h2>Responses</h2>
      {totals && (
        <dl className="cluster" aria-label="Totals">
          <div><dt>Attending</dt><dd>{totals.attending}</dd></div>
          <div><dt>Guests coming</dt><dd>{totals.guestsComing}</dd></div>
          <div><dt>Declined</dt><dd>{totals.declined}</dd></div>
          <div><dt>Waiting</dt><dd>{totals.waiting}</dd></div>
          {Object.entries(totals.meals).map(([meal, n]) => <div key={meal}><dt>{meal}</dt><dd>{n}</dd></div>)}
        </dl>
      )}
      <div className="cluster">
        <label className="visually-hidden" htmlFor="resp-search">Search responses</label>
        <input id="resp-search" className="input" type="search" placeholder="Search by guest name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {[['', 'All'], ['attending', 'Attending'], ['declined', 'Declined']].map(([value, label]) => (
          <button key={label} type="button" className={`btn ${status === value ? 'btn--primary' : ''}`} aria-pressed={status === value} onClick={() => { setStatus(value!); setPage(1); }}>{label}</button>
        ))}
      </div>
      {loading && <Skeleton rows={5} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.total === 0 && !filtered && (
        <div className="card stack">
          <h3>No replies yet</h3>
          <p className="text-muted">Replies appear here as guests respond on the public page.</p>
        </div>
      )}
      {data && data.total === 0 && filtered && (
        <div className="card stack">
          <h3>No replies match</h3>
          <div><button className="btn" type="button" onClick={() => { setSearch(''); setStatus(''); }}>Clear search</button></div>
        </div>
      )}
      {data && data.total > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Guest</th><th>Reply</th><th>Guests</th><th>Meal</th><th>Dietary note</th><th>Message</th><th>Updated</th></tr></thead>
            <tbody>
              {data.responses.map((r) => (
                <tr key={r.guestId}>
                  <td>{r.guest}</td><td>{r.reply === 'attending' ? 'Attending' : 'Declined'}</td><td>{r.guestsCount || '–'}</td>
                  <td>{r.meal ?? '–'}</td><td>{r.dietary || '–'}</td><td>{r.message || '–'}</td><td>{r.updatedAt.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cluster">
            <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
            <button className="btn" type="button" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
