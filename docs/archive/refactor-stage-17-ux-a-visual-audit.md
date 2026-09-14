# Stage 17.UX-A — Production UI Visual & Layout Audit

## 1. Audit verdict

**BROWSER VISUAL AUDIT BLOCKED.** No finding in this report is claimed as observed in a browser. The documented local production-test endpoint was not listening during this audit, and a direct Playwright Chromium launch failed because `libglib-2.0.so.0` is unavailable. This matches the Stage 17.V browser-runtime limitation.

The source-level audit finds a coherent set of likely visible defects rather than isolated pixel issues: the shared wide container does not become wide; Project modules apply competing page insets; Project People duplicates the Project identity; task metadata has a broken flex direction; Notes Inspector has accumulated too much dense content; and the tablet, public, Account, and Graph surfaces each break the target visual system in different ways.

Counts: **P0 0 · P1 8 · P2 9 · P3 1**.

## 2. Worker usage

Main worker: Codex Terra Extra High.

Luna Max workers used: 3 read-only scouts.

- Shell, responsive behavior, Account, and public presentation.
- Project workspace, module alignment, tasks, and Library.
- Notes, Materials, Activities, People, Search, and Graph.

No worker edited a source file.

## 3. Browser coverage

| Viewport | Result |
| --- | --- |
| 1440 × 900 | Not visually inspected — browser blocked |
| 1280 × 800 | Not visually inspected — browser blocked |
| 768 × 1024 | Not visually inspected — browser blocked |
| 390 × 844 | Not visually inspected — browser blocked |
| Approximately 200% zoom | Not visually inspected — browser blocked |

The configured Playwright base URL is `http://localhost:3000`; `GET /api/health` could not connect during the main audit. Playwright Chromium exited before opening a page with the missing-library error above. No host package, browser-security setting, deployment, database, or source file was changed to work around this.

**OBSERVED IN BROWSER:** none.

**SOURCE-LEVEL RISK:** all findings below.

## 4. Global visual-system findings

- The declared `wide` content band cannot exceed the standard 64rem inline size, despite an 80rem wide token. This is the highest-leverage desktop whitespace/alignment issue.
- The target UI has a useful spacing token set, but page CSS adds separate 1100px, 300px, 420px, 900px, 44rem, 46rem, and 48rem rules. Those independent thresholds produce incompatible layout changes.
- Page title and content framing vary materially: standard/wide containers, Project module padding, and nested containers produce different left edges for related screens.
- Equivalent content is contained at different levels: simple entity lists are cards, Activity detail is four cards, Material extraction is a card within a card, and Account can contain legacy tables inside new surfaces.
- Typography is generally token-based in the shell, but Notes metadata, Inspector labels, and Search type labels rely on 12px or bare `small` treatments; metadata can become more numerous than its hierarchy supports.

## 5. Route-by-route findings

### UXA-01

ID: UXA-01
Route: `/app`, `/app/projects`, all routes using `PageContainer width="wide"`
Viewport: 1440 × 900; 1280 × 800
Severity: P1
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: The base container sets `inline-size: min(100% - 2rem, var(--ui-width-standard))`; the `wide` variant only changes `max-inline-size`. Its 80rem maximum therefore never overrides the inherited 64rem inline cap.
Why it matters: Desktop pages intended to use the wider workspace retain a narrow canvas and create excess outer whitespace. The same defect prevents a predictable wide alignment system.
Likely component/CSS: `src/app/components/ui-next/styles.css:354-369`.
Recommended repair direction: Correct the shared container-width contract before tuning individual pages.

### UXA-02

ID: UXA-02
Route: `/app/projects/:projectId` modules
Viewport: all; most apparent at desktop/tablet
Severity: P1
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: Module wrappers have incompatible insets: Notes has a separate 1100px wrapper, Materials is flush to its parent, and Activities/Tasks add 32px internal padding.
Why it matters: Sibling workspace pages will not share left edges, header starts, card widths, or density, making one Project read as independently implemented modules.
Likely component/CSS: `projects/[projectId]/layout.tsx:18-31`; `notes.css:4-11`; `materials.css:2-8`; `activities-tasks.css:1-6`.
Recommended repair direction: Establish one local Project-module content/header inset and use it for all modules.

### UXA-03

