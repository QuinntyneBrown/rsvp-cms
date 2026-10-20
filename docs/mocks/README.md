# Invitely mocks

Static HTML mocks for the RSVP CMS: an organiser admin app, and the public invitation pages guests use to RSVP. Every page, dialog and notification is shown in every state that matters. Open [index.html](index.html) from disk to click through the whole set.

- Light and dark: the mock bar toggles the theme; `?theme=dark` forces it.
- Chrome: `?chrome=0` hides the mock bar and the annotation notes, so a mock looks exactly like the product.
- Widths: every file is responsive at 360, 768 and 1280 px, with no horizontal page scroll.

## Cast and catalog

Reused in every mock. Keep names, numbers and dates consistent when you add a screen.

**Today:** Monday 19 October 2026.

**Organiser:** Priya Natarajan (admin, signed in). Initials `PN`. Email `priya@example.com`.

**Invitees (Maya’s 30th):** Jonah Adeyemi, Mei Rodríguez, Tomasz Okafor, Amara Osei, Lena Hoffmann, Ruth Abernathy, Sam Whitfield, Kenji Mori.

**Events**

| Event | Type | When | Invite window | State in the mocks | Counts |
|---|---|---|---|---|---|
| Maya’s 30th birthday | Birthday | Sat 14 Nov 2026, 7:00 pm, The Lantern Room, 88 Harbour Street | Opens Mon 19 Oct 9:00 am; closes Sat 7 Nov 11:59 pm | Invites open, public page published | 84 invitees · 52 attending · 9 declined · 23 waiting |
| Christmas Eve at the Okafors’ | Holiday | Thu 24 Dec 2026, 6:30 pm, 14 Alder Road | Opens Mon 26 Oct | Scheduled, not yet invited | 46 invitees |
| Grandma Ruth’s 90th | Birthday | Sun 29 Nov 2026, 1:00 pm, Riverside Community Hall, Room B | Opened Mon 14 Sep; closed Sun 4 Oct | Invites closed, read-only | 37 invitees · 30 attending · 4 declined · 3 waiting |

**Public page (Maya’s 30th):** headline “Maya is turning 30, and we want you there”; details; schedule (6:30 doors, 7:00 dinner, 9:30 cake and dancing); FAQ; invitation-code form.

**Emails:** Invitation (sent Mon 19 Oct), Reminder 1 to people who have not replied (Fri 30 Oct), Reminder 2 “closing soon” (Thu 5 Nov), Event details to people attending (Fri 13 Nov).

## Screens

- **Admin pages:** dashboard, events, new event, event overview, event page (CMS block editor), event settings (including the invite window), guests, guest import (CSV), emails, responses, notifications, account, plus sign-in, forgot password, reset password and the error pages (404, 403, 500, offline).
- **Public pages:** invitation page (CMS-driven), RSVP form for an invitee, and the invalid or expired invitation link.
- **Dialogs:** delete event (typed confirmation), add or edit guest, remove guests, schedule invitations, email preview, add a CMS block, discard unpublished changes, reset invitation links, decline an RSVP.
- **Notifications:** save toast (with stacked and with-action), event status banner, guest import alerts, RSVP toast, invitation page banner.

## Open questions and assumptions

No specs existed in `docs/specs/` when these were written, so the screen list comes from the product brief and the standard screens every product has. Requirement IDs are not yet attached; add them to `manifest.json` and each file’s `mock:requirements` meta when L1 and L2 exist.

