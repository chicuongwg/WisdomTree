# Stage 17.2 — New App Shell / Global Navigation result

## 1. Result

PASS. A parallel authenticated `/app` shell now provides localized global navigation, responsive behavior, Quick Search, Project-first New, and account utilities. The old UI remains available and unchanged on its existing routes.

## 2. Tooling/sub-worker usage

Zero Luna Max workers were used. The three Stage 17.1 scouting attempts had already stopped at the tool quota, and Stage 17.2 evidence was narrow enough to inspect directly without depending on unavailable workers.

## 3. Route namespace

Implemented `/app`, `/app/projects`, `/app/projects/[projectId]`, `/app/my-work`, `/app/people`, and `/app/search`. Two authenticated browser adapters were added at `/api/app/search` and `/api/app/locale`. No old route redirects or renames were introduced.

## 4. App shell architecture

The nested server layout resolves authenticated Stage 16 application context and confirmed Projects, then renders one shared `AppShell`. The shell contains a global sidebar, quiet header, and one main landmark. Route pages are intentionally minimal placeholders. The Project-ID route only proves a safe confirmed-Project entry point; it does not implement workspace tabs.

## 5. Global navigation

Overview, Projects, My Work, People, and Search are explicit semantic links with VI/EN labels, browser routing, `aria-current`, and non-color-only active styling. No Personal/Team/Branch/Wiki terminology or legacy global Library, Board, Review, Graph, or Deadline entry appears.

## 6. Responsive navigation

Wide mode uses the expanded sidebar. Medium mode uses a compact labeled-icon rail with hover/focus labels. Narrow mode uses the Stage 17.1 Drawer, closes after navigation, and retains focus/Escape semantics. Route content remains one column.

## 7. Quick Search

The visible trigger and `Ctrl/Cmd+K` open one dialog. Empty state contains basic navigation commands only. Queries use the accepted authorization-first research search for Projects, Notes, Materials, and People. The delivery adapter omits scores. Arrow keys select, Enter activates, Escape closes, and View all transfers `q` to `/app/search`.

The legacy command palette now ignores its open event and shortcut only while `.ui-next-app-root` is present, preventing shortcut collision without changing old-route behavior.

## 8. + New flow

New first lists confirmed Projects from Stage 16 and distinguishes work access from research-only access. After selection it derives allowed categories only from server-computed capability booleans. Downstream creation is deliberately not faked: allowed categories are disabled and labeled Upcoming until their target slices exist.

## 9. Locale/account utilities

The account menu shows display identity, persisted VI/EN preference, light/dark toggle, existing account destination, and logout. Locale mutation calls Stage 16 through a thin authenticated adapter and refreshes server-rendered chrome. Appearance reuses `data-theme`/`wt-theme`. Logout uses the existing hard-navigation safety behavior.

## 10. Server/client boundary

Authentication, application context, Project listing, Project entry resolution, and page copy are server-side. Only route activity, drawer, Quick Search, New, account/locale/theme/logout, and the legacy-wrapper tab-order seam are client islands. No UI component imports DB, Drizzle, or schema modules.

## 11. Accessibility

Implemented skip-to-main, one new main landmark, labeled primary navigation, `aria-current`, visible active shape, required IconButton label, native modal focus containment/Escape/restoration, search combobox/listbox state, visible mutation errors, keyboard selection, responsive reflow, and inherited reduced-motion/focus behavior.

## 12. E2E isolation audit

OBSERVED unsafe defaults were present in both E2E global setup and server launcher: each could use normal `wisdomtree`, and global setup inserts a session. Both now require an explicitly test-named `TEST_DATABASE_URL` before connecting or starting. Unit checks prove missing URL and normal `wisdomtree` are rejected. E2E was not run because no isolated test URL or Chromium executable was configured.

## 13. Simplicity/maintainability review

The slice adds approximately eight shell components plus a small page placeholder and route-level loading/error states (about 11 UI components total), and two thin browser adapters. Navigation and search commands remain explicit arrays. No new provider, global state, command registry, navigation engine, icon framework, application-facade wrapper, or speculative domain component was introduced.

## 14. Legacy UI preservation

Old shell components, navigation, routes, Graph, styles, and APIs remain. Route-presence CSS suppresses old chrome only for `/app`; the root shell continues unchanged everywhere else. No schema, migration, seed, or domain service changed.

## 15. Tests executed

- `npm test` — PASS: lint, typecheck, 10 unit files, boundary check (247 delivery files with no direct database access), signing, time, legacy contrast, and new-UI contrast.
- `npm run test:unit` — PASS, 10 files including foundation and app-shell coverage.
- Focused E2E fail-closed checks within `ui-next-app-shell.test.ts` — PASS for missing URL and normal `wisdomtree` rejection.
- `npm run build` — PASS; all six `/app` page routes and two `/api/app` adapters compiled. Existing Next ESLint-plugin warning remains informational.
- `git diff --check` — PASS.

## 16. Files changed

Stage 17.2 adds the `/app` route tree, two `/api/app` adapters, eight shell components, scoped shell styling, one focused unit test, E2E isolation changes, this report, and the implementation note. It also extends the accepted Stage 17.1 catalogs and index, plus a two-line legacy palette guard limited to the new-shell route.

The repository HEAD advanced during the stage through `e327345` (E2E isolation) and `1b75bba` (request context/API/catalog foundation). The remaining worktree diff contains the shell, routes, focused tests, documentation, and final refinements; no unrelated prior changes were discarded.

## 17. New dependencies

None.

## 18. Risks/gaps

- Browser visual, screen-reader, keyboard walkthrough, and 200% zoom validation remain pending because no safe Playwright runtime was configured.
- Domain collection screens remain placeholders by design.
- Search result deep links target the prepared Project/People route seams; object detail screens arrive in later slices.
- New-category actions remain disabled until real target creation routes exist.
- The root layout still renders legacy data before nested `/app`; CSS/client isolation prevents UI conflict, but a future explicit cutover can remove this temporary compatibility cost.
- Account details continue linking to the existing `/account` utility until a new account surface is scoped.

## 19. Recommended Stage 17.3

Implement TMKT Overview and Projects discovery/list/entry using `getTmktOverview` and `listAppProjects`. Replace only the corresponding placeholders. Keep the old UI and defer Project workspace tabs to Stage 17.4.
