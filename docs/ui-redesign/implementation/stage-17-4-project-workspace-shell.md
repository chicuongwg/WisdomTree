# Stage 17.4 — Project Workspace Shell Implementation

## 1. Workspace route structure

```text
/app/projects/:projectId                 → Project Overview (layout + page)
/app/projects/:projectId/notes           → Notes placeholder
/app/projects/:projectId/materials       → Materials placeholder
/app/projects/:projectId/activities      → Activities placeholder (operational only)
/app/projects/:projectId/tasks           → Tasks placeholder (operational only)
/app/projects/:projectId/people          → People placeholder
/app/projects/:projectId/library         → Library placeholder (capability only)
```

All routes share a common layout at `[projectId]/layout.tsx` that owns the ProjectHeader and ProjectNavigation chrome, so module pages only render their own content.

## 2. Workspace contract

Every Project workspace route resolves through a request-scoped cached function:

```text
getProjectWorkspaceContext(projectId)
  → getAppRequestContext()          (cached: actor, application, projects)
  → getProjectWorkspace(actor, id)  (application facade)
  → returns { application, projects, workspace }
```

The workspace contract returns:
- `workspace.project`: identity, research lens, status, access booleans, capabilities
- `workspace.modules`: `{ notes, materials, activities, tasks, people, library }`

Module availability is server-computed:
- `activities` and `tasks` require `project.operationalMember`
- `library` requires `project.features.libraryCirculation`
- `notes`, `materials`, `people` are always `true`

Inaccessible or non-existent Projects surface as `notFound()` via `toApplicationError` — non-disclosing.

## 3. Project header

`ProjectHeader` renders:
- Project name (`<h1>`)
- Research lens (with `dir="auto"`)
- Status badge: active/paused/completed/archived with appropriate tones
- Access badge: Work access or Research access
- Library badge: only when `libraryCirculation` is enabled
- ProjectSwitcher: labeled `<select>` with all accessible Projects

No Space, Team, Personal, Branch, role, UUID, or raw capability strings are displayed.

## 4. Module navigation

`ProjectNavigation` is a `"use client"` component that:
- Reads `pathname` to determine the current segment
- Filters `projectModules` by `workspace.modules` availability
- Renders accessible route links with `aria-current="page"`
- On wide screens: horizontal link bar (sticky, scrollable overflow)
- On narrow screens: labeled `<select>` with `<option>` for each module
- Module list: Overview, Notes, Materials, Activities, Tasks, People, Library?
- Activities/Tasks absent for research-only outsiders
- Library absent unless capability-enabled

The navigation uses semantic route links, not ARIA tabs.

## 5. Access behavior

### Operational Project member
Sees all modules according to returned capabilities.

### Core research-only outsider
Sees: Overview, Notes, Materials, People
Does NOT see: Activities, Tasks
Library: only if capability-enabled

### Manual URL entry
Each module page calls `requireProjectModule(projectId, module)` which:
1. Resolves workspace context (enforcing Project access)
2. Checks `workspace.modules[module]` — if false, returns `notFound()`

Conditionally-available module routes (activities, tasks, library) also have `not-found.tsx` pages for clean fallback.

## 6. Project switching

`ProjectSwitcher` is a `"use client"` component using a native `<select>`:
- Displays all accessible Projects from the shell-loaded collection (no extra fetch)
- On change, navigates to `projectSwitchHref(newProjectId, pathname)`:
  - If currently on a module segment → `/app/projects/:newId?module=segment`
  - Otherwise → `/app/projects/:newId`
- The Overview page handles `?module=` by checking destination module availability:
  - If available → redirect to that module
  - If not available → stay on Overview

This preserves the current module when switching, but safely falls back.

## 7. Responsive behavior

### Wide
- Global sidebar + Project header + horizontal navigation links + main content
- Sticky navigation bar

### Medium
- Horizontal links with CSS overflow-x scrolling
- Project identity stacks responsively

### Narrow (≤44rem)
- Project identity badges wrap to start alignment
- Navigation links hidden, replaced by labeled `<select>` dropdown
- Select dropdown sticky below mobile header (3.75rem offset)
- Single-column content

## 8. Server/client split

```text
Server Components:
  - layout.tsx           → getProjectWorkspaceContext, renders chrome
  - page.tsx             → Overview content
  - notes/page.tsx       → requireProjectModule
  - materials/page.tsx   → requireProjectModule
  - activities/page.tsx  → requireProjectModule
  - tasks/page.tsx       → requireProjectModule
  - people/page.tsx      → requireProjectModule
  - library/page.tsx     → requireProjectModule
  - not-found.tsx        → error display

Client Islands:
  - ProjectNavigation    → pathname detection, module select
  - ProjectSwitcher      → Project select, router.push
```

Layout is Server Component. Only interactive navigation needs client-side state.

## 9. Simplicity decisions

Deliberately avoided:
- Module registry / navigation DSL
- Plugin system / dynamic route engine
- Generic workspace framework
- Capability expression language
- Global context/provider stack
- Custom overflow measurement engine
- Popover/dialog for Project switcher (native select is simpler)
- New dependencies
- API routes

Used instead:
- Explicit route files per module
- Small concrete components
- Server-side access resolution
- Simple route links
- CSS-only responsive behavior
- Native `<select>` for both Project switching and narrow navigation

## 10. Stage 17.5 handoff

Stage 17.5 should implement Notes at `/app/projects/:projectId/notes`:
- Replace the placeholder with Project Note collection
- Note reader
- Author-private draft editor
- Autosave
- Publication-state display
- Optional Context Inspector
- Focus mode

Evidence Picker remains Stage 17.6.
