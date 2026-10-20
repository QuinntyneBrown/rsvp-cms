import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import type { FakeEvent } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

let event: FakeEvent;

test.beforeEach(({ api }) => {
  api.signIn();
  event = api.addEvent({ name: 'Maya & Sam' });
});

const CSV = 'name,email,group,plus-ones\nMaya Chen,maya@example.com,Friends,1\nSam Okafor,sam@example.com,Family,0\nNo Email,,Work,0\nOld Friend,old@example.com,Friends,0\n';

async function choose(page: Page, name: string, content: string | Buffer) {
  await page.getByLabel('CSV file').setInputFiles({ name, mimeType: 'text/csv', buffer: typeof content === 'string' ? Buffer.from(content, 'utf8') : content });
  await page.getByRole('button', { name: 'Continue' }).click();
}

const fileError = (page: Page) => page.locator('#import-file-error');

test.describe('L2-019 AC5 The empty guest list offers Add guest and Import CSV', () => {
  test('Import CSV opens the import', async ({ admin }) => {
    await admin.event.goto(event.id, 'guests');
    const empty = admin.event.guests.empty.locator('..');
    await expect(empty.getByRole('button', { name: 'Add guest' })).toBeVisible();
    await empty.getByRole('link', { name: 'Import CSV' }).click();
    await expect(admin.page.getByRole('heading', { name: 'Import guests', level: 1 })).toBeVisible();
    await expect(admin.page).toHaveURL(new RegExp(`#/events/${event.id}/import$`));
  });
});

test.describe('L2-025 Upload and check the file', () => {
  test.beforeEach(async ({ admin }) => {
    await admin.page.goto(`http://localhost:5173/#/events/${event.id}/import`);
  });

  test('AC1 a file that is not .csv is refused before anything is sent', async ({ admin, api }) => {
    await choose(admin.page, 'guests.xlsx', 'whatever');
    await expect(fileError(admin.page)).toHaveText('Choose a .csv file');
    expect(api.calls('POST', `/api/events/${event.id}/guests/import/review`)).toHaveLength(0);
  });

  test('AC2 a file with more than 2,000 rows names the limit', async ({ admin }) => {
    const rows = Array.from({ length: 2001 }, (_, i) => `G${i},g${i}@x.co`).join('\n');
    await choose(admin.page, 'big.csv', `name,email\n${rows}`);
    await expect(fileError(admin.page)).toHaveText('The file has more than 2,000 rows');
  });

  test('AC3 a valid file lists each column and the field it fills', async ({ admin }) => {
    await choose(admin.page, 'guests.csv', 'Email,Full name,Dietary\nmaya@example.com,Maya,none\n');
    const map = admin.page.getByRole('table', { name: 'Columns in the file' });
    await expect(map.locator('tbody tr')).toHaveText(['EmailEmail', 'Full nameFull name', 'DietaryNot imported']);
    await expect(admin.page.getByRole('list', { name: 'Progress' }).locator('[aria-current="step"]')).toContainText('Map columns');
  });

  test('AC4 a file with no Email column cannot continue', async ({ admin }) => {
    await choose(admin.page, 'guests.csv', 'name,group\nMaya,Friends\n');
    await expect(fileError(admin.page)).toHaveText('Email is needed to send invitations');
  });

  test('AC5 a file that is not UTF-8 is refused', async ({ admin }) => {
    await choose(admin.page, 'guests.csv', Buffer.from([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0xe9]));
    await expect(fileError(admin.page)).toHaveText('The file must be saved as UTF-8');
  });
});

test.describe('L2-026 Review and import', () => {
  test.beforeEach(async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Old Friend', email: 'old@example.com' });
    await admin.page.goto(`http://localhost:5173/#/events/${event.id}/import`);
  });

  const toReview = async (page: Page, csv = CSV) => {
    await choose(page, 'guests.csv', csv);
    await page.getByRole('button', { name: 'Continue' }).click();
  };

  test('AC1 error rows are listed with row number and reason, and Import waits until they are left out; AC2 duplicates are skipped; AC3 Done shows the counts', async ({ admin, api }) => {
    await toReview(admin.page);
    const problems = admin.page.getByRole('table', { name: 'Rows that will not be imported' });
    await expect(problems.locator('tbody tr').nth(0)).toContainText('Row 4');
    await expect(problems.locator('tbody tr').nth(0)).toContainText('Enter an email like name@example.com');
    await expect(problems.locator('tbody tr').nth(1)).toContainText('Duplicate');
    await expect(admin.page.getByText('1 duplicate row is skipped.')).toBeVisible();
    const importButton = admin.page.getByRole('button', { name: 'Import 2 guests' });
    await expect(importButton).toBeDisabled();
    await admin.page.getByLabel('Leave out the 1 row with errors').check();
    await importButton.click();
    await expect(admin.page.getByRole('heading', { name: '2 guests imported' })).toBeVisible();
    await expect(admin.page.locator('dt', { hasText: 'Skipped' }).locator('xpath=following-sibling::dd[1]')).toHaveText('2');
    await expect(admin.page.locator('dt', { hasText: 'Failed' }).locator('xpath=following-sibling::dd[1]')).toHaveText('0');
    expect(api.guestsOf(event.id).map((g) => g.name).sort()).toEqual(['Maya Chen', 'Old Friend', 'Sam Okafor']);
    await admin.page.getByRole('link', { name: 'Back to guests' }).click();
    await expect(admin.event.guests.heading).toHaveText('Guests · 3 invitees');
  });

  test('AC4 a failed import can be retried without adding anyone twice', async ({ admin, api }) => {
    await toReview(admin.page, 'name,email\nMaya Chen,maya@example.com\n');
    api.failNext('POST', `/api/events/${event.id}/guests/import`);
    await admin.page.getByRole('button', { name: 'Import 1 guest' }).click();
    const failed = admin.page.getByRole('alert').filter({ hasText: "The import didn't finish" });
    await expect(failed).toContainText('Trying again adds no guest twice.');
    await failed.getByRole('button', { name: 'Try again' }).click();
    await expect(admin.page.getByRole('heading', { name: '1 guest imported' })).toBeVisible();
    expect(api.guestsOf(event.id).filter((g) => g.email === 'maya@example.com')).toHaveLength(1);
  });

  test('AC5 an unknown group is set to Friends only after the organiser accepts it', async ({ admin, api }) => {
    await toReview(admin.page, 'name,email,group\nMaya Chen,maya@example.com,Neighbours\n');
    const importButton = admin.page.getByRole('button', { name: 'Import 1 guest' });
    await expect(importButton).toBeDisabled();
    await admin.page.getByLabel(/^Group will be set to Friends for row 2/).check();
    await importButton.click();
    await expect(admin.page.getByRole('heading', { name: '1 guest imported' })).toBeVisible();
    expect(api.guestsOf(event.id).find((g) => g.email === 'maya@example.com')!.group).toBe('Friends');
  });
});

test.describe('L2-027 CSV template download', () => {
  test('AC1/AC2 downloads <event slug>-guests-template.csv with the four columns and one example row', async ({ admin }) => {
    await admin.page.goto(`http://localhost:5173/#/events/${event.id}/import`);
    const download = admin.page.waitForEvent('download');
    await admin.page.getByRole('button', { name: 'Download the CSV template' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('maya-sam-guests-template.csv');
    const text = await readFile((await file.path())!, 'utf8');
    expect(text.trim().split(/\r?\n/)).toEqual(['name,email,group,plus-ones', 'Maya Chen,maya@example.com,Friends,1']);
  });
});
