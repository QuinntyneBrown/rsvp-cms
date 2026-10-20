import { useEffect, useRef, useState } from 'react';
import { BLOCK_TYPES, MAX_BLOCKS, type Block, type BlockType } from '../../domain/blocks.js';
import { ApiError, get, post, put } from '../../shared/ui/api.js';
import { BLOCK_SPECS, BlockView } from '../../shared/ui/blocks.js';
import { Dialog, ErrorState, Field, Skeleton } from '../../shared/ui/components.js';
import { useLoad } from '../../shared/ui/hooks.js';

interface PageState {
  draft: Block[];
  published: Block[] | null;
  hasUnpublishedChanges: boolean;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function PageTab({ eventId }: { eventId: number }) {
  const { data, error, loading, reload } = useLoad(() => get<PageState>(`/api/events/${eventId}/page`), [eventId]);
  if (loading) return <Skeleton rows={4} />;
  if (error || !data) return <ErrorState message={error ?? 'Could not load the page'} onRetry={reload} />;
  return <Composer eventId={eventId} initial={data} />;
}

function Composer({ eventId, initial }: { eventId: number; initial: PageState }) {
  const [blocks, setBlocks] = useState<Block[]>(initial.draft);
  const [published, setPublished] = useState<Block[]>(initial.published ?? []);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState(false);
  const [pickerNote, setPickerNote] = useState<string>();
  const [discarding, setDiscarding] = useState(false);
  const [preview, setPreview] = useState(false);
  const [undo, setUndo] = useState<{ block: Block; index: number } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const lastSaved = useRef(initial.draft);
  const focusMove = useRef<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const unpublished = !same(blocks, published);

  // Autosave 2 seconds after the last edit (L2-015 AC1).
  useEffect(() => {
    if (same(blocks, lastSaved.current)) return;
    setSaveState('saving');
    const t = setTimeout(async () => {
      try {
        await put(`/api/events/${eventId}/page/draft`, { blocks });
        lastSaved.current = blocks;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [blocks, eventId]);

  // Leave guard (L2-016 AC3).
  useEffect(() => {
    if (!unpublished) return;
    const on = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = 'You have unpublished changes'; };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [unpublished]);

  // Keep focus on the moved block's control after a reorder (L2-013 AC3).
  useEffect(() => {
    if (focusMove.current) {
      document.getElementById(focusMove.current)?.focus();
      focusMove.current = null;
    }
  }, [blocks]);

  function addBlock(type: BlockType) {
    if (blocks.length >= MAX_BLOCKS) { setPickerNote('A page can have up to 12 blocks'); return; }
    setBlocks([...blocks, { id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, type, fields: {} }]);
    setPicker(false);
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    focusMove.current = `${dir === -1 ? 'up' : 'down'}-${next[target]!.id}`;
    setBlocks(next);
  }

  function removeBlock(index: number) {
    const block = blocks[index]!;
    setBlocks(blocks.filter((_, i) => i !== index));
    setUndo({ block, index });
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 10_000);
  }

  function undoRemove() {
    if (!undo) return;
    const next = [...blocks];
    next.splice(undo.index, 0, undo.block);
    setBlocks(next);
    setUndo(null);
  }

  const edit = (id: string, key: string, value: string) =>
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, fields: { ...b.fields, [key]: value } } : b)));

  async function publish() {
    if (publishing) return; // second press is not sent (L2-015 AC3)
    setPublishing(true);
    setPublishError(undefined);
    setErrors({});
    try {
      await put(`/api/events/${eventId}/page/draft`, { blocks });
      lastSaved.current = blocks;
      await post(`/api/events/${eventId}/page/publish`);
      setPublished(blocks);
      setSaveState('saved');
      setNotice('Published · just now');
    } catch (err) {
      const e = err as ApiError;
      if (e.errors && Object.keys(e.errors).length) {
        setErrors(e.errors);
        const first = e.firstInvalid ?? Object.keys(e.errors)[0]!;
        setCollapsed((c) => { const n = new Set(c); n.delete(first.split('.')[0]!); return n; });
        setTimeout(() => document.getElementById(`f-${first}`)?.focus(), 0);
      } else {
        setPublishError(e.message);
      }
    } finally {
      setPublishing(false);
    }
  }

  async function discard() {
    try {
      const res = await post<PageState>(`/api/events/${eventId}/page/discard`);
      setBlocks(res.draft);
      lastSaved.current = res.draft;
      setErrors({});
      setNotice('Published');
      setDiscarding(false);
    } catch (err) {
      setPublishError((err as ApiError).message); // draft unchanged
      setDiscarding(false);
    }
  }

