import { PLUS_ONES_BELOW_CONFIRMED } from '../../../src/domain/guests.js';
import type { FakeBackend, FakeEvent } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

let event: FakeEvent;

test.beforeEach(({ api }) => {
  api.signIn();
  event = api.addEvent();
});

const addMany = (api: FakeBackend, n: number) => {
  for (let i = 0; i < n; i++) api.addGuest(event.id, { name: `Guest ${String(i).padStart(2, '0')}`, email: `g${i}@example.com` });
};

test.describe('L2-019 Guest list table', () => {
  test('AC5 shows an empty state with Add guest when there are no guests', async ({ admin }) => {
    await admin.event.goto(event.id, 'guests');
    await expect(admin.event.guests.empty).toBeVisible();
    await expect(admin.event.guests.empty.locator('..').getByRole('button', { name: 'Add guest' })).toBeVisible();
    await expect(admin.event.guests.heading).toHaveText('Guests · 0 invitees');
    await expect(admin.event.guests.table).toHaveCount(0);
  });

  test('AC1 each row shows name, email, group, reply, party size, last updated and Edit and Remove, sorted by name', async ({ admin, api }) => {
    const sam = api.addGuest(event.id, { name: 'Sam Okafor', email: 'sam@example.com', group: 'Family', plusOnes: 2 });
    api.addGuest(event.id, { name: 'Maya Chen', email: 'maya@example.com', plusOnes: 1 });
    const tom = api.addGuest(event.id, { name: 'Tom Lee', email: 'tom@example.com', group: 'Work' });
    api.addReply(sam.id, { attending: true, partySize: 3 });
    api.addReply(tom.id, { attending: false });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await expect(guests.names()).toHaveText(['Maya Chen', 'Sam Okafor', 'Tom Lee']);
    await expect.poll(() => guests.cells('Sam Okafor')).toMatchObject({ name: 'Sam Okafor', email: 'sam@example.com', group: 'Family', reply: 'Attending', party: '3' });
    await expect.poll(() => guests.cells('Maya Chen')).toMatchObject({ group: '—', reply: 'Waiting', party: '2' });
    await expect.poll(() => guests.cells('Tom Lee')).toMatchObject({ reply: 'Declined', party: '0' });
    await expect(guests.row('Sam Okafor').locator('time')).toHaveText(/^(just now|\d+ min ago|\d+ hr ago|Yesterday|\d+ days ago|\w{3} \d+ \w{3})$/);
    await expect(guests.edit('Sam Okafor')).toBeVisible();
    await expect(guests.remove('Sam Okafor')).toBeVisible();
    await expect(guests.heading).toHaveText('Guests · 3 invitees');
  });

  test('AC2 shows the total number of invitees with thousands separated', async ({ admin, api }) => {
    addMany(api, 2000);
    await admin.event.goto(event.id, 'guests');
    await expect(admin.event.guests.heading).toHaveText('Guests · 2,000 invitees');
    await expect(admin.event.guests.rows).toHaveCount(50);
    await expect(admin.event.guests.pageLabel).toHaveText('Showing 1–50 of 2,000');
  });

  test('AC3 shows placeholder rows while the list loads', async ({ admin, api }) => {
    addMany(api, 3);
    const held = api.hold('GET', `/api/events/${event.id}/guests`);
    await admin.event.goto(event.id, 'guests');
    await expect(admin.page.getByText('Loading guests')).toBeAttached();
    held.release();
    await expect(admin.event.guests.rows).toHaveCount(3);
  });

  test('pages at 50 rows with Previous and Next', async ({ admin, api }) => {
    addMany(api, 52);
    await admin.event.goto(event.id, 'guests');
    const guests = admin.event.guests;
    await expect(guests.rows).toHaveCount(50);
    await expect(guests.pageLabel).toHaveText('Showing 1–50 of 52');
    await expect(guests.previous).toBeDisabled();
    await guests.next.click();
    await expect(guests.rows).toHaveCount(2);
    await expect(guests.pageLabel).toHaveText('Showing 51–52 of 52');
    await expect(guests.next).toBeDisabled();
    await guests.previous.click();
    await expect(guests.rows).toHaveCount(50);
  });

  test('AC4 a failed load says nothing was changed and can be retried', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    api.failNext('GET', `/api/events/${event.id}/guests`);
    await admin.event.goto(event.id, 'guests');
    await expect(admin.event.error).toContainText("We couldn't load your guests");
    await expect(admin.event.error).toContainText('Nothing was changed.');
    await admin.event.retry.click();
    await expect(admin.event.guests.row('Maya Chen')).toBeVisible();
  });
});

