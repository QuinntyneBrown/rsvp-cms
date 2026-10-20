import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  createSession, deleteSession, findOrganiserByEmail, findOrganiserById, findSession, setPassword, touchSession,
} from '../data/repos.js';
import { hashPassword, validateNewPassword, verifyPassword } from '../domain/password.js';
import { EMAIL_RE } from '../domain/result.js';
import { isSessionAlive, REMEMBER_MS } from '../domain/session.js';
import { body, type Ctx } from './context.js';

const COOKIE = 'sid';
const GENERIC_ERROR = 'Email or password is not right';
export const SESSION_ENDED = 'Your session ended. Sign in again.';

function setSessionCookie(res: Response, sid: string, remember: boolean) {
  res.cookie(COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    ...(remember ? { maxAge: REMEMBER_MS } : {}),
  });
}

export function requireAuth(ctx: Ctx) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sid = req.cookies?.[COOKIE] as string | undefined;
    const session = sid ? await findSession(ctx.db, sid) : null;
    const now = ctx.now();
    const organiser = session ? await findOrganiserById(ctx.db, session.organiserId) : null;
    const alive =
      session && organiser && organiser.passwordVersion === session.passwordVersion && isSessionAlive(session, now);
    if (!sid || !session || !organiser || !alive) {
      if (sid && session) await deleteSession(ctx.db, sid);
      res.status(401).json({ error: session && organiser ? SESSION_ENDED : 'Sign in to continue' });
      return;
    }
    await touchSession(ctx.db, sid, now);
    res.locals.organiserId = organiser.id;
    res.locals.organiserName = organiser.name;
    res.locals.organiserEmail = organiser.email;
    res.locals.session = session;
    next();
  };
}

export function authRoutes(ctx: Ctx): Router {
  const r = Router();

  r.post('/sign-in', async (req, res) => {
    const { email, password, keepSignedIn } = body(req);
    const mail = String(email ?? '').trim();
    if (!EMAIL_RE.test(mail)) {
      res.status(422).json({ errors: { email: 'Enter an email like name@example.com' } });
      return;
    }
    const organiser = await findOrganiserByEmail(ctx.db, mail);
    if (!organiser || !verifyPassword(String(password ?? ''), organiser.passwordHash)) {
      res.status(401).json({ error: GENERIC_ERROR });
      return;
    }
    const now = ctx.now();
    const remember = keepSignedIn === true;
    const sid = await createSession(ctx.db, organiser.id, organiser.passwordVersion, now, remember ? now + REMEMBER_MS : null);
    setSessionCookie(res, sid, remember);
    res.json({ redirect: '/dashboard', name: organiser.name });
  });

  r.post('/sign-out', async (req, res) => {
    const sid = req.cookies?.[COOKIE] as string | undefined;
    if (sid) await deleteSession(ctx.db, sid);
    res.clearCookie(COOKIE, { httpOnly: true, secure: true, sameSite: 'lax' });
    res.status(204).end();
  });

  r.get('/me', requireAuth(ctx), (_req, res) => {
    res.json({ id: res.locals.organiserId, name: res.locals.organiserName, email: res.locals.organiserEmail });
  });

  /**
   * Changes the password, which ends every other session of the account (L2-005 AC3).
   * This browser gets a fresh session so the organiser stays signed in here.
   */
  r.post('/password', requireAuth(ctx), async (req, res) => {
    const { currentPassword, newPassword } = body(req);
    const organiser = await findOrganiserById(ctx.db, res.locals.organiserId as number);
    if (!organiser) {
      res.status(401).json({ error: SESSION_ENDED });
      return;
    }
    if (!verifyPassword(String(currentPassword ?? ''), organiser.passwordHash)) {
      res.status(422).json({ errors: { currentPassword: 'Your current password is not right' } });
      return;
    }
    const v = validateNewPassword(String(newPassword ?? ''), organiser.email);
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    const version = await setPassword(ctx.db, organiser.id, hashPassword(v.value));
    const old = res.locals.session as { id: string; expiresAt: number | null };
    await deleteSession(ctx.db, old.id);
    const now = ctx.now();
    const remember = old.expiresAt !== null;
    const sid = await createSession(ctx.db, organiser.id, version, now, remember ? now + REMEMBER_MS : null);
    setSessionCookie(res, sid, remember);
    res.json({ message: 'Password changed. You were signed out on your other devices.' });
  });

  return r;
}
