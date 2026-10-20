import { useEffect, useState } from 'react';
import { get } from '../../shared/ui/api.js';
import {
  Button, Card, Chip, Cluster, EmptyState, Grid, Pagination, Skeleton, Stack, Stat,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TextField,
} from '../../shared/ui/components/index.js';
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

const FILTERS = [
  ['', 'All'],
  ['attending', 'Attending'],
  ['declined', 'Declined'],
] as const;

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
    <Stack>
      <h2>Responses</h2>
      {totals && (
        <Grid as="section" auto compact aria-label="Totals">
          <Stat card label="Attending" value={totals.attending} />
          <Stat card label="Guests coming" value={totals.guestsComing} />
          <Stat card label="Declined" value={totals.declined} />
          <Stat card label="Waiting" value={totals.waiting} />
          {Object.entries(totals.meals).map(([meal, n]) => <Stat card key={meal} label={meal} value={n} />)}
        </Grid>
      )}
      <Cluster>
        <TextField label="Search responses" hideLabel id="resp-search" type="search" variant="search" placeholder="Search by guest name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {FILTERS.map(([value, label]) => (
          <Chip key={label} pressed={status === value} onToggle={() => { setStatus(value); setPage(1); }}>{label}</Chip>
        ))}
      </Cluster>
      {loading && <Skeleton rows={5} />}
      {error && <EmptyState tone="error" title={error} actions={<Button onClick={reload}>Try again</Button>} />}
      {data && data.total === 0 && !filtered && (
        <Card>
          <EmptyState compact title="No replies yet" headingLevel={3} text="Replies appear here as guests respond on the public page." />
        </Card>
      )}
      {data && data.total === 0 && filtered && (
        <Card>
          <EmptyState compact title="No replies match" headingLevel={3} actions={<Button onClick={() => { setSearch(''); setStatus(''); }}>Clear search</Button>} />
        </Card>
      )}
      {data && data.total > 0 && (
        <>
          <Table caption="Responses" captionHidden>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Guest</TableHeaderCell><TableHeaderCell>Reply</TableHeaderCell><TableHeaderCell numeric>Guests</TableHeaderCell>
                <TableHeaderCell>Meal</TableHeaderCell><TableHeaderCell>Dietary note</TableHeaderCell><TableHeaderCell>Message</TableHeaderCell><TableHeaderCell>Updated</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.responses.map((r) => (
                <TableRow key={r.guestId}>
                  <TableCell>{r.guest}</TableCell><TableCell>{r.reply === 'attending' ? 'Attending' : 'Declined'}</TableCell><TableCell numeric>{r.guestsCount || '–'}</TableCell>
                  <TableCell>{r.meal ?? '–'}</TableCell><TableCell>{r.dietary || '–'}</TableCell><TableCell>{r.message || '–'}</TableCell><TableCell>{r.updatedAt.slice(0, 16).replace('T', ' ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / data.pageSize))} onPageChange={setPage} />
        </>
      )}
    </Stack>
  );
}