test.describe('L2-020 Search and filter guests', () => {
  test.beforeEach(({ api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen', email: 'maya@example.com' });
    const sam = api.addGuest(event.id, { name: 'Sam Okafor', email: 'sam@example.com' });
    api.addGuest(event.id, { name: 'Ana Ruiz', email: 'ana@family.example' });
    api.addReply(maya.id, { attending: true });
    api.addReply(sam.id, { attending: false });
  });

  test('searches names case-insensitively', async ({ admin }) => {
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.search.fill('MAYA');
    await expect(admin.event.guests.rows).toHaveCount(1);
    await expect(admin.event.guests.row('Maya Chen')).toBeVisible();
  });

  test('searches by email', async ({ admin }) => {
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.search.fill('family.example');
    await expect(admin.event.guests.rows).toHaveCount(1);
    await expect(admin.event.guests.row('Ana Ruiz')).toBeVisible();
  });

  test('filters by reply status and marks the active filter', async ({ admin }) => {
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await expect(guests.filter('All')).toHaveAttribute('aria-pressed', 'true');
    for (const [filter, name] of [['Attending', 'Maya Chen'], ['Declined', 'Sam Okafor'], ['Waiting', 'Ana Ruiz']] as const) {
      await guests.filter(filter).click();
      await expect(guests.filter(filter)).toHaveAttribute('aria-pressed', 'true');
      await expect(guests.filter('All')).toHaveAttribute('aria-pressed', 'false');
      await expect(guests.rows).toHaveCount(1);
      await expect(guests.row(name)).toBeVisible();
    }
    await guests.filter('All').click();
    await expect(guests.rows).toHaveCount(3);
  });

  test('no matches shows "No guests match" and Clear search brings the list back', async ({ admin }) => {
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.filter('Attending').click();
    await guests.search.fill('zzz');
    await expect(guests.noMatch).toHaveText('No guests match “zzz”');
    await expect(guests.empty).toHaveCount(0);
    await guests.clearSearch.click();
    await expect(guests.search).toHaveValue('');
    await expect(guests.filter('All')).toHaveAttribute('aria-pressed', 'true');
    await expect(guests.rows).toHaveCount(3);
  });

  test('searching returns to the first page', async ({ admin, api }) => {
    addMany(api, 50);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.next.click();
    await expect(guests.pageLabel).toHaveText(/^Showing 51–/);
    await guests.search.fill('Guest 0');
    await expect(guests.pageLabel).toHaveText('Showing 1–10 of 10');
    await expect(guests.rows).toHaveCount(10);
  });
});

test.describe('L2-021 Add a guest', () => {
  test('adds a guest from the empty state and shows a toast', async ({ admin, api }) => {
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.empty.locator('..').getByRole('button', { name: 'Add guest' }).click();
    await expect(guests.addDialog.root).toBeVisible();
    await expect(guests.addDialog.plusOnes).toHaveValue('0');
    await guests.addDialog.save({ name: 'Maya Chen', email: 'Maya@Example.com', group: 'Friends', plusOnes: 1 });
    await expect(guests.addDialog.root).toHaveCount(0);
    await expect(admin.event.toast).toHaveText('Guest added');
    await expect.poll(() => guests.cells('Maya Chen')).toMatchObject({ email: 'maya@example.com', group: 'Friends', party: '2', reply: 'Waiting' });
    expect(api.guestsOf(event.id)).toHaveLength(1);
    await expect(guests.heading).toHaveText('Guests · 1 invitees');
  });

  test('moves focus into the dialog when it opens', async ({ admin }) => {
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.addGuest.click();
    await expect(admin.event.guests.addDialog.name).toBeFocused(); // the first field (design system: dialog focus)
  });

  test('shows field errors for a missing name, a bad email and out-of-range plus-ones', async ({ admin, api }) => {
    const dialog = admin.event.guests.addDialog;
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.addGuest.click();
    await dialog.save({ name: '', email: 'nope', plusOnes: 10 });
    await expect(dialog.errorFor('name')).toHaveText("Add the guest's full name");
    await expect(dialog.errorFor('email')).toHaveText('Enter an email like name@example.com');
    await expect(dialog.errorFor('plusOnes')).toHaveText('Plus-ones must be a whole number from 0 to 9');
    expect(api.guestsOf(event.id)).toHaveLength(0);
  });

  test('refuses an email already on the list', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen', email: 'maya@example.com' });
    const dialog = admin.event.guests.addDialog;
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.addGuest.click();
    await dialog.save({ name: 'Maya Again', email: 'maya@example.com' });
    await expect(dialog.errorFor('email')).toHaveText('This email is already on the list');
    expect(api.guestsOf(event.id)).toHaveLength(1);
  });

  test('a server failure keeps the values in the dialog and Try again saves', async ({ admin, api }) => {
    api.failNext('POST', `/api/events/${event.id}/guests`);
    const dialog = admin.event.guests.addDialog;
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.addGuest.click();
    await dialog.save({ name: 'Maya Chen', email: 'maya@example.com' });
    await expect(dialog.failure).toContainText("This guest wasn't saved");
    await expect(dialog.name).toHaveValue('Maya Chen');
    await expect(dialog.email).toHaveValue('maya@example.com');
    await dialog.tryAgain.click();
    await expect(admin.event.toast).toHaveText('Guest added');
    await expect(admin.event.guests.row('Maya Chen')).toBeVisible();
  });

  test('Cancel and Escape close the dialog without saving', async ({ admin, api }) => {
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.addGuest.click();
    await guests.addDialog.fill({ name: 'Maya Chen', email: 'maya@example.com' });
    await guests.addDialog.cancel.click();
    await expect(guests.addDialog.root).toHaveCount(0);
    await guests.addGuest.click();
    await admin.page.keyboard.press('Escape');
    await expect(guests.addDialog.root).toHaveCount(0);
    expect(api.calls('POST', `/api/events/${event.id}/guests`)).toHaveLength(0);
  });

  test('the Add guest button stays busy so the guest is added only once', async ({ admin, api }) => {
    const held = api.hold('POST', `/api/events/${event.id}/guests`);
    const dialog = admin.event.guests.addDialog;
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.addGuest.click();
    await dialog.save({ name: 'Maya Chen', email: 'maya@example.com' });
    await expect(dialog.submit).toBeDisabled();
    held.release();
    await expect(admin.event.toast).toHaveText('Guest added');
    await expect(admin.event.guests.row('Maya Chen')).toBeVisible();
    expect(api.calls('POST', `/api/events/${event.id}/guests`)).toHaveLength(1);
  });
});

