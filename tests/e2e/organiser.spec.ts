import { expect, test } from '@playwright/test';
import { addGuest, ADMIN, ORGANISER, organiserWithEvent, signIn, yesterday } from './support.js';

test.describe('J5 Organiser signs in', () => {
  test('L2-001 a malformed email is a field error and no request is sent; sign-in lands on the dashboard', async ({ page }) => {
    await page.goto(ADMIN);
    let posted = 0;
    page.on('request', (r) => { if (r.url().includes('/api/auth/sign-in')) posted++; });
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter an email like name@example.com')).toBeVisible();
    expect(posted).toBe(0);
    await page.getByLabel('Email').fill(ORGANISER.email);
    await page.getByLabel('Password', { exact: true }).fill(ORGANISER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Olivia/, level: 1 })).toBeVisible();
  });

  test('L2-005 AC2 sign out ends the session', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to Invitely' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sign in to Invitely' })).toBeVisible();
  });

  test('L2-060 / L2-005 AC1+AC3 a password change signs out the other device, which is sent to Sign in with a message', async ({ browser }) => {
    const laptop = await (await browser.newContext()).newPage();
    const phone = await (await browser.newContext()).newPage();
    await signIn(laptop);
    await signIn(phone);

    await laptop.goto(`${ADMIN}/#/account`);
    await expect(laptop.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible();
    await laptop.getByRole('button', { name: 'Change password' }).click();
    const dialog = laptop.getByRole('dialog', { name: 'Change password' });
    await dialog.getByLabel('Current password').fill('wrong password');
    await dialog.getByLabel('New password', { exact: true }).fill('a brand new secret');
    await dialog.getByLabel('Confirm new password').fill('a different secret');
    await dialog.getByRole('button', { name: 'Change password' }).click();
    await expect(dialog.getByText('Passwords do not match')).toBeVisible();
    await dialog.getByLabel('Confirm new password').fill('a brand new secret');
    await dialog.getByRole('button', { name: 'Change password' }).click();
    await expect(dialog.getByText('Current password is not right')).toBeVisible();
    await dialog.getByLabel('Current password').fill(ORGANISER.password);
    await dialog.getByRole('button', { name: 'Change password' }).click();
    await expect(laptop.getByText('Password changed. You were signed out on your other devices.')).toBeVisible();
    await expect(laptop.getByText('Last changed just now')).toBeVisible();

    // The other device is sent to Sign in on its next request.
    await phone.getByRole('link', { name: 'Events' }).first().click();
    await expect(phone.getByRole('heading', { name: 'Sign in to Invitely' })).toBeVisible();
    await expect(phone.getByText('Your session ended. Sign in again.')).toBeVisible();

    // Put the demo password back for the other tests.
    await laptop.getByRole('button', { name: 'Change password' }).click();
    const again = laptop.getByRole('dialog', { name: 'Change password' });
    await again.getByLabel('Current password').fill('a brand new secret');
    await again.getByLabel('New password', { exact: true }).fill(ORGANISER.password);
    await again.getByLabel('Confirm new password').fill(ORGANISER.password);
    await again.getByRole('button', { name: 'Change password' }).click();
    await expect(laptop.getByText('Password changed. You were signed out on your other devices.')).toBeVisible();
  });
});

test.describe('J6 Organiser creates an event', () => {
  test('L2-006 the type is chosen from the four occasions and errors keep the values', async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await signIn(page);
    await page.goto(`${ADMIN}/#/events/new`);
    await page.getByRole('radio', { name: /Holiday/ }).check();
    await page.getByLabel('Event name').fill('Winter party');
    await page.getByLabel('Date').fill('2020-01-01');
    await page.getByLabel('Start time').fill('18:00');
    await page.getByRole('button', { name: 'Create event' }).click();
    await expect(page.getByText('Pick a date in the future')).toBeVisible();
    await expect(page.getByLabel('Event name')).toHaveValue('Winter party');
    await page.getByLabel('Date').fill('2027-12-24');
    await page.getByRole('button', { name: 'Create event' }).click();
    await expect(page.getByRole('heading', { name: 'Winter party', level: 1 })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Event created' })).toBeVisible();
    await expect(page.getByText(/^Holiday ·/)).toBeVisible();
  });
});

