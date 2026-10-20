# Detailed designs

This folder holds the detailed design of every in-scope feature in Invitely, the RSVP CMS. Each feature is one vertical slice that cuts from the UI through the API and domain to storage. The folder layout is `{subsystem}/{feature}/README.md`, with rendered C4, class and sequence diagrams in each feature's `diagrams/` folder.

Access control, security hardening, reliability, time zones and the personal-data access rules are out of scope. They have no designs here.

The designs trace to the requirements in [docs/specs/L1.md](../specs/L1.md) and [docs/specs/L2.md](../specs/L2.md). Every in-scope L2 requirement appears in exactly one feature's Requirements table. Each table gives the L2 ID, the L1 parent it refines, and the requirement text copied from L2.md.

## Subsystems

| Subsystem | Refines (L1) | Features |
|-----------|--------------|----------|
| [accounts](accounts/) | L1-001, L1-010 | 4 |
| [events](events/) | L1-002 | 6 |
| [event-page](event-page/) | L1-003 | 4 |
| [guests](guests/) | L1-004 | 4 |
| [invitations](invitations/) | L1-005 | 5 |
| [rsvp](rsvp/) | L1-006 | 4 |
| [responses](responses/) | L1-007 | 2 |
| [dashboard](dashboard/) | L1-008 | 3 |
| [notifications](notifications/) | L1-009 | 2 |
| [performance](performance/) | L1-013 | 5 |
| [responsive-design](responsive-design/) | L1-014 | 4 |
| [accessibility](accessibility/) | L1-015 | 4 |
| [privacy](privacy/) | L1-018 | 1 |

## Features

### accounts

- [Sign in as an organiser](accounts/sign-in-organiser/README.md): L2-001
- [Reset a forgotten password](accounts/reset-password/README.md): L2-003, L2-004
- [Manage organiser sessions](accounts/manage-session/README.md): L2-005
- [Manage account settings](accounts/manage-account-settings/README.md): L2-058, L2-059, L2-060

### events

- [Create an event](events/create-event/README.md): L2-006
- [Manage the invite window and event status](events/manage-invite-window/README.md): L2-007, L2-009
- [Edit event details](events/edit-event-details/README.md): L2-008
- [Delete an event](events/delete-event/README.md): L2-010
- [Regenerate invitation links](events/regenerate-invitation-links/README.md): L2-011
- [List and find events](events/list-events/README.md): L2-012

### event-page

- [Compose the public page from blocks](event-page/compose-page-blocks/README.md): L2-013, L2-014
- [Save, publish and discard page drafts](event-page/publish-page-draft/README.md): L2-015, L2-016
- [Preview the page as a guest](event-page/preview-guest-page/README.md): L2-017
- [Upload gallery photos](event-page/upload-gallery-photos/README.md): L2-018

### guests

- [View, search and select guests](guests/view-guest-list/README.md): L2-019, L2-020, L2-024
- [Add, edit and remove guests](guests/manage-guest/README.md): L2-021, L2-022, L2-023
- [Import guests from a CSV file](guests/import-guests-csv/README.md): L2-025, L2-026, L2-027
- [Export the guest list](guests/export-guests/README.md): L2-028

### invitations

- [Schedule invitation emails](invitations/schedule-invitations/README.md): L2-029, L2-036
- [Review scheduled and sent emails](invitations/review-scheduled-emails/README.md): L2-030, L2-031
- [Send reminders to guests who have not replied](invitations/send-reminders/README.md): L2-032
- [Issue personal invitation links](invitations/issue-personal-links/README.md): L2-033
- [Track delivery outcomes and bounces](invitations/track-delivery-outcomes/README.md): L2-034, L2-035

### rsvp

- [Enter an invitation code](rsvp/enter-invitation-code/README.md): L2-037
- [Open a personal invitation link](rsvp/open-personal-invitation/README.md): L2-038, L2-039
- [Submit an RSVP](rsvp/submit-rsvp/README.md): L2-040, L2-041, L2-042, L2-044
- [Change an RSVP before the window closes](rsvp/change-rsvp/README.md): L2-043

### responses

- [View and filter responses](responses/view-responses/README.md): L2-046, L2-047, L2-048
- [Export responses](responses/export-responses/README.md): L2-049

### dashboard

