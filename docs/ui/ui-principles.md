# UI Principles

## Purpose
- Define the visual and interaction principles that should shape the V1 interface before detailed screen work begins.

## In Scope
- Visual direction.
- Information hierarchy.
- Trust visibility.
- Density target.
- Experience split across User, Editor, and Admin/Op concerns.

## Out of Scope
- Exact component placement.
- Final visual assets or brand system.
- Implementation-level CSS or component code.

## Decisions
- Visual direction is `Knowledge atlas`, not generic SaaS minimalism.
- Information density target is `Medium`.
- The UI is structured around a workspace with navigation, content canvas, and contextual inspection.
- Trust state is a first-class visual signal, not secondary metadata.

## Dependencies
- Product goals in [`../product/prd.md`](../product/prd.md).
- Roles in [`../product/roles-personas.md`](../product/roles-personas.md).
- App structure in [`app-layout.md`](./app-layout.md).

## Acceptance Criteria
- Designers and frontend engineers can use this file to judge whether a proposed screen fits the intended product character.
- Trust, provenance, and structure are treated as primary interface concerns.
- Later screen specs do not contradict these principles.

## Visual Direction: Knowledge Atlas
- The product should feel like a navigable map of knowledge, not just a folder browser or dashboard grid.
- Surfaces should favor orientation, traceability, and branching context.
- The interface should support exploratory reading without becoming visually noisy.

## Information Hierarchy
- Primary:
  - node content
  - branch context
  - trust state
  - next meaningful action
- Secondary:
  - source excerpt
  - tags
  - backlinks
  - mini-graph context
- Tertiary:
  - audit metadata
  - operational diagnostics
  - deep provenance details

## Trust Visibility
- Verification and source trust states must be visible at:
  - result-card level
  - page-header level
  - review queue level
  - source detail level
- Trust states should use consistent badge language and color roles across all screens.

## Density Target
- Medium density means:
  - enough metadata to support research work
  - enough whitespace to preserve readability
  - no over-compressed enterprise admin tables by default
- Dense views are acceptable in Admin/Op surfaces, but the default user experience should remain legible.

## Experience Split

### User-Facing Experience
- Optimize for reading, exploration, relation-following, branch understanding, and simple source contribution tracking.

### Editor Authoring Extension
- Extend user surfaces with owned-or-assigned creation, editing, correction, and draft actions.

### Admin/Op Source-Review-Publish Experience
- Prioritize queue clarity, comparison views, decision states, and operational traceability.
