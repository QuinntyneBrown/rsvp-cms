import cookieParser from 'cookie-parser';
import express from 'express';
import { authRoutes, requireAuth } from './auth.js';
import type { Ctx } from './context.js';
import { eventRoutes } from './events/routes.js';
import { guestRoutes } from './guests/routes.js';
import { publicRoutes } from './public/routes.js';
import { responseRoutes } from './responses/routes.js';

export function createApp(ctx: Ctx) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoutes(ctx));
  app.use('/api/public', publicRoutes(ctx));

  const auth = requireAuth(ctx);
  app.use('/api/events', auth, eventRoutes(ctx), guestRoutes(ctx), responseRoutes(ctx));

  return app;
}
