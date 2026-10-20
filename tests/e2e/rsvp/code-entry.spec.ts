import { expect, test } from '../support/fixtures.js';

test.describe('L2-037 Invitation code entry', () => {
  test('asks for the code from the invitation email', async ({ guest }) => {
    await guest.codeEntry.goto();
    await expect(guest.codeEntry.heading).toBeVisible();
    await expect(guest.page.getByText('The code is on your invitation email, like MAYA-7K2Q.')).toBeVisible();
    await expect(guest.codeEntry.code).toHaveAttribute('autocomplete', 'off');
  });

  test('AC3 an empty code asks for one without sending anything', async ({ guest, api }) => {
    await guest.codeEntry.goto();
    await guest.codeEntry.find('');
    await expect(guest.codeEntry.error).toHaveText('Enter your invitation code');
    await expect(guest.codeEntry.code).toBeFocused();
    expect(api.calls('POST', '/api/public/code')).toHaveLength(0);
  });

  test('an unknown code says the invitation does not work', async ({ guest }) => {
    await guest.codeEntry.goto();
    await guest.codeEntry.find('NOPE-NOPE');
    await expect(guest.codeEntry.error).toHaveText("This invitation link doesn't work");
    await expect(guest.codeEntry.submit).toBeEnabled();
  });

  test('a known code opens the guest\'s personal page, ignoring case, spaces and a missing dash', async ({ guest, api }) => {
    const event = api.addEvent();
    api.publish(event.id, [{ id: 'b1', type: 'hero', fields: { headline: 'Join us' } }]);
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    await guest.codeEntry.goto();
    await guest.codeEntry.find(` ${maya.code.replace('-', '').toLowerCase()} `);
    await expect(guest.page).toHaveURL(new RegExp(`/i/${maya.token}$`));
    await expect(guest.invite.greeting).toHaveText('Hi Maya, will you join us?');
  });

  test('shows Checking… and blocks a second submit while the code is checked', async ({ guest, api }) => {
    const held = api.hold('POST', '/api/public/code');
    await guest.codeEntry.goto();
    await guest.codeEntry.find('NOPE-NOPE');
    await expect(guest.codeEntry.submit).toHaveText('Checking…');
    await expect(guest.codeEntry.submit).toBeDisabled();
    held.release();
    await expect(guest.codeEntry.error).toBeVisible();
    expect(api.calls('POST', '/api/public/code')).toHaveLength(1);
  });

  test('a lost connection says so and the code can be sent again', async ({ guest, api }) => {
    api.abortNext('POST', '/api/public/code');
    await guest.codeEntry.goto();
    await guest.codeEntry.find('NOPE-NOPE');
    await expect(guest.codeEntry.error).toHaveText('Something went wrong. Check your connection and try again.');
    await guest.codeEntry.submit.click();
    await expect(guest.codeEntry.error).toHaveText("This invitation link doesn't work");
  });
});
