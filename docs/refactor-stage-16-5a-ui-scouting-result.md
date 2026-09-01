# Stage 16.5A — UX/UI Scouting & Concept Blueprint Result

## 1. Result

**PASS — design/research deliverables complete; no production implementation performed.**

Three materially different interface architectures were developed and evaluated against all 21 required workflows. The recommendation is a deliberate hybrid: Concept A supplies the default Project-centric shell and coordination model; selected Concept B patterns supply evidence, Material, Person, and contextual-inspector interactions. Concept C is retained as a possible later high-density research mode, not the universal shell.

Human direction selection is required before any replacement UI implementation.

## 2. Current UX constraints retained

The blueprint preserves behavior, not the existing layout:

- autosave with explicit saving/saved/failure states;
- optimistic concurrency and deliberate conflict recovery;
- author-private Project drafts;
- immutable version/provenance awareness;
- safe Markdown preview/rendering;
- upload/extraction progress and recoverable errors;
- keyboard navigation, command/search, focus restoration, and Escape behavior;
- skip link, landmarks, visible focus, live announcements, dialog focus containment, reduced motion, and zoom/reflow support;
- stable privacy/non-disclosure and capability-shaped actions;
- light/dark compatibility.

## 3. Current UX structures rejected

The replacement UX must not use these as primary product concepts:

- Personal/Team auto-switch navigation;
- Space or Branch ownership choices;
- Branch-first Note creation/browsing;
- global Library as a peer to Project;
- global Board as Task ownership;
- overlapping search products;
- WikiRelease and Proposal as universal publication concepts;
- raw database/service names or raw authorization roles.

No legacy code was deleted. These are target-UX decisions only.

## 4. External product/pattern scouting

Scouting was pattern-based, not style copying:

