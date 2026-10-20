import { ORGANISER, SESSION_ENDED } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

test.describe('L2-001 Organiser sign-in', () => {
  test('shows Sign in when there is no session', async ({ admin }) => {
    await admin.signIn.goto();
    await expect(admin.signIn.heading).toBeVisible();
    await expect(admin.signIn.alert).toHaveCount(0);
    await expect(admin.signIn.submit).toHaveText('Sign in');
  });

  test('AC1 signs in and lands on the dashboard with the organiser named in the top bar', async ({ admin, api }) => {
    await admin.signIn.goto();
    await admin.signIn.signIn(ORGANISER.email, ORGANISER.password);
    await expect(admin.dashboard.heading).toBeVisible();
    await expect(admin.shell.userName(ORGANISER.name)).toBeVisible();
    await expect(admin.page).toHaveURL(/#\/dashboard$/);
    expect(api.calls('POST', '/api/auth/sign-in')[0]!.body).toEqual({ email: ORGANISER.email, password: ORGANISER.password, keepSignedIn: false });
  });

  test('AC2 a wrong password shows one generic error', async ({ admin }) => {
    await admin.signIn.goto();
    await admin.signIn.signIn(ORGANISER.email, 'wrong');
    await expect(admin.signIn.alert).toContainText('Email or password is not right');
    await expect(admin.signIn.submit).toBeEnabled();
  });

  test('AC2 an unknown email shows the same generic error', async ({ admin }) => {
    await admin.signIn.goto();
    await admin.signIn.signIn('nobody@example.com', ORGANISER.password);
    await expect(admin.signIn.alert).toContainText('Email or password is not right');
  });

  test('AC3 a malformed email is caught before anything is sent and the field gets focus', async ({ admin, api }) => {
    await admin.signIn.goto();
    await admin.signIn.signIn('not-an-email', 'whatever');
    await expect(admin.signIn.emailError).toHaveText('Enter an email like name@example.com');
    await expect(admin.signIn.email).toBeFocused();
    expect(api.calls('POST', '/api/auth/sign-in')).toHaveLength(0);
  });

  test('trims the email before sending it', async ({ admin, api }) => {
    await admin.signIn.goto();
    await admin.signIn.signIn(`  ${ORGANISER.email}  `, ORGANISER.password);
    await expect(admin.dashboard.heading).toBeVisible();
    expect(api.calls('POST', '/api/auth/sign-in')[0]!.body.email).toBe(ORGANISER.email);
  });

  test('shows a busy, disabled button while signing in so it cannot be sent twice', async ({ admin, api }) => {
    const held = api.hold('POST', '/api/auth/sign-in');
    await admin.signIn.goto();
    await admin.signIn.signIn(ORGANISER.email, ORGANISER.password);
    await expect(admin.signIn.submit).toHaveText('Signing in…');
    await expect(admin.signIn.submit).toBeDisabled();
    await expect(admin.signIn.submit).toHaveAttribute('aria-busy', 'true');
    held.release();
    await expect(admin.dashboard.heading).toBeVisible();
    expect(api.calls('POST', '/api/auth/sign-in')).toHaveLength(1);
  });

  test('reports a lost connection and lets the organiser try again', async ({ admin, api }) => {
    api.abortNext('POST', '/api/auth/sign-in');
    await admin.signIn.goto();
    await admin.signIn.signIn(ORGANISER.email, ORGANISER.password);
    await expect(admin.signIn.alert).toContainText('Something went wrong. Check your connection and try again.');
    await admin.signIn.submit.click();
    await expect(admin.dashboard.heading).toBeVisible();
  });
});

test.describe('L2-005 Session lifetime and sign-out', () => {
  test('AC1 "Keep me signed in" is sent with the sign-in', async ({ admin, api }) => {
    await admin.signIn.goto();
    await admin.signIn.signIn(ORGANISER.email, ORGANISER.password, { keep: true });
    await expect(admin.dashboard.heading).toBeVisible();
    expect(api.calls('POST', '/api/auth/sign-in')[0]!.body.keepSignedIn).toBe(true);
  });

  test('a live session opens the app without signing in again', async ({ admin, api }) => {
    api.signIn();
    await admin.events.goto();
    await expect(admin.events.heading).toBeVisible();
    await expect(admin.signIn.heading).toHaveCount(0);
  });

  test('AC1 an ended session returns to Sign in with "Your session ended. Sign in again."', async ({ admin, api }) => {
    api.session = 'ended';
    await admin.events.goto();
    await expect(admin.signIn.heading).toBeVisible();
    await expect(admin.signIn.alert).toContainText(SESSION_ENDED);
  });

  test('AC1 a session that ends mid-visit returns to Sign in on the next request', async ({ admin, api }) => {
    const event = api.addEvent({ name: 'Maya & Sam' });
    api.signIn();
    await admin.events.goto();
    await expect(admin.events.heading).toBeVisible();
    api.session = 'ended';
    await admin.events.open('Maya & Sam');
    await expect(admin.signIn.heading).toBeVisible();
    await expect(admin.signIn.alert).toContainText(SESSION_ENDED);
    expect(api.calls('GET', `/api/events/${event.id}`)).toHaveLength(1);
  });

  test('the shell names the organiser and lists Events in the primary navigation', async ({ admin, api }) => {
    api.signIn();
    await admin.events.goto();
    await expect(admin.shell.userName(ORGANISER.name)).toBeVisible();
    await expect(admin.shell.nav.getByRole('link', { name: 'Events' })).toHaveAttribute('aria-current', 'page');
  });

  test('AC2 Sign out ends the session and returns to Sign in', async ({ admin, api }) => {
    api.signIn();
    await admin.events.goto();
    await admin.shell.signOut.click();
    await expect(admin.signIn.heading).toBeVisible();
    expect(api.calls('POST', '/api/auth/sign-out')).toHaveLength(1);
    expect(api.session).toBe('none');
    await admin.page.reload();
    await expect(admin.signIn.heading).toBeVisible();
  });
});

test.describe('L2-086 Keyboard operation', () => {
  test('the organiser shell offers a skip link to the main content', async ({ admin, api }) => {
    api.signIn();
    await admin.events.goto();
    await expect(admin.shell.skipLink).toHaveAttribute('href', '#main');
  });
});
