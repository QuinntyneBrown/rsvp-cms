import type { Locator, Page } from '@playwright/test';
import { definition } from '../definitions.js';
import { ADMIN_URL } from '../urls.js';
import { EmailsTab } from './EmailsTab.js';
import { GuestsTab } from './GuestsTab.js';
import { PageComposerTab } from './PageComposerTab.js';
import { ResponsesTab } from './ResponsesTab.js';

export type EventTab = 'overview' | 'guests' | 'page' | 'emails' | 'responses';
const LABELS: Record<EventTab, string> = { overview: 'Overview', guests: 'Guests', page: 'Page', emails: 'Emails', responses: 'Responses' };

/** The event shell: title, section tabs, overview and the shared toast. */
export class EventPage {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly status: Locator;
  readonly nav: Locator;
  readonly overview: Locator;
  readonly toast: Locator;
  readonly error: Locator;
  readonly retry: Locator;
  readonly guests: GuestsTab;
  readonly composer: PageComposerTab;
  readonly emails: EmailsTab;
  readonly responses: ResponsesTab;

  constructor(readonly page: Page) {
    this.heading = page.locator('main h1');
    this.subtitle = page.locator('main h1 + p');
    this.status = page.locator('main .page-header__actions .badge');
    this.nav = page.getByRole('navigation', { name: 'Event sections' });
    this.overview = page.locator('main dl');
    this.toast = page.locator('.toast');
    this.error = page.getByRole('alert');
    this.retry = page.getByRole('button', { name: 'Try again' });
    this.guests = new GuestsTab(page);
    this.composer = new PageComposerTab(page);
    this.emails = new EmailsTab(page);
    this.responses = new ResponsesTab(page);
  }

  async goto(eventId: number, tab: EventTab = 'overview') {
    await this.page.goto(`${ADMIN_URL}/#/events/${eventId}/${tab}`);
  }

  tab(tab: EventTab) {
    return this.nav.getByRole('link', { name: LABELS[tab], exact: true });
  }

  async openTab(tab: EventTab) {
    await this.tab(tab).click();
  }

  /** The value shown for an overview term such as 'Date', 'Venue' or 'Replies accepted'. */
  detail(term: string) {
    return definition(this.overview, term);
  }
}
