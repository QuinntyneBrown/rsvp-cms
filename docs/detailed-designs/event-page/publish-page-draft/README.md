# Save, publish and discard page drafts

## Overview

Changes that an organiser makes to the public event page are held as a page draft until the organiser publishes them. This keeps unfinished edits away from guests and lets the organiser decide when a change goes live. The feature covers three actions on the draft: saving it as the organiser types, publishing it to the public page, and discarding it back to the last published version.

**page draft** — unpublished working copy of an event's page, which the organiser edits in place.

**published page** — the version of an event's page that guests read, which changes only when a publish succeeds.

The feature sits in the event-page subsystem, next to the block editor described in the compose-page-blocks feature. The organiser app (`src/admin`) shows the draft status and the publish, discard and leave-guard controls. The organiser API (`src/api/events`) receives the save, publish and discard requests. The publish rules are in the domain (`src/domain`), and the draft and published page are persisted through `src/data`. The guest app (`src/rsvp`) reads only the published page, so a draft change cannot reach a guest before it is published.

## Description

- **`DraftStatusBar`** — component in the organiser app. It shows the status text "Draft · saved just now" or "Published · just now" and the Publish and Discard changes controls.
- **`DraftAutosave`** — component in the organiser app. It saves the draft once 2 seconds pass without typing and reports the save state.
- **`UnsavedChangesGuard`** — component in the organiser app. It registers the browser warning "You have unpublished changes" while the draft holds unpublished changes.
- **`DiscardChangesDialog`** — dialog in the organiser app. It offers Keep editing and Discard for the question "Discard unpublished changes?".
- **`PageDraftController`** — controller under `src/api/events/page-draft`. It exposes the save, publish and discard endpoints.
- **`PagePublisher`** — domain service. It validates a draft, writes it as the published page and resets the draft to match. It also resets the draft to the published page on discard.
- **`PageDraft`** — domain aggregate for the unpublished blocks. It reports whether it holds unpublished changes, validates its blocks and resets to a published page.
- **`PublishedPage`** — domain entity holding the blocks that guests see and the time of the last publish.
- **`PageDraftRepository`** and **`PublishedPageRepository`** — persistence components under `src/data`. Each loads and saves one page in a single write.
- **`DraftSaveState`** — enumeration of the save states shown by the status bar: `Saved`, `Pending` and `Failed`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-015` | `L1-003` | Edits must be saved as a draft and only become visible to guests when published. |
| `L2-016` | `L1-003` | Organisers must not lose unpublished changes by accident. |

## Diagrams

### System context

The organiser saves, publishes and discards page changes, and the guest reads the most recently published page.

![System context for saving, publishing and discarding page drafts](diagrams/c4-context.png)

### Containers

The organiser app sends draft, publish and discard requests to the organiser API. The guest app reads the published page from the application database, and never the draft.

![Container view for saving, publishing and discarding page drafts](diagrams/c4-container.png)

### Components

`PageDraftController` delegates publish and discard to `PagePublisher`. The publisher validates `PageDraft` and writes `PublishedPage` through `PublishedPageRepository`, and the guest app reads that same published page.

![Component view for saving, publishing and discarding page drafts](diagrams/c4-component.png)

### Class structure

`PagePublisher` reads a `PageDraft` and writes a `PublishedPage`. Both hold zero to twelve `PageBlock` entities, and `PageDraftController` depends on the publisher and the draft repository.

![Class diagram for saving, publishing and discarding page drafts](diagrams/class-structure.png)

### Behaviour — publish the draft

The publish control disables itself while the request is in flight, so a second press sends no request. The publisher replaces the published page and resets the draft in one unit of work, and a failed write leaves the published page unchanged.

![Sequence diagram for publishing the page draft](diagrams/sequence-publish-draft.png)

### Behaviour — discard unpublished changes

The discard dialog confirms the action first. On confirmation the publisher resets the draft to the last published page, and a failed reset leaves the draft unchanged.

![Sequence diagram for discarding unpublished changes](diagrams/sequence-discard-draft.png)
