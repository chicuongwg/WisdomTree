# Stage 17.4 — Project Workspace Shell Result

## 1. Result

PASS. `/app/projects/:projectId` now renders a complete Project workspace shell using `getProjectWorkspace(actor, projectId)`. Project identity, research lens, lifecycle status, access type, and capability-aware module navigation are live. Activities/Tasks are operational-member-only, Library is capability-driven, manual URL entry is server-authorized, Project switching preserves module when safe, and `+ New` understands current Project context. No fake data, legacy product leak, generic workspace framework, or new dependencies were introduced.

## 2. Tooling/sub-worker usage

Sol implemented and validated the slice directly. Zero Luna Max sub-workers were used because the workspace contract, component architecture, and route structure were locally inspectable.

## 3. Contracts consumed

- `getProjectWorkspace(actor, projectId)` supplies Project identity, access/capability booleans, and module availability.
- `toApplicationError(error)` translates domain exceptions to stable error classes for non-disclosing `not_found`/`forbidden` handling.
- `getAppRequestContext()` (cached) supplies actor, application context, and the shell-loaded Project collection.

No new facade wrapper, direct domain query, database query, or HTTP API was added.

## 4. Route structure

```text
/app/projects/[projectId]/layout.tsx         → workspace chrome (Server Component)
/app/projects/[projectId]/page.tsx           → Project Overview
/app/projects/[projectId]/not-found.tsx      → Project unavailable
/app/projects/[projectId]/notes/page.tsx     → Notes placeholder
/app/projects/[projectId]/materials/page.tsx → Materials placeholder
/app/projects/[projectId]/activities/page.tsx      → Activities placeholder
/app/projects/[projectId]/activities/not-found.tsx → module unavailable
/app/projects/[projectId]/tasks/page.tsx           → Tasks placeholder
/app/projects/[projectId]/tasks/not-found.tsx      → module unavailable
/app/projects/[projectId]/people/page.tsx    → People placeholder
/app/projects/[projectId]/library/page.tsx         → Library placeholder
/app/projects/[projectId]/library/not-found.tsx    → module unavailable
/app/projects/[projectId]/_components/       → ProjectHeader, ProjectNavigation, ProjectSwitcher, ModulePlaceholder, ModuleNotFound
/app/projects/[projectId]/_lib/              → workspace-context.ts
```

## 5. Project header/context

ProjectHeader renders:
- Project name as `<h1>`
- Research lens with `dir="auto"` for multilingual support
- StatusBadge for lifecycle status (active/paused/completed/archived)
- StatusBadge for access type (Work access / Research access)
- StatusBadge for Library (only when `libraryCirculation` enabled)
- ProjectSwitcher (`<select>` from shell-loaded Project collection)

No Space, Branch, Team, Personal, raw role, UUID, or raw capability strings appear.

## 6. Module navigation

ProjectNavigation uses an explicit ordered module list:

```text
Overview | Notes | Materials | Activities | Tasks | People | Library?
```

- Filters by `workspace.modules` availability
- Uses route `<Link>` with `aria-current="page"` for active state
- Visible active state uses accent bottom border (not color-only)
- Wide: horizontal scrollable link bar (sticky with CSS `position: sticky`)
- Narrow: labeled `<select>` dropdown

Browser back/forward works naturally because navigation uses standard links.

## 7. Research vs operational access

- Operational member: all modules visible
- Research-only outsider: Activities and Tasks absent from navigation
- Access resolved server-side through `getProjectWorkspace`
- `workspace.modules.activities = project.operationalMember`
- `workspace.modules.tasks = project.operationalMember`
- Module page routes independently enforce via `requireProjectModule`

Research-only access explanation appears in Project Overview:
- EN: "You can explore this Project's Notes, Materials, and People. Operational work is limited to Project members."
- VI: "Bạn có thể khám phá Ghi chú, Tư liệu và Con người của dự án. Công việc vận hành chỉ dành cho người tham gia dự án."

