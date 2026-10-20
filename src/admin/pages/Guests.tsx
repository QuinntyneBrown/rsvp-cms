import { useState, type FormEvent } from 'react';
import { ApiError, get, post, put } from '../../shared/ui/api.js';
import { Alert, Button, Card, Checkbox, Chip, Cluster, Dialog, EmptyState, FormActions, Pagination, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TextField } from '../../shared/ui/components/index.js';
import { Text } from '../../shared/ui/primitives/index.js';
import { useDebounced, useLoad } from '../../shared/ui/hooks.js';

interface Guest {
  id: number;
  name: string;
  email: string;
  group: string;
  plusOnes: number;
  code: string;
  status: 'waiting' | 'attending' | 'declined';
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
  ['attending', 'Attending'],
  ['declined', 'Declined'],
  ['waiting', 'Waiting'],
] as const;

export function GuestsTab({ eventId, showToast }: { eventId: number; showToast: (m: string) => void }) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set()); // survives paging (L2-024)
  const [editing, setEditing] = useState<Guest | 'new' | null>(null);
  const [removing, setRemoving] = useState(false);

  const list = useLoad(
    () => get<GuestList>(`/api/events/${eventId}/guests?page=${page}&status=${status}&q=${encodeURIComponent(q.trim())}`),
    [eventId, page, status, q],
  );
  const data = list.data;
  const filtered = Boolean(q.trim() || status);

  const pageIds = data?.guests.map((g) => g.id) ?? [];
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    if (selectedOnPage === pageIds.length) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    setSelected(next);
  };

  async function remove() {
    await post(`/api/events/${eventId}/guests/remove`, { ids: [...selected] });
    showToast(`Removed ${selected.size} ${selected.size === 1 ? 'guest' : 'guests'}`);
    setSelected(new Set());
    setRemoving(false);
    list.reload();
  }

  return (
    <Stack>
      <Cluster justify="between">
        <h2>Guests {data && <Text as="span" tone="muted">· {data.invitees.toLocaleString()} invitees</Text>}</h2>
        <Button variant="primary" onClick={() => setEditing('new')}>Add guest</Button>
      </Cluster>

      <Cluster>
        <TextField label="Search guests" hideLabel id="guest-search" type="search" variant="search" placeholder="Search by name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {FILTERS.map(([value, label]) => (
          <Chip key={label} pressed={status === value} onToggle={() => { setStatus(value); setPage(1); }}>{label}</Chip>
        ))}
        {selected.size > 0 && (
          <Button variant="danger" onClick={() => setRemoving(true)}>Remove {selected.size}</Button>
        )}
      </Cluster>

      {list.loading && <Skeleton rows={5} />}
      {list.error && <EmptyState tone="error" title={list.error} actions={<Button onClick={list.reload}>Try again</Button>} />}
      {data && data.total === 0 && !filtered && (
        <Card>
          <EmptyState compact title="No guests yet" headingLevel={3} actions={<Button variant="primary" onClick={() => setEditing('new')}>Add guest</Button>} />
        </Card>
      )}
      {data && data.total === 0 && filtered && (
        <Card>
          <EmptyState compact title="No guests match" headingLevel={3} actions={<Button onClick={() => { setSearch(''); setStatus(''); }}>Clear search</Button>} />
        </Card>
      )}
      {data && data.total > 0 && (
        <>
          <Table caption="Guests" captionHidden>
            <TableHead>
              <TableRow>
                <TableHeaderCell>
                  <Checkbox
                    label="Select all on this page"
                    hideLabel
                    checked={selectedOnPage === pageIds.length}
                    indeterminate={selectedOnPage > 0 && selectedOnPage < pageIds.length}
                    onChange={toggleAll}
                  />
                </TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell><TableHeaderCell>Email</TableHeaderCell><TableHeaderCell>Group</TableHeaderCell>
                <TableHeaderCell numeric>Places</TableHeaderCell><TableHeaderCell>Code</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell labelHidden>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.guests.map((g) => (
                <TableRow key={g.id} selected={selected.has(g.id)}>
                  <TableCell><Checkbox label={`Select ${g.name}`} hideLabel checked={selected.has(g.id)} onChange={() => toggle(g.id)} /></TableCell>
                  <TableCell>{g.name}</TableCell><TableCell>{g.email}</TableCell><TableCell>{g.group}</TableCell>
                  <TableCell numeric>{g.plusOnes + 1}</TableCell><TableCell>{g.code}</TableCell><TableCell>{g.status}</TableCell>
                  <TableCell actions><Button variant="ghost" size="sm" onClick={() => setEditing(g)}>Edit {g.name}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / data.pageSize))} onPageChange={setPage} />
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
      {removing && (
        <Dialog
          title={`Remove ${selected.size} ${selected.size === 1 ? 'guest' : 'guests'}?`}
          tone="danger"
          onClose={() => setRemoving(false)}
          footer={<><Button onClick={() => setRemoving(false)}>Cancel</Button><Button variant="danger" onClick={remove}>Remove</Button></>}
        >
          <p>Their personal links stop working and their replies are deleted.</p>
        </Dialog>
      )}
    </Stack>
  );
}

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
      setErrors(apiErr.errors ?? {});
      if (!apiErr.errors || !Object.keys(apiErr.errors).length) setFailure(apiErr.message); // dialog keeps the values
      setBusy(false);
    }
  }

  return (
    <Dialog title={props.guest ? 'Edit guest' : 'Add guest'} onClose={props.onClose} busy={busy}>
      <Stack as="form" onSubmit={submit} noValidate>
        {failure && <Alert tone="danger" live actions={<Button type="submit">Try again</Button>}>{failure}</Alert>}
        <TextField label="Full name" id="g-name" error={errors.name} value={form.name} onChange={set('name')} />
        <TextField label="Email" id="g-email" type="email" error={errors.email} value={form.email} onChange={set('email')} />
        <TextField label="Group" id="g-group" optional value={form.group} onChange={set('group')} />
        <TextField label="Plus-ones" id="g-plus" type="number" min={0} max={9} error={errors.plusOnes} value={form.plusOnes} onChange={set('plusOnes')} />
        <FormActions>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>{props.guest ? 'Save' : 'Add guest'}</Button>
        </FormActions>
      </Stack>
    </Dialog>
  );
}
