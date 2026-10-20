import { LIMITS, MEALS } from '../../../src/domain/rsvp.js';
import type { FakeBackend, FakeGuest } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

/** An open, published event with an RSVP block and one invited guest. */
function invited(api: FakeBackend, plusOnes = 0): FakeGuest {
  const event = api.addEvent();
  api.publish(event.id, [
    { id: 'b1', type: 'hero', fields: { headline: 'Join us' } },
    { id: 'b2', type: 'rsvp', fields: {} },
  ]);
  return api.addGuest(event.id, { name: 'Maya Chen', plusOnes });
}

test.describe('L2-040 RSVP form fields', () => {
  test('a guest with no plus-ones chooses a meal but no party size', async ({ guest, api }) => {
    const maya = invited(api);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await expect(form.heading).toBeVisible();
    await expect(form.meal).toHaveCount(0);
    await form.accept.check();
    await expect(form.partySize).toHaveCount(0);
    await expect(form.meal.locator('option')).toHaveText(['Choose a meal', ...MEALS]);
    await expect(form.dietary).toBeVisible();
    await expect(form.song).toBeVisible();
    await expect(form.message).toHaveCount(0);
  });

  test('party size offers one place per invited seat and asks for each guest\'s name', async ({ guest, api }) => {
    const maya = invited(api, 2);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.accept.check();
    await expect(form.partySize.locator('option')).toHaveText(['Just me', 'Me and one guest', 'Me and 2 guests']);
    await expect(form.guestName(0, false)).toHaveCount(0);
    await form.partySize.selectOption({ label: 'Me and one guest' });
    await expect(form.guestName(0, false)).toBeVisible();
    await form.partySize.selectOption({ label: 'Me and 2 guests' });
    await expect(form.guestName(0, true)).toBeVisible();
    await expect(form.guestName(1, true)).toBeVisible();
  });

  test('optional fields count down the characters left', async ({ guest, api }) => {
    const maya = invited(api);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.accept.check();
    await expect(form.counterFor('dietary')).toHaveText(`${LIMITS.dietary} characters left`);
    await form.dietary.fill('No nuts');
    await expect(form.counterFor('dietary')).toHaveText(`${LIMITS.dietary - 7} characters left`);
    await form.song.fill('Dancing Queen');
    await expect(form.counterFor('song')).toHaveText(`${LIMITS.song - 13} characters left`);
    await form.decline.check();
    await form.message.fill('Sorry');
    await expect(form.counterFor('message')).toHaveText(`${LIMITS.message - 5} characters left`);
  });
});

test.describe('L2-041 RSVP validation', () => {
  test('sending without choosing asks "Choose whether you\'re coming" and sends nothing', async ({ guest, api }) => {
    const maya = invited(api);
    await guest.invite.goto(maya.token);
    await guest.invite.form.send.click();
    await expect(guest.invite.form.attendingError).toHaveText("Choose whether you're coming");
    await expect(guest.invite.form.accept).toBeFocused();
    expect(api.calls('POST', `/api/public/invite/${maya.token}/rsvp`)).toHaveLength(0);
  });

  test('accepting without a meal asks for one', async ({ guest, api }) => {
    const maya = invited(api);
    await guest.invite.goto(maya.token);
    await guest.invite.form.attend({});
    await guest.invite.form.send.click();
    await expect(guest.invite.form.errorFor('meal')).toHaveText('Choose a meal');
    await expect(guest.invite.form.meal).toBeFocused();
    expect(api.replyOf(maya.id)).toBeNull();
  });

  test('every extra guest needs a name', async ({ guest, api }) => {
    const maya = invited(api, 2);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.attend({ partySize: 'Me and 2 guests', meal: 'Chicken' });
    await form.guestName(1, true).fill('Kai');
    await form.send.click();
    await expect(form.guestNameError(0)).toHaveText('Add the name of your guest');
    await expect(form.guestNameError(1)).toHaveCount(0);
    await expect(form.guestName(0, true)).toBeFocused();
  });

  test('over-long notes are refused with the limit', async ({ guest, api }) => {
    const maya = invited(api);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.attend({ meal: 'Chicken' });
    await form.song.fill('x'.repeat(LIMITS.song + 1));
    await form.send.click();
    await expect(form.errorFor('song')).toHaveText(`Song request can be up to ${LIMITS.song} characters`);
    await expect(form.counterFor('song')).toHaveText('-1 characters left');
  });
});

