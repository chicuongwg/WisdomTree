# Stage 16.5B — Final UI Interaction Blueprint Result

## 1. Result

**PASS — final internal UI interaction blueprint completed; Stage 17 not implemented.**

The accepted Concept A + B direction is now one implementation-ready architecture covering navigation, creation, search, Overview, Project workspaces, Note/evidence, Materials/extraction, Activities/Tasks/My Work, People, Tempo circulation, publication, localization, multilingual research content, responsive/accessibility behavior, interaction states, capability rendering, components, and ordered Stage 17 slices.

A coherent static prototype was created under `docs/ui-concepts/final/`. It uses synthetic data, no APIs, no framework, and no production imports.

## 2. Approved design direction

Final baseline:

```text
Concept A — Project Workspace
→ shell, global IA, Project context/navigation, Overview, work, Tempo, responsive behavior

Concept B — Research Studio patterns
→ optional inspector, Evidence Picker, Material representation, Person context, collection preview
```

Concept C remains a future optional wide-screen mode for Notes, Materials, or Search. It is not part of Stage 17 baseline.

The approved direction maps cleanly to Stage 16. No Space/Branch exposure, new domain relation, ownership change, additional UI locale, or production route replacement is required.

## 3. Final global IA

```text
TMKT
├── Overview
├── Projects
├── My Work
├── People
└── Search

Global accelerators
├── + New
└── Quick Search / Command
```

Favorites and a persistent Recents section are deferred. Quick Search may show authorization-checked recent objects.

## 4. Global navigation model

Desktop uses a quiet AppHeader, text-labeled global sidebar, and main route. Expanded sidebar is approximately 224–256 px; collapsed form approximately 56–64 px. Account and locale controls sit in the utility area, not primary research navigation.

Active navigation uses shape/text/`aria-current`, not color alone. Medium widths collapse the sidebar. Narrow widths use a labeled drawer. `Ctrl/Cmd+K` opens Quick Search; Escape closes the topmost transient surface and restores trigger focus.

No icon-only mystery navigation, giant tree, Favorites, or permanent Recents.

## 5. Project workspace/navigation model

Every Project route begins from `getProjectWorkspace(actor, projectId)` and renders only returned modules/capabilities.

```text
Project name / status / concise lens
Overview | Notes | Materials | Activities | Tasks | People | Library?
```

- Wide: full horizontal navigation, optionally sticky in compact form.
- Medium: active/high-priority labels plus visible `More`/overflow.
- Narrow: Project picker plus module selector.
- Library appears only for a capability-enabled Project.
- Activities/Tasks are absent for research-only Core outsiders.
- Project switch preserves module only when destination exposes it; otherwise it lands on Overview with a plain-language access explanation.

No second permanent local sidebar.

## 6. Create/Quick Search model

### `+ New`

- Inside Project: `New in {Project}` shows only Note, Material, Activity, Task, and Person actions authorized by server capabilities.
- Outside Project: choose confirmed Project, then a permitted object. Project is never guessed.
- Recent Projects may assist selection but are reauthorized.

### Quick Search

One dialog provides recent authorized objects, Project/Note/Material/Person navigation, full-search entry, and safe commands. It uses Stage 16 internal research search for queries and never returns Tasks, Activities, private drafts, loans, or legacy records.

It is a compact interaction over the same search foundation—not a second search product.

## 7. TMKT Overview

TMKT Overview answers where to go and what needs the actor:

- `My active work`: assigned Task and active Activity counts from operational memberships;
- `Projects`: operational Projects first, readable research Projects after;
- `Continue research`: entry to Search/Quick Search recents only.

Stage 16 does not expose a detailed recent-research feed, so no recent Notes/Materials dashboard was invented. Core-readable-only Projects never show operational Task/Activity data. There are no vanity metrics.

## 8. Note/editor/inspector model

One canonical Note surface has Reader and Editor modes:

- Reader shows official internal content/version and capability-driven actions.
- Editor shows the actor's author-private Project draft, title/summary/Markdown, optional purpose, inline save state, and optional preview.

Inspector is closed by default and may remember section/open state per surface. Note sections: Context, Evidence, Metadata, History, Publication. History browsing/compare is deferred until a target facade exists.

Focus mode hides shell/tabs/inspector while retaining Project identity, private/official state, save state, evidence access, and a visible exit. It does not require browser full-screen.

