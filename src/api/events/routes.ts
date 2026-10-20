import { Router } from 'express';
import { createEvent, discardDraft, getEvent, getPage, listEvents, publishDraft, saveDraft } from '../../data/repos.js';
import { parseBlocks, validateBlocks, type Block } from '../../domain/blocks.js';
import { validateNewEvent } from '../../domain/events.js';
import { body, eventOf, isoDate, isoStamp, organiserId, ownEvent, type Ctx } from '../context.js';

const eventJson = (e: Record<string, unknown>) => ({
  id: e.id,
  type: e.type,
  name: e.name,
  date: e.date,
  startTime: e.start_time,
  venue: e.venue,
  status: e.status,
  inviteOpen: e.invite_open,
  inviteClose: e.invite_close,
});

function pageJson(row: Record<string, unknown>) {
  const draft = JSON.parse(String(row.draft)) as Block[];
  const published = row.published === null ? null : (JSON.parse(String(row.published)) as Block[]);
  return {
    draft,
    published,
    draftSavedAt: row.draft_saved_at,
    publishedAt: row.published_at,
    hasUnpublishedChanges: JSON.stringify(draft) !== JSON.stringify(published ?? []),
  };
}

export function eventRoutes(ctx: Ctx): Router {
  const r = Router();
  const own = ownEvent(ctx);

  r.get('/', (_req, res) => {
    res.json({ events: listEvents(ctx.db, organiserId(res)).map(eventJson) });
  });

  r.post('/', (req, res) => {
    const v = validateNewEvent(body(req), isoDate(ctx.now()));
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    const id = createEvent(ctx.db, organiserId(res), v.value, isoDate(ctx.now()));
    res.status(201).json({ event: eventJson(getEvent(ctx.db, id)!), redirect: `/events/${id}` });
  });

  r.get('/:id', own, (_req, res) => {
    res.json({ event: eventJson(eventOf(res)) });
  });

  // ---- page composer (draft / publish / discard / preview) -----------------

  r.get('/:id/page', own, (_req, res) => {
    res.json(pageJson(getPage(ctx.db, eventOf(res).id)!));
  });

  r.put('/:id/page/draft', own, (req, res) => {
    const blocks = parseBlocks(body(req).blocks);
    if (!blocks) {
      res.status(400).json({ error: 'Blocks are invalid' });
      return;
    }
    // Autosave stores what the organiser typed, but never an over-long page.
    if (blocks.length > 12) {
      res.status(422).json({ errors: { page: 'A page can have up to 12 blocks' } });
      return;
    }
    saveDraft(ctx.db, eventOf(res).id, blocks, isoStamp(ctx.now()));
    res.json(pageJson(getPage(ctx.db, eventOf(res).id)!));
  });

  r.post('/:id/page/publish', own, (_req, res) => {
    const page = getPage(ctx.db, eventOf(res).id)!;
    const errors = validateBlocks(JSON.parse(String(page.draft)) as Block[]);
    if (Object.keys(errors).length) {
      res.status(422).json({ errors, firstInvalid: Object.keys(errors)[0] });
      return;
    }
    publishDraft(ctx.db, eventOf(res).id, isoStamp(ctx.now()));
    res.json(pageJson(getPage(ctx.db, eventOf(res).id)!));
  });

  r.post('/:id/page/discard', own, (_req, res) => {
    discardDraft(ctx.db, eventOf(res).id);
    res.json(pageJson(getPage(ctx.db, eventOf(res).id)!));
  });

  /** Preview renders the draft; the public endpoint only ever serves the published blocks. */
  r.get('/:id/page/preview', own, (_req, res) => {
    const page = pageJson(getPage(ctx.db, eventOf(res).id)!);
    res.json({ event: eventJson(eventOf(res)), blocks: page.draft });
  });

  return r;
}
