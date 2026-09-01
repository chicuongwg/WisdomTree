# Concept B — Research Studio

## Thesis

A research-object studio inspired by Capacities and Zotero. Project remains the ownership boundary, but Notes, Materials, and People are stable objects browsed through a compact object rail, central canvas, and strong contextual inspector. Evidence stays close to writing.

## Interaction architecture

- Global destinations appear in a compact top/left launcher; entering a Project opens its Studio.
- A local object rail replaces horizontal Project tabs: Overview, Notes, Materials, Activities, Tasks, People, conditional Library.
- Central collections use cards/list/table as appropriate; the right inspector is a primary but collapsible work surface.
- Selecting an object preserves the collection behind it; full-screen focus expands only the central object.
- Evidence Picker can occupy the inspector and switch between Materials and Note versions without leaving the draft.

## Strength and deliberate cost

Best at Material/evidence context, canonical Person comprehension, and synthesis continuity. It has a higher learning cost and a harder responsive collapse than Concept A.

## Low-fidelity wireframes

### 1. TMKT Overview

```text
┌──────┬──────────────────────────────┬────────────────────────────┐
│ TMKT │ Today in TMKT                │ Research context           │
│  +   │ [Continue] [Projects]        │ Recently viewed objects    │
│  ◉   ├──────────────────────────────┤ across readable Projects   │
│  P   │ My work (operational)        │ Notes · Materials · People │
│  W   │ Tasks from memberships only  │ Core adds research, not ops│
│  S   ├──────────────────────────────┤                            │
│      │ Project cards with lens      │ [Open full Search]         │
│ VI   │ and last research activity   │                            │
└──────┴──────────────────────────────┴────────────────────────────┘
```

### 2. Projects

```text
┌──────┬───────────────┬───────────────────────────┬───────────────┐
│ TMKT │ Projects      │ Project gallery/list      │ Selected      │
│      │ All readable  │ Tempo                     │ Tempo         │
│      │ Mine          │ NNTT                      │ Research lens │
│      │ Active        │ Project C                 │ Recent objects│
│      │ Completed     │                           │ My access     │
│      │               │ [List | Cards]            │ [Open Studio] │
└──────┴───────────────┴───────────────────────────┴───────────────┘
```

### 3. Project Overview

```text
┌──────┬───────────────┬───────────────────────────┬───────────────┐
│ TMKT │ TEMPO         │ Tempo Studio              │ Project facts │
│      │ Overview   ●  │ Research lens             │ Status active │
│      │ Notes         │                           │ People 12     │
│      │ Materials     │ Continue objects          │ Capabilities  │
│      │ Activities    │ [Note] [Material]         │ Library       │
│      │ Tasks         │ Active Activities/My Work │               │
│      │ People/Library│                           │               │
└──────┴───────────────┴───────────────────────────┴───────────────┘
```

### 4. Project Notes

```text
┌──────┬───────────────┬───────────────────────────┬───────────────┐
│ TMKT │ TEMPO         │ Notes  [Search] [+]       │ Preview       │
│      │ Notes      ●  │ [All][Drafts][Evidence]   │ Selected Note │
│      │ Materials     │ [Synthesis][Published]    │ Purpose       │
│      │ Activities    │                           │ Evidence 4    │
│      │ ...           │ Community memory          │ Version v3    │
│      │               │ Catalogue study           │ Public current│
│      │               │ Reading-room interviews   │ [Open]        │
└──────┴───────────────┴───────────────────────────┴───────────────┘
```

### 5. Note editor/reader

```text
┌──────┬───────────────┬───────────────────────────┬───────────────┐
│ TMKT │ Project Notes │ Community memory          │ EVIDENCE      │
│      │ Drafts        │ Private draft · Saved     │ Search…       │
│      │ Evidence      ├───────────────────────────┤ Materials     │
│      │ Synthesis     │ [Markdown canvas]         │ □ scan v2     │
│      │ Published     │                           │ Note versions │
│      │               │ 漢文 / العربية / English  │ □ Note X v3   │
│      │               │                           │ Attached (4)  │
└──────┴───────────────┴───────────────────────────┴───────────────┘
```

Inspector tabs are Evidence, Metadata, Versions, Publication. Focus mode collapses both side regions and leaves a small Evidence drawer trigger.

### 6. Material detail

```text
┌──────┬───────────────┬───────────────────────────┬───────────────┐
│ TMKT │ Materials     │ Sổ tay 1972               │ REPRESENTATION│
│      │ All           │ Description and metadata  │ Files (2)     │
│      │ Physical      │                           │ v2 processed  │
│      │ Processing    │ Extracted text preview    │ Physical #A21 │
│      │ Used in Notes │                           │ Usage (3)     │
│      │               │ [Review extraction]       │ [Add version] │
└──────┴───────────────┴───────────────────────────┴───────────────┘
```

### 7. Activity detail

```text
┌──────┬───────────────┬───────────────────────────┬───────────────┐
│ TMKT │ Activities    │ Interview — Nguyễn…       │ CONTEXT       │
│      │ Planned       │ Summary/preparation       │ People (2)    │
│      │ Active        │                           │ Materials (3) │
│      │ Completed     │ Resulting Notes           │ Tasks (4)     │
│      │               │ [Open Note]               │ role labels   │
│      │               │                           │ [Add existing]│
└──────┴───────────────┴───────────────────────────┴───────────────┘
```

### 8. Search

```text
┌──────┬───────────────┬───────────────────────────┬───────────────┐
│ TMKT │ Search        │ community memory          │ RESULT PREVIEW│
│      │ Types         │ [Project][Note][Material] │ identity      │
│      │ Project scope │ [Person]                  │ visible Project│
│      │ Purpose       │ Results ranked by text    │ context       │
│      │               │ 1 Note · Tempo            │ metadata      │
│      │               │ 2 Material · Tempo        │ [Open object] │
└──────┴───────────────┴───────────────────────────┴───────────────┘
```

## Responsive behavior

- Wide desktop: four regions only when preview/inspector is useful; otherwise compact launcher + local rail + canvas.
- Medium: global launcher and local rail merge into one drawer; inspector becomes a right drawer.
- Narrow: collection → object drill-in; evidence uses a full-height sheet and retains draft/save state.

## Risks to validate

- Users may mistake object categories for global ownership unless Project identity is constantly visible.
- Permanent multi-pane cues can intimidate occasional collaborators.
- Activity/Task coordination is less immediately legible than in Concept A.
- Inspector state and focus behavior require careful keyboard and screen-reader design.
