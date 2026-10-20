import { useEffect, useRef, useState } from 'react';
import { BLOCK_TYPES, MAX_BLOCKS, type Block, type BlockType } from '../../domain/blocks.js';
import { ApiError, get, post, put } from '../../shared/ui/api.js';
import { BLOCK_SPECS, BlockView } from '../../shared/ui/blocks.js';
import {
  Alert, Button, Card, CardFooter, CardHeader, Cluster, Dialog, EmptyState, ErrorSummary, Grid, InlineStatus, Skeleton, Stack, Textarea, TextField, Toast, ToastRegion,
} from '../../shared/ui/components/index.js';
import { useLoad } from '../../shared/ui/hooks.js';
import { Icon, Text } from '../../shared/ui/primitives/index.js';
import './PageComposer.css';

interface PageState {
  draft: Block[];
  published: Block[] | null;
  hasUnpublishedChanges: boolean;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const UNDO_MS = 10_000;

export function PageTab({ eventId }: { eventId: number }) {
  const { data, error, loading, reload } = useLoad(() => get<PageState>(`/api/events/${eventId}/page`), [eventId]);
  if (loading) return <Skeleton rows={4} label="Loading page blocks" />;
  if (error || !data) {
    return (
      <EmptyState
        tone="error"
        title="Your page didn't load"
        text={`Your last saved version is safe. ${error ?? ''}`.trim()}
        actions={<Button onClick={reload}>Try again</Button>}
      />
    );
  }
  return <Composer eventId={eventId} initial={data} />;
}

/** The page composer: blocks, autosave, publish, discard and preview (L2-013 to L2-017). */
function Composer({ eventId, initial }: { eventId: number; initial: PageState }) {
  const [blocks, setBlocks] = useState<Block[]>(initial.draft);
  const [published, setPublished] = useState<Block[]>(initial.published ?? []);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [preview, setPreview] = useState(false);
  const [undo, setUndo] = useState<{ block: Block; index: number } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const lastSaved = useRef(initial.draft);
  const focusMove = useRef<string | null>(null);
  const dragFrom = useRef<number | null>(null);
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

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  /** Appends a block; false when the page is full (L2-013 AC2, AC4). */
  function addBlock(type: BlockType): boolean {
    if (blocks.length >= MAX_BLOCKS) return false;
    setBlocks([...blocks, { id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, type, fields: {} }]);
    return true;
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    focusMove.current = `${dir === -1 ? 'up' : 'down'}-${next[target]!.id}`;
    setBlocks(next);
  }

  /** Drag and drop is a shortcut for the same reorder Move up and Move down make (L2-013 AC5). */
  function moveTo(from: number, to: number) {
    if (from === to) return;
    const next = [...blocks];
    const [block] = next.splice(from, 1);
    next.splice(to, 0, block!);
    setBlocks(next);
  }

  function removeBlock(index: number) {
    const block = blocks[index]!;
    setBlocks(blocks.filter((_, i) => i !== index));
    setUndo({ block, index });
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS); // Undo is offered for 10 seconds (L2-014 AC4)
  }

  function undoRemove() {
    if (!undo) return;
    const next = [...blocks];
    next.splice(undo.index, 0, undo.block);
    setBlocks(next);
    setUndo(null);
    clearTimeout(undoTimer.current);
  }

