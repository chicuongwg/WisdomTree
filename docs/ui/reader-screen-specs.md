# Reader Screen Specifications

## Purpose
- Define screen-by-screen behavior for the reader-facing experience and its editor extensions in V1.

## In Scope
- Reader-facing screens.
- Editor authoring extension screens.
- Empty, loading, error, and permission states relevant to those screens.

## Out of Scope
- Admin/Op review and publish screens.
- Component-level implementation details.
- Mobile-specific layouts.

## Decisions
- Reader flow is the default product experience.
- Editor capabilities extend reader screens rather than forming a separate application.
- Tree editing remains Markdown-first with preview.

## Dependencies
- Screen inventory in [`screen-inventory.md`](./screen-inventory.md).
- Reader flows in [`../flows/reader-flows.md`](../flows/reader-flows.md).
- Editor flows in [`../flows/editor-flows.md`](../flows/editor-flows.md).

## Acceptance Criteria
- Reader and Editor surfaces are specified clearly enough for implementation.
- Shared states are applied consistently across screens.
- Role-based action visibility is explicit.

## Reader-Facing Experience

### Home
- Goal:
  - orient the user toward branches, recent knowledge, and next discovery actions
- Key regions:
  - recent branches
  - recently updated verified nodes
  - pending knowledge gaps or suggested topics
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

### Node Detail
- Goal:
  - present the node as the primary reading surface
- Key regions:
  - page header with verification badge
  - Markdown content canvas
  - contextual mini-graph
  - related nodes
  - source excerpt and provenance summary
- Reader actions:
  - follow links
  - open branch
  - inspect relation context

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
- Key regions:
  - graph canvas
  - selected node inspector
  - filters by branch, tag, and relation type

## Editor Authoring Extension

### Create Branch
- Entry points:
  - branch CTA from home, search, or branch list
- Requirements:
  - choose branch type
  - fill template scaffold
  - save draft branch

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

### My Source Submissions
- Goal:
  - show submission history without exposing the full source repo
- Columns:
  - source title
  - processing state
  - last update
  - next action

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

## Shared States Applied Here
- loading
- empty
- error
- access denied
- archived