test.describe('L2-022 Edit a guest', () => {
  test('opens with the guest\'s details and saves changes', async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen', email: 'maya@example.com', group: 'Friends', plusOnes: 1 });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.edit('Maya Chen').click();
    const dialog = guests.editDialog;
    await expect(dialog.name).toHaveValue('Maya Chen');
    await expect(dialog.email).toHaveValue('maya@example.com');
    await expect(dialog.group).toHaveValue('Friends');
    await expect(dialog.plusOnes).toHaveValue('1');
    await dialog.save({ name: 'Maya Chen-Okafor', plusOnes: 2 });
    await expect(admin.event.toast).toHaveText('Guest updated');
    await expect.poll(() => guests.cells('Maya Chen-Okafor')).toMatchObject({ party: '3' });
    expect(api.calls('PUT', `/api/events/${event.id}/guests/${maya.id}`)[0]!.body).toEqual({
      name: 'Maya Chen-Okafor', email: 'maya@example.com', group: 'Friends', plusOnes: 2,
    });
  });

  test('refuses lowering plus-ones below the places the guest already confirmed', async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen', plusOnes: 2 });
    api.addReply(maya.id, { attending: true, partySize: 3 });
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.edit('Maya Chen').click();
    await admin.event.guests.editDialog.save({ plusOnes: 1 });
    await expect(admin.event.guests.editDialog.errorFor('plusOnes')).toHaveText(PLUS_ONES_BELOW_CONFIRMED);
    expect(api.guestsOf(event.id)[0]!.plusOnes).toBe(2);
  });

  test('AC3 a failed save keeps the dialog open with the entered values', async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen', email: 'maya@example.com' });
    api.failNext('PUT', `/api/events/${event.id}/guests/${maya.id}`);
    const dialog = admin.event.guests.editDialog;
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.edit('Maya Chen').click();
    await dialog.save({ name: 'Maya Chen-Okafor', group: 'Family' });
    await expect(dialog.failure).toContainText("This guest wasn't saved");
    await expect(dialog.name).toHaveValue('Maya Chen-Okafor');
    await expect(dialog.group).toHaveValue('Family');
    expect(api.guestsOf(event.id)[0]!.name).toBe('Maya Chen');
  });

  test('refuses an email that belongs to another guest', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen', email: 'maya@example.com' });
    api.addGuest(event.id, { name: 'Sam Okafor', email: 'sam@example.com' });
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.edit('Sam Okafor').click();
    await admin.event.guests.editDialog.save({ email: 'maya@example.com' });
    await expect(admin.event.guests.editDialog.errorFor('email')).toHaveText('This email is already on the list');
  });
});