ID: UXA-03
Route: `/app/projects/:projectId/people`
Viewport: all
Severity: P1
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: The Project shell already renders the Project name as its `h1`; Project People then renders another `PageHeader` using that Project name and nests a second wide `PageContainer`.
Why it matters: The page has ambiguous title hierarchy and a unique double gutter, unlike every other Project module.
Likely component/CSS: `project-header.tsx:30-35`; `people-directory.tsx:51-57`; `projects/[projectId]/layout.tsx:18-30`.
Recommended repair direction: Keep Project People inside the existing workspace content frame and use a module-level heading.

### UXA-04

ID: UXA-04
Route: `/app/projects/:projectId/tasks`; `/app/my-work`
Viewport: 390 × 844; 768 × 1024; long task metadata
Severity: P1
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: The task text wrapper is a flex row without `flex-direction: column`; the title and the `small` assignee/date/Activity line therefore become sibling flex items.
Why it matters: Titles, dates, Activity context, and status can sit on a shared baseline or wrap poorly, directly damaging task scanning and narrow-view readability.
Likely component/CSS: `activities-tasks.css:8-18,46-83`; `tasks-view.tsx:219-239`; `my-work-view.tsx:7-10`.
Recommended repair direction: Repair the shared task-row text stack and its long-content wrapping once for both screens.

### UXA-05

ID: UXA-05
Route: Note reader/editor/Inspector
Viewport: desktop; 768 × 1024; long evidence/provenance lists
Severity: P1
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: A fixed 300px Inspector combines Context, Metadata, Publication, Evidence, and Provenance. It has repeated bordered evidence rows, actions, and activity context, without a viewport-height treatment. The drawer threshold is only 900px, leaving a compressed 901–1024px range after the shell rail consumes width.
Why it matters: The Inspector can dominate editing context, compete with publication/editing controls, and make the editor uncomfortably narrow before it becomes a drawer.
Likely component/CSS: `note-inspector.tsx:143-372`; `note-workspace.tsx:103-110,275-297`; `notes.css:107-120,314-384,525-597`.
Recommended repair direction: Treat Inspector priority, containment, height, and its responsive handoff as one coordinated repair.

### UXA-06

ID: UXA-06
Route: `/app/projects/:projectId/activities/:activityId`
Viewport: desktop and tablet
Severity: P1
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: Participants, Materials, Notes, and Tasks render as four equal bordered cards in a two-column grid. An empty Tasks section adds `EmptyState`'s surface inside that card.
Why it matters: The page can read as four unrelated widgets rather than one Activity record; empty content gains disproportionate visual weight.
Likely component/CSS: `activity-workspace.tsx:53-70`; `activities-tasks.css:116-160`; `feedback/states.tsx:10-16`.
Recommended repair direction: Re-establish one Activity detail hierarchy and one empty-section treatment while preserving the existing sections.

### UXA-07

ID: UXA-07
Route: `/app` global shell
Viewport: 768 × 1024 and compact desktop at or below 1024px
Severity: P1
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: At 64rem the sidebar becomes an icon-only 4rem rail and hides brand/navigation labels. The menu trigger remains hidden until 44rem, leaving tablet/touch users with hover/focus-only visual labels.
Why it matters: This is a navigation discoverability break at a common tablet width; it also makes the shell look sparse while the header loses visible product context.
Likely component/CSS: `shell.css:307-354`; `shell.css:356-403`; `shell/navigation.tsx:14-21`.
Recommended repair direction: Reconcile the compact rail and drawer breakpoints, with an explicit tablet affordance.

### UXA-08

ID: UXA-08
Route: `/p`; `/p/:slug`
Viewport: all, especially 390 × 844 reading
Severity: P1
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: Public routes render only a bare legacy `main.page`, with no public presentation boundary. The published detail uses `MarkdownView`'s `ui-next-markdown-view`, but its rules live in `notes.css`, imported by the nested `/app` layout rather than the public route; its `--ui-*` token scope is also absent.
Why it matters: Published headings, tables, code, admonitions, and reading rhythm can fall back to browser/global defaults, and the public surface has no coherent branded reading frame.
Likely component/CSS: `p/page.tsx:13-41`; `p/[slug]/page.tsx:15-27`; `app/layout.tsx:3-11`; `markdown-view.tsx:183`; `notes.css:423-488`.
Recommended repair direction: Add a public-route presentation boundary for identity, search, and reading typography without changing public information architecture.

