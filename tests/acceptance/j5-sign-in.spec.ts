import { describe, expect, it } from 'vitest';
import { setPassword } from '../../src/data/repos.js';
import { hashPassword } from '../../src/domain/password.js';
import { cookieOf, makeEnv, PASSWORD, type Env } from '../helpers.js';

describe('L2-001 Sign in', () => {
  it('AC1 redirects to the dashboard with an HttpOnly, Secure, SameSite=Lax cookie', async () => {
    const { res } = await (await makeEnv()).signIn();
    expect(res.status).toBe(200);
    expect(res.body.redirect).toBe('/dashboard');
    const cookie = String((res.headers['set-cookie'] as unknown as string[])[0]);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('AC2 gives one generic error for a wrong password or unknown email', async () => {
    const env = await makeEnv();
    const bad = await env.api.post('/api/auth/sign-in').send({ email: 'olivia@example.com', password: 'nope' });
    const unknown = await env.api.post('/api/auth/sign-in').send({ email: 'x@example.com', password: 'nope' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('Email or password is not right');
    expect(unknown.body).toEqual(bad.body);
  });

  it('AC3 rejects a malformed email', async () => {
    const res = await (await makeEnv()).api.post('/api/auth/sign-in').send({ email: 'nope', password: 'x' });
    expect(res.status).toBe(422);
    expect(res.body.errors.email).toBeTruthy();
  });
});

describe('L2-005 Session lifetime', () => {
  it('AC1 "keep me signed in" lasts 30 days, otherwise the cookie is a browser-session cookie', async () => {
    const env = await makeEnv();
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
    const env = await makeEnv();
    const { cookie } = await env.signIn();
    env.clock.now += 7 * 3600 * 1000;
    expect((await env.api.get('/api/auth/me').set('Cookie', cookie)).status).toBe(200);
    env.clock.now += 8 * 3600 * 1000 + 1;
    const res = await env.api.get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Your session ended. Sign in again.');
  });

  it('AC3 sign-out invalidates the server session so the old cookie returns 401', async () => {
    const env = await makeEnv();
    const { cookie } = await env.signIn();
    await env.api.post('/api/auth/sign-out').set('Cookie', cookie);
    expect((await env.api.get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });

  it('AC4 a password change ends other sessions', async () => {
    const env = await makeEnv();
    const { cookie } = await env.signIn();
    await setPassword(env.db, env.organiserId, hashPassword('new password'), env.clock.now);
    expect((await env.api.get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });
});

describe('L2-005 AC3 / L2-060 Changing the password ends the other sessions', () => {
  const change = (env: Env, cookie: string, b: Record<string, unknown>) => env.api.post('/api/auth/password').set('Cookie', cookie).send(b);

  it('signs out every other device and keeps this one signed in', async () => {
    const env = await makeEnv();
    const laptop = await env.signIn();
    const phone = await env.signIn();
    const res = await change(env, laptop.cookie, { currentPassword: PASSWORD, newPassword: 'a much longer secret' });
    expect(res.status).toBe(200);
    const fresh = cookieOf(res);
    expect(fresh).toMatch(/^sid=/);
    expect(fresh).not.toBe(laptop.cookie);
    expect((await env.api.get('/api/auth/me').set('Cookie', phone.cookie)).body.error).toBe('Your session ended. Sign in again.');
    expect((await env.api.get('/api/auth/me').set('Cookie', laptop.cookie)).status).toBe(401);
    expect((await env.api.get('/api/auth/me').set('Cookie', fresh)).status).toBe(200);
    expect((await env.signIn('olivia@example.com', false, 'a much longer secret')).res.status).toBe(200);
    expect((await env.signIn()).res.status).toBe(401);
  });

  it('keeps "keep me signed in" for this device', async () => {
    const env = await makeEnv();
    const kept = await env.signIn('olivia@example.com', true);
    const res = await change(env, kept.cookie, { currentPassword: PASSWORD, newPassword: 'a much longer secret' });
    expect(String((res.headers['set-cookie'] as unknown as string[])[0])).toMatch(/Max-Age=2592000/);
  });

  it('checks the current password and the new password rules, and changes nothing on error', async () => {
    const env = await makeEnv();
    const { cookie } = await env.signIn();
    const wrong = await change(env, cookie, { currentPassword: 'nope', newPassword: 'a much longer secret' });
    expect(wrong.status).toBe(422);
    expect(wrong.body.errors.currentPassword).toBe('Current password is not right');
    const short = await change(env, cookie, { currentPassword: PASSWORD, newPassword: 'short' });
    expect(short.body.errors.newPassword).toBe('Use at least 12 characters');
    const email = await change(env, cookie, { currentPassword: PASSWORD, newPassword: 'Olivia@Example.com' });
    expect(email.body.errors.newPassword).toBe("Your password can't be your email address");
    const same = await change(env, cookie, { currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(same.body.errors.newPassword).toBe('Choose a different password');
    expect((await env.api.get('/api/auth/me').set('Cookie', cookie)).status).toBe(200);
    expect((await env.signIn()).res.status).toBe(200);
  });

  it('requires a signed-in session', async () => {
    const env = await makeEnv();
    expect((await env.api.post('/api/auth/password').send({})).status).toBe(401);
  });
});

describe('L2-060 Password change time', () => {
  it('records when the password was last changed', async () => {
    const env = await makeEnv();
    const { cookie } = await env.signIn();
    expect((await env.api.get('/api/auth/me').set('Cookie', cookie)).body.passwordChangedAt).toBeNull();
    const res = await env.api.post('/api/auth/password').set('Cookie', cookie).send({ currentPassword: PASSWORD, newPassword: 'a much longer secret' });
    const me = await env.api.get('/api/auth/me').set('Cookie', cookieOf(res));
    expect(me.body.passwordChangedAt).toBe(new Date(env.clock.now).toISOString());
  });
});