test.describe('L2-024 Select guests', () => {
  test('AC1/AC2 selecting guests shows the count and the header checkbox goes indeterminate', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    api.addGuest(event.id, { name: 'Sam Okafor' });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await expect(guests.selection).toHaveCount(0);
    await guests.select('Maya Chen').check();
    await expect(guests.selection).toContainText('1 selected');
    await expect(guests.selectAll).not.toBeChecked();
    await expect.poll(() => guests.selectAll.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
    await guests.select('Sam Okafor').check();
    await expect(guests.selection).toContainText('2 selected');
    await expect(guests.selectAll).toBeChecked();
    await guests.select('Maya Chen').uncheck();
    await expect(guests.selection).toContainText('1 selected');
  });

  test('AC1 Select all selects every guest on the page and toggles back', async ({ admin, api }) => {
    addMany(api, 3);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.selectAll.check();
    await expect(guests.selection).toContainText('3 selected');
    await guests.selectAll.uncheck();
    await expect(guests.selection).toHaveCount(0);
  });

  test('AC2 with some rows selected, the header checkbox selects the current page only', async ({ admin, api }) => {
    addMany(api, 52);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.select('Guest 00').check();
    await guests.selectAll.check();
    await expect(guests.selection).toContainText('50 selected');
    await guests.next.click();
    await expect(guests.select('Guest 50')).not.toBeChecked();
  });

  test('AC3 selection survives moving between pages', async ({ admin, api }) => {
    addMany(api, 52);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.select('Guest 00').check();
    await guests.next.click();
    await guests.select('Guest 51').check();
    await expect(guests.selection).toContainText('2 selected');
    await guests.previous.click();
    await expect(guests.select('Guest 00')).toBeChecked();
  });

  test('AC4 Clear leaves no rows selected', async ({ admin, api }) => {
    addMany(api, 3);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.selectAll.check();
    await guests.clearSelection.click();
    await expect(guests.selection).toHaveCount(0);
    await expect(guests.rows.getByRole('checkbox', { checked: true })).toHaveCount(0);
  });
});