- Dovetail supports Project-bounded research, quick retrieval, and in-document research references ([Projects](https://docs.dovetail.com/help/projects), [Search](https://docs.dovetail.com/help/search), [Project docs](https://docs.dovetail.com/help/projects/docs)).
- Linear supports stable Project overview/navigation, context-preserving detail, and multiple views over the same work identity ([Project overview](https://linear.app/docs/project-overview), [board layout](https://linear.app/docs/board-layout), [Search](https://linear.app/docs/search)).
- Zotero supports high-throughput collection/list/detail browsing and separates item identity from collection organization ([collections and tags](https://www.zotero.org/support/collections_and_tags)).
- Capacities supports stable typed research objects and contextual properties without requiring objects to become Project ownership ([content types](https://docs.capacities.io/reference/content-types)).
- Notion demonstrates multiple filtered views over the same items and optional side-peek detail ([views, filters, and sorts](https://www.notion.com/help/views-filters-and-sorts)); its blank-canvas/property sprawl is intentionally rejected.
- Heptabase demonstrates cards and sources on optional visual whiteboards ([product overview](https://heptabase.com/)); spatial/Graph interaction remains secondary because Project is WisdomTree's primary context.

The detailed problem/relevance/do-not-copy matrix is in `docs/ui-redesign/stage-16-5a-scouting.md`.

## 5. Design principles

1. Project before module.
2. Ownership, organization, privacy, evidence, Activity context, and publication remain separate dimensions.
3. Simple default; advanced research context appears progressively.
4. Same object identity may appear in multiple authorized views.
5. One global create entry, contextualized by confirmed Project and server capabilities.
6. Quick Search retrieves/navigates; full Search supports research exploration.
7. Quiet chrome and constrained reading measure protect content focus.
8. Inspector is optional and contextual, never a permanent penalty on writing width.
9. Focus mode preserves save state and evidence access while hiding surrounding chrome.
10. Accessibility and privacy are structural acceptance gates, not later decoration.

## 6. Global IA

Recommended global information architecture:

```text
TMKT
├── Overview
├── Projects
├── My Work
├── People
└── Search

Accelerators
├── + New
├── Quick Search / Command
└── Recent / Favorites (optional, collapsed)
```

TMKT Overview answers where the actor should go. It separates:

- operational attention from actual Project memberships;
- research continuation across readable Projects, including explicit Core research access.

It must not expose another Project's Tasks/Activities merely because the actor is Core.

## 7. Project navigation alternatives

### Horizontal tabs

Strongest for a bounded, stable module set and occasional collaborators. It makes Project context obvious, but needs named overflow behavior for vi/en labels and conditional Library.

### Compact local sidebar

Strong for large research collections and persistent object context. It costs width and risks looking like another hierarchy.

### Controlled three-pane desk

Strongest for source comparison and keyboard-heavy synthesis. It carries the highest learning, accessibility, responsive, and implementation cost.

### Recommendation

Use adaptive horizontal Project navigation in the default shell. Use an object-specific inspector/drawer within modules. Consider the dense desk only as an optional later view for wide-screen Notes/Materials/Search.

## 8. Concept A

**Project Workspace (Linear × Dovetail)**

- stable global sidebar;
- horizontal Project navigation;
- contextual `+ New`;
- list/board where semantically useful;
- inspector closed by default;
- clean focus mode;
- strongest TMKT orientation, coordination, My Work, Tempo Library, accessibility, and responsive behavior.

Trade-off: heavy evidence work is one drawer/action farther away than the research-first concepts.

Full wireframes: `docs/ui-redesign/concept-a-project-workspace.md`.

## 9. Concept B

**Research Studio (Capacities × Zotero)**

- Project-owned stable research objects;
- local object rail;
- collection + canvas + contextual inspector;
- Evidence Picker adjacent to writing;
- Material representations shown as one identity;
- strongest balanced Material/evidence/Person workflow.

Trade-off: greater pane literacy, weaker operational overview, and more difficult responsive behavior.

Full wireframes: `docs/ui-redesign/concept-b-research-studio.md`.

## 10. Concept C

**Research Desk (controlled professional three-pane model)**

- compact navigator;
- collection/source queue;
- central reader/editor;
- persistent context/evidence inspector;
- dense keyboard-driven work over large collections;
- strongest rapid comparison and advanced synthesis.

Trade-off: highest learning, accessibility, responsive, and implementation risk. It is unsuitable as the only default for occasional collaborators.

Full wireframes: `docs/ui-redesign/concept-c-research-desk.md`.

## 11. Workflow comparison

All concepts were scored against all 21 required workflows and 13 quality dimensions using a 1–5 qualitative rubric.

The meaningful result is categorical rather than a fake-precision total:

- **A leads:** entry/orientation, Project choice, quick capture, Activity/Task coordination, Core operational separation, Tempo circulation, My Work, accessibility, and responsive behavior.
- **B leads:** physical/digital Material coherence, extraction review, evidence attachment/tracing, and balanced research-object understanding.
- **C leads:** dense source switching, large collections, and keyboard-heavy synthesis, but scores worst for onboarding/responsive/implementation risk.

Full matrix and reasoning: `docs/ui-redesign/workflow-evaluation.md`.

## 12. Bilingual UI strategy

- UI chrome supports Vietnamese and English only for this target stage.
- Research content language remains independent.
- Layouts reserve expansion space and do not depend on English abbreviations.
- Locale affects interface labels/dates/accessibility names, never stored research translation.
- Proposed vi/en vocabulary is documented and unresolved terms are flagged rather than silently finalized.

Human review is especially required for Vietnamese labels for People, Materials, Tasks, Evidence/Synthesis Notes, Core, and Library operator.

## 13. Multilingual research-content/editor strategy

- One universal editor/reader supports arbitrary valid Unicode; no language-specific editors.
- Application chrome uses a compact system sans fallback.
- Research content uses a broader script-aware fallback strategy and later `:lang(...)`/direction-aware validation.
- Unicode character support is not the same as font glyph coverage ([Unicode core specification](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-2/)).
- Hán-Nôm/supplementary-plane coverage must be verified with deployment fonts and a product-owner corpus; no completeness claim is made.
- vi/en shell stays LTR; user content uses `dir="auto"` plus manual override and bidi isolation testing.
- Research reading targets a comfortable 65–75-character Latin measure with script-appropriate line height; editor and preview metrics should remain close.
- Code has an isolated monospace strategy; Markdown rendering stays behind the safe rendering boundary.

Detailed strategy and synthetic probes: `docs/ui-redesign/multilingual-ui-content.md`.

## 14. Accessibility/responsive strategy

- Preserve semantic landmarks, skip navigation, visible focus, logical focus order, live statuses, focus-contained dialogs, and reduced motion.
- All pointer actions have keyboard equivalents; shortcuts supplement visible controls.
- Status never relies on color alone.
- At medium widths, global navigation collapses and Project tabs overflow with text labels.
- At narrow widths, inspector becomes a drawer and multi-pane collections become master/detail navigation.
- Focus mode retains a clear exit, Project context, save state, and evidence affordance.
- Multi-pane concepts require explicit screen-reader landmarks, pane titles, resizing limits, and focus restoration before implementation acceptance.

## 15. Recommended direction

Adopt a deliberate hybrid:

```text
Concept A default shell
+
Concept B contextual research interactions
```

Specifically:

- A: global IA, Project header/tabs, create model, Overview, My Work, Activities/Tasks, Tempo Library, responsive shell.
- B: contextual inspector, Evidence Picker, Material representation panel, Person context, collection-preserving preview.
- C: defer as an optional later Research Desk view, not a baseline shell.

This combination makes Project ownership understandable without sacrificing evidence-intensive research work.

## 16. Open human decisions

1. Approve the A + B hybrid, or select A, B, or C alone.
2. Approve adaptive horizontal Project navigation as the wide default.
3. Confirm whether the contextual inspector starts closed (recommended) and remembers state per surface.
4. Confirm that global `+ New` outside a Project asks the actor to choose a Project rather than guessing.
5. Decide whether Recents/Favorites enter the first shell or a later convenience slice.
6. Approve optional future Research Desk mode rather than a mandatory three-pane shell.
7. Review the flagged Vietnamese product vocabulary.
8. Supply a real Hán-Nôm/RTL typography acceptance corpus and deployment platform/font targets.

## 17. Files created

- `docs/refactor-stage-16-5a-ui-scouting-result.md`
- `docs/ui-redesign/stage-16-5a-scouting.md`
- `docs/ui-redesign/interaction-principles.md`
- `docs/ui-redesign/workflow-evaluation.md`
- `docs/ui-redesign/concept-a-project-workspace.md`
- `docs/ui-redesign/concept-b-research-studio.md`
- `docs/ui-redesign/concept-c-research-desk.md`
- `docs/ui-redesign/multilingual-ui-content.md`
- `docs/ui-redesign/recommendation.md`

No static HTML prototype was created. The Markdown wireframes are sufficient for the human direction gate and avoid premature visual-system commitment.

## 18. Confirmation that production UI was untouched

Stage 16.5A created documentation only. It did not modify production routes, application pages, navigation, CSS, React components, database schema/data, seeds, services, or domain behavior. Pre-existing cumulative Stage 1–16 working-tree changes were preserved.

WAITING FOR HUMAN UI DIRECTION SELECTION
