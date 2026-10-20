# AGENTS.md

## Project

rsvp-cms is a content management system for running event RSVPs. Organizers create events, manage guest lists and invitations, and collect and review responses (attending, declining, plus-ones, meal choices, notes). Guests respond through a simple public RSVP page.

## Stack

TypeScript end to end. Express and zod for the API, PostgreSQL via Prisma for persistence, React with Vite for the organiser (`src/admin`) and guest (`src/rsvp`) apps, Vitest for unit, integration and acceptance tests, Playwright for e2e. Commands: `npm test`, `npm run typecheck`, `npm run lint`.

## Folder structure (MANDATORY)

This folder structure MUST be followed exactly. Every file you create MUST be placed in the folder whose responsibility matches it. Do NOT create new top-level folders, rename or move the folders below, or put files elsewhere unless the user explicitly approves a change to this structure (and updates this section).

```
rsvp-cms/
├── AGENTS.md                  # Agent instructions (this file)
├── CLAUDE.md                  # Pointer to AGENTS.md for Claude Code
├── README.md                  # Project overview, setup and run instructions
├── .agents/                   # Agent skills and tooling shared across coding agents
├── .claude/                   # Claude Code settings, commands and skills
├── .github/                   # CI workflows, issue/PR templates, copilot-instructions.md
├── docs/                      # All project documentation (written before code)
│   ├── specs/                 # L1 (high-level) and L2 (detailed, with acceptance criteria) requirements
│   ├── detailed-designs/      # Per-subsystem/feature designs with C4, class and sequence diagrams
│   │   └── {subsystem}/{feature}/README.md
│   ├── mocks/                 # Static HTML mocks of every page, dialog and state
│   │   └── assets/            # Shared mock CSS, JS and design tokens
│   ├── design-system/         # Tokens, foundations and component pages extracted from the mocks
│   ├── estimates/             # Effort estimates and percent-complete tracking per subsystem
│   └── screen-composition.md  # Which components make up each page, dialog and shell part
├── src/                       # Application source code
│   ├── api/                   # Backend: HTTP endpoints, request validation, auth
│   │   ├── events/            # Event creation and management
│   │   ├── guests/            # Guest lists and invitations
│   │   ├── responses/         # RSVP responses (attending/declining, plus-ones, meals, notes)
│   │   └── public/            # Unauthenticated endpoints used by the guest RSVP page
│   ├── domain/                # Business rules and entities, independent of framework and storage
│   │   └── invitations/       # Invitation scheduling rules
│   ├── data/                  # Persistence: schema, migrations, repositories, seed data
│   ├── admin/                 # Organizer UI (event setup, guest lists, response review)
│   ├── rsvp/                  # Public guest-facing RSVP page
│   ├── shared/                # Code used by more than one area: UI components, utilities, types
│   │   ├── forms/             # Form validation helpers
│   │   ├── storage/           # Client and server storage helpers
│   │   └── mail/              # Mail queue and transports
│   └── config/                # Environment and application configuration
├── tests/                     # Automated tests
│   ├── acceptance/            # Tests derived from L2 acceptance criteria, one per requirement
│   ├── unit/                  # Unit tests mirroring the src/ layout
│   ├── integration/           # API and database integration tests
│   └── e2e/                   # Browser tests of the organizer and guest flows
├── scripts/                   # Dev, build, seed and maintenance scripts
└── deploy/                    # Container, infrastructure and deployment configuration
```

Rules (all MUST be followed):
- Documentation in `docs/` comes first: requirements, then mocks, then detailed designs, then code.
- Tests MUST trace back to requirement IDs in `docs/specs/`.
- The guest-facing `src/rsvp/` MUST NOT contain organizer-only code; share through `src/shared/`.
- The responsibilities of the `src/` subfolders MUST stay separate. Stack-specific subfolders may be added inside them, but the folders listed above MUST NOT be replaced or bypassed.


