# Admin/Op Screen Specifications

## Purpose
- Define the screen behavior for source review, publication, operations, and administrative workflows in V1.

## In Scope
- Source inbox and source detail.
- Review queue and publish review.
- Board and admin operational surfaces.
- Relevant state behavior and decision actions.

## Out of Scope
- Reader-centric node reading screens.
- Future reviewer/curator role split.
- Mobile views.

## Decisions
- Admin/Op surfaces can be denser and more decision-oriented than reader surfaces.
- Review screens prioritize comparison and traceability over aesthetic minimalism.
- Publication is a visible workflow stage, not a hidden button on source detail alone.

## Dependencies
- Admin/Op flows in [`../flows/admin-op-flows.md`](../flows/admin-op-flows.md).
- Shared states in [`shared-states.md`](./shared-states.md).
- Permissions in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).

## Acceptance Criteria
- Admin/Op can execute the source-to-tree loop using the specified screens.
- Decision states and next actions are explicit.
- Operational screens expose enough information for review without requiring raw database access.

## Admin/Op Source-Review-Publish Experience

### Source Inbox
- Goal:
  - triage all incoming source items
- Key regions:
  - filter bar
  - source table
  - state counts
  - quick assignment or quick open actions
- Row essentials:
  - title
  - source lifecycle state
  - trust state
  - assignee
  - last updated
  - branch hint

### Source Detail
- Goal:
  - inspect one source item in depth
- Key regions:
  - metadata and provenance panel
  - original preview panel
  - raw text
  - corrected text
  - extraction warnings
  - related branch suggestions
- Actions:
  - assign
  - request changes
  - reject
  - mark unprocessable
  - proceed to draft review

### Review Queue
- Goal:
  - central decision surface for pending corrected text and Markdown draft items
- Key regions:
  - queue filters
  - decision summary
  - draft comparison preview

### Publish Review
- Goal:
  - make the final publish decision
- Layout:
  - corrected text vs Markdown draft comparison
  - source excerpt mapping
  - target branch selector or confirmation
  - publish decision controls
- Actions:
  - request changes
  - approve publish
  - reject publication

### Board
- Goal:
  - monitor branch completion and operational follow-up work
- Key regions:
  - task lanes or grouped status lists
  - branch progress view
  - achievement log summary

### Admin Console
- Goal:
  - hold operational and system-level controls
- Key regions:
  - taxonomy management
  - export status
  - backup summary
  - job health snapshot

## States Applied Here
- loading
- empty
- error
- conflict
- unprocessable
- access denied

