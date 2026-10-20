# User journeys

Ordered by value added, highest first. Effort is the sum of the estimates for the designs each journey needs, and Completion % is the effort-weighted percent complete of those designs (see the subsystem files in docs/estimates/), counting an acceptance criterion as done only when it is both implemented and tested. The first nine journeys run end to end on PostgreSQL through Prisma, with the API, the mail worker that sends scheduled invitations and the change-password endpoint covered by acceptance tests that use an in-memory store, never a real database. The organiser and guest UI is now built on the design-system components and laid out as the mocks, and every page, dialog and state is covered by Playwright tests against a faked backend. What remains open: drag-and-drop block reordering and the phone-width preview check in the page composer (in progress), and four criteria that wait on later journeys: the Import CSV action in the empty guest list (J12), landing on the dashboard after sign-in (J15; sign-in lands on Events today), setting the sender identity in Event settings (J16; it is set when scheduling today), and naming the organiser on a link invalidated by regeneration (J11). Later journeys show partial progress where the shared mail worker already covers part of them.

| Name | Description | Effort (days) | Completion % |
|---|---|---|---|
| Guest replies to invitation | Guest opens personal link and replies yes or no with party details. | 7 | 98% |
| Guest finds invitation by code | Guest enters invitation code to reach their invitation page. | 3 | 100% |
| Guest changes or declines reply | Guest changes their reply or sends regrets before the window closes. | 3 | 100% |
| Organiser reviews responses | Organiser sees replies, totals and dietary notes for catering. | 4 | 100% |
| Organiser signs in | Organiser signs in, stays signed in and signs out. | 6 | 98% |
| Organiser creates event | Organiser creates an event with type, date, start time and venue. | 2 | 100% |
| Organiser builds and publishes event page | Organiser composes page blocks, previews them and publishes. | 10 | 94% |
| Organiser manages guest list | Organiser adds, edits, searches, selects and removes guests. | 9 | 98% |
| Organiser sends invitations | Organiser schedules invitation emails to all guests or non-responders. | 5 | 97% |
| Organiser sends reminders | Organiser sends reminders only to guests who have not replied. | 5 | 40% |
| Organiser issues and regenerates links | Organiser issues personal links and regenerates them if compromised. | 7 | 20% |
| Organiser imports guests | Organiser imports a validated spreadsheet of guests. | 5 | 0% |
| Organiser exports guests and responses | Organiser downloads guest and response lists as CSV files. | 4 | 0% |
| Organiser tracks delivery outcomes | Organiser sees scheduled, sent and bounced emails per guest. | 5 | 30% |
| Organiser views dashboard and overview | Organiser sees summary counts, upcoming events and reminders due. | 7 | 0% |
| Organiser edits event settings | Organiser edits event details, invite window and sender identity. | 6 | 10% |
| Organiser reads notifications | Organiser reviews replies, bounces and reminders in notifications. | 6 | 0% |
| Organiser resets forgotten password | Organiser requests and sets a new password from an emailed link. | 5 | 0% |
| Organiser updates account settings | Organiser edits profile, notification preferences and password. | 4 | 20% |
| Organiser uploads gallery photos | Organiser adds validated photos to the event page gallery. | 3 | 0% |
| Organiser finds events | Organiser searches, filters and sorts their events list. | 3 | 0% |
| Organiser deletes event | Organiser permanently deletes an event after confirmation. | 3 | 0% |
| Guest personal data is erased | Guest personal data is erased on deletion and after retention. | 4 | 0% |
| Guest loads invitation on phone | Guest opens the invitation page quickly on a mobile connection. | 12 | 0% |
| Anyone uses product on any device | Every screen works across viewports, keyboards and screen readers. | 19 | 0% |
