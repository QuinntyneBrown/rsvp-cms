import { useEffect, useState } from 'react';
import { get } from '../../shared/ui/api.js';
import {
  Button, Card, Chip, Cluster, EmptyState, Grid, Pagination, Skeleton, Stack, Stat,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TextField,
} from '../../shared/ui/components/index.js';
import { formatAgo } from '../../shared/ui/format.js';
import { useDebounced, useLoad } from '../../shared/ui/hooks.js';
import { VisuallyHidden } from '../../shared/ui/primitives/index.js';
import { ReplyBadge } from '../ReplyBadge.js';

interface ResponseRow {
  guestId: number;
  guest: string;
  reply: 'attending' | 'declined' | 'waiting';
  guestsCount: number;
  meal: string | null;
  dietary: string;
  message: string;
  updatedAt: string | null;
}

interface ResponsesData {
  responses: ResponseRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: { attending: number; declined: number; waiting: number; guestsComing: number; meals: Record<string, number> };
}

const POLL_MS = 5000;

const FILTERS = [
  ['', 'All'],
  ['attending', 'Attending'],
  ['declined', 'Declined'],
  ['waiting', 'Waiting'],
] as const;

const dash = (text: string | null) => text || '—';

/** Responses: totals for catering, then every reply (L2-046 to L2-048). */
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
  const clear = () => { setSearch(''); setStatus(''); setPage(1); };

  return (
    <Stack>
      <VisuallyHidden as="h2">Responses</VisuallyHidden>
      {totals && (
        <Grid as="section" auto compact aria-label="Totals">
          <Stat card label="Attending" value={totals.attending} />
          <Stat card label="Guests coming" value={totals.guestsComing} />
          {Object.entries(totals.meals).map(([meal, n]) => <Stat card key={meal} label={meal} value={n} />)}
          <Stat card label="Declined" value={totals.declined} />
          <Stat card label="Waiting" value={totals.waiting} />
        </Grid>
      )}
      <Cluster>
        <TextField label="Search responses" hideLabel id="resp-search" type="search" variant="search" placeholder="Search by guest name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Cluster role="group" aria-label="Filter by reply">
          {FILTERS.map(([value, label]) => (
            <Chip key={label} pressed={status === value} onToggle={() => { setStatus(value); setPage(1); }}>{label}</Chip>
          ))}
        </Cluster>
      </Cluster>
      {loading && <Skeleton rows={5} label="Loading responses" />}
      {error && (
        <EmptyState
          tone="error"
          title="We couldn't load responses"
          text={`Your replies are safe. ${error}`}
          actions={<Button onClick={reload}>Try again</Button>}
        />
      )}
      {data && data.total === 0 && !filtered && (
        <Card>
          <EmptyState
            compact
            title="No responses yet"
            headingLevel={3}
            text="Replies appear here as guests respond on the public page."
            actions={<><Button href={`#/events/${eventId}/page`}>View the public page</Button><Button variant="ghost" href={`#/events/${eventId}/guests`}>View invitees</Button></>}
          />
        </Card>
      )}
      {data && data.total === 0 && filtered && (
        <Card>
          <EmptyState
            compact
            title={q.trim() ? `No responses match “${q.trim()}”` : 'No responses match'}
            headingLevel={3}
            text="Clear the search to see all replies."
            actions={<Button onClick={clear}>Clear search</Button>}
          />
        </Card>
      )}
      {data && data.total > 0 && (
        <>
          <Table caption="Responses" captionHidden>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Guest</TableHeaderCell><TableHeaderCell>Reply</TableHeaderCell><TableHeaderCell numeric>Guests</TableHeaderCell>
                <TableHeaderCell>Meal</TableHeaderCell><TableHeaderCell>Dietary</TableHeaderCell><TableHeaderCell>Message</TableHeaderCell><TableHeaderCell>Updated</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.responses.map((r) => (
                <TableRow key={r.guestId}>
                  <TableCell>{r.guest}</TableCell>
                  <TableCell><ReplyBadge reply={r.reply} /></TableCell>
                  <TableCell numeric>{r.guestsCount}</TableCell>
                  <TableCell>{dash(r.meal)}</TableCell>
                  <TableCell>{dash(r.dietary)}</TableCell>
                  <TableCell>{dash(r.message)}</TableCell>
                  <TableCell>{r.updatedAt ? <time dateTime={r.updatedAt}>{formatAgo(r.updatedAt)}</time> : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / data.pageSize))} summary={`Showing ${(page - 1) * data.pageSize + 1}–${(page - 1) * data.pageSize + data.responses.length} of ${data.total.toLocaleString('en-GB')}`} onPageChange={setPage} />
        </>
      )}
    </Stack>
  );
}
