# Admin/Op Screen Specifications

## Purpose
- Define the screen behavior for source review, publication, operations, and administrative workflows in V1.

## In Scope
- Source inbox and source detail.
- Review queue and publish review.
- Board and admin operational surfaces.
- Relevant state behavior and decision actions.

## Out of Scope
- User-centric node reading screens.
- Future reviewer/curator role split.
- Mobile views.

## Decisions
- Admin/Op surfaces can be denser and more decision-oriented than user surfaces.
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
  - triage all incoming intake items
- Key regions:
  - filter bar with `item_type`, state, assignee, and branch relevance filters
  - intake table
  - state counts
  - quick assignment or quick open actions
- Row essentials:
  - item type
  - title
  - state
  - trust state when applicable
  - assignee
  - last updated
  - branch hint

### Source Detail
- Goal:
  - inspect one intake item in depth with behavior that depends on `item_type`
- Key regions:
  - metadata and provenance or request-context panel
  - uploader and assignment summary
  - file-backed detail region:
    - original preview panel
    - raw text
    - corrected text
    - extraction warnings
    - trust state
  - gap-request detail region:
    - request text
    - branch hint
    - triage decision
    - conversion target
  - related branch suggestions
- Actions:
  - assign when applicable
  - change trust status for file-backed source items
  - request changes for file-backed source items
  - reject the intake item with a recorded outcome
  - mark unprocessable for file-backed source items
  - convert to branch work for `branch_gap_request`
  - proceed to draft review for file-backed source items

### Review Queue
- Goal:
  - central decision surface for file-backed intake items with pending corrected text and Markdown draft review
- Key regions:
  - queue filters
  - decision summary
  - trust and verification state summary
  - draft comparison preview

### Publish Review
- Goal:
  - make the final publish decision
- Layout:
  - corrected text vs Markdown draft comparison
  - source excerpt mapping
  - target branch selector or confirmation
  - accountability chain summary
  - publish decision controls
- Actions:
  - request changes
  - approve publish as `verified`
  - approve publish as `unverified`
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
  - space and membership management
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
