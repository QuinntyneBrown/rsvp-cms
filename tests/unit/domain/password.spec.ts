import { describe, expect, it } from 'vitest';
import { hashPassword, validateNewPassword, verifyPassword } from '../../../src/domain/password.js';

describe('passwords (L2-001, L2-060)', () => {
  it('hashes with a random salt and verifies only the right password', () => {
    const a = hashPassword('correct horse');
    expect(a).not.toBe(hashPassword('correct horse'));
    expect(verifyPassword('correct horse', a)).toBe(true);
    expect(verifyPassword('wrong', a)).toBe(false);
    expect(verifyPassword('x', 'garbage')).toBe(false);
  });

  it('requires 12 characters and not the email address', () => {
    expect(validateNewPassword('x'.repeat(11), 'a@b.co').ok).toBe(false);
    expect(validateNewPassword('x'.repeat(12), 'a@b.co').ok).toBe(true);
    expect(validateNewPassword('Olivia@Example.com', 'olivia@example.com').ok).toBe(false);
  });
});
