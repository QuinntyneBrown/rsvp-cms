import { describe, expect, it } from 'vitest';
import { addGuest, setup, type Setup } from '../helpers.js';

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const CSV = 'name,email,group,plus-ones\nMaya Chen,maya@example.com,Friends,1\nSam Okafor,sam@example.com,Family,0\nNo Email,,Work,0\nOld Friend,old@example.com,Friends,0\n';

const review = (s: Setup, body: Record<string, unknown>) => s.api.post(`/api/events/${s.eventId}/guests/import/review`).set('Cookie', s.cookie).send(body);
const commit = (s: Setup, body: Record<string, unknown>) => s.api.post(`/api/events/${s.eventId}/guests/import`).set('Cookie', s.cookie).send(body);

describe('L2-025 / L2-026 Import guests from a CSV file', () => {
  it('L2-025 AC1/AC4/AC5 a file that fails a check is refused with its reason and nothing is saved', async () => {
    const s = await setup();
    expect((await review(s, { fileName: 'g.xlsx', content: b64(CSV) })).body.errors.file).toBe('Choose a .csv file');
    expect((await review(s, { fileName: 'g.csv', content: b64('name\nMaya') })).body.errors.file).toBe('Email is needed to send invitations');
    const latin1 = Buffer.from([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0xe9]).toString('base64');
    expect((await review(s, { fileName: 'g.csv', content: latin1 })).body.errors.file).toBe('The file must be saved as UTF-8');
    expect(s.store.guests.size).toBe(0);
  });

  it('L2-025 AC3 / L2-026 AC1-2 reviews the columns and every row without saving anything', async () => {
    const s = await setup();
    await addGuest(s, { name: 'Old Friend', email: 'old@example.com' });
    const res = await review(s, { fileName: 'guests.csv', content: b64(CSV) });
    expect(res.status).toBe(200);
    expect(res.body.columns.map((c: { field: string }) => c.field)).toEqual(['name', 'email', 'group', 'plusOnes']);
    expect(res.body.counts).toEqual({ ready: 2, error: 1, duplicate: 1 });
    expect(res.body.rows[2]).toMatchObject({ row: 4, status: 'error', problem: 'Enter an email like name@example.com' });
    expect(s.store.guests.size).toBe(1);
  });

  it('L2-026 AC1 refuses to import while rows have errors unless they are left out', async () => {
    const s = await setup();
    const refused = await commit(s, { fileName: 'guests.csv', content: b64(CSV) });
    expect(refused.status).toBe(422);
    expect(refused.body.error).toBe('Fix the rows with errors, or leave them out');
    expect(s.store.guests.size).toBe(0);
  });

  it('L2-026 AC2/AC3 imports the ready rows, skips duplicates and reports imported, skipped and failed', async () => {
    const s = await setup();
    await addGuest(s, { name: 'Old Friend', email: 'old@example.com' });
    const res = await commit(s, { fileName: 'guests.csv', content: b64(CSV), skipErrors: true });
    expect(res.body).toEqual({ imported: 2, skipped: 2, failed: 0 });
    const names = [...s.store.guests.values()].map((g) => g.name).sort();
    expect(names).toEqual(['Maya Chen', 'Old Friend', 'Sam Okafor']);
    expect([...s.store.guests.values()].find((g) => g.name === 'Maya Chen')).toMatchObject({ group: 'Friends', plusOnes: 1 });
  });

  it('L2-026 AC4 retrying an interrupted import creates no guest twice', async () => {
    const s = await setup();
    const body = { fileName: 'guests.csv', content: b64(CSV), skipErrors: true };
    await commit(s, body);
    const again = await commit(s, body);
    expect(again.body).toEqual({ imported: 0, skipped: 4, failed: 0 });
    expect(s.store.guests.size).toBe(3);
  });

  it('L2-026 AC5 an unknown group becomes Friends only once the organiser accepts it', async () => {
    const s = await setup();
    const file = { fileName: 'g.csv', content: b64('name,email,group\nMaya,maya@example.com,Neighbours\n') };
    const refused = await commit(s, file);
    expect(refused.status).toBe(422);
    expect(refused.body.error).toBe('Accept the group changes to continue');
    const res = await commit(s, { ...file, acceptGroups: true });
    expect(res.body.imported).toBe(1);
    expect([...s.store.guests.values()][0]!.group).toBe('Friends');
  });

  it('needs the organiser who owns the event', async () => {
    const s = await setup();
    expect((await s.api.post(`/api/events/${s.eventId}/guests/import`).send({})).status).toBe(401);
  });
});
