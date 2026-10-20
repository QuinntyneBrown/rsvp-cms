import { describe, expect, it } from 'vitest';
import { IDLE_LIMIT_MS, isSessionAlive, REMEMBER_MS } from '../../../src/domain/session.js';

describe('session lifetime (L2-005, L2-001 AC5)', () => {
  it('ends after 8 hours idle', () => {
    expect(isSessionAlive({ lastSeen: 0, expiresAt: null }, IDLE_LIMIT_MS)).toBe(true);
    expect(isSessionAlive({ lastSeen: 0, expiresAt: null }, IDLE_LIMIT_MS + 1)).toBe(false);
  });

  it('ends at its expiry even when active', () => {
    expect(isSessionAlive({ lastSeen: REMEMBER_MS - 1, expiresAt: REMEMBER_MS }, REMEMBER_MS)).toBe(false);
  });
});
