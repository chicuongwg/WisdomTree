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
- Navigation starts with storage access (`Library`, `Source Intake`) and user discovery.
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
- Library
- Catalog
- Tree
- Branches
- Graph
- Source Intake
- My Submissions
- Source Inbox
- Review Queue
- Board
- Deadlines
- Admin

## User-First Navigation
- Default entry points:
  - Home
  - Search
  - Library
  - Tree
  - Branches
  - Graph
  - Source Intake
  - My Submissions
- Storage comes first: `Library` and `Source Intake` must stay one click away, and a user should reach a stored file in their spaces within two navigation steps.
- Operational review internals stay out of the default user path; users never need them to store, find, or consume knowledge.

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
