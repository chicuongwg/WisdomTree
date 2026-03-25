# Screen Inventory

## Purpose
- Inventory the main V1 screens, their ownership, and their visibility by role.

## In Scope
- Top-level screens and important sub-surfaces.
- Role visibility.
- Route and module ownership.

## Out of Scope
- Pixel-level layouts.
- Edge-case modal inventories.
- Implementation of route guards.

## Decisions
- Screen inventory is route-oriented and role-aware.
- Reader flows are primary; Admin/Op screens expand from the same app shell.
- Editor-specific functionality appears as extensions on top of reader and assigned-work surfaces.

## Dependencies
- Navigation model in [`navigation-model.md`](./navigation-model.md).
- Permissions in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).
- Screen behavior in [`reader-screen-specs.md`](./reader-screen-specs.md) and [`admin-op-screen-specs.md`](./admin-op-screen-specs.md).

## Acceptance Criteria
- Every core V1 capability maps to at least one screen.
- Role visibility is explicit enough for frontend routing decisions.
- Backend and frontend teams can refer to the same screen/module boundaries.

## Inventory

| Screen | Route concept | Primary role | Visible to | Module owner |
| --- | --- | --- | --- | --- |
| Home | `/` | Reader | Reader, Editor, Admin/Op | Tree |
| Search | `/search` | Reader | Reader, Editor, Admin/Op | Search |
| Node Detail | `/tree/node/:id` | Reader | Reader, Editor, Admin/Op | Tree |
| Branch Hub | `/tree/branch/:id` | Reader | Reader, Editor, Admin/Op | Tree |
| Graph Explorer | `/graph` | Reader | Reader, Editor, Admin/Op | Search/Graph |
| Create Branch | `/tree/branch/new` | Editor | Editor, Admin/Op | Tree |
| Edit Node | `/tree/node/:id/edit` | Editor | Editor, Admin/Op | Tree |
| My Source Submissions | `/source/mine` | Editor | Editor, Admin/Op | Source Repo |
| Assigned Source Task | `/source/task/:id` | Editor | Assigned Editor, Admin/Op | Source Repo |
| Source Inbox | `/source/inbox` | Admin/Op | Admin/Op | Source Repo |
| Source Detail | `/source/:id` | Admin/Op | Admin/Op | Source Repo |
| Review Queue | `/review` | Admin/Op | Admin/Op | Review |
| Publish Review | `/review/publish/:id` | Admin/Op | Admin/Op | Review |
| Board | `/board` | Editor | Editor, Admin/Op | Board |
| Admin Console | `/admin` | Admin/Op | Admin/Op | Admin |

## Screen Grouping

### Reader-Facing Experience
- Home
- Search
- Node Detail
- Branch Hub
- Graph Explorer

### Editor Authoring Extension
- Create Branch
- Edit Node
- My Source Submissions
- Assigned Source Task
- Board

### Admin/Op Source-Review-Publish Experience
- Source Inbox
- Source Detail
- Review Queue
- Publish Review
- Admin Console

