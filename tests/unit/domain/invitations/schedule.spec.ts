import { describe, expect, it } from 'vitest';
import { invitationText, personalLink, retryDelayMs } from '../../../../src/domain/invitations/message.js';
import { sendTime, validateSchedule } from '../../../../src/domain/invitations/schedule.js';

describe('schedule rules (L2-029, L2-036)', () => {
  it('L2-029 AC2 needs a subject of up to 150 characters, AC3 a send date no later than the close', () => {
    const base = { subject: 'Hi', sendOn: '2026-11-01' };
    expect(validateSchedule({ ...base, subject: 'x'.repeat(150) }, '2026-12-01').ok).toBe(true);
    expect(validateSchedule({ ...base, subject: 'x'.repeat(151) }, '2026-12-01').ok).toBe(false);
    expect(validateSchedule({ ...base, sendOn: '2026-12-01' }, '2026-12-01').ok).toBe(true);
    const late = validateSchedule({ ...base, sendOn: '2026-12-02' }, '2026-12-01');
    expect(!late.ok && late.errors.sendOn).toBe('Invitations must go out before invites close');
  });

  it('L2-036 AC3 strips line breaks from header values', () => {
    const v = validateSchedule({ subject: 'a\r\nb', senderName: 'x\ny', sendOn: '2026-11-01' }, '2026-12-01');
    expect(v.ok && [v.value.subject, v.value.senderName]).toEqual(['a b', 'x y']);
  });

  it('L2-029 AC4 sends at 9:00 am', () => {
    expect(sendTime('2026-11-01')).toBe('2026-11-01T09:00');
  });
});

describe('invitation message (L2-031, L2-033, L2-035)', () => {
  it('greets the guest and carries their link and code', () => {
    const text = invitationText({ guestName: 'Maya', eventName: 'Party', eventDate: '2026-11-14', link: 'https://x/i/t', code: 'MAYA-7K2Q' });
    expect(text).toContain('Hi Maya,');
    expect(text).toContain('https://x/i/t');
    expect(text).toContain('MAYA-7K2Q');
  });

  it('L2-033 AC3 builds the same link for every email to a guest', () => {
    expect(personalLink('https://rsvp.example/', 'a b')).toBe('https://rsvp.example/i/a%20b');
  });

  it('L2-035 AC2 backs off 1, 2, 4, 8 minutes so 5 attempts finish within an hour', () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([60_000, 120_000, 240_000, 480_000]);
    expect([1, 2, 3, 4].map(retryDelayMs).reduce((a, b) => a + b)).toBeLessThan(3_600_000);
  });
});
