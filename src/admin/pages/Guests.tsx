import { useState, type FormEvent } from 'react';
import { ApiError, get, post, put } from '../../shared/ui/api.js';
import { Dialog, ErrorState, Field, Skeleton } from '../../shared/ui/components.js';
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
    <div className="stack">
      <div className="cluster cluster--between">
        <h2>Guests {data && <span className="text-muted">· {data.invitees.toLocaleString()} invitees</span>}</h2>
        <button className="btn btn--primary" type="button" onClick={() => setEditing('new')}>Add guest</button>
      </div>

      <div className="cluster">
        <label className="visually-hidden" htmlFor="guest-search">Search guests</label>
        <input id="guest-search" className="input" type="search" placeholder="Search by name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {FILTERS.map(([value, label]) => (
          <button key={label} type="button" className={`btn ${status === value ? 'btn--primary' : ''}`} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>
            {label}
          </button>
        ))}
        {selected.size > 0 && (
          <button className="btn btn--danger" type="button" onClick={() => setRemoving(true)}>Remove {selected.size}</button>
        )}
      </div>

      {list.loading && <Skeleton rows={5} />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {data && data.total === 0 && !filtered && (
        <div className="card stack">
          <h3>No guests yet</h3>
          <div className="cluster"><button className="btn btn--primary" type="button" onClick={() => setEditing('new')}>Add guest</button></div>
        </div>
      )}
      {data && data.total === 0 && filtered && (
        <div className="card stack">
          <h3>No guests match</h3>
          <div><button className="btn" type="button" onClick={() => { setSearch(''); setStatus(''); }}>Clear search</button></div>
        </div>
      )}
      {data && data.total > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={selectedOnPage === pageIds.length}
                    ref={(el) => { if (el) el.indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length; }}
                    onChange={toggleAll}
                  />
                </th>
                <th>Name</th><th>Email</th><th>Group</th><th>Places</th><th>Code</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {data.guests.map((g) => (
                <tr key={g.id}>
                  <td><input type="checkbox" aria-label={`Select ${g.name}`} checked={selected.has(g.id)} onChange={() => toggle(g.id)} /></td>
                  <td>{g.name}</td><td>{g.email}</td><td>{g.group}</td><td>{g.plusOnes + 1}</td><td>{g.code}</td><td>{g.status}</td>
                  <td><button className="btn btn--ghost" type="button" onClick={() => setEditing(g)}>Edit {g.name}</button></td>
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

      {editing && (
        <GuestDialog
          eventId={eventId}
          guest={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); showToast(msg); list.reload(); }}
        />
      )}
      {removing && (
        <Dialog title={`Remove ${selected.size} ${selected.size === 1 ? 'guest' : 'guests'}?`} onClose={() => setRemoving(false)}>
          <p>Their personal links stop working and their replies are deleted.</p>
          <div className="form-actions">
            <button className="btn" type="button" onClick={() => setRemoving(false)}>Cancel</button>
            <button className="btn btn--danger" type="button" onClick={remove}>Remove</button>
          </div>
        </Dialog>
      )}
    </div>
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
    <Dialog title={props.guest ? 'Edit guest' : 'Add guest'} onClose={props.onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        {failure && <p role="alert" className="field__error">{failure} <button className="btn" type="submit">Try again</button></p>}
        <Field label="Full name" id="g-name" error={errors.name}><input className="input" id="g-name" value={form.name} onChange={set('name')} /></Field>
        <Field label="Email" id="g-email" error={errors.email}><input className="input" id="g-email" type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Group" id="g-group" optional><input className="input" id="g-group" value={form.group} onChange={set('group')} /></Field>
        <Field label="Plus-ones" id="g-plus" error={errors.plusOnes}><input className="input" id="g-plus" type="number" min={0} max={9} value={form.plusOnes} onChange={set('plusOnes')} /></Field>
        <div className="form-actions">
          <button className="btn" type="button" onClick={props.onClose}>Cancel</button>
          <button className="btn btn--primary" type="submit" disabled={busy}>{props.guest ? 'Save' : 'Add guest'}</button>
        </div>
      </form>
    </Dialog>
  );
}