test.describe('J7 Organiser builds and publishes the event page', () => {
  test('L2-013 blocks reorder by drag and drop and by Move up, and L2-014 a removed block can be undone', async ({ browser }) => {
    const { page, tab } = await organiserWithEvent(browser);
    await tab('page');
    for (const type of ['Hero', 'Details', 'FAQ']) {
      await page.getByRole('button', { name: 'Add a block' }).click();
      await page.getByRole('dialog', { name: 'Add a block' }).getByRole('button', { name: `Add ${type}` }).click();
    }
    const outline = page.getByRole('list', { name: 'Page outline' });
    const titles = () => outline.locator(':scope > li h3').allTextContents();
    await expect.poll(titles).toEqual(['Hero', 'Details', 'FAQ']);

    await outline.locator(':scope > li').nth(2).getByRole('button', { name: /^Drag FAQ/ }).dragTo(outline.locator(':scope > li').nth(0));
    await expect.poll(titles).toEqual(['FAQ', 'Hero', 'Details']);

    const moveUp = page.getByRole('button', { name: 'Move up Details' });
    await moveUp.click();
    await expect.poll(titles).toEqual(['FAQ', 'Details', 'Hero']);
    await expect(page.getByRole('button', { name: 'Move up Details' })).toBeFocused();

    await outline.locator(':scope > li').nth(0).getByRole('button', { name: 'Remove block' }).click();
    await expect.poll(titles).toEqual(['Details', 'Hero']);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(titles).toEqual(['FAQ', 'Details', 'Hero']);
    await expect(page.getByRole('status').filter({ hasText: /Draft · saved/ })).toBeVisible({ timeout: 10_000 });
  });

  test('L2-016 discarding returns the draft to the published version', async ({ browser }) => {
    const { page, tab } = await organiserWithEvent(browser);
    await tab('page');
    await page.getByRole('button', { name: 'Add a block' }).click();
    await page.getByRole('dialog', { name: 'Add a block' }).getByRole('button', { name: 'Add Hero' }).click();
    await page.getByLabel('Headline').fill('First');
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible();
    await page.getByLabel('Headline').fill('Second thoughts');
    await page.getByRole('button', { name: 'Discard changes' }).click();
    const dialog = page.getByRole('dialog', { name: 'Discard unpublished changes?' });
    await dialog.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByLabel('Headline')).toHaveValue('First');
  });
});

test.describe('J8 Organiser manages the guest list', () => {
  test('L2-019..L2-024 rows show reply, party and updated; search, filter, select and remove', async ({ browser }) => {
    const { page, tab } = await organiserWithEvent(browser);
    await tab('guests');
    await expect(page.getByRole('heading', { name: 'No invitees yet' })).toBeVisible();
    await addGuest(page, 'Amara Osei', 'amara@example.com', '1');
    await addGuest(page, 'Lena Hoffmann', 'lena@example.com');
    await addGuest(page, 'Tomasz Okafor', 'tomasz@example.com');
    await expect(page.getByText('3 invitees')).toBeVisible();

    const amara = page.getByRole('row', { name: /Amara Osei/ });
    await expect(amara.getByRole('cell', { name: 'Waiting' })).toBeVisible();
    await expect(amara.getByRole('cell', { name: '2', exact: true })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search guests' }).fill('lisbon');
    await expect(page.getByRole('heading', { name: 'No guests match “lisbon”' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.getByRole('row', { name: /Lena Hoffmann/ })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Select Amara Osei' }).check();
    await page.getByRole('checkbox', { name: 'Select Lena Hoffmann' }).check();
    await expect(page.getByText('2 guests selected')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Select all on this page' })).toHaveJSProperty('indeterminate', true);
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(page.getByText('2 guests selected')).toBeHidden();

    await page.getByRole('row', { name: /Tomasz Okafor/ }).getByRole('button', { name: 'Remove Tomasz Okafor' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove 1 guest?' });
    await expect(dialog.getByText(/links stop working and their replies are deleted/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('row', { name: /Tomasz Okafor/ })).toBeHidden();
    await expect(page.getByText('2 invitees')).toBeVisible();
  });

  test('L2-021 AC2 a malformed email is caught before the request', async ({ browser }) => {
    const { page, tab } = await organiserWithEvent(browser);
    await tab('guests');
    await page.getByRole('button', { name: 'Add guest' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add guest' });
    await dialog.getByLabel('Full name').fill('Someone');
    await dialog.getByLabel('Email').fill('nope');
    await dialog.getByRole('button', { name: 'Add guest' }).click();
    await expect(dialog.getByText('Enter an email like name@example.com')).toBeVisible();
  });
});

test.describe('J9 Organiser sends invitations', () => {
  test('L2-029 / L2-030 the dialog offers both audiences with counts and the worker sends the email', async ({ browser }) => {
    const { page, tab } = await organiserWithEvent(browser);
    await tab('guests');
    await addGuest(page, 'Maya Chen', 'maya@example.com');
    await tab('emails');
    await expect(page.getByRole('heading', { name: 'No emails planned' })).toBeVisible();
    await page.getByRole('button', { name: 'Schedule invitations' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Schedule invitations' });
    await expect(dialog.getByRole('radio', { name: 'All invitees (1)' })).toBeChecked();
    await expect(dialog.getByRole('radio', { name: "Only people who haven't replied (1)" })).toBeVisible();
    await dialog.getByLabel('Send on').fill(yesterday());
    await dialog.getByRole('button', { name: 'Schedule invitation', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /Invitation scheduled for/ })).toBeVisible();
    await expect(async () => {
      await page.reload();
      await expect(page.getByRole('row', { name: /All invitees/ }).getByRole('cell', { name: 'Sent' })).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await page.getByRole('row', { name: /All invitees/ }).getByRole('button', { name: /Preview/ }).click();
    const preview = page.getByRole('dialog', { name: 'Email preview' });
    await expect(preview.getByText(/Hi Maya Sample,/)).toBeVisible();
  });
});