Autosave states are `Unsaved`, `Saving…`, `Saved`, `Failed`, and `Conflict`. No repetitive success toast. Version conflict preserves local content and offers compare/reload/reapply; it never silently overwrites.

## 9. Evidence workflow

```text
Draft
→ Add evidence
→ current Project by default / readable cross-Project scope
→ Materials or Notes
→ inspect exact version
→ select
→ attach
```

User-facing items are `Material · title · Version n · Project` and `Note · title · Version n · Project`. Internal IDs are secondary implementation data. Inaccessible and legacy/projectless research is absent. Duplicate exact relations are disabled/idempotent; self-support is rejected.

Evidence remains version-specific internal supporting research. It is not automatically a public citation. Candidate extraction lineage remains separate.

Stage 17 needs a narrow application DTO wrapper/read composition for evidence version choice; raw support-service exports remain server-side.

## 10. Material/extraction workflow

Material is one object with Overview, files/versions, optional physical copy, extraction, and authorized research usage.

Add Material progressively collects required title, optional description, optional file, and optional physical representation where capability permits. Metadata-only physical-first Material remains valid.

```text
Material
→ add scan/photo/PDF as a new version
→ upload/processing
→ extraction ready
→ review
→ create author-private Project working Note
```

The user never chooses Space, Branch, scope, or a new Project during evolution. Object-storage keys are never exposed. Extraction retry/queue UI is deferred because Stage 16 exposes evolution/state but no target retry/review queue.

## 11. Activity/Task/My Work workflow

Activity is a contextual research/work workspace with summary, People, Materials, Tasks, and resulting official Notes. It is not a calendar event; no unsupported scheduling fields or private-draft relations appear.

Project Tasks use an accessible list baseline; an optional board is a client view over the same Task IDs/states. Project ownership is immutable. Activity links must remain same-Project.

My Work contains assigned Project Tasks and non-cancelled Activities from operational memberships only. It excludes Core-readable-only Projects. Activities are not date-grouped because Stage 16 exposes no schedule.

## 12. People model

Global People and Project People show canonical research Persons, not accounts or Project access members. Duplicate display names remain valid. A Person appears once globally with authorization-filtered Project contexts.

Person detail prioritizes identity/summary and visible Project contexts. Activities appear only if the actor may operationally read them and a safe composition exists. Account linkage and raw roles remain hidden.

Stage 17 must add a narrow explicit Person-edit capability before showing Edit and compose Project names server-side; current detail returns Project IDs.

## 13. Search model

Full Search supports exactly:

```text
All | Projects | Notes | Materials | People
Project facet: authorized confirmed Projects
```

Query/type/Project facet are URL state. Results use explicit kind, title, summary, score order, and visible Project context. No purpose/publication/date/tag/status facets, snippets/highlights, operational entities, or semantic search were invented.

Quick Search and Full Search use the same internal service but separate transient/navigation and persistent/exploration interactions. Public search remains a separate Stage 14/13 source set and is not part of this internal UI.

## 14. Tempo Library model

Tempo remains an ordinary Project. Library is a conditional local module focused on physical holdings, requests, active loans, returns, and operator administration. Research Material browsing stays in Materials.

- Core alone: research Material access, no loan list/action.
- Manager alone: manage operators, no circulation action.
- Operator with current membership: supported circulation transitions.
- Manager + operator: both.

Because `modules.library` represents Project capability rather than operational loan access, Stage 17 must gate loan data/actions separately using named operator/manager capabilities. Operator grant requires a narrow eligible-member picker adapter before UI implementation.

## 15. Publishing model

Publication Inspector states:

- Never published
- Published · up to date
- Published · changes not public
- Unpublished · previous revision retained

Internal edits never change public content automatically. `Publish changes` creates/switches immutable public revision; unchanged publish is a no-op; unpublish removes availability without deleting identity/history. Only explicit Core sees publish/unpublish actions, including Core without Project membership. Public history browsing is deferred until a facade exists.

No Proposal, second-person approval, or WikiRelease terminology.

## 16. VI/EN interface strategy

The shell, dialogs, validation, statuses, accessible names, and dates/numbers use locale message catalogs for `vi` and `en`. Locale persists through the Stage 16 preference and does not duplicate routes or translate research content.

