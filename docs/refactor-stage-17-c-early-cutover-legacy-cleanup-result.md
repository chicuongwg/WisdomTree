# Stage 17.C — Early UI Cutover + Legacy Frontend Cleanup

## 1. Verdict

PASS. The Project-centric `/app` workspace is the only internal application shell. The root route redirects to it, and no target navigation links an archived Tree, Board, Space, Library, Review, WikiRelease, or Personal/Team frontend.

## 2. Tooling/sub-workers

One main Codex worker performed the inventory, cutover, and validation. No sub-workers were used.

## 3. Pre-cutover architecture

The root layout loaded a signed-in rail, Tree/Space sidebar, status bar, command palette, unread notifications, Tree outline, and pending-review data before rendering every route (`src/app/layout.tsx`, pre-cutover). `/app` then hid that root chrome with `ShellIsolation` and `body:has(...)` CSS compatibility selectors.

## 4. Post-cutover architecture

`src/app/layout.tsx` is document-level only: global styles, theme initialization, validation messages, and route children. The only application shell is `src/app/app/layout.tsx` → `AppShell` → `GlobalNavigation`.

## 5. Canonical entry/shell

- `/` redirects to `/app` (`src/app/page.tsx`).
- `src/app/app/layout.tsx` defines the canonical authenticated shell.
- `src/app/components/ui-next/shell/navigation.tsx` defines primary navigation: Overview, Projects, My Work, People, Search.
- `src/app/app/projects/[projectId]/_components/project-navigation.tsx` remains the Project-local navigation owner.

## 6. Legacy inventory

| Legacy area | Decision | Evidence | Remaining dependency |
| --- | --- | --- | --- |
| Root rail/sidebar/status shell | DELETE_NOW | It was consumed only by `src/app/layout.tsx`; `/app` has its own `AppShell`. | None. |
| Command palette | DELETE_NOW | It searched `/api/search` and linked Tree/Board/Library/Review routes; target shell owns `QuickSearch`. | None. |
| Tree/Branch/Personal presentation | DELETE_NOW | No target `/app` import or link; all Tree pages and branch-facing editors were route-only presentation. | Domain schema/services remain. |
| Board/Deadline presentation | DELETE_NOW | No target consumer; Project Tasks and My Work are the target application contract. | Task/Deadline services and compatibility API remain. |
| Global Library/source intake presentation | DELETE_NOW | No target consumer; target Project Materials and Project Library routes are present. | Storage/circulation services and APIs remain. |
| Review/Proposal presentation | DELETE_NOW | Target publishing is Core-authorized and no target UI imports the legacy screens. | Legacy writers/proposal data remain for compatibility. |
| WikiRelease/export presentation | DELETE_NOW | Whole-Space release UI is not the public Note publishing model. | Export and release domain services remain. |
| Old root search/notifications | DELETE_NOW | Target shell owns Quick Search and `/app/search`; account preferences remain separately. | Search/notification services remain. |
| Graph | KEEP_TEMPORARILY | Product decision retains Graph as a secondary visualization. | Uses retained graph component and preview helper only. |
| Login/account settings | KEEP_TEMPORARILY | Authentication and self-service settings have no replacement target route. | `/login`, `/account`, and their narrow components. |
| Target UI components/CSS | TARGET_SHARED | Imported by `/app` routes and targeted unit tests. | Canonical shell and Project workspace. |
| Legacy delivery/domain services | KEEP_TEMPORARILY | Integration/use-case/privacy suites and compatibility APIs still consume them. | Explicitly outside frontend cleanup. |

## 7. Routes deleted

- `/admin`, `/admin/health`
- `/board`, `/board/task/:taskId`
- `/deadlines`, `/deadlines/:id`
- `/library`, `/library/:id`, `/library/loans`
- `/new-ui-preview`
- `/notifications`, `/search`
- `/review/*`, `/vault/review`
- `/source/intake`, `/source/mine`
- `/tree/*`
- `/wiki/:id/*`, `/wiki/releases`

These pages had no target `/app` consumer. Their backend/API routes were intentionally not deleted.

## 8. Routes redirected

| Route | Target | Reason |
| --- | --- | --- |
| `/` | `/app` | Canonical internal entry. |

## 9. Routes temporarily retained

| Route | Reason |
| --- | --- |
| `/login` | Authentication entry point. |
| `/account` | Transitional self-service profile, notification preferences, and calendar subscription settings. It no longer displays Spaces or source submissions. |
| `/graph` | Approved secondary research visualization; not primary navigation. Node selection remains inside Graph rather than reaching deleted Wiki pages. |
| `/calendar/[token]` | Calendar-feed delivery route, not an internal application shell. |
| `/api/*` | Compatibility and target delivery boundaries; no API/domain cleanup is part of this stage. |