### UXA-09

ID: UXA-09
Route: Materials list/detail
Viewport: 390 × 844; 768 × 1024; long filenames
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: Detail can contain a bordered Material panel, a bordered/sunken extraction candidate, and a further bordered Markdown preview. Titles, version rows, and original filenames lack a common long-label shrink/wrap rule.
Why it matters: The review state becomes fragmented and long research filenames can push badges, metadata, or controls into awkward wrapping.
Likely component/CSS: `material-detail.tsx:217-323`; `materials.css:46-53,69-72,145-189`.
Recommended repair direction: Reduce only redundant containment and define one long-content row behavior for Material identity/version rows.

### UXA-10

ID: UXA-10
Route: `/app/projects/:projectId/library`
Viewport: desktop, tablet, and long holding/borrower values
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: Holding rows, selected detail, and every loan item use the same bordered rounded card treatment; borrower/title/code values do not have explicit narrow-content protection, while detail metadata remains two columns below tablet width.
Why it matters: Browsing and operator circulation actions have equal visual weight, and realistic long values risk awkward wrapping or overflow.
Likely component/CSS: `library.css:27-49,51-100,102-143`; `library-view.tsx:139-251`.
Recommended repair direction: Clarify the browse/detail/circulation hierarchy and add focused narrow-content behavior before local visual polish.

### UXA-11

ID: UXA-11
Route: `/app/people`; `/app/people/:personId`; `/app/search`
Viewport: all; search controls at 390 × 844
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: People and Search reuse Project card styling for unrelated entities. Search identifies Note/Material/Activity/Person/Project only with a bare tiny `small` label; Person detail uses bare headings/lists inside surfaces without the local resets that Project cards receive.
Why it matters: Entity type, identity, and metadata scan poorly, while browser-default list/heading margins can produce visibly inconsistent card interiors.
Likely component/CSS: `people-directory.tsx:80-95`; `people/[personId]/page.tsx:18-37`; `research-search-view.tsx:27-61`; `overview-projects.css:46-93`.
Recommended repair direction: Locally consolidate equivalent entity-row/card interiors and elevate result type without creating a universal component framework.

### UXA-12

ID: UXA-12
Route: `/app/graph`
Viewport: desktop, tablet, and mobile
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: The route combines target `PageHeader`/`PageContainer` with legacy global graph classes, global colors, `.field`, and `.secondary` controls. Its 16rem settings panel is an absolute canvas overlay until the 44rem breakpoint.
Why it matters: Graph can look like an embedded foreign application and the controls can cover a material share of the canvas at tablet widths.
Likely component/CSS: `graph/page.tsx:25-53`; `knowledge-map/index.tsx:733-851`; `graph-settings-panel.tsx:123-334`; `globals.css:1846-2056,2081-2137`.
Recommended repair direction: Integrate Graph chrome and canvas controls in one local visual pass; preserve graph physics and interaction behavior.

### UXA-13

ID: UXA-13
Route: `/app/account`, including loading/error states
Viewport: all; 390 × 844
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: The page wraps legacy profile, notification, calendar, form, table, and error/loading components in target `PageHeader`/`Surface` primitives. Legacy `.field`, `.button`, `.button-row`, `table.list`, and legacy `main.page` states coexist with the new control/surface style.
Why it matters: Control height, label styling, border radius, and containment can diverge within one route; notification content can become a card inside a card.
Likely component/CSS: `account/page.tsx:25-77`; `account-profile.tsx:61`; `notification-prefs.tsx:41`; `account.css:41-103`; `globals.css:838-960`; `account/loading.tsx:3`; `account/error.tsx:13`.
Recommended repair direction: Normalize only the Account child controls, table containment, and route-local feedback states to the target shell.

### UXA-14

ID: UXA-14
Route: global target UI; Notes; Materials; Activities/Tasks; Library
Viewport: 768 × 1024; 390 × 844; approximately 200% zoom risk
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: Responsive changes occur at unrelated thresholds: 900px for Inspector, 44rem for shell/project/materials, 46rem for Tasks/Activities, and 48rem for Library. Notes additionally uses literal 1100px, 300px, 420px, and 70vh values outside the spacing/width scale.
Why it matters: Adjacent features change layout at different moments, making the product appear to jump between independently designed breakpoints.
Likely component/CSS: `shell.css:307-403`; `project-workspace.css:126-155`; `notes.css:4-11,107-113,284-327,525-529`; `activities-tasks.css:166-183`; `library.css:145-153`.
Recommended repair direction: Audit responsive thresholds and one-off dimensions as a bounded consistency pass; do not introduce a new token system in this stage.

