# Interaction principles

## Product orientation

1. **Project before module.** Every operational or research creation makes its Project context visible before commit.
2. **Ownership is not organization.** Views, folders, filters, Activities, evidence links, and publication do not alter Project ownership.
3. **Privacy is explicit and independent.** `Private draft` is a visible working state inside a Project, not a separate Personal universe.
4. **Same identity, multiple views.** My Work, Project Tasks, Activity Tasks, search results, and detail pages point to the same object.
5. **Capabilities shape the interface.** Hide unavailable create/manage actions when the server contract says they are unavailable; never infer from raw roles.

## Progressive disclosure

- Primary content and the next likely action occupy the main canvas.
- Secondary metadata uses a summary strip or closed inspector.
- Evidence, versions, publication history, and administrative detail are explicit inspector tabs/drawers.
- Destructive or externally visible changes require clear confirmation and consequence text.
- Empty states explain the product concept and offer one authorized next step, not a wall of controls.

## Navigation

- Global: Overview, Projects, My Work, People, Search.
- Local Project navigation never includes Space, Branch, Personal, Team, or WikiRelease.
- Recents/Favorites are optional accelerators below stable destinations, not another hierarchy.
- `Ctrl/Cmd+K` opens quick navigation/search; `/` or an in-view field narrows the current collection.
- Back/forward and deep links preserve selected object, filters, and inspector state when practical.

## Creation

- One global `+ New` is visible on desktop and discoverable on narrow layouts.
- In Project context it offers Note, Material, Activity, Task, and Person; Library actions appear only with capability and authority.
- Outside a Project, creation either asks for a Project first or creates only objects whose contract permits global creation. Stage 17 should default to choosing a Project rather than guessing.
- Quick Note starts as a Project-owned author-private draft and exposes its state immediately.

## Reading, writing, and evidence

- Reading measure is constrained; metadata does not force content into a narrow column.
- Focus mode hides global navigation and closes the inspector, with an always-visible exit and evidence affordance.
- Evidence Picker searches authorized Materials and official Notes, shows exact version identity, and attaches without navigation loss.
- Evidence chips communicate object type, title, version, Project, and availability; detailed provenance is one action away.
- Save, conflict, publication, and stale-publication states use text plus icon—not color alone.

## Materials

- Material detail is one identity with sections for metadata, files/versions, physical copy, extracted text, and research usage.
- Upload, scan, and corrected files create visible versions under the same Material.
- Processing states are durable and resumable. Extraction never creates a Note without an explicit review/evolve action.
- Folder is an optional organization control, never a Project ownership selector.

## Activities and work

- Activity detail is a contextual workspace: purpose/summary, People, Materials, Tasks, and resulting official Notes.
- Calendar language is avoided unless scheduling integration exists.
- Project Tasks and My Work are different scopes over the same Task identity.
- Core research read never implies access to another Project's Activities or Tasks.

## Feedback and errors

- Pending actions show immediate local state without claiming persistence.
- Server errors map to stable user-language messages and retain user input where safe.
- Optimistic version conflicts offer compare/reload/reapply paths.
- Upload/extraction progress is announced visually and through an appropriate live region.
- Empty, loading, denied, unavailable, and not-found states are distinct internally while preserving non-disclosure to unauthorized users.

## Accessibility and responsive behavior

- Semantic headings/landmarks, skip link, logical tab order, visible focus, and full keyboard paths are baseline.
- Shortcuts supplement visible controls and are listed in an accessible shortcut reference.
- Contrast, status text, target size, zoom/reflow, reduced motion, and screen-reader announcements are acceptance criteria.
- At narrower widths: global sidebar becomes a drawer; Project tabs become a scrollable/overflow selector; inspector becomes a modal drawer; three-pane work collapses to a master-detail stack.
- User research content uses content direction independently from the vi/en interface direction.

## Component families

Common families:

- `AppShell`, `GlobalSidebar`, `QuickSearch`, `CreateMenu`
- `ProjectHeader`, `ProjectNav`, `ProjectContextBadge`
- `CollectionToolbar`, `ResourceList`, `ResourceTable`, `ViewSwitcher`
- `ContextInspector`, `InspectorSection`, `FocusMode`
- `SaveState`, `ConflictDialog`, `EmptyState`, `StatusBadge`
- `PublicStateBadge`, `VersionLabel`, `EvidencePicker`, `EvidenceChip`

Domain-specific families should remain explicit:

- `MaterialVersionList`, `PhysicalCopyPanel`, `ExtractionPanel`
- `ActivityPeoplePanel`, `ActivityTasksPanel`, `ActivityOutcomesPanel`
- `PersonProjectContexts`
- `LibraryLoanTable`, `LibraryOperatorActions`

Do not turn these into a generic entity/edge renderer merely because their outer panels look similar.

## Visual language

- Quiet neutral chrome; content and state carry hierarchy.
- Compact controls with comfortable reading surfaces.
- One restrained accent for current context/action; semantic states also have labels/icons.
- Borders and spacing establish structure before shadows or decoration.
- Light and dark themes use the same hierarchy and density, not separate layouts.