## 10. Components removed

Removed root shell and command-palette components, Tree/Branch readers and editors, Board/Task presentation, Library/catalog/loan presentation, review/proposal/translation presentation, notification presentation, deadline/source forms, old Markdown reader wrapper, and the externally archived preview showcase. `node-link.tsx` now retains only the Graph preview primitive; it no longer renders old Wiki links.

## 11. CSS removed

Removed the dual-shell suppression rules from `src/app/components/ui-next/shell.css`, the root rail/sidebar/status/palette CSS, and exclusive Board, Tree-link, catalog/upload, pagination, and legacy sidebar CSS from `src/app/globals.css`. Target UI CSS was not redesigned.

## 12. Dependencies removed

None. Dependency inspection found that `d3-force` and `force-graph` remain live for `/graph`, `jose` remains live for authentication, and the remaining dependencies are used by the current application/build/test runtime.

## 13. Backend/domain compatibility deliberately retained

- All database schema, migrations, Project/Space identity, Branch compatibility, audit/version history, and Stage 17.6B provenance tables.
- Task, Deadline, Storage, Extraction, Circulation, Proposal/legacy-writer, WikiRelease/export, notification, and authorization services.
- Legacy API handlers where integration, privacy, or compatibility behavior still uses them.
- Project Material, Project Note, evidence/provenance, Person, Activity, Core, publication, search, and Tempo capability services.

## 14. Stage 17.6B regression status

PASS by regression coverage. The isolated integration suite passed all 20 files, including Project Note ownership, Project extraction, research support, Core authorization, stable publishing, cross-project search, and application contract tests. No Stage 17.6B schema or service behavior was changed.

## 15. Tests executed

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run test:unit` | PASS — 16 test files, including `ui-next-cutover.test.ts` |
| `npm run test:integration` | PASS — 20 test files on `wisdomtree_stage17_c_test` |
| `npm run test:usecase` | PASS — 3 test files on the isolated DB |
| `npm run test:privacy` | PASS — 2 test files on the isolated DB |
| `npm test` | PASS — lint, typecheck, unit, boundaries, signing, time, and contrast gates |
| `npm run test:boundaries` | PASS — 185 delivery files, no direct database access |
| `npm run build` | PASS |
| `git diff --check` | PASS |

The isolated database was created, migrated through `0048_note_version_support.sql`, seeded, used for stateful tests, and dropped. The normal `wisdomtree` database was not used for fixtures.

## 16. Browser status

Not run. Browser/E2E verification is optional in this stage and deep product verification is explicitly deferred. Build and structural route tests passed.

## 17. git diff --stat

```text
109 files changed, 52 insertions(+), 11674 deletions(-)
```

This command does not include the two new untracked Stage 17.C artifacts below.

## 18. git status --short

```text
M  src/app/account/page.tsx
M  src/app/app/layout.tsx
M  src/app/components/knowledge-map/index.tsx
M  src/app/components/node-link.tsx
M  src/app/components/ui-next/shell.css
M  src/app/globals.css
M  src/app/graph/page.tsx
M  src/app/layout.tsx
M  src/app/page.tsx
D  100 legacy route/component/style files (see git diff --stat)
?? docs/refactor-stage-17-c-early-cutover-legacy-cleanup-result.md
?? tests/unit/ui-next-cutover.test.ts
```

## 19. Maintainer test

- **Internal shell:** `src/app/app/layout.tsx` and `src/app/components/ui-next/shell/app-shell.tsx`.
- **Primary navigation:** `src/app/components/ui-next/shell/navigation.tsx`.
- **Project-local navigation:** `src/app/app/projects/[projectId]/_components/project-navigation.tsx`.
- **Second legacy application shell active:** No.

## 20. Remaining legacy

The retained Graph and account settings are temporary non-primary routes. Legacy backend/service/schema compatibility remains deliberately. No obsolete frontend shell or legacy primary-navigation route remains active.

## 21. Risks

- Graph still exposes its existing shared/personal compatibility scopes; it is intentionally secondary and was not redesigned here.
- Account settings remains legacy-styled until its future target UI replacement.
- Legacy APIs remain callable for compatibility even though their old browser pages are removed; their later removal needs a dedicated backend/dependency audit.
- Browser smoke verification remains pending.

## 22. Recommendation for Stage 17.CV

Do not start automatically. Stage 17.CV should perform the deferred browser/product verification of the single `/app` shell, Project workspace flows, evidence/provenance behavior, authorization boundaries, and retained Graph/account compatibility routes before Stage 17.7.
