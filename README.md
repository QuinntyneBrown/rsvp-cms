# rsvp-cms

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: early development](https://img.shields.io/badge/status-early%20development-orange.svg)](docs/estimates/README.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6.svg?logo=typescript&logoColor=white)](tsconfig.json)
[![WCAG 2.2 AA](https://img.shields.io/badge/accessibility-WCAG%202.2%20AA-green.svg)](docs/specs/L1.md#l1-015-accessibility-cross-cutting)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](.github/CONTRIBUTING.md)

rsvp-cms is an open source content management system for event RSVPs. Organizers create events, build a public event page, manage guest lists and invitations, and review replies. Guests answer from a simple public RSVP page: attending or declining, party size, meal choice, dietary needs, a song request and a message.

> [!IMPORTANT]
> rsvp-cms is in **early development**. The requirements, HTML mocks, detailed designs and estimates are done, and the TypeScript project is scaffolded. The features are not implemented yet. See [Project status](#project-status).

## Contents

- [Features](#features)
- [Project status](#project-status)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Repository layout](#repository-layout)
- [Documentation](#documentation)
- [How we build](#how-we-build)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## Features

**For organizers**

- **Accounts.** Sign in, reset a forgotten password, manage your profile and notification preferences.
- **Events.** Create birthdays, holidays, anniversaries and other occasions. Set the invite window, see whether invitations are open or closed, regenerate invitation links and delete events.
- **Event page builder.** Build the public page from blocks: hero, details, schedule, map, RSVP form, FAQ, photo gallery and gift list. Keep changes as a draft, preview the page as a guest sees it, then publish.
- **Guest lists.** Add, edit, search, filter and remove guests. Import a CSV, which is validated before anything is saved, and export the list.
- **Invitations and reminders.** Schedule invitation emails, preview them and track what was scheduled, sent or bounced. Reminders stop for guests who have already replied. Every guest gets a personal link.
- **Response review.** See totals for attendance, party size, meals and dietary needs. Filter replies by status and export them.
- **Dashboard and notifications.** See all your events at a glance, and get in-app notifications for replies, bounces, due reminders and attendance milestones.

**For guests**

- Open an invitation with a personal link or an invitation code.
- Reply, change the reply or decline with a message until the invite window closes.
- Guests only ever see their own data.

**Across the product**

- Responsive from 360 px phones to wide desktops, with no horizontal scrolling and touch-friendly controls.
- WCAG 2.2 Level AA: light and dark themes, full keyboard use, announced form errors and support for reduced motion.
- Guest personal data is restricted to the people who need it, and is erased when its event is deleted.
- Stateless instances, so it scales horizontally.

## Project status

| Stage | Status | Where |
|---|---|---|
| Requirements (14 L1, 73 L2 with acceptance criteria) | Done | [`docs/specs/`](docs/specs/) |
| HTML mocks of every page, dialog and state | Done | [`docs/mocks/`](docs/mocks/) |
| Detailed designs (48 features in 13 subsystems) | Done | [`docs/detailed-designs/`](docs/detailed-designs/) |
| Estimates and roadmap (about 147 developer-days) | Done | [`docs/estimates/`](docs/estimates/README.md) |
| TypeScript project, lint and test tooling | Done | [`package.json`](package.json) |
| Design system | Planned | `docs/design-system/` |
| Feature implementation | Not started | `src/`, `tests/` |

The [roadmap](docs/estimates/README.md#roadmap) sets the order of work.

## Technology

rsvp-cms is TypeScript end to end.

| Layer | Technology |
|---|---|
| API | [Express](https://expressjs.com/) with [zod](https://zod.dev/) validation |
| Persistence | [PostgreSQL](https://www.postgresql.org/) through [Prisma](https://www.prisma.io/) |
| Organizer and guest apps | [React](https://react.dev/) with [Vite](https://vite.dev/) |
| Unit, integration and acceptance tests | [Vitest](https://vitest.dev/) |
| End-to-end tests | [Playwright](https://playwright.dev/) |
| Linting | [ESLint](https://eslint.org/) with [typescript-eslint](https://typescript-eslint.io/) |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 24 or later, which includes npm
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) for the local PostgreSQL 17 database, or your own PostgreSQL 17 server

### Install

```sh
git clone https://github.com/QuinntyneBrown/rsvp-cms.git
cd rsvp-cms
npm install          # also generates the Prisma client
npm run db:up        # starts PostgreSQL on localhost:5433 with the rsvp, rsvp_test and rsvp_e2e databases
npm run db:migrate   # applies the migrations in src/data/prisma/migrations
```

### Run

Start the API and both apps in three terminals:

```sh
npm run dev:api      # http://localhost:3000, seeds olivia@example.com / "correct horse"
npm run dev:admin    # organiser app, http://localhost:5173
npm run dev:rsvp     # guest app, http://localhost:5174
```

The API also runs the mail worker, which sends scheduled invitations at 9:00 am on their send date. By default it prints each message (`MAIL_TRANSPORT=log`); set `MAIL_TRANSPORT=smtp` and `SMTP_URL` to send real email.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://rsvp:rsvp@localhost:5433/rsvp` | PostgreSQL connection |
| `PORT` | `3000` | API port |
| `SEED` | `true` | Adds the demo organiser on start |
| `RSVP_URL` | `http://localhost:5174` | Guest app address used in personal links |
| `MAIL_TRANSPORT` | `log` | `log`, `smtp` or `memory` |
| `SMTP_URL`, `MAIL_FROM` | none, `invitations@invitely.example` | SMTP server and From address |
| `MAIL_WORKER`, `MAIL_POLL_MS` | `true`, `30000` | Run the mail worker and how often it checks |

### Build and test

The tests need the database from `npm run db:up`. Each test worker gets its own schema in `rsvp_test`, and the e2e run resets `rsvp_e2e`.

| Command | What it does |
|---|---|
| `npm test` | Runs the unit, integration and acceptance tests with Vitest |
| `npm run typecheck` | Type-checks the project with `tsc --noEmit` |
| `npm run lint` | Lints the project with ESLint |
| `npm run test:e2e` | Runs the Playwright browser tests (page objects in `tests/e2e/pages`); every `/api` call is answered by an in-memory fake, so no API server or database is needed. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use a preinstalled Chromium |
| `npm run db:migrate:dev` | Creates a migration after a change to `src/data/prisma/schema.prisma` |

Run `npm test`, `npm run typecheck` and `npm run lint` before you open a pull request.

### Explore the design

Open [`docs/mocks/index.html`](docs/mocks/index.html) in a browser to click through every screen. Add `?theme=dark` for the dark theme, or `?chrome=0` to hide the mock annotations. To follow one feature from requirement to design, start with [`docs/detailed-designs/rsvp/submit-rsvp/`](docs/detailed-designs/rsvp/submit-rsvp/).

## Repository layout

```
rsvp-cms/
├── docs/            Requirements, mocks, detailed designs, estimates
├── src/
│   ├── api/         HTTP endpoints, validation and auth (events, guests, responses, public)
│   ├── domain/      Business rules and entities, independent of framework and storage
│   ├── data/        Schema, migrations, repositories and seed data
│   ├── admin/       Organizer UI
│   ├── rsvp/        Public guest RSVP page (no organizer-only code)
│   ├── shared/      Code used by more than one area
│   └── config/      Environment and application configuration
├── tests/           Acceptance, unit, integration and end-to-end tests
├── scripts/         Dev, build, seed and maintenance scripts
└── deploy/          Container, infrastructure and deployment configuration
```

The layout is required. [`AGENTS.md`](AGENTS.md) defines it and explains what goes in each folder.

## Documentation

| Document | What it covers |
|---|---|
| [L1 requirements](docs/specs/L1.md) | What the system must do, at a high level |
| [L2 requirements](docs/specs/L2.md) | Detailed requirements with acceptance criteria |
| [User journeys](docs/specs/user-journeys.md) | End-to-end journeys, ranked by value |
| [Mocks](docs/mocks/README.md) | Static HTML mocks, the cast and the sample data they use |
| [Detailed designs](docs/detailed-designs/) | C4, class and sequence diagrams for each feature |
| [Estimates](docs/estimates/README.md) | Effort per subsystem, percent complete and roadmap |
| [AGENTS.md](AGENTS.md) | Rules for human and AI contributors |

## How we build

Documentation comes before code. Every change follows the same order:

1. **Requirements.** Add or update L1 and L2 requirements in `docs/specs/`.
2. **Mocks.** Show every affected screen and state in `docs/mocks/`.
3. **Detailed design.** Describe the feature in `docs/detailed-designs/{subsystem}/{feature}/`.
4. **Acceptance tests.** Write tests that trace to L2 requirement IDs, and watch them fail.
5. **Code.** Write the code that makes the tests pass, in small vertical slices.

## Contributing

Contributions are welcome. Read the [contributing guide](.github/CONTRIBUTING.md) before you open an issue or a pull request. It covers the workflow, branch and commit conventions, and how to trace tests to requirements.

## Code of conduct

This project follows the [Contributor Covenant](.github/CODE_OF_CONDUCT.md). By taking part, you agree to follow it.

## Security

Do not report security vulnerabilities in public issues. Follow the process in [SECURITY.md](.github/SECURITY.md).

## Support

See [SUPPORT.md](.github/SUPPORT.md) for how to ask questions and get help.

## License

Copyright (c) 2026 Quinntyne Brown. Licensed under the [MIT License](LICENSE).
