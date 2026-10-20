import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, get, post, put } from '../../shared/ui/api.js';
import {
  Alert, Button, Card, Checkbox, Chip, Cluster, Dialog, EmptyState, ErrorSummary, FormActions, Pagination, Select, Skeleton, Stack,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TextField,
} from '../../shared/ui/components/index.js';
import { formatAgo } from '../../shared/ui/format.js';
import { useDebounced, useLoad } from '../../shared/ui/hooks.js';
import { Text } from '../../shared/ui/primitives/index.js';
import { ReplyBadge } from '../ReplyBadge.js';

interface Guest {
  id: number;
  name: string;
  email: string;
  group: string;
  plusOnes: number;
  code: string;
  status: 'waiting' | 'attending' | 'declined';
  partySize: number | null;
  updatedAt: string | null;
}

interface GuestList {
  guests: Guest[];
  total: number;
  page: number;
  pageSize: number;
  invitees: number;
}

const FILTERS = [
  ['', 'All'],
  ['waiting', 'Waiting'],
  ['attending', 'Attending'],
  ['declined', 'Declined'],
] as const;

const GROUPS = ['Friends', 'Family', 'Work'];

/** Places the guest takes up: what they confirmed, nothing once declined, otherwise what the invitation allows. */
const party = (g: Guest) => (g.status === 'attending' ? (g.partySize ?? 1) : g.status === 'declined' ? 0 : g.plusOnes + 1);

const plural = (n: number) => `${n} ${n === 1 ? 'guest' : 'guests'}`;

/** "Maya Chen", "Maya Chen and Sam Okafor", or "3 guests". */
const namesOf = (guests: { name: string }[]) =>
  guests.length === 1 ? guests[0]!.name : guests.length === 2 ? `${guests[0]!.name} and ${guests[1]!.name}` : plural(guests.length);

