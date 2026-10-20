import { test as base, expect, type Page } from '@playwright/test';
import { AdminShell } from '../pages/admin/AdminShell.js';
import { EventPage } from '../pages/admin/EventPage.js';
import { EventsPage } from '../pages/admin/EventsPage.js';
import { NewEventPage } from '../pages/admin/NewEventPage.js';
import { SignInPage } from '../pages/admin/SignInPage.js';
import { CodeEntryPage } from '../pages/rsvp/CodeEntryPage.js';
import { InvitePage } from '../pages/rsvp/InvitePage.js';
import { FakeBackend } from './fake-backend.js';

/** Every page object of the organiser app, bound to one browser page. */
export class AdminApp {
  readonly shell: AdminShell;
  readonly signIn: SignInPage;
  readonly events: EventsPage;
  readonly newEvent: NewEventPage;
  readonly event: EventPage;

  constructor(readonly page: Page) {
    this.shell = new AdminShell(page);
    this.signIn = new SignInPage(page);
    this.events = new EventsPage(page);
    this.newEvent = new NewEventPage(page);
    this.event = new EventPage(page);
  }
}

/** Every page object of the guest app, bound to one browser page. */
export class GuestApp {
  readonly codeEntry: CodeEntryPage;
  readonly invite: InvitePage;

  constructor(readonly page: Page) {
    this.codeEntry = new CodeEntryPage(page);
    this.invite = new InvitePage(page);
  }
}

interface Fixtures {
  /** The faked API, installed on the browser context before the test runs. */
  api: FakeBackend;
  admin: AdminApp;
  guest: GuestApp;
}

export const test = base.extend<Fixtures>({
  api: async ({ context }, use) => {
    const api = new FakeBackend();
    await api.install(context);
    await use(api);
    // Stop the apps (polling, debounced reloads) while the fake still answers, so no late call slips past it.
    await Promise.all(context.pages().map((p) => p.goto('about:blank')));
    expect(api.unhandled, 'API calls the fake backend does not implement').toEqual([]);
  },
  admin: async ({ page, api: _api }, use) => {
    await use(new AdminApp(page));
  },
  guest: async ({ page, api: _api }, use) => {
    await use(new GuestApp(page));
  },
});

export { expect };