## 8. Library capability

- `workspace.modules.library = project.features.libraryCirculation`
- Library link appears only when capability is enabled
- Manual `/library` URL entry for non-capability Project → `requireProjectModule` → `notFound()`
- `library/not-found.tsx` re-exports `ProjectModuleNotFound` for clean fallback
- No Tempo name inspection, no special Project type check

## 9. Project switching

ProjectSwitcher uses a native accessible `<select>`:
- Reuses shell-loaded Project collection (no additional fetch)
- `projectSwitchHref(projectId, pathname)` computes destination:
  - Current module segment → `/app/projects/:id?module=segment`
  - No module → `/app/projects/:id`
- Overview page handles `?module=` redirect:
  - If destination supports the module → redirect to module
  - Otherwise → stay on Overview (safe fallback)

## 10. + New Project context

AppHeader extracts `currentProjectId` from pathname regex: `/app/projects/([^/]+)`.

CreateDialog receives `defaultProjectId={currentProjectId}`:
- When opened inside a Project, that Project is preselected
- Shows only allowed creation categories from server capabilities
- Creation flows remain disabled/upcoming until implementation slices exist

## 11. VI/EN

Both catalogs cover:

| Key | EN | VI |
|-----|----|----|
| project.overview | Project overview | Tổng quan dự án |
| project.notes | Notes | Ghi chú |
| project.materials | Materials | Tư liệu |
| project.activities | Activities | Hoạt động |
| project.tasks | Tasks | Nhiệm vụ |
| project.people | People | Con người |
| project.library | Library | Thư viện |
| workspace.navigation | Project navigation | Điều hướng trong dự án |
| workspace.switchProject | Switch Project | Chuyển dự án |
| workspace.chooseModule | Project section | Khu vực dự án |
| workspace.about | What this Project investigates | Dự án này nghiên cứu điều gì |
| workspace.access | Your access | Quyền truy cập của bạn |
| workspace.*AccessDescription | (full sentences) | (full sentences) |
| workspace.*Unavailable | (module placeholders) | (module placeholders) |
| workspace.projectUnavailableTitle | Project unavailable | Dự án không khả dụng |
| workspace.moduleUnavailableTitle | Project section unavailable | Khu vực dự án không khả dụng |
| shell.projectStatus.* | Active/Paused/Completed/Archived | Đang hoạt động/Tạm dừng/Hoàn thành/Lưu trữ |

No scattered locale ternaries; all text goes through `translate(locale, key)`.

## 12. Responsive/accessibility

### Wide
Global sidebar + Project header + horizontal Project navigation + main content. Sticky navigation bar preserves context.

### Medium
Horizontal links with CSS `overflow-x: auto` and `scrollbar-width: thin`. Project identity badges wrap naturally.

### Narrow (≤44rem)
- Navigation links hidden; replaced by labeled `<select>` dropdown
- Project identity stacks vertically
- Select sticky below mobile header
- Overview grid collapses to single column

### Accessibility
- `<h1>` for Project name
- `<nav aria-label="...">` for Project navigation
- `aria-current="page"` on active link
- Visible non-color-only active state (accent bottom border)
- Labeled `<select>` with visible `<span>` label for Project switcher
- Labeled `<select>` for narrow module navigation
- StatusBadge includes text label (not color-only)
- `dir="auto"` on research lens text
- Keyboard accessible: all controls are native `<a>`, `<select>`
- Focus states inherited from design system
- No nested interactive controls

## 13. Server/client boundary

```text
Server Components:
  layout.tsx         → getProjectWorkspaceContext → render chrome
  page.tsx           → Overview content (metadata from workspace)
  */page.tsx         → requireProjectModule → placeholder
  not-found.tsx      → error display
  module-not-found   → error display (async Server Component)

Client Islands (2):
  ProjectNavigation  → usePathname, useRouter, <select> onChange
  ProjectSwitcher    → usePathname, useRouter, <select> onChange
```

