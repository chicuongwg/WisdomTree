# Concept C — Research Desk

## Thesis

A dense desktop research environment modeled on professional reference tools: compact navigator, collection pane, primary reader/editor, and metadata/evidence inspector. It optimizes rapid switching across large Project collections and keyboard-driven synthesis.

## Interaction architecture

- A very compact global/project switcher owns the far-left edge.
- The collection pane changes by desk mode: Notes, Materials, People, Activities, Tasks, Search.
- The main pane reads/edits the selected object; inspector shows versions, evidence, metadata, or relations.
- Command bar and keyboard navigation are primary accelerators, while visible buttons preserve discoverability.
- Focus mode collapses navigator, collection, and inspector to a full-width reading/writing canvas.
- This concept is desktop-first; narrow behavior is explicit master-detail rather than attempting three tiny panes.

## Strength and deliberate cost

Best at large collections, rapid source comparison, and continuous evidence synthesis. It has the highest learning, accessibility, responsive, and implementation risk; it should not become the mandatory experience for occasional collaborators.

## Low-fidelity wireframes

### 1. TMKT Overview

```text
┌──────┬────────────────────┬────────────────────────┬─────────────┐
│ TMKT │ SCOPE              │ ATTENTION / CONTINUE   │ CONTEXT     │
│  +   │ Overview           │ My Tasks               │ Selected    │
│  O   │ Projects           │ Recent research        │ Project lens│
│  P   │ My Work            │ Processing Materials   │ Access type │
│  W   │ People             │ Published changes      │ Open module │
│  S   │ Search             │ (only actor-authorized)│             │
└──────┴────────────────────┴────────────────────────┴─────────────┘
```

### 2. Projects

```text
┌──────┬────────────────────┬────────────────────────┬─────────────┐
│ TMKT │ PROJECT FILTERS    │ PROJECTS               │ PROJECT     │
│      │ Mine / All readable│ Tempo      active      │ Lens        │
│      │ Active / Completed │ NNTT       active      │ Recent      │
│      │ Capability         │ Project C  paused      │ People      │
│      │ Search             │                        │ [Open Desk] │
└──────┴────────────────────┴────────────────────────┴─────────────┘
```

### 3. Project Overview

```text
┌──────┬────────────────────┬────────────────────────┬─────────────┐
│ TMKT │ TEMPO DESK         │ PROJECT BRIEF          │ STATUS      │
│      │ Overview        ●  │ Research lens          │ Active      │
│      │ Notes              │ Recent Note/Material   │ Capability  │
│      │ Materials          │ Active Activity        │ My access   │
│      │ Activities/Tasks   │ My next Task           │ People      │
│      │ People/Library     │ [+ New in Tempo]       │             │
└──────┴────────────────────┴────────────────────────┴─────────────┘
```

### 4. Project Notes

```text
┌──────┬────────────────────┬────────────────────────┬─────────────┐
│ TMKT │ NOTE COLLECTION    │ SELECTED NOTE          │ INSPECTOR   │
│Tempo │ All                │ Community memory       │ Evidence 4  │
│ Notes│ Mine/private       │ Official · v3          │ Versions    │
│      │ Evidence           │                        │ Publication │
│      │ Synthesis          │ reading preview        │ Purpose     │
│      │ Published/stale    │ [Open editor]          │ Metadata    │
└──────┴────────────────────┴────────────────────────┴─────────────┘
```

### 5. Note editor/reader

```text
┌──────┬────────────────────┬────────────────────────┬─────────────┐
│ TMKT │ SOURCE QUEUE       │ SYNTHESIS DRAFT        │ EVIDENCE    │
│Tempo │ scan v2            │ Private · Saved        │ Attached 4  │
│ Note │ evidence Note v3   │                        │ Exact vers. │
│      │ material B v1      │ [Markdown editor]      │ Search/add  │
│      │                    │                        │ Trace path  │
│      │ [filters]          │ [Focus]                │ History     │
└──────┴────────────────────┴────────────────────────┴─────────────┘
```

The source queue is a view of authorized evidence candidates, not another ownership relation.

### 6. Material detail

```text
┌──────┬────────────────────┬────────────────────────┬─────────────┐
│ TMKT │ MATERIALS          │ DOCUMENT / TEXT        │ MATERIAL    │
│Tempo │ title/filter       │ PDF or extracted text  │ Metadata    │
│ Mat. │ Sổ tay 1972     ● │                         │ Versions    │
│      │ Oral history tape │ compare page/text      │ Physical    │
│      │ Catalogue         │ [Create working Note]  │ Usage       │
│      │                    │                        │ Processing  │
└──────┴────────────────────┴────────────────────────┴─────────────┘
```

### 7. Activity detail

```text
┌──────┬────────────────────┬────────────────────────┬─────────────┐
│ TMKT │ ACTIVITIES         │ INTERVIEW — NGUYỄN…   │ ACTIVITY    │
│ NNTT │ Planned / Active   │ Preparation/context    │ People      │
│ Act. │ Interview 01    ●  │                        │ Materials   │
│      │ Field trip 02      │ Resulting Notes        │ Tasks       │
│      │ Workshop 03        │                        │ Role labels │
│      │                    │                        │ Status      │
└──────┴────────────────────┴────────────────────────┴─────────────┘
```

### 8. Search

```text
┌──────┬────────────────────┬────────────────────────┬─────────────┐
│ TMKT │ SEARCH FACETS      │ RESULT LIST            │ PREVIEW     │
│Search│ Project scope      │ Note · Tempo           │ title       │
│      │ Type               │ Material · Tempo       │ summary     │
│      │ Purpose            │ Person · NNTT/Tempo    │ Project(s)  │
│      │ Published state*   │ Project · NNTT         │ metadata    │
│      │                    │ deterministic ranking  │ [Open]      │
└──────┴────────────────────┴────────────────────────┴─────────────┘
```

`*` Internal publication state is relevant only for official Notes the actor may read; no private draft search.

## Responsive behavior

- ≥1280 px: full desk with user-resizable collection/inspector within tested limits.
- 900–1279 px: compact navigator plus either collection or inspector, toggled without losing selection.
- <900 px: single-pane collection/detail stack; focus canvas for editor; context in sheets.

## Risks to validate

- Dense panes can obscure the simple Project mental model and overwhelm newcomers.
- Resizing, focus order, screen-reader landmarks, and narrow-width adaptation are costly.
- TMKT Overview and coordination workflows feel like a research console rather than an inviting workspace.
- Persistent previews can expose sensitive metadata if query authorization is not applied before result rendering.