### UXA-15

ID: UXA-15
Route: Project header; Library; Activity context; Notes Evidence picker
Viewport: tablet/mobile with long names
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: Several horizontal title/control rows lack `min-inline-size: 0`, text overflow handling, or a small-screen stack: Project identity versus badges, Library values, Activity rows with Remove actions, Evidence headers, and Evidence version labels.
Why it matters: Long Vietnamese/English/Unicode titles, person names, or filenames can collide with actions, displace badges, or force horizontal overflow.
Likely component/CSS: `project-workspace.css:20-45`; `library.css:51-75,120-143`; `activities-tasks.css:141-156`; `notes.css:689-700,727-746`.
Recommended repair direction: Define a shared long-content pattern for the equivalent row types and validate it with representative data.

### UXA-16

ID: UXA-16
Route: Notes list/Inspector/Evidence picker
Viewport: all; narrow and 200% zoom risk
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: Note list metadata, Inspector section labels/URLs, evidence subtitles, and picker project labels are commonly 12px (`xs`) or bare `small`; the Inspector adds uppercase letter-spaced headings and repeated nested borders.
Why it matters: Research provenance becomes visually dense and secondary metadata competes with readable content rather than supporting it.
Likely component/CSS: `notes.css:98-103,342-384,552-597,651-704`.
Recommended repair direction: Rebalance Inspector/Evidence typography and containment together after resolving its width/responsive behavior.

### UXA-17

ID: UXA-17
Route: `/p`
Viewport: 1440 × 900; 390 × 844
Severity: P2
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: The public search form and results have no public-specific layout classes; the page relies on generic global form and raw list rules.
Why it matters: Search lacks prominence and result-type/project context has weak separation; the vertical form becomes unnecessarily tall on mobile.
Likely component/CSS: `p/page.tsx:17-40`; `globals.css:810-878`.
Recommended repair direction: Give public search field width, action alignment, result spacing, and metadata a local presentation treatment without changing public IA.

### UXA-18

ID: UXA-18
Route: `/app/account`
Viewport: 390 × 844 with long display name/email
Severity: P3
Observed / Source-risk: SOURCE-LEVEL RISK
Problem: The profile row combines a fixed 4.5rem avatar with an unconstrained text flex item and does not set a text-column minimum/overflow behavior.
Why it matters: An unusually long identity can crowd the profile form and weaken the mobile rhythm.
Likely component/CSS: `account.css:11-39,105-112`; `account/page.tsx:32-51`.
Recommended repair direction: Constrain and test the profile text column with representative long identity strings.

## 6. Responsive/accessibility presentation findings

- **P1 — UXA-07:** tablet navigation has no persistent labels or drawer trigger once the rail collapses.
- **P1 — UXA-04 and UXA-05:** task metadata and the pre-drawer Note workspace are likely to wrap poorly at tablet/narrow widths.
- **P2 — UXA-14 and UXA-15:** independent breakpoints and unprotected long rows are reflow risks; browser 200% validation remains outstanding.
- **P2 — UXA-16:** 12px metadata, uppercase Inspector labels, and dense rows are readability risks at zoom.
- **P2 — UXA-12:** Graph's absolute panel can obscure the canvas before the mobile layout puts it into normal flow.

No contrast failure is reported here: existing contrast checks were not reinterpreted as browser evidence. No screen-reader, keyboard, or target-size claim is made.

## 7. Root-cause groups

### A. Global container alignment

UXA-01 is the shared wide-container defect. UXA-02 and UXA-03 add local/nested wrappers that amplify it. Repairing the width contract and then establishing one Project-module inset has the highest cross-route leverage.

### B. Page-header and workspace composition drift

UXA-02, UXA-03, and UXA-13 show that PageHeader/Surface primitives coexist with module-specific and legacy layouts. The repair target is consistent composition, not a new component framework.

### C. Dense containment on complex screens

UXA-05, UXA-06, UXA-09, UXA-10, and UXA-13 use borders/cards for adjacent hierarchy levels. Inspector, Activity detail, Material review, Library circulation, and Account should each clarify hierarchy with fewer competing containers.