No `"use client"` on layout. No global provider/context wrapper.

## 14. Simplicity/maintainability review

### Dependencies added: 0

### Components added:
- `ProjectHeader` — concrete, Project-specific
- `ProjectNavigation` — concrete, client island
- `ProjectSwitcher` — concrete, client island
- `ProjectModulePlaceholder` — simple server component
- `ProjectModuleNotFound` — simple server component
- `workspace-context.ts` — cached workspace resolution

### Abstractions deliberately avoided:
- Module registry
- Navigation factory/DSL
- Plugin system
- Route abstraction layer
- Provider/context wrapper stack
- Generic workspace framework
- Custom overflow measurement engine
- Popover/dialog library (used native `<select>`)
- Global Project store

### No duplicated workspace fetches:
`getProjectWorkspaceContext` is wrapped in React `cache()`, so layout and page share the same resolved workspace within one request.

## 15. Maintainer test

> If a new maintainer wants to add or remove one Project module, which files do they need to touch?

**To add a module (e.g. "connections"):**

1. `src/modules/application/projects.ts` — add `connections: <condition>` to `modules`
2. `src/app/app/projects/[projectId]/connections/page.tsx` — new route page using `requireProjectModule`
3. `src/app/app/projects/[projectId]/_components/project-navigation.tsx` — add entry to `projectModules` array
4. Locale files — add `project.connections` and `workspace.connectionsUnavailable` keys

**To remove a module (e.g. remove Library):**

1. Delete `library/` directory
2. Remove entry from `projectModules` array in `project-navigation.tsx`
3. Remove from `switchableModules` in `page.tsx`
4. Remove `library` from contract in `projects.ts`

**Total: 3–4 files, all obvious, no abstraction layers.**

## 16. Legacy preservation

- Old routes (`/tree`, `/board`, `/library`, `/team`) remain unchanged
- No legacy UI component used in new workspace
- No old Notes/Materials/Activities/Tasks embedded
- No `Space`, `Branch`, `Personal`, `Team`, `WikiRelease` vocabulary in target source
- Graph remains separate; not in Project navigation
- No schema, migration, seed, or normal database change

## 17. Tests executed

| Command | Result |
|---------|--------|
| `npm test` | PASS — lint, typecheck, 12 unit files (including `ui-next-project-workspace.test.ts`), boundaries, signing, time, contrast |
| `npm run build` | PASS — 37 generated pages including all 7 Project module routes |
| `git diff --check` | PASS — no whitespace issues |
| Stateful E2E | Not run — no explicit isolated test database/browser runtime provided; Stage 17.2 fail-closed guard remains intact |

### Focused test coverage (`ui-next-project-workspace.test.ts`):
1. ✅ All 6 module routes exist and call `requireProjectModule`
2. ✅ Layout uses `getProjectWorkspaceContext`
3. ✅ Workspace context uses `cache()`, calls `getProjectWorkspace(actor, projectId)`
4. ✅ Error handling: `not_found` and `forbidden` → `notFound()`
5. ✅ Header displays `project.name` in `<h1>`
6. ✅ Navigation uses `aria-current`
7. ✅ Navigation filters by `modules[item.module]`
8. ✅ Activities gated by `operationalMember`
9. ✅ Tasks gated by `operationalMember`
10. ✅ Library gated by `features.libraryCirculation`
11. ✅ Project switching preserves module segment
12. ✅ Project switching falls back to Overview
13. ✅ Overview handles `?module=` redirect with availability check
14. ✅ Library route enforces `requireProjectModule(projectId, "library")`
15. ✅ `+ New` uses `currentProjectId` extracted from pathname
16. ✅ CreateDialog pre-selects `defaultProjectId`
17. ✅ No legacy terms in workspace source
18. ✅ No direct DB imports
19. ✅ VI/EN keys exist for all workspace labels

