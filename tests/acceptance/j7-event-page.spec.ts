import { describe, expect, it } from 'vitest';
import { addGuest, publish, setup, tokenOf, type Setup } from '../helpers.js';

const hero = (headline: string, extra: Record<string, string> = {}) => ({ id: 'b1', type: 'hero', fields: { headline, ...extra } });
const putDraft = (s: Setup, blocks: unknown[]) => s.api.put(`/api/events/${s.eventId}/page/draft`).set('Cookie', s.cookie).send({ blocks });
const getPage = (s: Setup) => s.api.get(`/api/events/${s.eventId}/page`).set('Cookie', s.cookie);

describe('L2-013 Add and reorder page blocks', () => {
  it('AC2 keeps blocks in the order saved (new blocks are appended by the client)', async () => {
    const s = await setup();
    await putDraft(s, [hero('A'), { id: 'b2', type: 'details', fields: {} }]);
    const page = await getPage(s);
    expect(page.body.draft.map((b: { id: string }) => b.id)).toEqual(['b1', 'b2']);
  });

  it('AC4 refuses a 13th block', async () => {
    const s = await setup();
    const blocks = Array.from({ length: 13 }, (_, i) => ({ id: `b${i}`, type: 'faq', fields: {} }));
    const res = await putDraft(s, blocks);
    expect(res.status).toBe(422);
    expect(res.body.errors.page).toBe('A page can have up to 12 blocks');
  });
});

describe('L2-014 Edit block content', () => {
  it('AC1 does not publish a hero with an empty headline', async () => {
    const s = await setup();
    await putDraft(s, [hero('')]);
    const res = await s.api.post(`/api/events/${s.eventId}/page/publish`).set('Cookie', s.cookie);
    expect(res.status).toBe(422);
    expect(res.body.errors['b1.headline']).toBe('Add a headline');
    expect(res.body.firstInvalid).toBe('b1.headline');
  });

  it('AC2 enforces 120 / 40 character limits', async () => {
    const s = await setup();
    await putDraft(s, [hero('x'.repeat(121), { buttonLabel: 'y'.repeat(41) })]);
    const res = await s.api.post(`/api/events/${s.eventId}/page/publish`).set('Cookie', s.cookie);
    expect(Object.keys(res.body.errors)).toEqual(['b1.headline', 'b1.buttonLabel']);
  });
});

describe('L2-015 Draft and publish', () => {
  it('AC1 saves the draft without publishing it', async () => {
    const s = await setup();
    const res = await putDraft(s, [hero('Draft headline')]);
    expect(res.body.draftSavedAt).toBeTruthy();
    expect(res.body.published).toBeNull();
    expect(res.body.hasUnpublishedChanges).toBe(true);
  });

  it('AC2 publishing updates the public page and AC3 is idempotent', async () => {
    const s = await setup();
    const g = await addGuest(s);
    const first = await publish(s);
    const second = await s.api.post(`/api/events/${s.eventId}/page/publish`).set('Cookie', s.cookie);
    expect(first.status).toBe(200);
    expect(second.body.published).toEqual(first.body.published);
    s.clock.now = Date.parse('2026-10-20T00:00:00Z');
    const pub = await s.api.get(`/api/public/invite/${tokenOf(s, g.id)}`);
    expect(pub.body.blocks[0].fields.headline).toBe('Join us');
  });

  it('AC4 a blocked publish leaves the public page unchanged', async () => {
    const s = await setup();
    await publish(s);
    await putDraft(s, [hero('')]);
    await s.api.post(`/api/events/${s.eventId}/page/publish`).set('Cookie', s.cookie);
    const page = await getPage(s);
    expect(page.body.published[0].fields.headline).toBe('Join us');
  });
});

describe('L2-016 Discard unpublished changes', () => {
  it('AC2 makes the draft match the last published version', async () => {
    const s = await setup();
    await publish(s);
    await putDraft(s, [hero('Edited')]);
    const res = await s.api.post(`/api/events/${s.eventId}/page/discard`).set('Cookie', s.cookie);
    expect(res.body.draft).toEqual(res.body.published);
    expect(res.body.hasUnpublishedChanges).toBe(false);
  });
});

describe('L2-017 Preview', () => {
  it('AC1 previews the draft while AC2 guests only see the published version', async () => {
    const s = await setup();
    const g = await addGuest(s);
    await publish(s);
    await putDraft(s, [hero('Unpublished edit')]);
    const preview = await s.api.get(`/api/events/${s.eventId}/page/preview`).set('Cookie', s.cookie);
    expect(preview.body.blocks[0].fields.headline).toBe('Unpublished edit');
    s.clock.now = Date.parse('2026-10-20T00:00:00Z');
    const guest = await s.api.get(`/api/public/invite/${tokenOf(s, g.id)}`);
    expect(guest.body.blocks[0].fields.headline).toBe('Join us');
  });
});