/** The guest list: search, filters, selection, paging, add, edit and remove (L2-019 to L2-024). */
export function GuestsTab({ eventId, showToast }: { eventId: number; showToast: (m: string) => void }) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  // Selected guests by id, kept across pages (L2-024 AC3); names are kept for the remove dialog.
  const [selected, setSelected] = useState<Map<number, string>>(new Map());
  const [editing, setEditing] = useState<Guest | 'new' | null>(null);
  const [removing, setRemoving] = useState<{ id: number; name: string }[] | null>(null);

  const list = useLoad(
    () => get<GuestList>(`/api/events/${eventId}/guests?page=${page}&status=${status}&q=${encodeURIComponent(q.trim())}`),
    [eventId, page, status, q],
  );
  const data = list.data;
  const filtered = Boolean(q.trim() || status);

  // A removal can empty the last page; step back to one that has rows.
  useEffect(() => {
    if (data && data.guests.length === 0 && data.total > 0 && page > 1) setPage(Math.ceil(data.total / data.pageSize));
  }, [data, page]);

  const rows = data?.guests ?? [];
  const selectedOnPage = rows.filter((g) => selected.has(g.id)).length;
  const toggle = (g: Guest) => {
    const next = new Map(selected);
    if (next.has(g.id)) next.delete(g.id);
    else next.set(g.id, g.name);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Map(selected);
    if (selectedOnPage === rows.length) rows.forEach((g) => next.delete(g.id));
    else rows.forEach((g) => next.set(g.id, g.name));
    setSelected(next);
  };
  const clearFilters = () => { setSearch(''); setStatus(''); setPage(1); };

  function removed(ids: number[]) {
    showToast(`Removed ${plural(ids.length)}`);
    const next = new Map(selected);
    ids.forEach((id) => next.delete(id));
    setSelected(next);
    setRemoving(null);
    list.reload();
  }

  return (
    <Stack>
      <Cluster justify="between">
        <h2>Guests {data && <Text as="span" tone="muted">· {data.invitees.toLocaleString('en-GB')} invitees</Text>}</h2>
        <Cluster>
          <Button variant="ghost" href={`#/events/${eventId}/import`}>Import CSV</Button>
          <Button variant="primary" onClick={() => setEditing('new')}>Add guest</Button>
        </Cluster>
      </Cluster>

      <Cluster>
        <TextField label="Search guests" hideLabel id="guest-search" type="search" variant="search" placeholder="Search by name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Cluster role="group" aria-label="Filter by reply">
          {FILTERS.map(([value, label]) => (
            <Chip key={label} pressed={status === value} onToggle={() => { setStatus(value); setPage(1); }}>{label}</Chip>
          ))}
        </Cluster>
      </Cluster>

      {selected.size > 0 && (
        <Card>
          <Cluster justify="between" role="region" aria-label="Selection">
            <Text as="span" variant="label">{selected.size} selected</Text>
            <Cluster>
              <Button variant="ghost" onClick={() => setSelected(new Map())}>Clear</Button>
              <Button variant="danger" onClick={() => setRemoving([...selected].map(([id, name]) => ({ id, name })))}>Remove</Button>
            </Cluster>
          </Cluster>
        </Card>
      )}

      {list.loading && <Skeleton rows={5} label="Loading guests" />}
      {list.error && (
        <EmptyState
          tone="error"
          title="We couldn't load your guests"
          text={`Nothing was changed. ${list.error}`}
          actions={<Button onClick={list.reload}>Try again</Button>}
        />
      )}
      {data && data.total === 0 && !filtered && (
        <Card>
          <EmptyState
            compact
            title="No invitees yet"
            headingLevel={3}
            text="Import a CSV from a spreadsheet, or add people one at a time. Each invitee gets a personal link."
            actions={<><Button href={`#/events/${eventId}/import`}>Import CSV</Button><Button variant="primary" onClick={() => setEditing('new')}>Add guest</Button></>}
          />
        </Card>
      )}
      {data && data.total === 0 && filtered && (
        <Card>
          <EmptyState
            compact
            title={q.trim() ? `No guests match “${q.trim()}”` : 'No guests match'}
            headingLevel={3}
            text={`Search looks at names and emails. Clear the search to see all ${data.invitees.toLocaleString('en-GB')} invitees.`}
            actions={<Button onClick={clearFilters}>Clear search</Button>}
          />
        </Card>
      )}
      {data && data.total > 0 && (
        <>
          <Table caption="Invitees" captionHidden>
            <TableHead>
              <TableRow>
                <TableHeaderCell>
                  <Checkbox
                    label="Select all on this page"
                    hideLabel
                    checked={rows.length > 0 && selectedOnPage === rows.length}
                    indeterminate={selectedOnPage > 0 && selectedOnPage < rows.length}
                    onChange={toggleAll}
                  />
                </TableHeaderCell>
                <TableHeaderCell>Guest</TableHeaderCell><TableHeaderCell>Group</TableHeaderCell><TableHeaderCell>Reply</TableHeaderCell>
                <TableHeaderCell numeric>Party</TableHeaderCell><TableHeaderCell>Updated</TableHeaderCell>
                <TableHeaderCell labelHidden>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id} selected={selected.has(g.id)}>
                  <TableCell><Checkbox label={`Select ${g.name}`} hideLabel checked={selected.has(g.id)} onChange={() => toggle(g)} /></TableCell>
                  <TableCell>
                    <Text as="div">{g.name}</Text>
                    <Text as="div" variant="body-sm" tone="muted">{g.email}</Text>
                  </TableCell>
                  <TableCell>{g.group || '—'}</TableCell>
                  <TableCell><ReplyBadge reply={g.status} /></TableCell>
                  <TableCell numeric>{party(g)}</TableCell>
                  <TableCell>{g.updatedAt ? <time dateTime={g.updatedAt}>{formatAgo(g.updatedAt)}</time> : '—'}</TableCell>
                  <TableCell actions>
                    <Button variant="ghost" size="sm" aria-label={`Edit ${g.name}`} onClick={() => setEditing(g)}>Edit</Button>
                    <Button variant="ghost" size="sm" aria-label={`Remove ${g.name}`} onClick={() => setRemoving([{ id: g.id, name: g.name }])}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / data.pageSize))} summary={`Showing ${(page - 1) * data.pageSize + 1}–${(page - 1) * data.pageSize + rows.length} of ${data.total.toLocaleString('en-GB')}`} onPageChange={setPage} />
        </>
      )}

      {editing && (
        <GuestDialog
          eventId={eventId}
          guest={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); showToast(msg); list.reload(); }}
        />
      )}
      {removing && <RemoveDialog eventId={eventId} guests={removing} onClose={() => setRemoving(null)} onRemoved={removed} />}
    </Stack>
  );
}

