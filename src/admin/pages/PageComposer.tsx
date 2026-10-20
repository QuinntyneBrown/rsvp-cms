import { useEffect, useRef, useState } from 'react';
import { BLOCK_TYPES, MAX_BLOCKS, type Block, type BlockType } from '../../domain/blocks.js';
import { ApiError, get, post, put } from '../../shared/ui/api.js';
import { BLOCK_SPECS, BlockView } from '../../shared/ui/blocks.js';
import { Alert, Button, Card, Cluster, Dialog, EmptyState, InlineStatus, List, ListItem, Skeleton, Stack, Textarea, TextField } from '../../shared/ui/components/index.js';
import { Text } from '../../shared/ui/primitives/index.js';
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
  if (error || !data) return <EmptyState tone="error" title={error ?? 'Could not load the page'} actions={<Button onClick={reload}>Try again</Button>} />;
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
      <Stack>
        <Cluster justify="between">
          <h2>Preview</h2>
          <Button onClick={() => setPreview(false)}>Back to editing</Button>
        </Cluster>
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
      <Cluster justify="between">
        <h2>Event page</h2>
        <InlineStatus live tone={saveState === 'error' ? 'danger' : 'neutral'}>{status}</InlineStatus>
      </Cluster>
      <Cluster>
        <Button variant="primary" onClick={publish} disabled={publishing} loading={publishing}>Publish</Button>
        <Button onClick={() => setPreview(true)}>Preview</Button>
        {unpublished && <Button variant="ghost" onClick={() => setDiscarding(true)}>Discard changes</Button>}
        <Button onClick={() => { setPickerNote(undefined); setPicker(true); }}>Add a block</Button>
      </Cluster>
      {publishError && <Alert tone="danger" live actions={<Button size="sm" onClick={publish}>Try again</Button>}>{publishError}</Alert>}
      {errors.page && <Alert tone="danger" live>{errors.page}</Alert>}
      {undo && <Alert actions={<Button size="sm" onClick={undoRemove}>Undo</Button>}>Block removed.</Alert>}

      {blocks.length === 0 && <EmptyState compact title="No blocks yet" text="Add a block to start your page." />}
      <Stack as="ol" aria-label="Page outline">
        {blocks.map((b, i) => {
          const spec = BLOCK_SPECS[b.type];
          const open = !collapsed.has(b.id);
          return (
            <li key={b.id}>
              <Card>
                <Stack>
                  <Cluster justify="between">
                    <strong>{spec.label}</strong>
                    <Cluster>
                      <Button id={`up-${b.id}`} size="sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move up ${spec.label}`}>Move up</Button>
                      <Button id={`down-${b.id}`} size="sm" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label={`Move down ${spec.label}`}>Move down</Button>
                      <Button size="sm" aria-expanded={open} onClick={() => setCollapsed((c) => { const n = new Set(c); if (open) n.add(b.id); else n.delete(b.id); return n; })}>{open ? 'Collapse' : 'Expand'}</Button>
                      <Button size="sm" variant="danger" onClick={() => removeBlock(i)}>Remove block</Button>
                    </Cluster>
                  </Cluster>
                  {open && spec.fields.map((f) => {
                    const value = b.fields[f.key] ?? '';
                    const id = `f-${b.id}.${f.key}`;
                    const over = f.max !== undefined && value.length > f.max;
                    const field = {
                      id,
                      label: f.label,
                      value,
                      counter: f.max ? `${value.length}/${f.max}` : undefined,
                      error: errors[`${b.id}.${f.key}`] ?? (over ? `${f.label} can be up to ${f.max} characters` : undefined),
                    };
                    return f.multiline
                      ? <Textarea key={f.key} {...field} onChange={(e) => edit(b.id, f.key, e.target.value)} />
                      : <TextField key={f.key} {...field} onChange={(e) => edit(b.id, f.key, e.target.value)} />;
                  })}
                  {open && b.type === 'rsvp' && <Text tone="muted">The RSVP fields are fixed and cannot be removed individually.</Text>}
                </Stack>
              </Card>
            </li>
          );
        })}
      </Stack>

      {picker && (
        <Dialog title="Add a block" onClose={() => setPicker(false)} footer={<Button onClick={() => setPicker(false)}>Close</Button>}>
          {pickerNote && <Alert tone="danger" live>{pickerNote}</Alert>}
          <List aria-label="Block types">
            {BLOCK_TYPES.map((t) => (
              <ListItem
                key={t}
                title={BLOCK_SPECS[t].label}
                meta={BLOCK_SPECS[t].description}
                trailing={<Button size="sm" onClick={() => addBlock(t)}>Add {BLOCK_SPECS[t].label}</Button>}
              />
            ))}
          </List>
        </Dialog>
      )}
      {discarding && (
        <Dialog
          title="Discard unpublished changes?"
          tone="danger"
          onClose={() => setDiscarding(false)}
          footer={<><Button onClick={() => setDiscarding(false)}>Keep editing</Button><Button variant="danger" onClick={discard}>Discard</Button></>}
        >
          <p>Your page goes back to the last published version.</p>
        </Dialog>
      )}
    </Stack>
  );
}
