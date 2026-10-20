import type { Block } from '../../../src/domain/blocks.js';
import { expect, test } from '../support/fixtures.js';

const page: Block[] = [
  { id: 'b1', type: 'hero', fields: { headline: 'Maya & Sam are getting married', subhead: 'Join us at the barn', buttonLabel: 'Reply now' } },
  { id: 'b2', type: 'schedule', fields: { items: '16:00 Ceremony\n18:00 Dinner' } },
  { id: 'b3', type: 'rsvp', fields: {} },
  { id: 'b4', type: 'faq', fields: { question: 'Is there parking?', answer: 'Yes, behind the barn.' } },
];

test.describe('L2-038 Personal link access and invalid links', () => {
  test('AC1 a personal link greets the guest by name', async ({ guest, api }) => {
    const event = api.addEvent();
    api.publish(event.id, page);
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    await guest.invite.goto(maya.token);
    await expect(guest.invite.greeting).toHaveText('Hi Maya, will you join us?');
    await expect(guest.page.getByRole('banner')).toContainText('Maya & Sam');
    await expect(guest.page.getByRole('banner')).toContainText('From Olivia');
    await expect(guest.page.getByRole('contentinfo')).toHaveText('Sent with Invitely');
  });

  test('AC2 an unknown link explains it does not work and points to code entry', async ({ guest }) => {
    await guest.invite.goto('not-a-token');
    await expect(guest.invite.invalid).toBeVisible();
    await expect(guest.page.getByText('Check the link in your invitation email, or ask your host for a new one.')).toBeVisible();
    await guest.invite.enterCode.click();
    await expect(guest.codeEntry.heading).toBeVisible();
  });

  test('a failed load shows an error with Try again', async ({ guest, api }) => {
    const event = api.addEvent();
    api.publish(event.id, page);
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    api.failNext('GET', `/api/public/invite/${maya.token}`);
    await guest.invite.goto(maya.token);
    await expect(guest.invite.error).toContainText("We couldn't find your invitation right now");
    await expect(guest.invite.error).toContainText('Your reply is safe. Try again in a moment.');
    await guest.invite.retry.click();
    await expect(guest.invite.greeting).toHaveText('Hi Maya, will you join us?');
  });
});

test.describe('L2-039 Public invitation page states', () => {
  test('open: shows the published blocks in order with the RSVP form in the RSVP block', async ({ guest, api }) => {
    const event = api.addEvent();
    api.publish(event.id, page);
    api.setDraft(event.id, [{ id: 'd1', type: 'hero', fields: { headline: 'Unpublished draft' } }]);
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    await guest.invite.goto(maya.token);
    const hero = guest.invite.section('Hero');
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Maya & Sam are getting married');
    await expect(hero).toContainText('Join us at the barn');
    await expect(hero.getByRole('link', { name: 'Reply now' })).toHaveAttribute('href', '#rsvp');
    await expect(guest.invite.section('Schedule')).toContainText('16:00 Ceremony');
    await expect(guest.invite.section('FAQ')).toContainText('Yes, behind the barn.');
    await expect(guest.invite.section('RSVP').getByRole('form', { name: 'RSVP' })).toBeVisible();
    await expect(guest.page.getByText('Unpublished draft')).toHaveCount(0);
    const order = await guest.page.locator('section[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(order).toEqual(['Hero', 'Schedule', 'RSVP', 'FAQ']);
  });

  test('open: a page without an RSVP block still shows the form after the blocks', async ({ guest, api }) => {
    const event = api.addEvent();
    api.publish(event.id, [page[0]!]);
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    await guest.invite.goto(maya.token);
    await expect(guest.invite.section('Hero')).toBeVisible();
    await expect(guest.invite.form.root).toBeVisible();
  });

  test('AC4 a Draft event is not open yet', async ({ guest, api }) => {
    const event = api.addEvent({ name: 'Maya & Sam', inviteOpen: '2026-10-19' });
    const maya = api.addGuest(event.id);
    await guest.invite.goto(maya.token);
    await expect(guest.page.getByRole('heading', { name: 'Maya & Sam is coming together' })).toBeVisible();
    await expect(guest.invite.notOpen).toHaveText('Codes are accepted from Mon 19 Oct.');
    await expect(guest.invite.form.root).toHaveCount(0);
  });

  test('before the invite window opens the page says when replies start', async ({ guest, api }) => {
    const event = api.addEvent({ inviteOpen: '2026-11-01' });
    api.publish(event.id, page);
    const maya = api.addGuest(event.id);
    await guest.invite.goto(maya.token);
    await expect(guest.invite.notOpen).toHaveText('Codes are accepted from Sun 1 Nov.');
    await expect(guest.invite.section('Hero')).toHaveCount(0);
  });

  test('after the window closes the page shows the guest\'s reply', async ({ guest, api }) => {
    const event = api.addEvent({ inviteOpen: '2026-09-01', inviteClose: '2026-10-01' });
    api.publish(event.id, page);
    const maya = api.addGuest(event.id, { plusOnes: 1 });
    api.addReply(maya.id, { attending: true, partySize: 2, meal: 'Vegan' });
    await guest.invite.goto(maya.token);
    await expect(guest.invite.closed).toHaveText('Replies closed on Thu 1 Oct');
    await expect(guest.invite.summary.value('Attending')).toHaveText('Joyfully accepting');
    await expect(guest.invite.summary.value('Guests')).toHaveText('You + 1');
    await expect(guest.invite.summary.value('Meal')).toHaveText('Vegan');
    await expect(guest.page.getByText('Contact Olivia if you need to change your answer.')).toBeVisible();
    await expect(guest.invite.form.root).toHaveCount(0);
    await expect(guest.invite.changeReply).toHaveCount(0);
  });

  test('after the window closes a guest who never replied is told so', async ({ guest, api }) => {
    const event = api.addEvent({ inviteOpen: '2026-09-01', inviteClose: '2026-10-01' });
    api.publish(event.id, page);
    const maya = api.addGuest(event.id);
    await guest.invite.goto(maya.token);
    await expect(guest.invite.closed).toBeVisible();
    await expect(guest.invite.noReply).toBeVisible();
  });

  test('the guest page offers a skip link to the main content', async ({ guest, api }) => {
    const event = api.addEvent();
    api.publish(event.id, page);
    const maya = api.addGuest(event.id);
    await guest.invite.goto(maya.token);
    await expect(guest.page.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
  });
});
