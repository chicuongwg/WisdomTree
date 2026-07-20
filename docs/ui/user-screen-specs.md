# User Screen Specifications

## Purpose
- Define screen-by-screen behavior for the user-facing experience and its editor extensions in V1.

## In Scope
- User-facing screens.
- Editor authoring extension screens.
- Empty, loading, error, and permission states relevant to those screens.

## Out of Scope
- Admin/Op review and publish screens.
- Component-level implementation details.
- Mobile-specific layouts.

## Decisions
- User flow is the default product experience.
- Editor capabilities extend user screens rather than forming a separate application.
- Tree editing remains Markdown-first with preview.
- Source contribution is part of the default authenticated experience, not an editor-only side path.

## Dependencies
- Screen inventory in [`screen-inventory.md`](./screen-inventory.md).
- User flows in [`../flows/user-flows.md`](../flows/user-flows.md).
- Editor flows in [`../flows/editor-flows.md`](../flows/editor-flows.md).

## Acceptance Criteria
- User and Editor surfaces are specified clearly enough for implementation.
- Shared states are applied consistently across screens.
- Role-based action visibility is explicit.

## User-Facing Experience

### Home
- Goal:
  - orient the user toward branches, recent knowledge, contribution entry points, and next discovery actions
- Key regions:
  - recent branches
  - recently updated verified nodes
  - pending knowledge gaps or suggested topics
  - contribution CTA for source intake
- States:
  - empty: no branches or nodes yet
  - loading: skeleton sections
  - error: recoverable fetch failure

### Search
- Goal:
  - search across the tree with optional source-related result filters
- Key regions:
  - query input
  - result filters
  - grouped result list
  - inspector preview
- Result behavior:
  - trust badge on each result
  - branch and node type visible
  - archived hidden by default

### Library
- Goal:
  - let space members browse and retrieve stored team files, replacing scattered Excel/Docs folders
- Key regions:
  - space switcher or space filter
  - stored item list with type, title, space, uploader, stored date, and extraction status
  - search and filter bar
  - quick download action
- States:
  - empty: no stored items in this space yet, with upload CTA
  - loading: list skeleton
  - error: recoverable fetch failure
  - access denied: space the user does not belong to

### Stored Item Detail
- Goal:
  - let a space member inspect and retrieve one stored item without operational review internals
- Key regions:
  - title, space, uploader, and stored date
  - preview or extraction summary when available
  - download original action
  - links to published nodes derived from this source when they exist
- Restrictions:
  - no trust or review controls
  - no corrected-text or Markdown-draft editing

### Catalog
- Goal:
  - let library-space members browse and search the physical book collection and request loans
- Key regions:
  - search and filter bar by title, author, identifier, and availability
  - catalog list with cover, title, author, identifier, location, and status
  - borrow request action on available items
- States:
  - empty: no books in this library space yet
  - loading: list skeleton
  - error: recoverable fetch failure
  - access denied: not a member of the library space

### Catalog Item Detail
- Goal:
  - let a member inspect one book copy and request to borrow it
- Key regions:
  - cover, title, author, identifier, location, and status
  - borrow request action and current availability
  - link to the digitized version when a linked source exists
- Restrictions:
  - no circulation approval or catalog editing controls for members

### Tree Browse
- Goal:
  - give an overview entry into the knowledge tree by branch and recent nodes
- Key regions:
  - branch overview and featured or recent verified nodes
  - filter by tag and verification state
- States:
  - empty, loading, error

### Branch List
- Goal:
  - list branches so a user can pick a topic to explore
- Key regions:
  - branch cards with title, summary, node count, and progress
  - filter and sort controls
- States:
  - empty, loading, error

### Node Detail
- Goal:
  - present the node as the primary reading surface
- Key regions:
  - page header with verification badge
  - Markdown content canvas
  - contextual mini-graph: the same interactive map component centred on this node, with the centre pinned. Its settings panel (collapsed by default) adds depth 1–3 hops and link direction (both / outgoing / incoming); the page fetches the deepest neighbourhood the control offers, so changing depth redraws without another round trip
  - related nodes
  - source excerpt and provenance summary
- User actions:
  - follow links
  - open branch
  - inspect relation context
  - export the node to `docx` or `pdf`

