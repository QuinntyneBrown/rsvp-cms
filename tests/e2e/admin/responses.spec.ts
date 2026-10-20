import type { FakeBackend, FakeEvent } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

let event: FakeEvent;

test.beforeEach(({ api }) => {
  api.signIn();
  event = api.addEvent();
});

/** Maya attends with a guest (Chicken), Sam declines with a message, Ana attends alone (Vegan), Leo has not replied. */
function seedReplies(api: FakeBackend) {
  const maya = api.addGuest(event.id, { name: 'Maya Chen', plusOnes: 1 });
  const sam = api.addGuest(event.id, { name: 'Sam Okafor' });
  const ana = api.addGuest(event.id, { name: 'Ana Ruiz' });
  api.addGuest(event.id, { name: 'Leo Park' });
  api.addReply(maya.id, { attending: true, partySize: 2, meal: 'Chicken', guestNames: ['Kai'], dietary: 'No nuts' });
  api.addReply(sam.id, { attending: false, message: 'Sorry, travelling' });
  api.addReply(ana.id, { attending: true, partySize: 1, meal: 'Vegan' });
}

test.describe('L2-046 Responses table', () => {
  test('shows an empty state and zero totals before anyone replies', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    await admin.event.goto(event.id, 'responses');
    const responses = admin.event.responses;
    await expect(responses.empty).toBeVisible();
    await expect(admin.page.getByText('Replies appear here as guests respond on the public page.')).toBeVisible();
    await expect(responses.total('Attending')).toHaveText('0');
    await expect(responses.total('Waiting')).toHaveText('1');
  });

  test('AC1 lists each reply, most recently updated first', async ({ admin, api }) => {
    seedReplies(api);
    const responses = admin.event.responses;
    await admin.event.goto(event.id, 'responses');
    await expect(responses.rows).toHaveCount(3);
    await expect.poll(() => responses.guestNames()).toEqual(['Ana Ruiz', 'Sam Okafor', 'Maya Chen']);
    await expect.poll(() => responses.cells(2)).toEqual({
      guest: 'Maya Chen', reply: 'Attending', guests: '2', meal: 'Chicken', dietary: 'No nuts', message: '–',
      updated: api.replyOf(api.guestsOf(event.id)[0]!.id)!.updatedAt.slice(0, 16).replace('T', ' '),
    });
    await expect.poll(() => responses.cells(1)).toMatchObject({ guest: 'Sam Okafor', reply: 'Declined', guests: '–', meal: '–', dietary: '–', message: 'Sorry, travelling' });
  });

  test('pages at 50 replies', async ({ admin, api }) => {
    for (let i = 0; i < 51; i++) api.addReply(api.addGuest(event.id, { name: `Guest ${i}` }).id);
    const responses = admin.event.responses;
    await admin.event.goto(event.id, 'responses');
    await expect(responses.rows).toHaveCount(50);
    await expect(responses.pageLabel).toHaveText('Showing 1–50 of 51');
    await expect(responses.previous).toBeDisabled();
    await responses.next.click();
    await expect(responses.rows).toHaveCount(1);
    await expect(responses.next).toBeDisabled();
    await responses.previous.click();
    await expect(responses.pageLabel).toHaveText('Showing 1–50 of 51');
  });

  test('a failed load can be retried', async ({ admin, api }) => {
    seedReplies(api);
    api.failNext('GET', `/api/events/${event.id}/responses`);
    await admin.event.goto(event.id, 'responses');
    await expect(admin.event.error).toContainText('Something went wrong. Try again.');
    await admin.event.retry.click();
    await expect(admin.event.responses.rows).toHaveCount(3);
  });
});

test.describe('L2-047 Response totals', () => {
  test('AC1 counts attending, guests coming, declined, waiting and meals by place', async ({ admin, api }) => {
    seedReplies(api);
    const responses = admin.event.responses;
    await admin.event.goto(event.id, 'responses');
    await expect(responses.total('Attending')).toHaveText('2');
    await expect(responses.total('Guests coming')).toHaveText('3');
    await expect(responses.total('Declined')).toHaveText('1');
    await expect(responses.total('Waiting')).toHaveText('1');
    await expect(responses.total('Chicken')).toHaveText('2');
    await expect(responses.total('Vegan')).toHaveText('1');
  });

  test('AC2 totals and rows refresh within 5 seconds without a reload', async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    const responses = admin.event.responses;
    await admin.event.goto(event.id, 'responses');
    await expect(responses.empty).toBeVisible();
    api.addReply(maya.id, { attending: false });
    await expect(responses.total('Declined')).toHaveText('1', { timeout: 7000 });
    await expect(responses.total('Waiting')).toHaveText('0');
    await expect.poll(() => responses.cells(0)).toMatchObject({ guest: 'Maya Chen', reply: 'Declined' });
  });
});

test.describe('L2-048 Filter and search responses', () => {
  test.beforeEach(({ api }) => seedReplies(api));

  test('filters by reply and marks the active filter', async ({ admin }) => {
    const responses = admin.event.responses;
    await admin.event.goto(event.id, 'responses');
    await expect(responses.filter('All')).toHaveAttribute('aria-pressed', 'true');
    await responses.filter('Attending').click();
    await expect(responses.filter('Attending')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => responses.guestNames()).toEqual(['Ana Ruiz', 'Maya Chen']);
    await responses.filter('Declined').click();
    await expect.poll(() => responses.guestNames()).toEqual(['Sam Okafor']);
    await responses.filter('All').click();
    await expect(responses.rows).toHaveCount(3);
  });

  test('searches guest names case-insensitively', async ({ admin }) => {
    const responses = admin.event.responses;
    await admin.event.goto(event.id, 'responses');
    await responses.search.fill('mAyA');
    await expect.poll(() => responses.guestNames()).toEqual(['Maya Chen']);
  });

  test('no matches shows "No replies match" and Clear search brings them back', async ({ admin }) => {
    const responses = admin.event.responses;
    await admin.event.goto(event.id, 'responses');
    await responses.filter('Declined').click();
    await responses.search.fill('Maya');
    await expect(responses.noMatch).toBeVisible();
    await expect(responses.empty).toHaveCount(0);
    await responses.clearSearch.click();
    await expect(responses.search).toHaveValue('');
    await expect(responses.filter('All')).toHaveAttribute('aria-pressed', 'true');
    await expect(responses.rows).toHaveCount(3);
  });

  test('totals always cover every reply, whatever the filter', async ({ admin }) => {
    const responses = admin.event.responses;
    await admin.event.goto(event.id, 'responses');
    await responses.filter('Declined').click();
    await expect(responses.rows).toHaveCount(1);
    await expect(responses.total('Attending')).toHaveText('2');
  });
});
