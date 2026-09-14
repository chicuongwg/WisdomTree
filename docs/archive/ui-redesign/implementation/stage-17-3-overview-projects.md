# Stage 17.3 — Overview and Projects implementation

## 1. Data contracts used

- `/app` calls `getTmktOverview(actor)` for authoritative My Work counts and its accessible Project identity set.
- The Project display DTOs come from the `listAppProjects(actor)` result already resolved by the Stage 17.2 request context.
- `/app/projects` renders that same accepted Project collection.
- No page reads the database or a legacy root-layout data prop, and no browser API was added.

## 2. Information hierarchy

The TMKT Overview renders:

1. My active work;
2. Projects;
3. Continue research.

My Work uses only the assigned-Task and non-cancelled-Activity counts in the accepted overview DTO. The Projects section explains access and provides direct Project entry. Continue research links to Search because no accepted recent-research feed exists.

## 3. Project ordering

Projects use a transparent stable order:

1. operational Projects before research-readable-only Projects;
2. status: active, paused, completed, archived;
3. locale-aware Project name;
4. stable Project ID tie-breaker.

No Project is hidden because of lifecycle status.

## 4. Access wording

The UI presents `Work access` or `Research access`. It does not expose raw roles or Core implementation terminology. Work access reflects actual Project participation; research access describes the narrower cross-Project research-reading context.

Library is shown only when `features.libraryCirculation` is true. Project names and IDs have no role in that decision.

## 5. Server/client split

Both pages are Server Components. The only interaction is ordinary semantic navigation. No client island, mount-time request, state provider, global store, or new API is needed.

## 6. Responsive behavior

Wide and medium layouts use a comfortable single Project list. Project metadata is split between the main description and concise badges. At narrow widths, Project rows, work summaries, headings, and Continue research stack into one column without squeezing metadata.

## 7. Accessibility

- One page-level heading comes from `PageHeader`.
- Every content area uses a labeled `section` with a logical `h2`.
- Projects are a semantic list with one clear Project-name link per item.
- Status and access are written text with a visible badge marker, not color-only state.
- Research lens and description use `dir="auto"` for multilingual content.
- Source order matches keyboard order and narrow-screen reading order.

## 8. Simplicity choices

The slice adds one concrete `ProjectList`, one pure ordering helper, and one content stylesheet. Overview sections remain direct page markup. It adds no dashboard/widget/card registry, presentation engine, analytics layer, provider, dependency, or per-Project enrichment query.

## 9. Deferred features

- Project creation, because the application context exposes no global create capability.
- Project search/status filters, because the current accessible collection is small and browser scanning is sufficient.
- Recent Notes/Materials, recommendations, charts, metrics, scheduling, and Project counts, because the accepted contracts do not provide them.
- Full Project workspace modules and actions.

## 10. Stage 17.4 handoff

Stage 17.4 should replace only `/app/projects/:projectId` with the Project workspace shell using `getProjectWorkspace(actor, projectId)`. It should preserve these access labels and capability-driven Library visibility while leaving deep module functionality for later slices.