Layouts reserve approximately 30–40% label expansion and avoid uppercase Vietnamese/English-only abbreviations. Final proposed vocabulary is documented with confidence and explicit review flags.

## 17. Multilingual content/typography

One editor preserves arbitrary valid Unicode. Chrome and research content use separate fallback strategies. Research uses content direction independently from the LTR vi/en shell.

- default user content `dir="auto"`, with a later manual override where needed;
- bidi isolation around mixed user text;
- comfortable 65–75 Latin-character reading measure;
- script-aware line height;
- separate monospace handling for code;
- safe Markdown rendering;
- Hán-Nôm/supplementary-plane corpus and installed-font testing before coverage acceptance.

No single-font full-Unicode claim is made.

## 18. Responsive/accessibility model

Wide: global sidebar, horizontal Project tabs, main content, optional inspector.

Medium: collapsed/drawer global navigation, labeled tab overflow, inspector overlay/drawer.

Narrow: mobile header/drawer, Project/module selectors, single main column, full-sheet inspector/Picker, master/detail lists. No three-pane squeeze.

Stage 17 acceptance includes skip link, landmarks, headings, keyboard paths, visible focus, dialog containment/restoration, live save/upload state, error summary, icon+text status, reduced motion, touch targets, 200% zoom/reflow, table/list semantics, and `dir="auto"` tests.

## 19. Component architecture

The blueprint defines explicit families including AppShell, GlobalSidebar, AppHeader, ProjectHeader/Nav/Picker, CreateMenu, QuickSearch, ContextInspector, FocusMode, resource primitives, NoteEditor/Reader/SaveStatus, EvidenceList/Picker, Material/Physical/Extraction panels, ActivitySummary, TaskList/Board, PersonSummary, PublicationPanel, LibraryLoanList, LocaleSwitcher, and dialogs/states.

Server Components perform initial facade reads. Client islands handle search dialogs, editor/autosave, Picker, upload, inspector/focus state, Task interaction, dialogs, and transitions. Thin adapters/server actions call the facade. No global client store or universal entity/editor/relation abstraction is prescribed.

## 20. Stage 17 implementation slices

Ordered plan:

1. UI foundation/tokens/localization
2. App shell/navigation
3. TMKT Overview/Projects
4. Project workspace shell
5. Notes/reader/editor/inspector
6. Evidence workflow
7. Materials/extraction
8. Activities
9. Tasks/My Work
10. People
11. Full Search
12. Tempo Library
13. Publication/Core actions
14. Responsive/accessibility/regression hardening

Each slice lists explicit application-contract gaps and independent acceptance criteria in `stage-17-implementation-plan.md`.

## 21. Human decisions still unresolved

Interaction architecture is final. Remaining decisions are terminology/content acceptance, not redesign:

- Vietnamese label for People/Person;
- `Tư liệu` versus `Nguồn tư liệu`;
- `Nhiệm vụ` versus another Task term;
- humanities wording for Evidence/Synthesis/supporting research;
- Unpublish/unpublished wording;
- Library operator and research/work access labels;
- product-owner Hán-Nôm/RTL corpus and supported deployment font environments.

## 22. Prototype artifacts

`docs/ui-concepts/final/index.html` is a standalone static review prototype with:

- approved Project Workspace shell;
- TMKT/Project/Note/Material/Extraction/Activity/Task/My Work/People/Search/Library states;
- VI/EN global shell toggle;
- multilingual research content;
- Quick Search, Create, Evidence Picker dialogs;
- Inspector open/closed and Focus mode;
- responsive wide/medium/narrow behavior.

It is explicitly labeled prototype-only, uses synthetic data, and has no API/framework/production imports.

## 23. Production-code diff confirmation

Stage 16.5B changes are limited to documentation and the isolated static prototype under `docs/**`. No `src/app`, production component/CSS/route, service, schema, migration, seed, test, or domain behavior was modified. Pre-existing cumulative working-tree changes were preserved.

## 24. Recommended next stage

**Stage 17 — New Internal UI Implementation**, following the ordered slices and the Stage 16 application facade. The new UI must be built in parallel with the old UI.

Full replacement remains separately gated:

```text
new UI built and reviewed
→ regression/responsive/accessibility review
→ Sol states: "Chuẩn bị chuyển toàn bộ UI"
→ product owner explicitly confirms
→ only then cutover
```

WAITING FOR HUMAN APPROVAL TO BEGIN STAGE 17