  const status = saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Could not save' : unpublished ? 'Draft · saved just now' : notice ?? 'Published';

  if (preview) {
    return (
      <div className="stack">
        <div className="cluster cluster--between">
          <h2>Preview</h2>
          <button className="btn" type="button" onClick={() => setPreview(false)}>Back to editing</button>
        </div>
        <div className="card stack" style={{ maxWidth: '100%' }}>
          {blocks.map((b) => <BlockView key={b.id} block={b} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="cluster cluster--between">
        <h2>Event page</h2>
        <span role="status" aria-live="polite">{status}</span>
      </div>
      <div className="cluster">
        <button className="btn btn--primary" type="button" onClick={publish} disabled={publishing} aria-busy={publishing}>Publish</button>
        <button className="btn" type="button" onClick={() => setPreview(true)}>Preview</button>
        {unpublished && <button className="btn btn--ghost" type="button" onClick={() => setDiscarding(true)}>Discard changes</button>}
        <button className="btn" type="button" onClick={() => { setPickerNote(undefined); setPicker(true); }}>Add a block</button>
      </div>
      {publishError && <ErrorState message={publishError} onRetry={publish} />}
      {errors.page && <p role="alert" className="field__error">{errors.page}</p>}
      {undo && (
        <p role="status">
          Block removed. <button className="btn" type="button" onClick={undoRemove}>Undo</button>
        </p>
      )}

      {blocks.length === 0 && <p className="text-muted">No blocks yet. Add a block to start your page.</p>}
      <ol className="stack" aria-label="Page outline">
        {blocks.map((b, i) => {
          const spec = BLOCK_SPECS[b.type];
          const open = !collapsed.has(b.id);
          return (
            <li key={b.id} className="card stack">
              <div className="cluster cluster--between">
                <strong>{spec.label}</strong>
                <div className="cluster">
                  <button id={`up-${b.id}`} className="btn" type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move up ${spec.label}`}>Move up</button>
                  <button id={`down-${b.id}`} className="btn" type="button" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label={`Move down ${spec.label}`}>Move down</button>
                  <button className="btn" type="button" aria-expanded={open} onClick={() => setCollapsed((c) => { const n = new Set(c); if (open) n.add(b.id); else n.delete(b.id); return n; })}>{open ? 'Collapse' : 'Expand'}</button>
                  <button className="btn btn--danger" type="button" onClick={() => removeBlock(i)}>Remove block</button>
                </div>
              </div>
              {open && spec.fields.map((f) => {
                const value = b.fields[f.key] ?? '';
                const id = `f-${b.id}.${f.key}`;
                const over = f.max !== undefined && value.length > f.max;
                return (
                  <Field key={f.key} id={id} label={f.label} counter={f.max ? `${value.length}/${f.max}` : undefined} error={errors[`${b.id}.${f.key}`] ?? (over ? `${f.label} can be up to ${f.max} characters` : undefined)}>
                    {f.multiline
                      ? <textarea className="textarea" id={id} value={value} onChange={(e) => edit(b.id, f.key, e.target.value)} />
                      : <input className="input" id={id} value={value} onChange={(e) => edit(b.id, f.key, e.target.value)} />}
                  </Field>
                );
              })}
              {open && b.type === 'rsvp' && <p className="text-muted">The RSVP fields are fixed and cannot be removed individually.</p>}
            </li>
          );
        })}
      </ol>

      {picker && (
        <Dialog title="Add a block" onClose={() => setPicker(false)}>
          {pickerNote && <p role="alert" className="field__error">{pickerNote}</p>}
          <ul className="stack">
            {BLOCK_TYPES.map((t) => (
              <li key={t} className="cluster cluster--between">
                <span><strong>{BLOCK_SPECS[t].label}</strong><br /><span className="text-muted">{BLOCK_SPECS[t].description}</span></span>
                <button className="btn" type="button" onClick={() => addBlock(t)}>Add {BLOCK_SPECS[t].label}</button>
              </li>
            ))}
          </ul>
          <button className="btn" type="button" onClick={() => setPicker(false)}>Close</button>
        </Dialog>
      )}
      {discarding && (
        <Dialog title="Discard unpublished changes?" onClose={() => setDiscarding(false)}>
          <p>Your page goes back to the last published version.</p>
          <div className="form-actions">
            <button className="btn" type="button" onClick={() => setDiscarding(false)}>Keep editing</button>
            <button className="btn btn--danger" type="button" onClick={discard}>Discard</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