/** Remove one or more guests, with busy and failed states (L2-023). */
function RemoveDialog(props: { eventId: number; guests: { id: number; name: string }[]; onClose: () => void; onRemoved: (ids: number[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const n = props.guests.length;

  async function remove() {
    if (busy) return;
    setBusy(true);
    setFailure(undefined);
    const ids = props.guests.map((g) => g.id);
    try {
      await post(`/api/events/${props.eventId}/guests/remove`, { ids });
      props.onRemoved(ids);
    } catch (err) {
      setFailure((err as ApiError).message); // the guests remain (L2-023 AC3)
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={`Remove ${plural(n)}?`}
      description="This can't be undone."
      tone="danger"
      busy={busy}
      initialFocus="footer"
      onClose={props.onClose}
      footer={
        <>
          <Button onClick={props.onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={remove} disabled={busy} loading={busy}>{busy ? 'Removing…' : 'Remove'}</Button>
        </>
      }
    >
      <Stack>
        {failure && (
          <Alert tone="danger" live title="Nothing was removed" actions={<Button size="sm" onClick={remove}>Try again</Button>}>
            {failure} {n === 1 ? 'The guest is' : n === 2 ? 'Both guests are' : `All ${n} guests are`} still on the list.
          </Alert>
        )}
        <p>{namesOf(props.guests)} will be removed. Their personal links stop working and their replies are deleted.</p>
      </Stack>
    </Dialog>
  );
}

/** Add guest / Edit guest (L2-021, L2-022), with the guest-edit mock's copy and states. */
function GuestDialog(props: { eventId: number; guest: Guest | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({
    name: props.guest?.name ?? '',
    email: props.guest?.email ?? '',
    group: props.guest?.group ?? '',
    plusOnes: String(props.guest?.plusOnes ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const fieldId = (key: string) => `g-${key === 'plusOnes' ? 'plus' : key}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure(undefined);
    const body = { ...form, plusOnes: Number(form.plusOnes) };
    try {
      if (props.guest) await put(`/api/events/${props.eventId}/guests/${props.guest.id}`, body);
      else await post(`/api/events/${props.eventId}/guests`, body);
      props.onSaved(props.guest ? 'Guest updated' : 'Guest added');
    } catch (err) {
      const apiErr = err as ApiError;
      const fieldErrors = apiErr.errors ?? {};
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFailure(apiErr.message); // the dialog keeps the values
      setBusy(false);
      const first = Object.keys(fieldErrors)[0];
      if (first) setTimeout(() => document.getElementById(fieldId(first))?.focus(), 0);
    }
  }

  const summary = Object.entries(errors).map(([key, message]) => ({ fieldId: fieldId(key), message }));
  const groups = GROUPS.includes(form.group) || !form.group ? GROUPS : [...GROUPS, form.group];

  return (
    <Dialog
      title={props.guest ? 'Edit guest' : 'Add guest'}
      description="Each guest gets a personal invitation link once you schedule the invitation."
      onClose={props.onClose}
      busy={busy}
    >
      <Stack as="form" onSubmit={submit} noValidate>
        {summary.length > 1 && <ErrorSummary errors={summary} autoFocus={false} />}
        {failure && (
          <Alert tone="danger" live title="This guest wasn't saved" actions={<Button type="submit">Try again</Button>}>
            {failure} Your changes are still here.
          </Alert>
        )}
        <TextField label="Full name" id="g-name" error={errors.name} value={form.name} onChange={set('name')} readOnly={busy} />
        <TextField label="Email" id="g-email" type="email" hint="Invitations and reminders go here." error={errors.email} value={form.email} onChange={set('email')} readOnly={busy} />
        <Select label="Group" id="g-group" optional value={form.group} onChange={set('group')} disabled={busy}>
          <option value="">No group</option>
          {groups.map((g) => <option key={g}>{g}</option>)}
        </Select>
        <TextField label="Plus-ones" id="g-plus" type="number" min={0} max={9} hint="How many people the guest can bring, from 0 to 9." error={errors.plusOnes} value={form.plusOnes} onChange={set('plusOnes')} readOnly={busy} />
        <FormActions>
          <Button onClick={props.onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy} loading={busy}>{busy ? 'Saving guest…' : props.guest ? 'Save' : 'Add guest'}</Button>
        </FormActions>
      </Stack>
    </Dialog>
  );
}