- [Show the organiser dashboard summary](dashboard/show-dashboard-summary/README.md): L2-051, L2-052
- [Show the event overview](dashboard/show-event-overview/README.md): L2-053
- [Prompt the organiser about due reminders](dashboard/prompt-due-reminders/README.md): L2-054

### notifications

- [List and mark notifications read](notifications/list-notifications/README.md): L2-055, L2-057
- [Create notifications for key events](notifications/create-notifications/README.md): L2-056

### performance

- [Load the public page quickly](performance/load-public-page-fast/README.md): L2-075
- [Meet API response-time targets](performance/meet-api-latency/README.md): L2-076
- [Render large lists within limits](performance/render-large-lists/README.md): L2-077
- [Process bulk operations within limits](performance/process-bulk-operations/README.md): L2-078
- [Scale horizontally by adding instances](performance/scale-horizontally/README.md): L2-079

### responsive-design

- [Adapt the organiser layout to viewport width](responsive-design/adapt-organiser-layout/README.md): L2-080, L2-081
- [Adapt the public page layout to viewport width](responsive-design/adapt-guest-page-layout/README.md): L2-082
- [Fit dialogs to the viewport](responsive-design/adapt-dialogs/README.md): L2-083
- [Size touch targets and show touch actions](responsive-design/size-touch-targets/README.md): L2-084

### accessibility

- [Ensure contrast and select a theme](accessibility/ensure-contrast-and-themes/README.md): L2-085, L2-088
- [Support keyboard operation and focus](accessibility/support-keyboard-operation/README.md): L2-086
- [Label form controls and announce errors](accessibility/announce-form-errors/README.md): L2-087
- [Respect reduced-motion preferences](accessibility/respect-reduced-motion/README.md): L2-089

### privacy

- [Erase guest personal data on deletion and retention](privacy/erase-guest-data/README.md): L2-097

## Open decisions

The designs mark these points as `<TO SUPPLY>` or as open items in the feature READMEs. Each needs a decision from the requirement owner or the team.

- **Erasure timing (L2-097):** criterion 3 does not say whether erasure waits for the 30-day notice. The design erases on the eligibility date, after the notice.
- **Reply percentage (L2-053):** the example gives 62% as attending divided by invitees (52 / 84). The design uses that formula. Counting all replies would give 73%. The spec's label "reply percentage" should be confirmed.
- **Responsive gaps:** the navigation layout between 576 and 767 px, the guest page layout between 576 and 991 px, the theme fallback when the OS reports no preference, focus order for rows with many actions, the animation duration, and the live-region politeness value are all `<TO SUPPLY>`.
- **Source folders:** some components sit in folders that AGENTS.md does not list, such as `src/api/events` for the dashboard and notifications endpoints, `src/shared/forms`, `src/shared/storage`, `src/shared/mail`, and domain subfolders such as `src/domain/invitations`. `src/shared/{forms,storage,mail}` and `src/domain/invitations` are approved and listed in AGENTS.md.

## Technology

The stack is TypeScript: React 19 with Vite for the organiser app (`src/admin`) and the guest app (`src/rsvp`); Node.js 24 with Express 5 and zod for the API application, serving JSON over HTTPS; PostgreSQL 17 through Prisma ORM 7 with the `@prisma/adapter-pg` driver adapter for data; Vitest and Playwright for tests. Persistence goes through the `Store` interface (`src/data/store.ts`): `PrismaStore` serves the running app, and the in-memory `MemoryStore` serves every automated test and the e2e server.

The 15 designs behind user journeys J1 to J9 are updated to this stack. Their C4 diagrams name the chosen technology, and each Description states where every design component lives in the code. Those designs are Sign in as an organiser, Manage organiser sessions, Create an event, Compose the public page from blocks, Preview the page as a guest, Save, publish and discard page drafts, View, search and select guests, Add, edit and remove guests, Schedule invitation emails, Review scheduled and sent emails, Open a personal invitation link, Enter an invitation code, Submit an RSVP, Change an RSVP before the window closes, and View and filter responses. The other designs were drawn before the stack was chosen and still use `<TO SUPPLY>` technology labels and neutral class-diagram types. Some of their class diagrams use `IReadOnlyList`, which the neutral-type rule does not cover; that should be normalised when they are updated.
