import { expect, test } from '@playwright/test';
import { addGuest, GUEST, organiserWithEvent } from './support.js';

/** An event with a published page and one guest; returns the guest's invitation code. */
async function publishedEventWithGuest(browser: import('@playwright/test').Browser) {
  const org = await organiserWithEvent(browser);
  await org.tab('guests');
  await addGuest(org.page, 'Jonah Adeyemi', `jonah.${Date.now()}@example.com`, '1');
  const code = (await org.page.getByRole('row', { name: /Jonah Adeyemi/ }).getByTestId('guest-code').textContent())!.trim();
  await org.tab('page');
  await org.page.getByRole('button', { name: 'Add a block' }).click();
  await org.page.getByRole('dialog', { name: 'Add a block' }).getByRole('button', { name: 'Add Hero' }).click();
  await org.page.getByLabel('Headline').fill('Come celebrate');
  await org.page.getByRole('button', { name: 'Add a block' }).click();
  await org.page.getByRole('dialog', { name: 'Add a block' }).getByRole('button', { name: 'Add RSVP form' }).click();
  await org.page.getByRole('button', { name: 'Publish' }).click();
  await expect(org.page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible();
  return { ...org, code };
}

test.describe('J1-J3 Guest replies, finds the invitation by code and changes the reply', () => {
  test('L2-037..L2-044 code entry, the RSVP form, the saved state and changing the answer', async ({ browser }) => {
    const { code, name } = await publishedEventWithGuest(browser);
    const guest = await (await browser.newContext()).newPage();
    await guest.goto(GUEST);
    await guest.getByRole('button', { name: 'Find my invitation' }).click();
    await expect(guest.getByText('Enter your invitation code')).toBeVisible();
    await guest.getByLabel('Invitation code').fill(`  ${code.toLowerCase().replace('-', ' ')} `);
    await guest.getByRole('button', { name: 'Find my invitation' }).click();

    await expect(guest.getByRole('heading', { name: 'Hi Jonah, will you join us?' })).toBeVisible();
    await expect(guest.getByText('From Olivia')).toBeVisible();
    await expect(guest.getByText(name).first()).toBeVisible();
    await expect(guest.getByLabel('Meal')).toBeHidden();
    await guest.getByLabel('Joyfully accepting').check();
    await expect(guest.getByText('Your invitation allows up to 2 places.')).toBeVisible();
    await guest.getByLabel('Party size').selectOption({ label: 'Me and one guest' });
    await guest.getByRole('button', { name: 'Send my RSVP' }).click();
    await expect(guest.getByLabel('Meal')).toBeFocused();
    await guest.getByLabel('Meal').selectOption("Kids' meal");
    await guest.getByLabel("Guest's name").fill('Sam Whitfield');
    await guest.getByRole('button', { name: 'Send my RSVP' }).click();
    await expect(guest.getByRole('status').filter({ hasText: 'Your reply is saved' })).toBeVisible();
    await expect(guest.getByText('You + Sam Whitfield')).toBeVisible();

    // L2-042 AC4 a returning guest sees their reply.
    await guest.reload();
    await expect(guest.getByRole('heading', { name: 'Thanks, Jonah. We have your reply.' })).toBeVisible();

    // L2-044 regrets with a message.
    await guest.getByRole('button', { name: 'Change my answer' }).click();
    await guest.getByLabel('Regretfully declining').check();
    await expect(guest.getByLabel('Party size')).toBeHidden();
    await guest.getByRole('button', { name: 'Send my RSVP' }).click();
    const dialog = guest.getByRole('dialog', { name: 'Send your regrets?' });
    await dialog.getByLabel('Message').fill('So sorry to miss it');
    await dialog.getByRole('button', { name: 'Send my regrets' }).click();
    await expect(guest.getByRole('status').filter({ hasText: 'Your regrets are sent' })).toBeVisible();
  });

  test('L2-038 AC2 an unknown link shows the invalid state with a way to enter a code', async ({ page }) => {
    await page.goto(`${GUEST}/i/not-a-real-token`);
    await expect(page.getByRole('heading', { name: "This invitation link doesn't work" })).toBeVisible();
    await expect(page.getByText(/Check the link in your invitation email/)).toBeVisible();
    await page.getByRole('link', { name: 'Enter an invitation code' }).click();
    await expect(page.getByLabel('Invitation code')).toBeVisible();
  });

  test('L2-039 AC4 a Draft event shows the not-open state and no form', async ({ browser }) => {
    const org = await organiserWithEvent(browser);
    await org.tab('guests');
    await addGuest(org.page, 'Early Bird', `early.${Date.now()}@example.com`);
    const code = (await org.page.getByRole('row', { name: /Early Bird/ }).getByTestId('guest-code').textContent())!.trim();
    const guest = await (await browser.newContext()).newPage();
    await guest.goto(GUEST);
    await guest.getByLabel('Invitation code').fill(code);
    await guest.getByRole('button', { name: 'Find my invitation' }).click();
    await expect(guest.getByText(/Codes are accepted from/)).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Send my RSVP' })).toBeHidden();
  });
});

test.describe('J4 Organiser reviews responses', () => {
  test('L2-046..L2-048 replies, totals and the Waiting filter', async ({ browser }) => {
    const org = await publishedEventWithGuest(browser);
    await org.tab('guests');
    await addGuest(org.page, 'Still Waiting', `waiting.${Date.now()}@example.com`);
    const guest = await (await browser.newContext()).newPage();
    await guest.goto(GUEST);
    await guest.getByLabel('Invitation code').fill(org.code);
    await guest.getByRole('button', { name: 'Find my invitation' }).click();
    await guest.getByLabel('Joyfully accepting').check();
    await guest.getByLabel('Meal').selectOption('Vegan');
    await guest.getByLabel('Dietary needs').fill('No nuts, please');
    await guest.getByRole('button', { name: 'Send my RSVP' }).click();
    await expect(guest.getByRole('status').filter({ hasText: 'Your reply is saved' })).toBeVisible();

    await org.tab('responses');
    const row = org.page.getByRole('row', { name: /Jonah Adeyemi/ });
    await expect(row.getByRole('cell', { name: 'Attending' })).toBeVisible();
    await expect(row.getByRole('cell', { name: 'No nuts, please' })).toBeVisible();
    const totals = org.page.getByRole('region', { name: 'Totals' });
    await expect(totals.getByText('Attending').locator('..')).toContainText('1');
    await expect(totals.getByText('Vegan').locator('..')).toContainText('1');
    await org.page.getByRole('button', { name: 'Waiting' }).click();
    await expect(org.page.getByRole('row', { name: /Still Waiting/ })).toBeVisible();
    await org.page.getByRole('searchbox', { name: 'Search responses' }).fill('nobody');
    await expect(org.page.getByRole('button', { name: 'Clear search' })).toBeVisible();
  });
});
