# User journeys

Ordered by value added, highest first. Effort is the sum of the estimates for the designs each journey needs (see the subsystem files in docs/estimates/). The first nine journeys are implemented and covered by acceptance and e2e tests (90%). Not yet done for them: drag-and-drop block reordering (Move up/down are done), a worker that actually sends scheduled emails (they stay Scheduled), the change-password flow that ends other sessions in the UI, and the responsive values still marked `<TO SUPPLY>`. All other journeys are 0%.

| Name | Description | Effort (days) | Completion % |
|---|---|---|---|
| Guest replies to invitation | Guest opens personal link and replies yes or no with party details. | 7 | 90% |
| Guest finds invitation by code | Guest enters invitation code to reach their invitation page. | 3 | 90% |
| Guest changes or declines reply | Guest changes their reply or sends regrets before the window closes. | 3 | 90% |
| Organiser reviews responses | Organiser sees replies, totals and dietary notes for catering. | 4 | 90% |
| Organiser signs in | Organiser signs in, stays signed in and signs out. | 6 | 90% |
| Organiser creates event | Organiser creates an event with type, date, start time and venue. | 2 | 90% |
| Organiser builds and publishes event page | Organiser composes page blocks, previews them and publishes. | 10 | 90% |
| Organiser manages guest list | Organiser adds, edits, searches, selects and removes guests. | 9 | 90% |
| Organiser sends invitations | Organiser schedules invitation emails to all guests or non-responders. | 5 | 90% |
| Organiser sends reminders | Organiser sends reminders only to guests who have not replied. | 5 | 0% |
| Organiser issues and regenerates links | Organiser issues personal links and regenerates them if compromised. | 7 | 0% |
| Organiser imports guests | Organiser imports a validated spreadsheet of guests. | 5 | 0% |
| Organiser exports guests and responses | Organiser downloads guest and response lists as CSV files. | 4 | 0% |
| Organiser tracks delivery outcomes | Organiser sees scheduled, sent and bounced emails per guest. | 5 | 0% |
| Organiser views dashboard and overview | Organiser sees summary counts, upcoming events and reminders due. | 7 | 0% |
| Organiser edits event settings | Organiser edits event details, invite window and sender identity. | 6 | 0% |
| Organiser reads notifications | Organiser reviews replies, bounces and reminders in notifications. | 6 | 0% |
| Organiser resets forgotten password | Organiser requests and sets a new password from an emailed link. | 5 | 0% |
| Organiser updates account settings | Organiser edits profile, notification preferences and password. | 4 | 0% |
| Organiser uploads gallery photos | Organiser adds validated photos to the event page gallery. | 3 | 0% |
| Organiser finds events | Organiser searches, filters and sorts their events list. | 3 | 0% |
| Organiser deletes event | Organiser permanently deletes an event after confirmation. | 3 | 0% |
| Guest personal data is erased | Guest personal data is erased on deletion and after retention. | 4 | 0% |
| Guest loads invitation on phone | Guest opens the invitation page quickly on a mobile connection. | 12 | 0% |
| Anyone uses product on any device | Every screen works across viewports, keyboards and screen readers. | 19 | 0% |