test.describe('L2-042 RSVP submission', () => {
  test('AC1 accepting saves the reply, thanks the guest and summarises it', async ({ guest, api }) => {
    const maya = invited(api, 1);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.attend({ partySize: 'Me and one guest', meal: 'Vegetarian', names: ['Sam Okafor'] });
    await form.dietary.fill('No nuts');
    await form.song.fill('Dancing Queen');
    await form.send.click();
    await expect(guest.invite.toast).toHaveText('Your reply is saved');
    await expect(guest.invite.thanks).toBeVisible();
    await expect(guest.invite.summary.value('Your reply')).toHaveText('Joyfully accepting');
    await expect(guest.invite.summary.value('Party size')).toHaveText('2');
    await expect(guest.invite.summary.value('Meal')).toHaveText('Vegetarian');
    expect(api.calls('POST', `/api/public/invite/${maya.token}/rsvp`)[0]!.body).toEqual({
      attending: true, partySize: 2, meal: 'Vegetarian', guestNames: ['Sam Okafor'], dietary: 'No nuts', song: 'Dancing Queen',
    });
    expect(api.replyOf(maya.id)).toMatchObject({ attending: true, partySize: 2, guestNames: ['Sam Okafor'] });
  });

  test('only sends the names for the party size chosen', async ({ guest, api }) => {
    const maya = invited(api, 2);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.attend({ partySize: 'Me and 2 guests', meal: 'Chicken', names: ['Sam', 'Kai'] });
    await form.partySize.selectOption({ label: 'Me and one guest' });
    await form.send.click();
    await expect(guest.invite.thanks).toBeVisible();
    expect(api.calls('POST', `/api/public/invite/${maya.token}/rsvp`)[0]!.body.guestNames).toEqual(['Sam']);
  });

  test('shows Sending… and blocks a second send while saving', async ({ guest, api }) => {
    const maya = invited(api);
    const held = api.hold('POST', `/api/public/invite/${maya.token}/rsvp`);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.attend({ meal: 'Chicken' });
    await form.send.click();
    await expect(form.send).toHaveText('Sending…');
    await expect(form.send).toBeDisabled();
    held.release();
    await expect(guest.invite.thanks).toBeVisible();
    expect(api.calls('POST', `/api/public/invite/${maya.token}/rsvp`)).toHaveLength(1);
  });

  test('a failed send keeps the answers and Try again saves them', async ({ guest, api }) => {
    const maya = invited(api);
    api.failNext('POST', `/api/public/invite/${maya.token}/rsvp`);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.attend({ meal: 'Vegan' });
    await form.dietary.fill('No nuts');
    await form.send.click();
    await expect(form.failure).toContainText('Something went wrong. Try again.');
    await expect(form.accept).toBeChecked();
    await expect(form.meal).toHaveValue('Vegan');
    await expect(form.dietary).toHaveValue('No nuts');
    await form.tryAgain.click();
    await expect(guest.invite.toast).toHaveText('Your reply is saved');
  });

  test('replies that closed while the page was open are refused with the closing date', async ({ guest, api }) => {
    const maya = invited(api);
    api.respond('POST', `/api/public/invite/${maya.token}/rsvp`, 403, { error: 'Replies closed on Sat 12 Dec, 11:59 pm' });
    await guest.invite.goto(maya.token);
    await guest.invite.form.attend({ meal: 'Chicken' });
    await guest.invite.form.send.click();
    await expect(guest.invite.form.failure).toContainText('Replies closed on Sat 12 Dec, 11:59 pm');
  });
});