  const edit = (id: string, key: string, value: string) =>
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, fields: { ...b.fields, [key]: value } } : b)));

  async function publish() {
    if (publishing) return; // second press is not sent (L2-015 AC3)
    setPublishing(true);
    setPublishError(undefined);
    setNotice(undefined);
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
        setTimeout(() => document.getElementById(`f-${first}`)?.focus(), 0); // first invalid field (L2-015 AC5)
      } else {
        setPublishError(e.message); // the draft is kept and the public page unchanged (L2-015 AC4)
      }
    } finally {
      setPublishing(false);
    }
  }

  const status = publishing
    ? 'Publishing…'
    : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Could not save' : unpublished ? 'Draft · saved just now' : notice ?? 'Published';
  const summary = Object.entries(errors)
    .filter(([key]) => key !== 'page')
    .map(([key, message]) => ({ fieldId: `f-${key}`, message }));

  if (preview) {
    return (
      <Stack>
        <Cluster justify="between">
          <h2>Preview</h2>
          <Button onClick={() => setPreview(false)}>Back to editing</Button>
        </Cluster>
        <Text tone="muted">This is the draft as guests will see it once it is published.</Text>
        <Card>
          <Stack>
            {blocks.map((b) => <BlockView key={b.id} block={b} />)}
          </Stack>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack>
      <h2>Event page</h2>
      <Cluster justify="between">
        <InlineStatus live dot={publishing || saveState === 'saving' ? 'pulse' : 'static'} tone={saveState === 'error' ? 'danger' : 'neutral'}>{status}</InlineStatus>
        <Cluster>
          <Button onClick={() => setPicker(true)}><Icon name="plus" />Add a block</Button>
          <Button onClick={() => setPreview(true)}><Icon name="eye" />Preview</Button>
          {unpublished && <Button variant="ghost" onClick={() => setDiscarding(true)}>Discard changes</Button>}
          <Button variant="primary" onClick={publish} disabled={publishing} loading={publishing}>{publishing ? 'Publishing…' : 'Publish'}</Button>
        </Cluster>
      </Cluster>
      {summary.length > 0 && <ErrorSummary errors={summary} autoFocus={false} title={summary.length === 1 ? '1 thing to fix before publishing' : `${summary.length} things to fix before publishing`} />}
      {publishError && (
        <Alert tone="danger" live title="The page wasn't published" actions={<Button size="sm" onClick={publish}>Try again</Button>}>
          {publishError} Your draft is kept and guests still see the last published page.
        </Alert>
      )}
      {errors.page && <Alert tone="danger" live>{errors.page}</Alert>}

      {blocks.length === 0 && (
        <Card>
          <EmptyState
            title="Start with a hero"
            headingLevel={3}
            text="A page is built from blocks. The hero says who is celebrating and when; the RSVP block lets guests answer."
            actions={<><Button variant="primary" onClick={() => addBlock('hero')}>Add a hero block</Button><Button onClick={() => setPicker(true)}>Browse blocks</Button></>}
          />
        </Card>
      )}
      <Stack as="ol" aria-label="Page outline">
        {blocks.map((b, i) => {
          const spec = BLOCK_SPECS[b.type];
          const open = !collapsed.has(b.id);
          return (
            <li
              key={b.id}
              className={dropIndex === i ? 'composer-drop' : undefined}
              onDragOver={(e) => { if (dragFrom.current !== null) { e.preventDefault(); setDropIndex(i); } }}
              onDragLeave={() => setDropIndex((d) => (d === i ? null : d))}
              onDrop={(e) => { e.preventDefault(); if (dragFrom.current !== null) moveTo(dragFrom.current, i); dragFrom.current = null; setDropIndex(null); }}
            >
              <Card as="section" aria-label={spec.label}>
                <CardHeader
                  level={3}
                  title={spec.label}
                  subtitle={`Block ${i + 1} of ${blocks.length} · ${spec.description}`}
                  actions={
                    <>
                      <span
                        className="composer-grip"
                        draggable
                        title="Drag to reorder"
                        aria-hidden="true"
                        onDragStart={(e) => { dragFrom.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); }}
                        onDragEnd={() => { dragFrom.current = null; setDropIndex(null); }}
                      >
                        <Icon name="menu" />
                      </span>
                      <Button id={`up-${b.id}`} size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move up ${spec.label}`}>Move up</Button>
                      <Button id={`down-${b.id}`} size="sm" variant="ghost" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label={`Move down ${spec.label}`}>Move down</Button>
                      <Button size="sm" variant={open ? 'ghost' : 'secondary'} aria-expanded={open} onClick={() => setCollapsed((c) => { const n = new Set(c); if (open) n.add(b.id); else n.delete(b.id); return n; })}>{open ? 'Collapse' : 'Expand'}</Button>
                    </>
                  }
                />
                {open && (
                  <Stack>
                    {spec.fields.map((f) => {
                      const value = b.fields[f.key] ?? '';
                      const id = `f-${b.id}.${f.key}`;
                      const over = f.max !== undefined && value.length > f.max;
                      const field = {
                        id,
                        label: f.label,
                        value,
                        optional: !(b.type === 'hero' && f.key === 'headline'),
                        counter: f.max ? `${value.length}/${f.max}` : undefined,
                        error: errors[`${b.id}.${f.key}`] ?? (over ? `${f.label} can be up to ${f.max} characters` : undefined),
                      };
                      return f.multiline
                        ? <Textarea key={f.key} {...field} onChange={(e) => edit(b.id, f.key, e.target.value)} />
                        : <TextField key={f.key} {...field} onChange={(e) => edit(b.id, f.key, e.target.value)} />;
                    })}
                    {b.type === 'rsvp' && <Text tone="muted">The RSVP fields are fixed and cannot be removed individually.</Text>}
                  </Stack>
                )}
                {open && (
                  <CardFooter>
                    <Button size="sm" variant="danger" onClick={() => removeBlock(i)}>Remove block</Button>
                  </CardFooter>
                )}
              </Card>
            </li>
          );
        })}
      </Stack>

      <ToastRegion>
        {undo && <Toast title={`${BLOCK_SPECS[undo.block.type].label} block removed`} actionLabel="Undo" onAction={undoRemove} />}
      </ToastRegion>

      {picker && <BlockPicker full={blocks.length >= MAX_BLOCKS} onAdd={addBlock} onClose={() => setPicker(false)} />}
      {discarding && (
        <DiscardDialog
          eventId={eventId}
          onClose={() => setDiscarding(false)}
          onDiscarded={(res) => { setBlocks(res.draft); lastSaved.current = res.draft; setErrors({}); setNotice('Published'); setDiscarding(false); }}
        />
      )}
    </Stack>
  );
}

/** Add a block: choose a type, then Add block (L2-013 AC1, AC2, AC4). */
function BlockPicker({ full, onAdd, onClose }: { full: boolean; onAdd: (type: BlockType) => boolean; onClose: () => void }) {
  const [choice, setChoice] = useState<BlockType | null>(null);
  const [note, setNote] = useState<string>();

  function add() {
    if (!choice) return setNote('Choose a block to add');
    if (full || !onAdd(choice)) return setNote('A page can have up to 12 blocks');
    onClose();
  }

  return (
    <Dialog
      title="Add a block"
      description="Blocks are added to the end of the page. Reorder them afterwards."
      size="lg"
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={add}>Add block</Button></>}
    >
      {note && <Alert tone="danger" live>{note}</Alert>}
      <Grid as="div" auto role="group" aria-label="Block types">
        {BLOCK_TYPES.map((t) => (
          <Card key={t} selected={choice === t} onClick={() => { setChoice(t); setNote(undefined); }} aria-label={`${BLOCK_SPECS[t].label}: ${BLOCK_SPECS[t].description}`}>
            <CardHeader level="none" title={BLOCK_SPECS[t].label} subtitle={BLOCK_SPECS[t].description} />
          </Card>
        ))}
      </Grid>
    </Dialog>
  );
}

/** Discard unpublished changes, with busy and failed states (L2-016 AC1, AC2, AC4). */
function DiscardDialog({ eventId, onClose, onDiscarded }: { eventId: number; onClose: () => void; onDiscarded: (res: PageState) => void }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function discard() {
    if (busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      onDiscarded(await post<PageState>(`/api/events/${eventId}/page/discard`));
    } catch (err) {
      setFailure((err as ApiError).message); // the draft is unchanged
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Discard unpublished changes?"
      description="Your published page stays as it is."
      tone="danger"
      busy={busy}
      initialFocus="footer"
      onClose={onClose}
      footer={<><Button onClick={onClose} disabled={busy}>Keep editing</Button><Button variant="danger" onClick={discard} disabled={busy} loading={busy}>{busy ? 'Discarding…' : 'Discard'}</Button></>}
    >
      {failure && (
        <Alert tone="danger" live title="Nothing was discarded" actions={<Button size="sm" onClick={discard}>Try again</Button>}>
          {failure} Your edits are still on the page.
        </Alert>
      )}
      <p>Every edit since the last publish will be lost.</p>
    </Dialog>
  );
}
