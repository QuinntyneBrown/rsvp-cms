import { expect, test } from '@playwright/test';

const ADMIN = 'http://localhost:5173';
const GUEST = 'http://localhost:5174';

test('organiser sets up an event, a guest replies by code, the organiser sees it (J5-J9, J1-J4)', async ({ page, context }) => {
  // J5 sign in
  await page.goto(ADMIN);
  await page.getByLabel('Email').fill('olivia@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Email or password is not right')).toBeVisible();
  await page.getByLabel('Password').fill('correct horse');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();

  // J6 create event
  await page.getByRole('link', { name: 'New event' }).click();
  await page.getByLabel('Event name').fill('Maya & Sam');
  await page.getByLabel('Date').fill('2027-06-12');
  await page.getByLabel('Start time').fill('16:00');
  await page.getByRole('button', { name: 'Create event' }).click();
  await expect(page.getByRole('heading', { name: 'Maya & Sam' })).toBeVisible();
  await expect(page.getByText('Event created')).toBeVisible();

  // J8 add a guest
  await page.getByRole('link', { name: 'Guests' }).click();
  await page.getByRole('button', { name: 'Add guest' }).first().click();
  await page.getByLabel('Full name').fill('Maya Chen');
  await page.getByLabel('Email').fill('maya@example.com');
  await page.getByLabel('Plus-ones').fill('1');
  await page.getByRole('dialog').getByRole('button', { name: 'Add guest' }).click();
  await expect(page.getByRole('cell', { name: 'Maya Chen', exact: true })).toBeVisible();
  const code = (await page.locator('tbody tr').first().locator('td').nth(5).textContent())!;

  // J7 compose and publish the page
  await page.getByRole('link', { name: 'Page' }).click();
  await page.getByRole('button', { name: 'Add a block' }).click();
  await page.getByRole('button', { name: 'Add Hero' }).click();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Add a headline')).toBeVisible();
  await page.getByLabel('Headline').fill('Join us');
  await page.getByRole('button', { name: 'Add a block' }).click();
  await page.getByRole('button', { name: 'Add RSVP form' }).click();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible();

  // J9 schedule invitations
  await page.getByRole('link', { name: 'Emails' }).click();
  await page.getByRole('button', { name: 'Schedule invitations' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Schedule invitation', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'All invitees', exact: true })).toBeVisible();

  // J2 + J1 guest finds the invitation by code and replies
  const guest = await context.newPage();
  await guest.goto(GUEST);
  await guest.getByLabel('Invitation code').fill('nonsense');
  await guest.getByRole('button', { name: 'Find my invitation' }).click();
  await expect(guest.getByText("This invitation link doesn't work")).toBeVisible();
  await guest.getByLabel('Invitation code').fill(code.toLowerCase());
  await guest.getByRole('button', { name: 'Find my invitation' }).click();
  await expect(guest.getByText('Hello, Maya Chen')).toBeVisible();
  await guest.getByRole('button', { name: 'Send my RSVP' }).click();
  await expect(guest.getByText("Choose whether you're coming")).toBeVisible();
  await guest.getByLabel('Joyfully accepting').check();
  await guest.getByLabel('Party size').selectOption({ label: 'Me and one guest' });
  await guest.getByLabel('Meal').selectOption('Chicken');
  await guest.getByRole('button', { name: 'Send my RSVP' }).click();
  await expect(guest.getByText('Add the name of your guest')).toBeVisible();
  await guest.getByLabel("Guest's name").fill('Sam Okafor');
  await guest.getByRole('button', { name: 'Send my RSVP' }).click();
  await expect(guest.getByText('Your reply is saved')).toBeVisible();

  // J3 change to declining
  await guest.getByRole('button', { name: 'Change reply' }).click();
  await guest.getByLabel('Regretfully declining').check();
  await guest.getByRole('button', { name: 'Send my RSVP' }).click();
  await guest.getByRole('button', { name: 'Send my regrets' }).click();
  await expect(guest.getByText('Your regrets are sent')).toBeVisible();

  // J4 organiser sees the reply and totals without reloading
  await page.getByRole('link', { name: 'Responses' }).click();
  await expect(page.getByRole('cell', { name: 'Maya Chen', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Declined', exact: true })).toBeVisible();
  await expect(page.getByLabel('Totals')).toContainText('Declined1');
});