1. **Product name.** “Invitely” is a placeholder. Replace it in the topbar, the footers and the `<title>` tags before any stakeholder review.
2. **Invitation codes.** Each invitee gets a personal code (for example `MAYA-7K2Q`), sent in the invitation email, and the public page takes it at `/e/<slug>`. The RSVP form lives at `/i/<code>`. Confirm this is the right way to identify guests, instead of a sign-in or a fixed link.
3. **Invite window.** Each event has an open date and a close date. Assumed: opens 9:00 am and closes 11:59 pm on the chosen days, in the event time zone.
4. **Event types.** Birthday, Holiday, Anniversary and Other, to cover “Birthdays, Christmas, etc.”. Each type’s starting layout is not designed; the CMS block set is fixed for now (hero, details, schedule, map, RSVP form, FAQ, photo gallery, gift list).
5. **Co-hosts.** The 403 page mentions co-hosts, but no screen manages them. Decide whether they are in scope for the demo.
6. **Organiser sign-up.** Only sign-in, forgot password and reset password are mocked. There is no self sign-up or invite-an-organiser flow.
7. **Email delivery.** The mocks assume the email provider reports bounces, and that reminders skip anyone who has replied. Invitation emails are previewed inside a dialog rather than as standalone pages.
8. **Time zones.** Events carry a time zone; guests see the page in the event time zone, with a note. No per-guest time zone is designed.
9. **Changing an answer.** Guests can change or withdraw their RSVP until the invite window closes. After that the page shows that replies are closed and who to contact.
10. **Brand and contrast.** The accent is the starter blue from `tokens.css`. The colour pairs pass WCAG AA in both themes by the shipped values; the design-system contrast checker was not run, because it is not installed.
11. **Interaction.** These are static mocks. Buttons such as “Copy link”, “Add to calendar” and the reorder controls show their state but do not work.
12. **Screenshot review.** The overflow scan at 360, 768 and 1280 px is clean. The screenshot script waits 150 ms, so dialogs captured by it can look faded mid-animation; they render correctly after about 300 ms.

## Keyboard and accessibility

Every control is a real button, link or form field with a label. Dialogs are `role="dialog"` with `aria-modal`, the page behind them is `inert`, and each has a close button. Toasts sit in a live region. Tab bars on event pages are navigation links with `aria-current`, not ARIA tabs, so they behave as links.

## Commands

```sh
# Re-check the manifest, the files and the gallery; regenerate index.html and the coverage matrix below
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write

# Render every mock at 360, 768 and 1280 px in light and dark (writes to docs/mocks/.cache, not committed)
python .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks
```

