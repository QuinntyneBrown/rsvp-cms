# Estimates

- Overall effort: 147 days
- Complete: 29%

| Subsystem | Effort | Complete |
|---|---|---|
| [accounts](accounts.md) | 15 days | 35% |
| [events](events.md) | 17 days | 12% |
| [event-page](event-page.md) | 13 days | 51% |
| [guests](guests.md) | 16 days | 37% |
| [invitations](invitations.md) | 19 days | 48% |
| [rsvp](rsvp.md) | 13 days | 82% |
| [responses](responses.md) | 6 days | 53% |
| [dashboard](dashboard.md) | 7 days | 0% |
| [notifications](notifications.md) | 6 days | 0% |
| [privacy](privacy.md) | 4 days | 0% |
| [performance](performance.md) | 12 days | 0% |
| [accessibility](accessibility.md) | 9 days | 0% |
| [responsive-design](responsive-design.md) | 10 days | 0% |

Access control, security, reliability and time zones are out of scope and are not estimated.

## Roadmap

1. Finish the journey J1-J9 designs: rebuild the organiser and guest UI on the design-system components to match the mocks, then close the open criteria (session-ended redirect, drag-and-drop blocks, guest-row actions and copy, account password change).
2. Accounts and events: reset-password, manage-account-settings, list-events, edit-event-details, manage-invite-window, delete-event and regenerate-invitation-links.
3. Invitations: issue-personal-links, send-reminders and track-delivery-outcomes on the existing mail worker.
4. Guests, responses and page extras: import-guests-csv, export-guests, export-responses and upload-gallery-photos.
5. Dashboard and notifications, then the cross-cutting privacy, performance, accessibility and responsive-design work.
