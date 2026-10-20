import { Router, type NextFunction, type Request, type Response } from 'express';
import { createSession, deleteSession, findOrganiserByEmail, findOrganiserById, findSession, touchSession } from '../data/repos.js';
import { verifyPassword } from '../domain/password.js';
import { EMAIL_RE } from '../domain/result.js';
import { isSessionAlive, REMEMBER_MS } from '../domain/session.js';
import { body, type Ctx } from './context.js';

const COOKIE = 'sid';
const GENERIC_ERROR = 'Email or password is not right';

export function requireAuth(ctx: Ctx) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sid = req.cookies?.[COOKIE] as string | undefined;
    const session = sid ? findSession(ctx.db, sid) : undefined;
    const now = ctx.now();
    const organiser = session ? findOrganiserById(ctx.db, Number(session.organiser_id)) : undefined;
    const alive =
      session &&
      organiser &&
      organiser.password_version === session.password_version &&
      isSessionAlive({ lastSeen: Number(session.last_seen), expiresAt: session.expires_at === null ? null : Number(session.expires_at) }, now);
    if (!sid || !session || !organiser || !alive) {
      if (sid && session) deleteSession(ctx.db, sid);
      const idle = Boolean(session && organiser);
      res.status(401).json({ error: idle ? 'Your session ended. Sign in again.' : 'Sign in to continue' });
      return;
    }
    touchSession(ctx.db, sid, now);
    res.locals.organiserId = organiser.id;
    res.locals.organiserName = organiser.name;
    next();
  };
}

export function authRoutes(ctx: Ctx): Router {
  const r = Router();

  r.post('/sign-in', (req, res) => {
    const { email, password, keepSignedIn } = body(req);
    const mail = String(email ?? '').trim();
    if (!EMAIL_RE.test(mail)) {
      res.status(422).json({ errors: { email: 'Enter an email like name@example.com' } });
      return;
    }
    const organiser = findOrganiserByEmail(ctx.db, mail);
    if (!organiser || !verifyPassword(String(password ?? ''), String(organiser.password_hash))) {
      res.status(401).json({ error: GENERIC_ERROR });
      return;
    }
    const now = ctx.now();
    const remember = keepSignedIn === true;
    const sid = createSession(ctx.db, Number(organiser.id), Number(organiser.password_version), now, remember ? now + REMEMBER_MS : null);
    res.cookie(COOKIE, sid, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      ...(remember ? { maxAge: REMEMBER_MS } : {}),
    });
    res.json({ redirect: '/dashboard', name: organiser.name });
  });

  r.post('/sign-out', (req, res) => {
    const sid = req.cookies?.[COOKIE] as string | undefined;
    if (sid) deleteSession(ctx.db, sid);
    res.clearCookie(COOKIE);
    res.status(204).end();
  });

  r.get('/me', requireAuth(ctx), (_req, res) => {
    res.json({ id: res.locals.organiserId, name: res.locals.organiserName });
  });

  return r;
}
