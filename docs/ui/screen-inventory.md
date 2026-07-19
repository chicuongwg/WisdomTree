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
- User flows are primary; Admin/Op screens expand from the same app shell.
- Editor-specific functionality appears as extensions on top of user and assigned-work surfaces.

## Dependencies
- Navigation model in [`navigation-model.md`](./navigation-model.md).
- Permissions in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).
- Screen behavior in [`user-screen-specs.md`](./user-screen-specs.md) and [`admin-op-screen-specs.md`](./admin-op-screen-specs.md).

## Acceptance Criteria
- Every core V1 capability maps to at least one screen.
- Role visibility is explicit enough for frontend routing decisions.
- Backend and frontend teams can refer to the same screen/module boundaries.

## Inventory

| Screen | Route concept | Primary role | Visible to | Module owner |
| --- | --- | --- | --- | --- |
| Home | `/` | User | User, Editor, Admin/Op | Tree |
| Search | `/search` | User | User, Editor, Admin/Op | Search |
| Tree Browse | `/tree` | User | User, Editor, Admin/Op | Tree |
| Branch List | `/tree/branches` | User | User, Editor, Admin/Op | Tree |
| Node Detail | `/tree/node/:id` | User | User, Editor, Admin/Op | Tree |
| Branch Hub | `/tree/branch/:id` | User | User, Editor, Admin/Op | Tree |
| Graph Explorer | `/graph` | User | User, Editor, Admin/Op | Search/Graph |
| Source Intake | `/source/intake` | User | User, Editor, Admin/Op | Source Repo |
| My Submissions | `/source/mine` | User | User, Editor, Admin/Op | Source Repo |
| Library | `/library` | User | User, Editor, Admin/Op | Source Repo |
| Stored Item Detail | `/library/:id` | User | Space members, Admin/Op | Source Repo |
| Catalog | `/catalog` | User | Library-space members, Admin/Op | Catalog |
| Catalog Item Detail | `/catalog/:id` | User | Library-space members, Admin/Op | Catalog |
| Librarian Desk | `/catalog/admin` | Admin/Op | Admin/Op | Circulation |
| Create Branch | `/tree/branch/new` | Editor | Editor, Admin/Op | Tree |
| Edit Node | `/tree/node/:id/edit` | Editor | Editor, Admin/Op | Tree |
| Assigned Source Task | `/source/task/:id` | Editor | Assigned Editor, Admin/Op | Source Repo |
| Source Inbox | `/source/inbox` | Admin/Op | Admin/Op | Source Repo |
| Source Detail | `/source/:id` | Admin/Op | Admin/Op | Source Repo |
| Review Queue | `/review` | Admin/Op | Admin/Op | Review |
| Publish Review | `/review/publish/:id` | Admin/Op | Admin/Op | Review |
| Board | `/board` | Editor | Editor, Admin/Op | Board |
| Deadlines | `/deadlines` | User | Project members, Admin/Op | Board |
| Admin Console | `/admin` | Admin/Op | Admin/Op | Admin |

Notes:
- `My Submissions` is the unified intake history for both file-backed uploads and `branch-gap requests`.
- `Source Detail` is type-aware and supports both file-backed evidence review and `branch-gap request` triage.
- `Library` and `Stored Item Detail` are space-scoped: they list and open only items from the viewer's spaces. `Stored Item Detail` is the member view (metadata, preview, download) and never exposes operational review internals.
- `Catalog` and `Catalog Item Detail` cover the physical library; they are scoped to the library space and let members browse and request loans. `Librarian Desk` is the Admin/Op circulation surface for approving, lending, returning, and managing catalog items.

## Screen Grouping

### User-Facing Experience
- Home
- Search
- Tree Browse
- Branch List
- Library
- Stored Item Detail
- Catalog
- Catalog Item Detail
- Node Detail
- Branch Hub
- Graph Explorer
- Deadlines
- Source Intake
- My Submissions

### Editor Authoring Extension
- Create Branch
- Edit Node
- Assigned Source Task
- Board

### Admin/Op Source-Review-Publish Experience
- Source Inbox
- Source Detail
- Review Queue
- Publish Review
- Librarian Desk
- Admin Console
