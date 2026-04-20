# Navigation Model

## Purpose
- Define the top-level information architecture and navigation logic for the V1 application.

## In Scope
- Top-level modules.
- Role-aware navigation.
- User-first flow.
- Admin/Op secondary flow.
- Dedicated graph surface and contextual mini-graph.

## Out of Scope
- Final iconography.
- Keyboard shortcut system.
- Deep breadcrumb implementation.

## Decisions
- Navigation starts with user discovery and branch exploration.
- Admin/Op modules remain present but secondary in the global information architecture.
- Graph is both a dedicated module and a contextual support element.
- The navigation model should support gradual role growth without restructuring the entire app.

## Dependencies
- Roles in [`../product/roles-personas.md`](../product/roles-personas.md).
- Layout in [`app-layout.md`](./app-layout.md).
- Screen inventory in [`screen-inventory.md`](./screen-inventory.md).

## Acceptance Criteria
- Top-level navigation can support V1 workflows without hidden, role-specific dead ends.
- Route ownership is clear enough for frontend implementation.
- User-first structure remains consistent even with Admin/Op capabilities present.

## Top-Level Information Architecture
- Home
- Search
- Tree
- Branches
- Graph
- Source Intake
- My Submissions
- Source Inbox
- Review Queue
- Board
- Admin

## User-First Navigation
- Default entry points:
  - Home
  - Search
  - Tree
  - Branches
  - Graph
  - Source Intake
  - My Submissions
- User should not need to think about the full source repository to consume knowledge, but contribution and submission tracking must stay one click away.

## Editor Extensions
- Editors inherit user navigation plus:
  - create branch
  - create node
  - assigned correction work
  - owned or assigned edit surfaces

## Admin/Op Secondary Flow
- Admin/Op inherits the same shell and gains access to:
  - Source Inbox
  - Review Queue
  - Publish Review
  - Admin
  - Operational views inside Board

## Graph Surface Strategy
- Dedicated graph page:
  - topic exploration
  - relation traversal
  - branch context analysis
- Contextual mini-graph:
  - relation panel on node pages
  - lightweight context on branch and review screens where relevant
