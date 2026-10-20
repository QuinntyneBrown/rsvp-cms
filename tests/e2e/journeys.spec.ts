import { ORGANISER } from './support/fake-backend.js';
import { expect, GuestApp, test } from './support/fixtures.js';

/**
 * The whole organiser and guest journey across both apps (user journeys J1 to J9). Both apps share one
 * stateful fake backend, so what the organiser sets up is what the guest sees, and the guest's reply
 * reaches the organiser's Responses tab.
 */
test('organiser sets up an event, a guest replies by code, the organiser sees it (J5-J9, J1-J4)', async ({ admin, context }) => {
  // J5 sign in
  await admin.signIn.goto();
  await admin.signIn.signIn(ORGANISER.email, 'wrong');
  await expect(admin.signIn.alert).toHaveText('Email or password is not right');
  await admin.signIn.signIn(ORGANISER.email, ORGANISER.password);
  await expect(admin.events.heading).toBeVisible();

  // J6 create event
  await admin.events.newEvent.click();
  await admin.newEvent.createEvent({ name: 'Maya & Sam', date: '2027-06-12', startTime: '16:00' });
  await expect(admin.event.heading).toHaveText('Maya & Sam');
  await expect(admin.event.toast).toHaveText('Event created');

  // J8 add a guest
  await admin.event.openTab('guests');
  await admin.event.guests.add({ name: 'Maya Chen', email: 'maya@example.com', plusOnes: 1 });
  await expect(admin.event.guests.row('Maya Chen')).toBeVisible();
  const { code } = await admin.event.guests.cells('Maya Chen');

  // J7 compose and publish the page
  const composer = admin.event.composer;
  await admin.event.openTab('page');
  await composer.add('Hero');
  await composer.publish.click();
  await expect(composer.block(0).errorFor('Headline')).toHaveText('Add a headline');
  await composer.block(0).field('Headline').fill('Join us');
  await composer.add('RSVP form');
  await composer.publish.click();
  await expect(composer.status).toHaveText('Published · just now');

  // J9 schedule invitations
  await admin.event.openTab('emails');
  await admin.event.emails.scheduleInvitations.click();
  await admin.event.emails.dialog.schedule();
  await expect.poll(() => admin.event.emails.cells(0)).toMatchObject({ audience: 'All invitees', recipients: '1' });

  // J2 + J1 guest finds the invitation by code and replies
  const guest = new GuestApp(await context.newPage());
  await guest.codeEntry.goto();
  await guest.codeEntry.find('nonsense');
  await expect(guest.codeEntry.error).toHaveText("This invitation link doesn't work");
  await guest.codeEntry.find(code!.toLowerCase());
  await expect(guest.invite.greeting).toHaveText('Hi Maya, will you join us?');
  await expect(guest.invite.section('Hero')).toContainText('Join us');
  const form = guest.invite.form;
  await form.send.click();
  await expect(form.attendingError).toHaveText("Choose whether you're coming");
  await form.attend({ partySize: 'Me and one guest', meal: 'Chicken' });
  await form.send.click();
  await expect(form.guestNameError(0)).toHaveText('Add the name of your guest');
  await form.guestName(0, false).fill('Sam Okafor');
  await form.send.click();
  await expect(guest.invite.toast).toHaveText('Your reply is saved');

  // J3 change to declining
  await guest.invite.changeReply.click();
  await form.decline.check();
  await form.send.click();
  await form.sendRegrets.click();
  await expect(guest.invite.toast).toHaveText('Your regrets are sent');

  // J4 organiser sees the reply and totals
  await admin.event.openTab('responses');
  await expect.poll(() => admin.event.responses.cells(0)).toMatchObject({ guest: 'Maya Chen', reply: 'Declined' });
  await expect(admin.event.responses.total('Declined')).toHaveText('1');
  await expect(admin.event.responses.total('Attending')).toHaveText('0');
});
