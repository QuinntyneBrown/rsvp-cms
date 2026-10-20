import type { Locator, Page } from '@playwright/test';
import { ADMIN_URL } from '../urls.js';

/** Organiser Sign in (L2-001). */
export class SignInPage {
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly keepSignedIn: Locator;
  readonly submit: Locator;
  /** The form-level message: a failed sign-in or the "session ended" notice. */
  readonly alert: Locator;
  readonly emailError: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Sign in to Invitely' });
    this.email = page.getByLabel('Email', { exact: true });
    this.password = page.getByLabel('Password', { exact: true });
    this.keepSignedIn = page.getByLabel('Keep me signed in');
    this.submit = page.getByRole('form', { name: 'Sign in' }).getByRole('button');
    this.alert = page.locator('.auth-card > p[role="alert"]');
    this.emailError = page.locator('#si-email-error');
  }

  async goto() {
    await this.page.goto(ADMIN_URL);
  }

  async signIn(email: string, password: string, { keep = false } = {}) {
    await this.email.fill(email);
    await this.password.fill(password);
    if (keep) await this.keepSignedIn.check();
    await this.submit.click();
  }
}
