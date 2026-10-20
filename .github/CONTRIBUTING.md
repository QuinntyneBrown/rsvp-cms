# Contributing to rsvp-cms

Thank you for helping. This guide explains how to propose changes and what reviewers will check.

By taking part, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Contents

- [Ways to contribute](#ways-to-contribute)
- [Before you start](#before-you-start)
- [Documentation comes first](#documentation-comes-first)
- [Development workflow](#development-workflow)
- [Commit messages](#commit-messages)
- [Pull requests](#pull-requests)
- [Coding standards](#coding-standards)
- [Working with AI coding agents](#working-with-ai-coding-agents)
- [License](#license)

## Ways to contribute

- **Report a bug.** Use the [bug report template](https://github.com/QuinntyneBrown/rsvp-cms/issues/new?template=bug_report.md).
- **Suggest a feature.** Use the [feature request template](https://github.com/QuinntyneBrown/rsvp-cms/issues/new?template=feature_request.md).
- **Improve the docs.** Fix requirements, mocks or designs that are unclear, wrong or out of date.
- **Write code.** Pick up an issue labelled `good first issue` or `help wanted`, or follow the [roadmap](../docs/estimates/README.md#roadmap).

Search the [existing issues](https://github.com/QuinntyneBrown/rsvp-cms/issues) before you open a new one.

## Before you start

- For anything bigger than a small fix, open an issue first and agree on the approach. This saves you from writing work that cannot be merged.
- Comment on an issue to say you are working on it, so that two people do not pick it up.
- Read [AGENTS.md](../AGENTS.md). It defines the required folder structure and the rules every change must follow.

## Documentation comes first

rsvp-cms is built docs first. A change that adds or changes behaviour must update these, in this order, before or with the code:

| Step | Folder | What to do |
|---|---|---|
| 1. Requirements | `docs/specs/` | Add or change L1 and L2 requirements. Every L2 requirement has acceptance criteria. |
| 2. Mocks | `docs/mocks/` | Show every affected page, dialog and state, in light and dark, at every breakpoint. |
| 3. Detailed design | `docs/detailed-designs/{subsystem}/{feature}/` | Describe the feature with C4, class and sequence diagrams. |
| 4. Estimates | `docs/estimates/` | Update the effort and percent complete. |
| 5. Tests and code | `tests/`, `src/` | Write acceptance tests first, then the code. |

A pull request that changes behaviour without the matching documentation will be asked for it.

## Development workflow

1. Fork the repository and clone your fork.
2. Create a branch from `main` with a short, descriptive name:
   - `feat/guest-csv-import`
   - `fix/rsvp-window-timezone`
   - `docs/l2-reminders`
3. Write a failing acceptance test for the L2 requirement you are implementing. Put it in `tests/acceptance/` and name the requirement ID in it, for example `L2-031`.
4. Write the smallest change that makes the test pass, then refactor.
5. Add unit and integration tests as needed. Unit tests mirror the `src/` layout.
6. Run the full test suite and the linters before you push.
7. Open a pull request against `main`.

Build and test commands will be added to the [README](../README.md#build-and-run-the-application) once the technology stack is chosen.

### Rules that apply to every change

- Put every file in the folder whose responsibility matches it. Do not add top-level folders.
- Tests must trace to requirement IDs in `docs/specs/`.
- `src/rsvp/` is public and must not contain organizer-only code. Put shared code in `src/shared/`.
- Keep `src/domain/` free of framework and storage code.
- Every screen must meet WCAG 2.2 Level AA and work from 360 px up with no horizontal scrolling.
- Never log or expose guest personal data: names, email addresses, meal choices or dietary and allergy details.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>

<body: what changed and why>

Refs: L2-031
```

- **Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`.
- **Scope:** the subsystem, for example `events`, `guests`, `invitations`, `rsvp` or `responses`.
- **Summary:** imperative mood, under 72 characters, no full stop.
- Reference the requirement IDs and issue numbers the commit relates to.

## Pull requests

- Keep pull requests small and focused on one change.
- Fill in the [pull request template](PULL_REQUEST_TEMPLATE.md), including the requirement IDs it covers.
- Include screenshots in light and dark themes for any UI change.
- Make sure every check passes.
- At least one maintainer must approve a pull request before it is merged. Maintainers squash merge so that `main` stays linear.
- Reply to review comments, and resolve each conversation once it has been dealt with.

## Coding standards

- Make new code read like the code around it: the same naming, idioms and comment density.
- Prefer clear names over comments. Use comments to explain why, not what.
- Validate every input at the API boundary. Never trust data that comes from the guest RSVP page.
- Do not add a dependency without saying in the pull request why it is needed.
- Formatting and lint rules will be enforced in CI once the stack is in place.

## Working with AI coding agents

Contributions made with AI coding agents are welcome. You are responsible for every line you submit, whoever wrote it.

- Agents read [AGENTS.md](../AGENTS.md). `CLAUDE.md` and `.github/copilot-instructions.md` point to it.
- Shared agent skills live in `.agents/` and `.claude/`.
- Review, run and test agent-written changes before you open a pull request.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).