test.describe('L2-023 Remove guests', () => {
  test('AC1 Cancel in the confirmation keeps the guests', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.select('Maya Chen').check();
    await guests.removeSelected.click();
    await expect(guests.removeDialog).toHaveAccessibleName('Remove 1 guest?');
    await expect(guests.removeDialog).toContainText('Their personal links stop working and their replies are deleted.');
    await expect(guests.removeDialog.getByRole('button', { name: 'Cancel' })).toBeFocused(); // the safe action
    await guests.cancelRemove();
    await expect(guests.removeDialog).toHaveCount(0);
    await expect(guests.row('Maya Chen')).toBeVisible();
    expect(api.calls('POST', `/api/events/${event.id}/guests/remove`)).toHaveLength(0);
  });

  test('AC2 confirming removes the selected guests, updates the count and shows a toast', async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    const sam = api.addGuest(event.id, { name: 'Sam Okafor' });
    api.addGuest(event.id, { name: 'Ana Ruiz' });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.select('Maya Chen').check();
    await guests.select('Sam Okafor').check();
    await guests.removeSelected.click();
    await expect(guests.removeDialog).toHaveAccessibleName('Remove 2 guests?');
    await expect(guests.removeDialog).toContainText('Maya Chen and Sam Okafor will be removed.');
    await guests.confirmRemove();
    await expect(admin.event.toast).toHaveText('Removed 2 guests');
    await expect(guests.rows).toHaveCount(1);
    await expect(guests.row('Ana Ruiz')).toBeVisible();
    await expect(guests.heading).toHaveText('Guests · 1 invitees');
    await expect(guests.selection).toHaveCount(0);
    expect(api.calls('POST', `/api/events/${event.id}/guests/remove`)[0]!.body.ids).toEqual(expect.arrayContaining([maya.id, sam.id]));
  });

  test("a row's Remove action removes just that guest", async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    api.addGuest(event.id, { name: 'Sam Okafor' });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.remove('Maya Chen').click();
    await expect(guests.removeDialog).toHaveAccessibleName('Remove 1 guest?');
    await guests.confirmRemove();
    await expect(admin.event.toast).toHaveText('Removed 1 guest');
    await expect(guests.names()).toHaveText(['Sam Okafor']);
    expect(api.calls('POST', `/api/events/${event.id}/guests/remove`)[0]!.body.ids).toEqual([maya.id]);
  });

  test('AC3 a failed removal keeps the guests and Try again removes them', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    api.failNext('POST', `/api/events/${event.id}/guests/remove`);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.remove('Maya Chen').click();
    await guests.confirmRemove();
    await expect(guests.removeFailure()).toContainText('Nothing was removed');
    await expect(guests.removeDialog).toBeVisible();
    expect(api.guestsOf(event.id)).toHaveLength(1);
    await guests.removeFailure().getByRole('button', { name: 'Try again' }).click();
    await expect(admin.event.toast).toHaveText('Removed 1 guest');
    expect(api.guestsOf(event.id)).toHaveLength(0);
  });

  test('AC4 while removing, Remove is busy and Cancel is disabled', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    const held = api.hold('POST', `/api/events/${event.id}/guests/remove`);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.remove('Maya Chen').click();
    await guests.confirmRemove();
    const busy = guests.removeDialog.getByRole('button', { name: 'Removing…' });
    await expect(busy).toBeDisabled();
    await expect(guests.removeDialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await admin.page.keyboard.press('Escape');
    await expect(guests.removeDialog).toBeVisible();
    held.release();
    await expect(admin.event.toast).toHaveText('Removed 1 guest');
  });
});
