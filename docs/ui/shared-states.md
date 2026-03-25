# Shared States

## Purpose
- Standardize how cross-product states should behave across reader, editor, and Admin/Op surfaces.

## In Scope
- Loading, empty, error, conflict, archived, unprocessable, and access denied.
- Tone, required content, and action patterns.

## Out of Scope
- Final copywriting.
- Detailed visual tokens.
- One-off exceptions for future features.

## Decisions
- Shared states must be recognizable across the entire app.
- Each state includes meaning, visible cues, and next-action guidance.
- Reader and Admin/Op may see different actions for the same state, but the state meaning stays constant.

## Dependencies
- UI principles in [`ui-principles.md`](./ui-principles.md).
- State machine definitions in [`../flows/state-machines.md`](../flows/state-machines.md).
- Screen specs in [`reader-screen-specs.md`](./reader-screen-specs.md) and [`admin-op-screen-specs.md`](./admin-op-screen-specs.md).

## Acceptance Criteria
- Every major screen can reuse one of the shared state definitions rather than inventing a new one.
- State handling is consistent enough to be implemented as shared UI patterns.
- State names remain consistent with lifecycle documentation.

## Loading
- Meaning:
  - the system is retrieving or preparing content
- Must include:
  - visible loading skeleton or placeholder
  - context of what is loading
- Should avoid:
  - blank screens with no feedback

## Empty
- Meaning:
  - no data exists yet or no data matches the current filter
- Must include:
  - explanation of why the surface is empty
  - next recommended action when allowed

## Error
- Meaning:
  - the requested operation or load failed
- Must include:
  - concise explanation
  - retry path when applicable
  - escalation path for Admin/Op when operational

## Conflict
- Meaning:
  - competing changes require manual resolution
- Must include:
  - what conflicted
  - who needs to resolve it
  - blocked actions while conflict remains open

## Archived
- Meaning:
  - content exists historically but is no longer active
- Must include:
  - archived indicator
  - redirect or replacement when available

## Unprocessable
- Meaning:
  - source input cannot be processed into useful extracted content in V1
- Must include:
  - reason category if known
  - operational next action
  - preserved provenance

## Access Denied
- Meaning:
  - the current role may know the surface exists but cannot access it
- Must include:
  - explicit permission denial message
  - safe next step or return path