The HTML was written by a one-off generator kept outside the repository. Edit the mock files directly from here on, and keep `manifest.json` in step with any file you add or remove.

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | partial | no-results | long | selected | invalid | submitting | success | read-only | expired | not-open | closed | edge | already-responded | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard (`dashboard`) | [✅](pages/dashboard/default.html) | [✅](pages/dashboard/loading.html) | [✅](pages/dashboard/empty.html) | [✅](pages/dashboard/error.html) | [✅](pages/dashboard/partial.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Events (`events`) | [✅](pages/events/default.html) | [✅](pages/events/loading.html) | [✅](pages/events/empty.html) | [✅](pages/events/error.html) |  | [✅](pages/events/no-results.html) | [✅](pages/events/long.html) | [✅](pages/events/selected.html) |  |  |  |  |  |  |  |  |  |  |
| New event (`event-new`) | [✅](pages/event-new/default.html) | [✅](pages/event-new/loading.html) | ➖ | [✅](pages/event-new/error.html) |  |  |  |  | [✅](pages/event-new/invalid.html) | [✅](pages/event-new/submitting.html) | [✅](pages/event-new/success.html) |  |  |  |  |  |  |  |
| Event overview (`event-overview`) | [✅](pages/event-overview/default.html) | [✅](pages/event-overview/loading.html) | [✅](pages/event-overview/empty.html) | [✅](pages/event-overview/error.html) | [✅](pages/event-overview/partial.html) |  |  |  |  |  |  | [✅](pages/event-overview/read-only.html) |  |  |  |  |  |  |
| Event page (`event-page-cms`) | [✅](pages/event-page-cms/default.html) | [✅](pages/event-page-cms/loading.html) | [✅](pages/event-page-cms/empty.html) | [✅](pages/event-page-cms/error.html) |  |  |  |  | [✅](pages/event-page-cms/invalid.html) | [✅](pages/event-page-cms/submitting.html) | [✅](pages/event-page-cms/success.html) |  |  |  |  |  |  |  |
| Event settings (`event-settings`) | [✅](pages/event-settings/default.html) | [✅](pages/event-settings/loading.html) | ➖ | [✅](pages/event-settings/error.html) |  |  |  |  | [✅](pages/event-settings/invalid.html) | [✅](pages/event-settings/submitting.html) | [✅](pages/event-settings/success.html) |  |  |  |  |  |  |  |
| Guests (`guests`) | [✅](pages/guests/default.html) | [✅](pages/guests/loading.html) | [✅](pages/guests/empty.html) | [✅](pages/guests/error.html) |  | [✅](pages/guests/no-results.html) | [✅](pages/guests/long.html) | [✅](pages/guests/selected.html) |  |  |  |  |  |  |  |  |  |  |
| Import guests (`guest-import`) | [✅](pages/guest-import/default.html) | [✅](pages/guest-import/loading.html) | ➖ | [✅](pages/guest-import/error.html) |  |  |  |  | [✅](pages/guest-import/invalid.html) | [✅](pages/guest-import/submitting.html) | [✅](pages/guest-import/success.html) |  |  |  |  |  |  |  |
| Emails (`event-emails`) | [✅](pages/event-emails/default.html) | [✅](pages/event-emails/loading.html) | [✅](pages/event-emails/empty.html) | [✅](pages/event-emails/error.html) | [✅](pages/event-emails/partial.html) |  |  |  |  |  |  | [✅](pages/event-emails/read-only.html) |  |  |  |  |  |  |
| Responses (`event-responses`) | [✅](pages/event-responses/default.html) | [✅](pages/event-responses/loading.html) | [✅](pages/event-responses/empty.html) | [✅](pages/event-responses/error.html) | [✅](pages/event-responses/partial.html) | [✅](pages/event-responses/no-results.html) | [✅](pages/event-responses/long.html) |  |  |  |  |  |  |  |  |  |  |  |
| Notifications (`notifications`) | [✅](pages/notifications/default.html) | [✅](pages/notifications/loading.html) | [✅](pages/notifications/empty.html) | [✅](pages/notifications/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Account (`account`) | [✅](pages/account/default.html) | [✅](pages/account/loading.html) | ➖ | [✅](pages/account/error.html) |  |  |  |  | [✅](pages/account/invalid.html) | [✅](pages/account/submitting.html) | [✅](pages/account/success.html) |  |  |  |  |  |  |  |
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | [✅](pages/sign-in/loading.html) | ➖ | [✅](pages/sign-in/error.html) |  |  |  |  | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) |  |  |  |  |  |  |  |  |
| Forgot password (`forgot-password`) | [✅](pages/forgot-password/default.html) | ➖ | ➖ | [✅](pages/forgot-password/error.html) |  |  |  |  | [✅](pages/forgot-password/invalid.html) | [✅](pages/forgot-password/submitting.html) | [✅](pages/forgot-password/success.html) |  |  |  |  |  |  |  |
| Reset password (`reset-password`) | [✅](pages/reset-password/default.html) | ➖ | ➖ | [✅](pages/reset-password/error.html) |  |  |  |  | [✅](pages/reset-password/invalid.html) | [✅](pages/reset-password/submitting.html) | [✅](pages/reset-password/success.html) |  | [✅](pages/reset-password/expired.html) |  |  |  |  |  |
| Page not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Access denied (`forbidden`) | [✅](pages/forbidden/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Something went wrong (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Invitation page (`public-event`) | [✅](pages/public-event/default.html) | [✅](pages/public-event/loading.html) | [✅](pages/public-event/empty.html) | [✅](pages/public-event/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/public-event/not-open.html) | [✅](pages/public-event/closed.html) | [✅](pages/public-event/edge.html) |  |  |
| RSVP (`rsvp`) | [✅](pages/rsvp/default.html) | [✅](pages/rsvp/loading.html) | ➖ | [✅](pages/rsvp/error.html) |  |  |  |  | [✅](pages/rsvp/invalid.html) | [✅](pages/rsvp/submitting.html) | [✅](pages/rsvp/success.html) |  |  |  |  |  | [✅](pages/rsvp/already-responded.html) |  |
| Invitation link (`invite-invalid`) | [✅](pages/invite-invalid/default.html) | [✅](pages/invite-invalid/loading.html) | ➖ | [✅](pages/invite-invalid/error.html) |  |  |  |  |  |  |  |  | [✅](pages/invite-invalid/expired.html) |  |  |  |  |  |

### Dialogs

| Screen | default | busy | invalid | confirm | failed | success | scroll | Requirements |
|---|---|---|---|---|---|---|---|---|
| Delete event (`event-delete`) | [✅](dialogs/event-delete/default.html) | [✅](dialogs/event-delete/busy.html) | [✅](dialogs/event-delete/invalid.html) | [✅](dialogs/event-delete/confirm.html) | [✅](dialogs/event-delete/failed.html) |  |  |  |
| Add or edit guest (`guest-edit`) | [✅](dialogs/guest-edit/default.html) | [✅](dialogs/guest-edit/busy.html) | [✅](dialogs/guest-edit/invalid.html) |  | [✅](dialogs/guest-edit/failed.html) |  |  |  |
| Remove guests (`guest-remove`) | [✅](dialogs/guest-remove/default.html) | [✅](dialogs/guest-remove/busy.html) | ➖ |  | [✅](dialogs/guest-remove/failed.html) |  |  |  |
| Schedule invitations (`invite-send`) | [✅](dialogs/invite-send/default.html) | [✅](dialogs/invite-send/busy.html) | [✅](dialogs/invite-send/invalid.html) |  | [✅](dialogs/invite-send/failed.html) | [✅](dialogs/invite-send/success.html) |  |  |
| Preview invitation email (`email-preview`) | [✅](dialogs/email-preview/default.html) | [✅](dialogs/email-preview/busy.html) | ➖ |  |  |  | [✅](dialogs/email-preview/scroll.html) |  |
| Add a block (`block-picker`) | [✅](dialogs/block-picker/default.html) | [✅](dialogs/block-picker/busy.html) | ➖ |  | [✅](dialogs/block-picker/failed.html) |  |  |  |
| Discard changes (`discard-changes`) | [✅](dialogs/discard-changes/default.html) | [✅](dialogs/discard-changes/busy.html) | ➖ |  | [✅](dialogs/discard-changes/failed.html) |  |  |  |
| Reset invitation links (`regenerate-links`) | [✅](dialogs/regenerate-links/default.html) | [✅](dialogs/regenerate-links/busy.html) | ➖ |  | [✅](dialogs/regenerate-links/failed.html) |  |  |  |
| Decline RSVP (`rsvp-decline`) | [✅](dialogs/rsvp-decline/default.html) | [✅](dialogs/rsvp-decline/busy.html) | ➖ |  | [✅](dialogs/rsvp-decline/failed.html) |  |  |  |

### Notifications

| Screen | info | success | warning | danger | with-action | stacked | persistent | Requirements |
|---|---|---|---|---|---|---|---|---|
| Save toast (`save-toast`) | [✅](notifications/save-toast/info.html) | [✅](notifications/save-toast/success.html) | [✅](notifications/save-toast/warning.html) | [✅](notifications/save-toast/danger.html) | [✅](notifications/save-toast/with-action.html) | [✅](notifications/save-toast/stacked.html) |  |  |
| Event banner (`schedule-banner`) | [✅](notifications/schedule-banner/info.html) | [✅](notifications/schedule-banner/success.html) | [✅](notifications/schedule-banner/warning.html) | [✅](notifications/schedule-banner/danger.html) |  |  | [✅](notifications/schedule-banner/persistent.html) |  |
| Import alerts (`guest-import-alert`) | [✅](notifications/guest-import-alert/info.html) | [✅](notifications/guest-import-alert/success.html) | [✅](notifications/guest-import-alert/warning.html) | [✅](notifications/guest-import-alert/danger.html) |  |  |  |  |
| RSVP toast (`rsvp-toast`) | [✅](notifications/rsvp-toast/info.html) | [✅](notifications/rsvp-toast/success.html) | [✅](notifications/rsvp-toast/warning.html) | [✅](notifications/rsvp-toast/danger.html) |  |  |  |  |
| Invite banner (`public-banner`) | [✅](notifications/public-banner/info.html) | [✅](notifications/public-banner/success.html) | [✅](notifications/public-banner/warning.html) | [✅](notifications/public-banner/danger.html) |  |  |  |  |

<!-- coverage:end -->
