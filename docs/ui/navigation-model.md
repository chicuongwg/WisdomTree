# Navigation Model

## Purpose
- Define the top-level information architecture and navigation logic for the V1 application.

## In Scope
- Top-level modules.
- Role-aware navigation.
- Reader-first flow.
- Admin/Op secondary flow.
- Dedicated graph surface and contextual mini-graph.

## Out of Scope
- Final iconography.
- Keyboard shortcut system.
- Deep breadcrumb implementation.

## Decisions
- Navigation starts with reader discovery and branch exploration.
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
- Reader-first structure remains consistent even with Admin/Op capabilities present.

## Top-Level Information Architecture
- Home
- Search
- Tree
- Branches
- Graph
- Source Inbox
- Review Queue
- Board
- Admin

## Reader-First Navigation
- Default entry points:
  - Home
  - Search
  - Tree
  - Branches
  - Graph
- Reader should not need to think about the source repository to consume knowledge.

## Editor Extensions
- Editors inherit reader navigation plus:
  - create branch
  - create node
  - my submissions
  - assigned correction work

## Admin/Op Secondary Flow
- Admin/Op inherits the same shell and gains access to:
  - Source Inbox
  - Review Queue
  - Publish Queue
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

