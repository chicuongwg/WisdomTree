# Stage 17.3 — TMKT Overview / Projects result

## 1. Result

PASS. `/app` and `/app/projects` now render real accepted application data inside the Stage 17.2 shell. No fake analytics, recent-research feed, Project statistics, direct database access, or legacy product vocabulary was introduced.

## 2. Tooling/sub-worker usage

Sol implemented and validated the slice directly. Zero Luna Max sub-workers were used because the two page contracts and accepted UI specifications were narrow and locally inspectable.

## 3. Contracts consumed

- `getTmktOverview(actor)` supplies the authoritative accessible Project identity set and My Work counts.
- `listAppProjects(actor)` is consumed through the cached Stage 17.2 request context for Project display metadata and capability-safe access presentation.

No facade wrapper, direct domain query, database query, or new HTTP API was added.

## 4. TMKT Overview implementation

The Overview follows the accepted hierarchy: My active work, Projects, Continue research. It uses one page heading and labeled semantic sections. Continue research routes to `/app/search`; no recent Notes, Materials, trending content, or recommendations are fabricated.

## 5. My active work behavior

The page displays assigned-Task and active-Activity counts only when either count is non-zero. They are navigation cues to My Work, not productivity metrics. With zero work it renders a direct empty state. Stage 16 already limits these counts to Projects where the actor is an operational member, so Core research-read alone contributes no work data.

## 6. Projects section

Overview displays its accessible confirmed Projects with Project name, research lens, lifecycle status, plain-language access, and capability-driven Library indicator. The list links directly to the prepared `/app/projects/:projectId` seam.

## 7. Projects screen

`/app/projects` now shows the complete accessible Project collection using the same restrained list, plus optional description. Project creation and filtering were deferred because no global creation capability is exposed and the current collection does not justify client filtering infrastructure.

## 8. Research vs operational access presentation

The UI says `Work access` for operational members and `Research access` for research-readable-only Projects. It does not render viewer/contributor/manager/Core or global role names.

## 9. Library capability presentation

Library appears only when `features.libraryCirculation` is true. No Tempo name, Project UUID, or special Project type is inspected.

## 10. VI/EN

Both catalogs now cover Overview sections, My Work summaries and empty state, Project list semantics, access wording, lifecycle labels, Library, and Project empty state. Stored Project research text is rendered unchanged with automatic text direction.

## 11. Responsive/accessibility

Wide and medium views retain a readable single list. Narrow views stack work summaries, headings, Project metadata, and badges. Pages use one `h1`, labeled sections, semantic Project list markup, clear links, textual status/access, logical keyboard order, and inherited focus/reduced-motion behavior.

## 12. Server/client boundary

Both routes remain Server Components. No client fetch, stateful island, browser adapter, or global provider was added.

## 13. Simplicity/maintainability review

Added one shared concrete `ProjectList`, one pure ordering helper, and one scoped stylesheet. Avoided dashboard/widget frameworks, registries, generic collection engines, analytics, Project presentation layers, new APIs, providers, and dependencies. No new N+1 query was introduced; Project rows render the existing list DTO directly. The Overview invokes the accepted composed facade as required and reuses the shell's already-loaded Project DTOs for presentation.

## 14. Legacy UI preservation

The old routes, shell, navigation, services, Graph, and UI remain unchanged. The parallel `/app` boundary still contains all new content. No schema, migration, seed, or normal database data changed.

## 15. Tests executed

- `npm run test:unit` — PASS, 11 unit files including Stage 17.3 ordering, contract-use, capability-driven Library, terminology, and VI/EN checks.
- `npm run typecheck` — PASS.
- `npm test` — PASS: lint, typecheck, 11 unit files, boundary isolation (248 delivery files with no direct database access), signing, time, and both contrast suites.
- `npm run build` — PASS: production compilation and all 37 generated pages, including `/app` and `/app/projects`. The existing informational Next ESLint-plugin warning remains.
- `git diff --check` — PASS.
- Stateful E2E — not run; no explicit isolated test database/browser runtime was provided, and the Stage 17.2 fail-closed guard remains intact.

## 16. Files changed

Stage 17.3 files:

- `src/app/app/page.tsx`
- `src/app/app/projects/page.tsx`
- `src/app/app/layout.tsx`
- `src/app/app/_components/project-list.tsx`
- `src/app/components/ui-next/overview-projects.css`
- `src/app/components/ui-next/localization/locales/en.ts`
- `src/app/components/ui-next/localization/locales/vi.ts`
- `tests/unit/ui-next-overview-projects.test.ts`
- `docs/ui-redesign/implementation/stage-17-3-overview-projects.md`
- `docs/refactor-stage-17-3-overview-projects-result.md`

Pre-existing Stage 17.2 worktree files were preserved.

## 17. New dependencies

None.

## 18. Risks/gaps

- Visual browser, screen-reader, keyboard walkthrough, and 200% zoom/reflow validation remain pending without a configured safe browser runtime.
- My Work detail remains the Stage 17.2 placeholder; Overview links to it but does not invent detail absent from this slice.
- The root layout compatibility cost identified in Stage 17.2 remains; this stage adds no dependency on its legacy data.
- The current `getTmktOverview` contract exposes counts rather than work-item titles and intentionally remains unchanged.

## 19. Recommended Stage 17.4

Implement the Project workspace shell at `/app/projects/:projectId` using `getProjectWorkspace(actor, projectId)`: Project identity, research lens, status/access, and capability-aware module navigation. Do not implement deep Notes, Materials, Activities, Tasks, People, or Library functionality yet.
