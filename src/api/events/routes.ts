import { Router } from 'express';
import { createEvent, discardDraft, getEvent, getPage, listEvents, publishDraft, saveDraft, type EventRecord, type PageRecord } from '../../data/repos.js';
import { MAX_BLOCKS, parseBlocks, validateBlocks } from '../../domain/blocks.js';
import { validateNewEvent } from '../../domain/events.js';
import { body, eventOf, isoDate, organiserId, ownEvent, type Ctx } from '../context.js';

const eventJson = (e: EventRecord) => ({
  id: e.id,
  type: e.type,
  name: e.name,
  date: e.date,
  startTime: e.startTime,
  venue: e.venue,
  status: e.status,
  inviteOpen: e.inviteOpen,
  inviteClose: e.inviteClose,
});

const pageJson = (p: PageRecord) => ({
  ...p,
  hasUnpublishedChanges: JSON.stringify(p.draft) !== JSON.stringify(p.published ?? []),
});

export function eventRoutes(ctx: Ctx): Router {
  const r = Router();
  const own = ownEvent(ctx);

  r.get('/', async (_req, res) => {
    res.json({ events: (await listEvents(ctx.db, organiserId(res))).map(eventJson) });
  });

  r.post('/', async (req, res) => {
    const v = validateNewEvent(body(req), isoDate(ctx.now()));
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    const id = await createEvent(ctx.db, organiserId(res), v.value, isoDate(ctx.now()));
    res.status(201).json({ event: eventJson((await getEvent(ctx.db, id))!), redirect: `/events/${id}` });
  });

  r.get('/:id', own, (_req, res) => {
    res.json({ event: eventJson(eventOf(res)) });
  });

  // ---- page composer (draft / publish / discard / preview) -----------------

  r.get('/:id/page', own, async (_req, res) => {
    res.json(pageJson(await getPage(ctx.db, eventOf(res).id)));
  });

  r.put('/:id/page/draft', own, async (req, res) => {
    const blocks = parseBlocks(body(req).blocks);
    if (!blocks) {
      res.status(400).json({ error: 'Blocks are invalid' });
      return;
    }
    // Autosave stores what the organiser typed, but never an over-long page.
    if (blocks.length > MAX_BLOCKS) {
      res.status(422).json({ errors: { page: 'A page can have up to 12 blocks' } });
      return;
    }
    await saveDraft(ctx.db, eventOf(res).id, blocks, ctx.now());
    res.json(pageJson(await getPage(ctx.db, eventOf(res).id)));
  });

  r.post('/:id/page/publish', own, async (_req, res) => {
    const page = await getPage(ctx.db, eventOf(res).id);
    const errors = validateBlocks(page.draft);
    if (Object.keys(errors).length) {
      res.status(422).json({ errors, firstInvalid: Object.keys(errors)[0] });
      return;
    }
    await publishDraft(ctx.db, eventOf(res).id, page.draft, ctx.now());
    res.json(pageJson(await getPage(ctx.db, eventOf(res).id)));
  });

  r.post('/:id/page/discard', own, async (_req, res) => {
    await discardDraft(ctx.db, eventOf(res).id);
    res.json(pageJson(await getPage(ctx.db, eventOf(res).id)));
  });

  /** Preview renders the draft; the public endpoint only ever serves the published blocks. */
  r.get('/:id/page/preview', own, async (_req, res) => {
    const page = await getPage(ctx.db, eventOf(res).id);
    res.json({ event: eventJson(eventOf(res)), blocks: page.draft });
  });

  return r;
}
