import { Router } from 'express';
import { DuplicateError } from '../../data/store.js';
import { checkImportFile, reviewImport, type CheckedFile } from '../../domain/guestImport.js';
import { body, eventOf, ownEvent, type Ctx } from '../context.js';

/**
 * Guest CSV import (L2-025, L2-026). The file travels base64-encoded in JSON. Review checks it and every row
 * without saving anything; import checks it again and creates the ready rows, so nothing is saved until the
 * organiser confirms and a retried import skips the guests it already created.
 */
export function importRoutes(ctx: Ctx): Router {
  const r = Router();
  const own = ownEvent(ctx);

  const fileOf = (input: Record<string, unknown>): CheckedFile =>
    checkImportFile(String(input.fileName ?? ''), Buffer.from(String(input.content ?? ''), 'base64'));

  r.post('/:id/guests/import/review', own, async (req, res) => {
    const file = fileOf(body(req));
    if (!file.ok) {
      res.status(422).json({ errors: { file: file.error } });
      return;
    }
    const review = reviewImport(file, await ctx.store.guestEmails(eventOf(res).id));
    res.json({ columns: file.columns, ...review });
  });

  r.post('/:id/guests/import', own, async (req, res) => {
    const input = body(req);
    const file = fileOf(input);
    if (!file.ok) {
      res.status(422).json({ errors: { file: file.error } });
      return;
    }
    const eventId = eventOf(res).id;
    const review = reviewImport(file, await ctx.store.guestEmails(eventId));
    if (review.counts.error && input.skipErrors !== true) {
      res.status(422).json({ error: 'Fix the rows with errors, or leave them out' });
      return;
    }
    if (review.rows.some((row) => row.status === 'ready' && row.groupNotice) && input.acceptGroups !== true) {
      res.status(422).json({ error: 'Accept the group changes to continue' });
      return;
    }
    let imported = 0;
    let failed = 0;
    let raced = 0;
    for (const row of review.rows.filter((x) => x.status === 'ready')) {
      try {
        await ctx.store.insertGuest(eventId, { name: row.name, email: row.email, group: row.group, plusOnes: row.plusOnes }, ctx.now());
        imported++;
      } catch (e) {
        if (e instanceof DuplicateError) raced++; // added meanwhile, e.g. by a retry still running
        else failed++;
      }
    }
    res.json({ imported, skipped: review.counts.error + review.counts.duplicate + raced, failed });
  });

  return r;
}