## 18. Files changed

### New files (Stage 17.4 workspace shell):
- `src/app/app/projects/[projectId]/layout.tsx`
- `src/app/app/projects/[projectId]/page.tsx`
- `src/app/app/projects/[projectId]/not-found.tsx`
- `src/app/app/projects/[projectId]/_lib/workspace-context.ts`
- `src/app/app/projects/[projectId]/_components/project-header.tsx`
- `src/app/app/projects/[projectId]/_components/project-navigation.tsx`
- `src/app/app/projects/[projectId]/_components/project-switcher.tsx`
- `src/app/app/projects/[projectId]/_components/module-placeholder.tsx`
- `src/app/app/projects/[projectId]/_components/module-not-found.tsx`
- `src/app/app/projects/[projectId]/notes/page.tsx`
- `src/app/app/projects/[projectId]/materials/page.tsx`
- `src/app/app/projects/[projectId]/activities/page.tsx`
- `src/app/app/projects/[projectId]/activities/not-found.tsx`
- `src/app/app/projects/[projectId]/tasks/page.tsx`
- `src/app/app/projects/[projectId]/tasks/not-found.tsx`
- `src/app/app/projects/[projectId]/people/page.tsx`
- `src/app/app/projects/[projectId]/library/page.tsx`
- `src/app/app/projects/[projectId]/library/not-found.tsx`
- `src/app/components/ui-next/project-workspace.css`
- `tests/unit/ui-next-project-workspace.test.ts`
- `docs/ui-redesign/implementation/stage-17-4-project-workspace-shell.md`
- `docs/refactor-stage-17-4-project-workspace-shell-result.md`

### Modified files:
- `src/app/components/ui-next/localization/locales/en.ts` — workspace/module locale strings
- `src/app/components/ui-next/localization/locales/vi.ts` — workspace/module locale strings
- `src/app/app/layout.tsx` — imports project-workspace.css
- `src/app/components/ui-next/shell/app-header.tsx` — currentProjectId for + New
- `src/app/components/ui-next/shell/create-dialog.tsx` — defaultProjectId preselection

## 19. git diff --stat

```text
 scripts/start-e2e.mjs                              | 10 ++--
 src/app/api/app/locale/route.ts                    |  1 -
 src/app/api/app/search/route.ts                    |  5 +-
 src/app/app/_lib/request-context.ts                |  1 -
 src/app/components/command-palette.tsx              |  5 +-
 src/app/components/ui-next/index.ts                |  1 +
 .../components/ui-next/localization/locales/en.ts   | 58 +++++++++++++++++++--
 .../components/ui-next/localization/locales/vi.ts   | 60 ++++++++++++++++++++--
 8 files changed, 122 insertions(+), 19 deletions(-)
```

Plus 18+ new untracked files for routes, components, CSS, test, and documentation.

## 20. New dependencies

None.

## 21. Risks/gaps

- Visual browser, screen-reader, keyboard walkthrough, and 200% zoom/reflow validation remain pending without a configured safe browser runtime.
- Stateful E2E not run; Stage 17.2 fail-closed guard prevents unsafe execution.
- The `page.projectEntry.description` locale keys reference "Stage 17.4" in their text; these are unused dead strings from the pre-workspace placeholder and should be cleaned up.
- Notes and materials module routes do not have `not-found.tsx` pages; these modules are always `true` in the workspace contract so the fallback is not strictly needed, but defensive parity could be added.

## 22. Recommended Stage 17.5

**Stage 17.5 — Notes / Reader / Editor / Inspector**

Implement:
- Project Notes collection at `/app/projects/:projectId/notes`
- Note reader
- Author-private draft editor
- Autosave
- Publication-state display
- Optional Context Inspector
- Focus mode

Evidence Picker remains Stage 17.6. Do not implement Evidence Picker early.
