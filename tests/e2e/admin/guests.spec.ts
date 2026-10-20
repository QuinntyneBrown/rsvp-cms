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
  test('shows an empty state with Add guest when there are no guests', async ({ admin }) => {
    await admin.event.goto(event.id, 'guests');
    await expect(admin.event.guests.empty).toBeVisible();
    await expect(admin.event.guests.heading).toHaveText('Guests · 0 invitees');
    await expect(admin.event.guests.table).toHaveCount(0);
  });

  test('AC1 each row shows name, email, group, places, code and reply status, sorted by name', async ({ admin, api }) => {
    const sam = api.addGuest(event.id, { name: 'Sam Okafor', email: 'sam@example.com', group: 'Family', plusOnes: 2 });
    const maya = api.addGuest(event.id, { name: 'Maya Chen', email: 'maya@example.com' });
    api.addReply(sam.id, { attending: true, partySize: 3 });
    await admin.event.goto(event.id, 'guests');
    await expect(admin.event.guests.rows.locator('td:nth-child(2)')).toHaveText(['Maya Chen', 'Sam Okafor']);
    await expect.poll(() => admin.event.guests.cells('Sam Okafor')).toEqual({
      name: 'Sam Okafor', email: 'sam@example.com', group: 'Family', places: '3', code: sam.code, status: 'attending',
    });
    await expect.poll(() => admin.event.guests.cells('Maya Chen')).toMatchObject({ places: '1', code: maya.code, status: 'waiting' });
    await expect(admin.event.guests.heading).toHaveText('Guests · 2 invitees');
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

  test('a failed load can be retried', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    api.failNext('GET', `/api/events/${event.id}/guests`);
    await admin.event.goto(event.id, 'guests');
    await expect(admin.event.error).toContainText('Something went wrong. Try again.');
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
    await expect(guests.noMatch).toBeVisible();
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
    await expect.poll(() => guests.cells('Maya Chen')).toMatchObject({ email: 'maya@example.com', group: 'Friends', places: '2', status: 'waiting' });
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
    await expect(dialog.failure).toContainText('Something went wrong. Try again.');
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
    await expect.poll(() => guests.cells('Maya Chen-Okafor')).toMatchObject({ places: '3', code: maya.code });
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

  test('refuses an email that belongs to another guest', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen', email: 'maya@example.com' });
    api.addGuest(event.id, { name: 'Sam Okafor', email: 'sam@example.com' });
    await admin.event.goto(event.id, 'guests');
    await admin.event.guests.edit('Sam Okafor').click();
    await admin.event.guests.editDialog.save({ email: 'maya@example.com' });
    await expect(admin.event.guests.editDialog.errorFor('email')).toHaveText('This email is already on the list');
  });
});

test.describe('L2-024 Select guests and L2-023 Remove guests', () => {
  test('selecting guests offers Remove with the count', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    api.addGuest(event.id, { name: 'Sam Okafor' });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await expect(guests.removeSelected).toHaveCount(0);
    await guests.select('Maya Chen').check();
    await expect(guests.removeSelected).toHaveText('Remove 1');
    await expect(guests.selectAll).not.toBeChecked();
    await expect.poll(() => guests.selectAll.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
    await guests.select('Sam Okafor').check();
    await expect(guests.removeSelected).toHaveText('Remove 2');
    await expect(guests.selectAll).toBeChecked();
    await guests.select('Maya Chen').uncheck();
    await expect(guests.removeSelected).toHaveText('Remove 1');
  });

  test('Select all toggles every guest on the page', async ({ admin, api }) => {
    addMany(api, 3);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.selectAll.check();
    await expect(guests.removeSelected).toHaveText('Remove 3');
    await guests.selectAll.uncheck();
    await expect(guests.removeSelected).toHaveCount(0);
  });

  test('AC selection survives moving between pages', async ({ admin, api }) => {
    addMany(api, 52);
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.select('Guest 00').check();
    await guests.next.click();
    await guests.select('Guest 51').check();
    await expect(guests.removeSelected).toHaveText('Remove 2');
    await guests.previous.click();
    await expect(guests.select('Guest 00')).toBeChecked();
  });

  test('Cancel in the confirmation keeps the guests', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.select('Maya Chen').check();
    await guests.removeSelected.click();
    await expect(guests.removeDialog).toHaveAccessibleName('Remove 1 guest?');
    await expect(guests.removeDialog).toContainText('Their personal links stop working and their replies are deleted.');
    await guests.cancelRemove();
    await expect(guests.removeDialog).toHaveCount(0);
    await expect(guests.row('Maya Chen')).toBeVisible();
    expect(api.calls('POST', `/api/events/${event.id}/guests/remove`)).toHaveLength(0);
  });

  test('confirming removes the selected guests and shows a toast', async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    const sam = api.addGuest(event.id, { name: 'Sam Okafor' });
    api.addGuest(event.id, { name: 'Ana Ruiz' });
    const guests = admin.event.guests;
    await admin.event.goto(event.id, 'guests');
    await guests.select('Maya Chen').check();
    await guests.select('Sam Okafor').check();
    await guests.removeSelected.click();
    await expect(guests.removeDialog).toHaveAccessibleName('Remove 2 guests?');
    await guests.confirmRemove();
    await expect(admin.event.toast).toHaveText('Removed 2 guests');
    await expect(guests.rows).toHaveCount(1);
    await expect(guests.row('Ana Ruiz')).toBeVisible();
    await expect(guests.removeSelected).toHaveCount(0);
    expect(api.calls('POST', `/api/events/${event.id}/guests/remove`)[0]!.body.ids).toEqual(expect.arrayContaining([maya.id, sam.id]));
  });
});