### D. Row metadata and long-content resilience

UXA-04, UXA-11, UXA-15, and UXA-16 share weak text stacking, tiny metadata, and missing shrink/wrap rules. Address equivalent title/metadata/action rows together.

### E. Responsive-shell discontinuities

UXA-05, UXA-07, and UXA-14 have incompatible thresholds. Shell, Project navigation, Inspector, and module grids need one responsive review before individual mobile polishing.

### F. Surfaces outside the target visual boundary

UXA-08, UXA-12, UXA-13, and UXA-17 retain public/legacy/global style dependencies. Each needs a bounded local presentation alignment; no domain, authorization, route, or workflow change is indicated.

## 8. Route scorecard

Scores are provisional source-derived assessments, not browser observations.

| Route / area | Layout | Hierarchy | Consistency | Responsive |
| --- | --- | --- | --- | --- |
| `/app` Overview | C | B | C | C |
| Projects | C | B | C | B |
| Project shell / Overview | C | B | C | C |
| Notes | C | C | C | D |
| Materials | C | B | C | C |
| Activities | C | C | C | C |
| Project Tasks | C | C | C | C |
| My Work | C | C | C | C |
| People / Project People | C | D | D | C |
| Search | B | C | C | C |
| Library | C | C | C | C |
| Graph | C | C | D | C |
| Account | C | C | D | C |
| Public `/p` | C | C | D | C |

`A` = polished; `B` = solid with minor repair; `C` = visibly unfinished risk; `D` = structurally poor/broken risk.

## 9. Top 10 repair priorities

1. Correct the shared `PageContainer` wide-width contract (UXA-01).
2. Establish one Project-module content inset/header composition and remove the Project People duplicate frame/title (UXA-02, UXA-03).
3. Repair the shared task title/metadata flex stack (UXA-04).
4. Reconcile tablet shell navigation: collapsed rail, labels, header context, and drawer timing (UXA-07).
5. Rework Note Inspector density, height, and responsive handoff as one bounded pass (UXA-05, UXA-16).
6. Restore a public presentation/reading boundary so published Markdown receives its intended styles (UXA-08).
7. Re-establish Activity detail hierarchy and remove nested empty-state containment (UXA-06).
8. Apply a common long-content/action-row resilience rule across Project, Materials, Activity, Library, and Evidence (UXA-09, UXA-10, UXA-15).
9. Align Account child/feedback states with the target primitives and remove double containment (UXA-13, UXA-18).
10. Integrate Graph control chrome with the target shell while preserving physics and read-only behavior (UXA-12).

## 10. Recommended repair batches

### Batch 1 — Shell, container, and responsive foundations

UXA-01, UXA-02, UXA-03, UXA-07, and UXA-14. Verify desktop, tablet, mobile, and 200% zoom in a supported browser before proceeding.

### Batch 2 — Project workspace list/detail consistency

UXA-04, UXA-06, UXA-09, UXA-10, UXA-11, and UXA-15. Work by equivalent row/container types, not by one-off margins.

### Batch 3 — High-complexity Notes and public reading surfaces

UXA-05, UXA-08, UXA-16, and UXA-17. Keep publication/provenance semantics and public information architecture unchanged.

### Batch 4 — Legacy-surface integration polish

UXA-12, UXA-13, and UXA-18. This is visual composition only; retain Graph behavior and Account workflows.

## 11. Product/IA questions

1. Confirm the minimum approved public identity around `/p` and `/p/:slug` (for example, a presentation header and return/search affordance). This is a visual-presentation decision, not a request to change public IA.
2. Confirm whether tablet is expected to support touch-first primary navigation. UXA-07 cannot be considered resolved by hover-only labels if it is.

No audit finding requires a domain-model, authorization, database, route, migration, or workflow change.

## 12. Audit limitations

- No compatible browser could launch, and no production-test URL other than the documented local runner was provided. Browser visual observations, screenshot references, keyboard behavior, real reflow, and 200% zoom are therefore pending.
- The working tree was already dirty with Stage 17 changes before this audit. Those changes were inspected but not modified.
- Data-dependent branches, role-gated controls, empty states, long localized strings, and populated circulation/provenance states were assessed from source only. They require a supported-browser pass with representative data before severity is treated as browser-confirmed.
