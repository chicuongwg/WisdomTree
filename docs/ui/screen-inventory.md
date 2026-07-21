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
| Search | inside `/tree`, plus the Ctrl+K palette | User | User, Editor, Admin/Op | Search |
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
| System Health | `/admin/health` | Admin/Op | Admin/Op | Admin |
| Deadline Detail | `/deadlines/:id` | User | Project members, Admin/Op | Board |
| Task Detail | `/board/task/:id` | Editor | Editor, Admin/Op | Board |
| Notification Center | `/notifications` | User | User, Editor, Admin/Op | Notify |
| Account | `/account` | User | User, Editor, Admin/Op | Auth |
| Sign-in | `/login` | — | Everyone | Auth |

Notes:
- `My Submissions` is the unified intake history for both file-backed uploads and `branch-gap requests`.
- `Source Detail` is type-aware and supports both file-backed evidence review and `branch-gap request` triage.
- `Library` and `Stored Item Detail` are space-scoped: they list and open only items from the viewer's spaces. `Stored Item Detail` is the member view (metadata, preview, download) and never exposes operational review internals.
- `Catalog` and `Catalog Item Detail` cover the physical library; they are scoped to the library space and let members browse and request loans. `Librarian Desk` is the Admin/Op circulation surface for approving, lending, returning, and managing catalog items.
- `Graph Explorer` is built, and it is interactive. It renders every non-archived knowledge node and the links between them as a dependency-free SVG map — still no graph library, but the layout is now a force simulation written in-repo (`src/lib/graph-force.ts`). The deterministic layout in `src/lib/graph-layout.ts` remains the *seed*: it is computed during render, so the server HTML still contains every mark and edge in a readable arrangement, and a reader with JavaScript disabled keeps that static map. On mount the simulation takes over from exactly those positions, so there is no blank frame and no hydration jump; it cools to a stop and the loop halts, so an idle tab does no work. Positions are written straight to the DOM from a ref-held array — a settling graph causes no React re-renders.
- `Graph Explorer` interaction: drag a mark with pointer, touch or pen to pin it where it is dropped (a pinned mark wears a vermilion seal ring, and `Bỏ ghim tất cả` releases them all); hover or focus a mark to light it and its immediate neighbours and dim the rest; pan by dragging the background; zoom with the on-screen buttons, with `Ctrl`/`⌘` + wheel, or with a two-finger pinch. Plain wheel is never intercepted, so the page scrolls normally over the map; a hint says which modifier zooms. Clicking or pressing Enter still opens the node, and hover or keyboard focus still opens the content preview card.
- `Graph Explorer` keyboard path: every mark is focusable, `Enter` opens, arrow keys nudge and thereby pin a mark (the keyboard alternative to dragging), `P` toggles the pin, and `Esc` dismisses the preview. Zoom, motion and pinning all have visible button controls, so nothing depends on a gesture.
- `Graph Explorer` display settings live in a collapsible `Tùy chỉnh bản đồ` panel (open by default on `/graph`, closed on the local map): filters (title search, branch, show/hide orphan nodes), display (colour by verification or by branch, size by link count, link arrows, label visibility always/on-hover/hidden, and a visibility toggle per link type — `related`, `supports`, `contrasts`, `part_of`), and four force sliders (centre, repel, link, link distance) that retune the running simulation live. Everything except the free-text search persists in `localStorage` under the single key `wisdomtree.graph.v1`, read in an effect so SSR and hydration agree, with `Khôi phục mặc định` to reset.
- Verification is still encoded twice, by colour and by shape, with a legend. Colouring by branch swaps only the colour axis — shape keeps carrying verification, so the map never depends on colour alone, and a second legend names the branch colours.
- Motion: `prefers-reduced-motion: reduce` renders the settled layout directly with no animation at all, and says so; an explicit `Dừng chuyển động` / `Cho chuyển động` button covers readers who want stillness without the OS setting. Above a stated cap of 300 simulated nodes the map keeps the static deterministic layout and says so in the UI rather than truncating silently.
- The same component renders the local map on `Node Detail`, which also lists that node's outgoing links and its backlinks. There the panel adds depth (1–3 hops) and link direction (both / outgoing / incoming); the page fetches the deepest neighbourhood the control offers so moving the slider needs no round trip, and the centre node is pinned by definition.
- `Admin Console` is now a real page. This note used to say the opposite — "the one screen in this table with no page behind it: there is no `/admin` route" — which stopped being true when `/admin` and `/admin/health` shipped, and a stale note is worse than a missing one: it tells a reader the screen they are looking at does not exist. `/admin` holds user administration, spaces and the audit trail; `/admin/health` is the readings board, reachable from the rail, the side panel and the palette. `GET /api/admin/health` still serves the same `HealthReport` subset under `admin.health.read`.

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
