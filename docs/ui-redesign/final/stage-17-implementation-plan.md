# Stage 17 implementation plan

## Delivery rule

Build the replacement internal UI in parallel with the old UI. Each slice is independently testable and capability-safe. No slice authorizes cutover.

## 17.1 — UI foundation, tokens, and localization

Scope:

- target route-group shell scaffolding without replacing legacy routes;
- semantic color/spacing/type tokens compatible with light/dark;
- vi/en message catalogs, locale persistence, date/number formatting;
- shared status, loading, empty, error, dialog, and focus primitives;
- multilingual content fixture and directionality tests.

Acceptance: no production-domain change; both locales render; Unicode probe round-trips; baseline accessibility primitives pass.

## 17.2 — App shell and navigation

Scope:

- AppShell, header, five-destination sidebar, narrow drawer;
- Quick Search trigger shell and account/locale utilities;
- skip link, active navigation, collapse behavior;
- no Favorites or persistent Recents.

Acceptance: keyboard/zoom/responsive shell passes; old UI remains independently reachable.

## 17.3 — TMKT Overview and Projects

Scope:

- consume `getTmktOverview` and `listAppProjects`;
- operational counts separate from research-readable Project entry;
- Projects list/access labels/status/lens;
- omit create-Project action until a global named capability is exposed.

Acceptance: Core-only Projects show no Tasks/Activities; no invented recent-research data or metrics.

## 17.4 — Project workspace shell

Scope:

- ProjectHeader, picker, adaptive horizontal navigation;
- `getProjectWorkspace` module/capability rendering;
- Project Overview using supported metadata and safe module composition;
- global `+ New` Project choice and capability-aware actions.

Acceptance: current Project always obvious; Project switch never enters unavailable module; Space/Branch absent.

## 17.5 — Notes, reader/editor, inspector

Scope:

- official/draft collection, reader, private draft editor;
- autosave/save/conflict recovery;
- optional inspector, focus mode, purpose metadata;
- thin mutation adapters/server actions over Stage 16.

Dependencies/gaps:

- collection purpose/group filtering is client-local over the complete returned list initially; pagination/server filtering requires a narrow facade later;
- history/compare UI must wait for a target version-history facade; do not reach legacy routes directly.

Acceptance: private drafts remain author-only; conflict never overwrites; inspector closed by default; arbitrary Unicode works.

## 17.6 — Evidence workflow

Scope:

- EvidenceList and Picker;
- exact Material/Note version selection and cross-Project readable scope;
- attach/remove and provenance expansion.

Dependency: add narrow application DTO wrappers/read composition for evidence search/version choices; raw service reexports stay server-side.

Acceptance: no inaccessible results, duplicates, self-support, or context-loss loop; exact versions traceable.

## 17.7 — Materials and extraction

Scope:

- Materials collection/detail, versions/download, upload progress;
- metadata-only creation and add version;
- extraction state and candidate-to-draft transition.

Dependencies/gaps:

- no rename/withdraw/folder UI;
- no extraction retry until target facade exists;
- extraction review uses available candidate/extraction data only; no invented queue.

Acceptance: one Material identity, no storage keys, no Branch/Project choice during evolution.

## 17.8 — Activities

Scope:

- collection/detail and supported metadata;
- People/Material/Note relations and Tasks display;
- no Calendar/scheduling or private-draft relation.

Dependency: wrap raw relation mutations in target delivery DTO/error adapters.

Acceptance: same-Project invariants and operational membership preserved.

## 17.9 — Tasks and My Work

Scope:

- Project Task list/detail/create/update/Activity link;
- accessible list baseline, optional client board over same returned Task IDs;
- My Work Tasks/Activities with Project context.

Acceptance: Core-only Projects absent from work; ownership immutable; version conflict rolls back optimistic state.

## 17.10 — People

Scope:

- global and Project People list, Person detail, create/attach/update as authorized.

Dependencies/gaps:

- compose Project names for detail server-side;
- add explicit Person edit capability before showing Edit;
- no detach/account-link/public profile.

Acceptance: Person ≠ User/member; duplicate names valid; visible contexts authorization-filtered.

## 17.11 — Full Search

Scope:

- Quick Search result integration and Full Search workspace;
- type + Project facets only;
- URL state, result navigation, optional preview.

Acceptance: no private/legacy/operational results; Core revocation changes scope; no client-side authorization filtering.

## 17.12 — Tempo Library

Scope:

- conditional Project tab, loan list/transitions, physical Material links;
- operator roster for managers.

Dependency: narrow eligible Project-member picker adapter for operator grants.

Acceptance: Core alone sees no loans/actions; manager alone manages roster but cannot circulate; operator scope is Project-specific.

## 17.13 — Publication/Core actions

Scope:

- Publication inspector states, first publish/republish/no-change/unpublish;
- stable slug input and confirmation.

Gaps: no public revision history browser until a facade exists; roster administration is separate administration work, not normal shell navigation.

Acceptance: official Note only, Core capability only, public state never tracks internal edits automatically.

## 17.14 — Responsive/accessibility/regression hardening

Scope:

- end-to-end VI/EN label stress, narrow master/detail, drawers;
- keyboard/screen-reader/zoom/reduced-motion/contrast;
- privacy and capability regression suite;
- legacy/new parallel-route regression review.

Acceptance: all Stage 17 criteria below pass; no cutover.

## Stage 17 measurable acceptance criteria

### Product model

- Zero target UI labels/routes/forms expose Space, Branch, Personal/Team ownership, global Library/Board, WikiRelease, or Proposal.
- Every creation flow shows or selects one confirmed Project without guessing.

### Navigation

- Current Project name is visible in every Project route and Focus mode.
- Project switching preserves a module only when the destination exposes it.
- Five global destinations are keyboard accessible and correctly indicate active route.

### Research workflow

- A contributor can create/edit a private Project draft and attach/trace exact evidence without repeated full-page navigation.
- Material shows metadata, versions, physical state, and extraction as one identity.
- Candidate evolution never asks for Project/Branch/scope.

### Privacy/authorization

- Core outsider sees official Project research and publish action only where eligible.
- Core outsider sees zero other-author drafts, Tasks, Activities, loans, or create/manage actions.
- Capability UI is driven by server DTOs, not client role interpretation.

### Bilingual/multilingual

- All target chrome and accessibility messages exist in vi/en with no clipped primary navigation at supported widths.
- Unicode acceptance corpus survives edit/save/read/copy/publish without replacement characters.
- Hán-Nôm missing-glyph behavior is tested and documented rather than claimed complete.

### Responsive/accessibility

- No three-pane squeeze on narrow viewport; Inspector/Picker becomes a labeled sheet.
- Keyboard-only shell, create, search, Note save/conflict, evidence, and dialog flows succeed.
- Skip link, landmarks, headings, focus restoration, live states, 200% zoom/reflow, reduced motion, and non-color status checks pass.

### Reliability

- Autosave displays Unsaved/Saving/Saved/Failed/Conflict accurately.
- Version conflicts never silently overwrite.
- Upload/extraction/publication/circulation never claim success before authoritative response.

## Cutover gate

After all slices and regression/responsive/accessibility reviews, Sol must explicitly tell the product owner:

```text
Chuẩn bị chuyển toàn bộ UI
```

Only an explicit product-owner confirmation after that message authorizes full cutover. Until then old and new UI remain available in parallel.
