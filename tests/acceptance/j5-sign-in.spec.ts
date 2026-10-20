import { describe, expect, it } from 'vitest';
import { setPassword } from '../../src/data/repos.js';
import { hashPassword } from '../../src/domain/password.js';
import { makeEnv } from '../helpers.js';

describe('L2-001 Sign in', () => {
  it('AC1 redirects to the dashboard with an HttpOnly, Secure, SameSite=Lax cookie', async () => {
    const { res } = await makeEnv().signIn();
    expect(res.status).toBe(200);
    expect(res.body.redirect).toBe('/dashboard');
    const cookie = String((res.headers['set-cookie'] as unknown as string[])[0]);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('AC2 gives one generic error for a wrong password or unknown email', async () => {
    const env = makeEnv();
    const bad = await env.api.post('/api/auth/sign-in').send({ email: 'olivia@example.com', password: 'nope' });
    const unknown = await env.api.post('/api/auth/sign-in').send({ email: 'x@example.com', password: 'nope' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('Email or password is not right');
    expect(unknown.body).toEqual(bad.body);
  });

  it('AC3 rejects a malformed email', async () => {
    const res = await makeEnv().api.post('/api/auth/sign-in').send({ email: 'nope', password: 'x' });
    expect(res.status).toBe(422);
    expect(res.body.errors.email).toBeTruthy();
  });
});

describe('L2-005 Session lifetime', () => {
  it('AC1 "keep me signed in" lasts 30 days, otherwise the cookie is a browser-session cookie', async () => {
    const env = makeEnv();
    const kept = await env.signIn('olivia@example.com', true);
    const plain = await env.signIn('olivia@example.com', false);
    expect(String((kept.res.headers['set-cookie'] as unknown as string[])[0])).toMatch(/Max-Age=2592000/);
    expect(String((plain.res.headers['set-cookie'] as unknown as string[])[0])).not.toMatch(/Max-Age|Expires/i);
    const start = env.clock.now;
    let status = 200;
    while (status === 200) {
      env.clock.now += 6 * 3600 * 1000; // active every 6h, so only the 30-day limit can end it
      status = (await env.api.get('/api/auth/me').set('Cookie', kept.cookie)).status;
    }
    const days = (env.clock.now - start) / (24 * 3600 * 1000);
    expect(days).toBeGreaterThanOrEqual(30);
    expect(days).toBeLessThan(30.5);
  });

  it('AC2 sends the organiser back after 8 hours idle with a message', async () => {
    const env = makeEnv();
    const { cookie } = await env.signIn();
    env.clock.now += 7 * 3600 * 1000;
    expect((await env.api.get('/api/auth/me').set('Cookie', cookie)).status).toBe(200);
    env.clock.now += 8 * 3600 * 1000 + 1;
    const res = await env.api.get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Your session ended. Sign in again.');
  });

  it('AC3 sign-out invalidates the server session so the old cookie returns 401', async () => {
    const env = makeEnv();
    const { cookie } = await env.signIn();
    await env.api.post('/api/auth/sign-out').set('Cookie', cookie);
    expect((await env.api.get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });

  it('AC4 a password change ends other sessions', async () => {
    const env = makeEnv();
    const { cookie } = await env.signIn();
    setPassword(env.db, env.organiserId, hashPassword('new password'));
    expect((await env.api.get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });
});