### Branch Hub
- Goal:
  - act as the knowledge path overview for a topic or project
- Key regions:
  - branch summary
  - node map
  - progress or checklist summary
  - related sources and open gaps

### Graph Explorer
- Goal:
  - support exploratory relation navigation
  - let the reader arrange the map themselves and keep that arrangement
- Key regions:
  - graph canvas: an interactive SVG map of every non-archived node, drawn with verification encoded by both colour and shape. The server renders a deterministic seed layout; an in-repo force simulation takes over from those exact positions on mount, then cools to a stop
  - hover or focus preview card for the node under the pointer, and click or Enter to open that node
  - `Tùy chỉnh bản đồ` settings panel, collapsible, open by default here:
    - filters: title search, branch, and show/hide orphan nodes
    - display: colour by verification or branch, size by link count, link arrows, label visibility (always / on hover / hidden), and one visibility toggle per link type (`related`, `supports`, `contrasts`, `part_of`)
    - forces: centre, repel, link, and link distance sliders that retune the running simulation live
    - `Khôi phục mặc định` to reset
  - toolbar: zoom in / out / `Vừa khung`, pause or resume motion, `Bỏ ghim tất cả`, and a live count of visible nodes, links and pinned nodes
  - legend for the verification marks, plus a branch-colour legend when colouring by branch
- User actions:
  - drag a mark (pointer, touch or pen) to pin it where it is dropped; a pinned mark wears a vermilion seal ring
  - hover or focus a mark to highlight it and its immediate neighbours and dim the rest
  - pan by dragging the background; zoom by button, by `Ctrl`/`⌘` + wheel, or by two-finger pinch. Plain wheel scrolls the page and is never intercepted
  - keyboard only: Tab between marks, Enter to open, arrow keys to nudge and pin, `P` to pin or unpin, `Esc` to dismiss the preview
- Constraints:
  - settings persist in `localStorage` under `wisdomtree.graph.v1`, read in an effect so SSR and hydration agree; the free-text search is deliberately not persisted
  - `prefers-reduced-motion: reduce` renders the settled layout with no animation and says so
  - above 300 simulated nodes the map keeps the static layout and says so in the UI rather than truncating silently

### Deadlines
- Goal:
  - let project members track conference, funding, report, and milestone deadlines across parallel projects
- Key regions:
  - upcoming deadlines list sorted by due date, filterable by project
  - deadline detail with type, due date, linked checklist, and linked documents
  - calendar-feed subscribe link
- States:
  - empty, loading, error, access denied

### Source Intake
- Goal:
  - let any authenticated user contribute new source material or record a `branch-gap request` into the pipeline
- Key regions:
  - intake mode selector for source upload vs gap request
  - target space selector limited to member spaces
  - upload form
  - minimal metadata fields
  - allowed-format guidance
  - submission result banner
- States:
  - empty: no recent intake items
  - loading: upload in progress
  - error: failed upload with retry guidance

### My Submissions
- Goal:
  - let users track only their own intake items; browsing stored team files happens in `Library`
- Columns:
  - item type
  - title
  - processing state
  - trust or review state when available
  - last updated
  - next expected action
- Restrictions:
  - no access to global source browsing
  - no corrected-text or Markdown-draft editing for baseline `User`

## Editor Authoring Extension

### Create Branch
- Entry points:
  - branch CTA from home, search, or branch list
- Requirements:
  - choose branch type
  - fill template scaffold
  - save draft branch
  - assign ownership or assignment context for later edits

### Edit Node
- Mode:
  - Markdown source + preview
- Key regions:
  - template-assisted Markdown editor
  - preview pane
  - metadata side panel
  - link and tag helper panel
- States:
  - no_source badge visible by default for manual nodes
  - validation errors shown inline and in summary
  - access denied when the node is not owned or assigned to the Editor

### Assigned Source Task
- Goal:
  - let an assigned editor correct text or refine a draft
- Layout:
  - raw text reference
  - corrected text editor
  - Markdown draft tab or split view
  - task status and assignment info
- Restrictions:
  - cannot approve or publish
  - cannot open tasks that are not owned or assigned

## Shared States Applied Here
- loading
- empty
- error
- access denied
- archived
