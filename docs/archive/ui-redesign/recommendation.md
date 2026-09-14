# Recommended direction

## Recommendation: deliberate A + B hybrid

Use **Concept A's Project Workspace as the default shell** and integrate a limited set of **Concept B's Research Studio interactions**. Do not adopt Concept C as the universal shell.

### Take from Concept A

- Stable global navigation: TMKT Overview, Projects, My Work, People, Search.
- Clear Project header and adaptive horizontal local navigation.
- One context-aware `+ New`.
- Approachable lists and purposeful Overview pages.
- Explicit separation of research access from operational access.
- Strong responsive collapse and simple focus order.
- Conditional Tempo Library inside the ordinary Project shell.

### Take from Concept B

- Optional contextual inspector with domain-specific tabs.
- Evidence Picker/drawer beside a synthesis draft.
- Material as one object with files/versions, physical copy, extraction, and usage.
- Collection-preserving preview for search and large research lists.
- Canonical Person preview with only readable Project contexts.

### Defer from Concept C

- A high-density `Research Desk` can later be offered as a user-selected Notes/Materials/Search view on wide screens.
- Do not make three panes, resizable splitters, or a source queue prerequisites for Stage 17.
- Do not expose Graph or spatial whiteboards in primary navigation.

## Proposed global IA

```text
TMKT
├── Overview          where should I go / what needs me
├── Projects          confirmed Project discovery
├── My Work           my authorized Tasks across Projects
├── People            canonical Persons through readable Projects
└── Search            full internal research discovery

Global accelerators
├── + New             context/capability aware
├── Quick Search      Ctrl/Cmd+K
└── Recent/Favorites  optional, collapsed, never a second tree
```

TMKT Overview must keep two scopes visually separate:

- operational attention from Projects where the actor participates;
- research continuation/discovery from readable Projects, including Core access.

## Proposed Project navigation

Default wide layout:

```text
Project name and research lens
Overview | Notes | Materials | Activities | Tasks | People | Library?
```

Adaptive rules:

- Wide: horizontal tabs because the set is bounded and Project context stays visible.
- Medium: scrollable tabs with a named `More` menu; never icon-only overflow.
- Narrow: one Project-module selector plus a drawer.
- Library appears only for a capability-enabled Project.

The inspector is not Project navigation. It belongs to the selected Note, Material, Person, or publication state.

## Initial Stage 17 slice after approval

Stage 17 should implement only a non-destructive target shell and one end-to-end read-oriented slice against Stage 16 contracts:

1. AppShell + bilingual global navigation;
2. Projects list and Project Overview;
3. adaptive Project navigation;
4. capability-shaped empty/loading/error states;
5. no legacy UI deletion or broad module implementation.

Note editor, evidence, Material intake, Activities, Tasks, Library, publication, and full Search should be subsequent vertical slices with focused usability checks.

## Human decisions required

1. Approve the A + B hybrid, or select pure A/B/C.
2. Approve horizontal Project navigation as the wide default.
3. Choose whether the contextual inspector starts closed (recommended) or remembers its last state globally.
4. Confirm global `+ New`: outside Project, should it always ask for a Project (recommended)?
5. Approve an optional future Research Desk mode rather than a three-pane default.
6. Review Vietnamese vocabulary flagged in `multilingual-ui-content.md`, especially People, Materials, Tasks, Evidence/Synthesis, Core, and Library operator.
7. Confirm whether Recents and Favorites belong in the first target shell or a later convenience slice.
8. Provide a real Hán-Nôm/RTL acceptance corpus and deployment-platform font inventory before typography implementation is accepted.

No production UI work should start until these decisions are recorded.

WAITING FOR HUMAN UI DIRECTION SELECTION
