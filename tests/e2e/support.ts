import { expect, type Browser, type Page } from '@playwright/test';

export const ADMIN = 'http://localhost:5173';
export const GUEST = 'http://localhost:5174';
export const ORGANISER = { email: 'olivia@example.com', password: 'correct horse' };

export async function signIn(page: Page, password = ORGANISER.password) {
  await page.goto(ADMIN);
  await page.getByLabel('Email').fill(ORGANISER.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** A signed-in organiser in a fresh browser context, with a new event of a unique name. */
export async function organiserWithEvent(browser: Browser, name = `Event ${Date.now().toString(36)}`) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${ADMIN}/#/events/new`);
  await page.getByLabel('Event name').fill(name);
  await page.getByLabel('Date').fill('2027-06-12');
  await page.getByLabel('Start time').fill('16:00');
  await page.getByRole('button', { name: 'Create event' }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  const eventUrl = page.url().replace(/#\/events\/(\d+).*/, '#/events/$1');
  return { context, page, name, eventUrl, tab: (t: string) => page.goto(`${eventUrl}/${t}`) };
}

export async function addGuest(page: Page, name: string, email: string, plusOnes = '0') {
  await page.getByRole('button', { name: 'Add guest' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add guest' });
  await dialog.getByLabel('Full name').fill(name);
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Plus-ones').fill(plusOnes);
  await dialog.getByRole('button', { name: 'Add guest' }).click();
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
}

/** Yesterday as YYYY-MM-DD, so a schedule is due at once and the e2e mail worker sends it. */
export const yesterday = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
