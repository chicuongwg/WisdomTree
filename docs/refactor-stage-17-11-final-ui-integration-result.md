# Stage 17.11 — Final UI Integration Result

## 1 Verdict

PASS

## 2 Worker usage

Main worker: Codex Terra Extra High  
Luna Max workers used: 3

- Graph implementation, dependencies, and authorization tracing.
- Target navigation, responsive/accessibility, Material and Task UI tracing.
- Account, public-route, and legacy-surface tracing.

## 3 Final UI architecture

`/app` is the single internal shell: Overview, Projects and their workspace modules, My Work, People, and Search. Graph and Account are secondary routes at `/app/graph` and `/app/account`. The existing stable published projection remains public.

## 4 Graph integration

`/app/graph` uses the application facade over persisted Project, official Note, Material, Person, and operationally-visible Activity facts. Nodes route only to canonical target screens. Private drafts, extraction candidates, projectless research, inaccessible Projects, and Activity context for Core-only research readers are excluded. The former `/graph` page redirects to the target route; the target flow no longer exposes Personal, Branch, Wiki, Tree, or old Library navigation.

## 5 UX/accessibility repairs

Material detail now offers **Continue working Note** only for the actor's persisted evolved draft. Task edit controls follow the same creator-or-assignee authority enforced by the service; other tasks are read-only. The Material version list is semantic, Graph and Account layouts reflow at narrow widths, and the publication Inspector link opens the actual public projection.

## 6 Legacy/navigation audit

Canonical navigation includes Graph and Account under `/app`. Root `/graph` and `/account` redirect to their target-shell equivalents. Target Graph clicks resolve to Project, Note, Material, Activity, or Person routes; no target navigation was found to point to Tree, Wiki, Board, Review, or the retired global Library UI.

## 7 Validation

Normal `wisdomtree` was read-only checked at migration `0051_source_current_version_same_source.sql` (52 migrations). A fresh isolated Stage 17.11 database was migrated through 0051, seeded, used for stateful suites, and then dropped.

Passed: `npm run test:unit`, `npm run test:integration`, `npm run test:usecase`, `npm run test:privacy`, `npm test`, `npm run build`, `git diff --check`, and `npm run test:boundaries`. The boundary check covered 216 delivery files with no direct database access. No migration or dependency files changed.

## 8 Files changed

Primary Stage 17.11 changes are the graph application facade and target route; retained Graph presentation; target navigation and localized labels; Material, Task, Account, and publication-link integration; focused unit/integration coverage; and target UI CSS. Stage 17.10 files already present in the worktree remain preserved.

## 9 Remaining risks

Browser/E2E visual validation is pending Stage 17.V: the installed Chromium cannot start because `libglib-2.0.so.0` is unavailable. No browser behavior is claimed here. The Graph remains intentionally read-only and secondary; it is not a relation editor or a second discovery system.

## 10 Readiness for Stage 17.V

Ready for Stage 17.V after coordinator review. Stage 17.V was not started.
