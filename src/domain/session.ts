export const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000;
export const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionState {
  lastSeen: number;
  expiresAt: number | null; // null = ends with the browser session
}

export function isSessionAlive(s: SessionState, now: number): boolean {
  if (now - s.lastSeen > IDLE_LIMIT_MS) return false;
  return s.expiresAt === null || now < s.expiresAt;
}
