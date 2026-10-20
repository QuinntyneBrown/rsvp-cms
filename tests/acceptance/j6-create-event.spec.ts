import { describe, expect, it } from 'vitest';
import { futureEvent, makeEnv } from '../helpers.js';

async function signedIn() {
  const env = makeEnv();
  const { cookie } = await env.signIn();
  const post = (body: Record<string, unknown>) => env.api.post('/api/events').set('Cookie', cookie).send(body);
  return { env, cookie, post };
}

describe('L2-006 Create an event', () => {
  it('AC1 creates a Draft event and redirects to its overview', async () => {
    const { post } = await signedIn();
    const res = await post(futureEvent());
    expect(res.status).toBe(201);
    expect(res.body.event.status).toBe('Draft');
    expect(res.body.redirect).toBe(`/events/${res.body.event.id}`);
  });

  it('AC2 rejects an empty or over-long name and saves nothing', async () => {
    const { post, env, cookie } = await signedIn();
    expect((await post(futureEvent({ name: '' }))).body.errors.name).toBeTruthy();
    expect((await post(futureEvent({ name: 'x'.repeat(121) }))).status).toBe(422);
    const list = await env.api.get('/api/events').set('Cookie', cookie);
    expect(list.body.events).toHaveLength(0);
  });

  it('AC3 rejects a past date with "Pick a date in the future"', async () => {
    const { post } = await signedIn();
    const res = await post(futureEvent({ date: '2026-01-01' }));
    expect(res.body.errors.date).toBe('Pick a date in the future');
  });

  it('requires sign-in and hides other organisers\' events', async () => {
    const { env, post } = await signedIn();
    expect((await env.api.post('/api/events').send(futureEvent())).status).toBe(401);
    const created = await post(futureEvent());
    expect((await env.api.get(`/api/events/${created.body.event.id}`)).status).toBe(401);
  });
});
