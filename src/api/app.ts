import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import { authRoutes, requireAuth } from './auth.js';
import type { Ctx } from './context.js';
import { dashboardRoutes } from './events/dashboard.js';
import { eventRoutes } from './events/routes.js';
import { guestRoutes } from './guests/routes.js';
import { publicRoutes } from './public/routes.js';
import { responseRoutes } from './responses/routes.js';

export function createApp(ctx: Ctx) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRoutes(ctx));
  app.use('/api/public', publicRoutes(ctx));

  const auth = requireAuth(ctx);
  app.use('/api/events', auth, eventRoutes(ctx), guestRoutes(ctx), responseRoutes(ctx));
  app.use('/api/dashboard', auth, dashboardRoutes(ctx));

  // Unexpected failures (e.g. the database is down) answer with a generic message; details stay in the log.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Something went wrong. Try again.' });
  });

  return app;
}