test.describe('L2-043 Changing a reply', () => {
  test('a returning guest sees their reply and can change it', async ({ guest, api }) => {
    const maya = invited(api, 1);
    api.addReply(maya.id, { attending: true, partySize: 2, meal: 'Chicken', guestNames: ['Sam'], dietary: 'No nuts' });
    await guest.invite.goto(maya.token);
    await expect(guest.invite.thanks).toBeVisible();
    await expect(guest.invite.summary.value('Meal')).toHaveText('Chicken');
    await guest.invite.changeReply.click();
    const form = guest.invite.form;
    await expect(form.accept).toBeChecked();
    await expect(form.partySize).toHaveValue('2');
    await expect(form.guestName(0, false)).toHaveValue('Sam');
    await expect(form.meal).toHaveValue('Chicken');
    await expect(form.dietary).toHaveValue('No nuts');
    await form.meal.selectOption('Vegan');
    await form.send.click();
    await expect(guest.invite.toast).toHaveText('Your reply is saved');
    await expect(guest.invite.summary.value('Meal')).toHaveText('Vegan');
    expect(api.replyOf(maya.id)!.meal).toBe('Vegan');
  });

  test('Cancel returns to the saved reply without sending', async ({ guest, api }) => {
    const maya = invited(api);
    api.addReply(maya.id, { attending: true, meal: 'Chicken' });
    await guest.invite.goto(maya.token);
    await guest.invite.changeReply.click();
    await guest.invite.form.decline.check();
    await guest.invite.form.cancel.click();
    await expect(guest.invite.summary.value('Your reply')).toHaveText('Joyfully accepting');
    expect(api.calls('POST', `/api/public/invite/${maya.token}/rsvp`)).toHaveLength(0);
  });
});

test.describe('L2-044 Declining with a message', () => {
  test('declining asks for confirmation and sends regrets with a message', async ({ guest, api }) => {
    const maya = invited(api);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.decline.check();
    await form.message.fill('Sorry, travelling');
    await form.send.click();
    await expect(form.regrets).toBeVisible();
    await expect(form.regrets).toContainText("We'll let your hosts know you can't make it.");
    await expect(form.regretsMessage).toHaveValue('Sorry, travelling');
    await form.regretsMessage.fill('Sorry, travelling that week');
    await form.sendRegrets.click();
    await expect(guest.invite.toast).toHaveText('Your regrets are sent');
    await expect(form.regrets).toHaveCount(0);
    await expect(guest.invite.summary.value('Your reply')).toHaveText('Regretfully declining');
    await expect(guest.invite.summary.value('Message')).toHaveText('Sorry, travelling that week');
    await expect(guest.invite.summary.value('Meal')).toHaveCount(0);
    expect(api.calls('POST', `/api/public/invite/${maya.token}/rsvp`)[0]!.body).toEqual({ attending: false, message: 'Sorry, travelling that week' });
  });

  test('Keep my reply closes the confirmation without sending', async ({ guest, api }) => {
    const maya = invited(api);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.decline.check();
    await form.send.click();
    await form.keepReply.click();
    await expect(form.regrets).toHaveCount(0);
    await expect(form.decline).toBeChecked();
    expect(api.calls('POST', `/api/public/invite/${maya.token}/rsvp`)).toHaveLength(0);
  });

  test('an attending guest can change to declining', async ({ guest, api }) => {
    const maya = invited(api);
    api.addReply(maya.id, { attending: true, meal: 'Chicken' });
    await guest.invite.goto(maya.token);
    await guest.invite.changeReply.click();
    await guest.invite.form.decline.check();
    await guest.invite.form.send.click();
    await guest.invite.form.sendRegrets.click();
    await expect(guest.invite.toast).toHaveText('Your regrets are sent');
    expect(api.replyOf(maya.id)).toMatchObject({ attending: false, partySize: 0, meal: null });
  });

  test('a failed regrets send closes the confirmation and keeps the message', async ({ guest, api }) => {
    const maya = invited(api);
    api.failNext('POST', `/api/public/invite/${maya.token}/rsvp`);
    await guest.invite.goto(maya.token);
    const form = guest.invite.form;
    await form.decline.check();
    await form.message.fill('Sorry');
    await form.send.click();
    await form.sendRegrets.click();
    await expect(form.failure).toContainText('Something went wrong. Try again.');
    await expect(form.regrets).toHaveCount(0);
    await expect(form.message).toHaveValue('Sorry');
  });
});
