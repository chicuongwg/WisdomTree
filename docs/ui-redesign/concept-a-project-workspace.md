# Concept A — Project Workspace

## Thesis

An approachable Project-first workspace inspired by the interaction strengths of Linear and Dovetail. The global shell is stable, each Project has horizontal local navigation, and detail appears in a collapsible inspector. This is the clearest default for mixed-frequency collaborators.

## Interaction architecture

- Persistent global sidebar: TMKT Overview, Projects, My Work, People, Search.
- Project header: display name, research lens, local tabs, contextual `+ New`.
- Lists are the default; Tasks may switch between list and board without duplicating Tasks.
- Selecting a list item opens full detail by default; quick preview is available but secondary.
- Inspector is closed by default on reading/writing surfaces and remembers a per-user preference.
- Focus mode reduces shell to a compact Project breadcrumb, save state, evidence control, and exit.

## Strength and deliberate cost

Best at discoverability, Project coordination, responsive collapse, and implementation clarity. Evidence synthesis is strong through a drawer/picker but less continuously visible than in Concepts B/C.

## Low-fidelity wireframes

### 1. TMKT Overview

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ TMKT   + New │ Good morning · Where should you go?       Search │
│ Overview  ●  ├───────────────────────────────────────────────────┤
│ Projects     │ NEEDS YOU            CONTINUE RESEARCH            │
│ My Work      │ 3 tasks across 2     Recent Notes / Materials     │
│ People       │ member Projects      from readable Projects       │
│ Search       ├───────────────────────────────────────────────────┤
│              │ YOUR PROJECTS        CORE RESEARCH (research only)│
│ Recent       │ Tempo · active       NNTT · recent official Notes │
│ • Tempo      │ NNTT · active        No Tasks/Activities exposed  │
│ Account / VI │                                                   │
└──────────────┴───────────────────────────────────────────────────┘
```

The Core panel is research discovery, never a cross-Project operational feed.

### 2. Projects

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ Global nav   │ Projects                         [Search] [Filter]│
│              │ [All] [Mine] [Active]                            │
│              ├───────────────────────────────────────────────────┤
│              │ Tempo Library & Community Space          Active  │
│              │ Preserves, connects and activates materials…     │
│              │ My access: contributor · Library available       │
│              ├───────────────────────────────────────────────────┤
│              │ NNTT                                     Active  │
│              │ Research lens…                                   │
└──────────────┴───────────────────────────────────────────────────┘
```

### 3. Project Overview

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ Global nav   │ Tempo                              [+ New] [•••] │
│              │ Overview Notes Materials Activities Tasks People │
│              │ Library                                            │
│              ├───────────────────────────────────────────────────┤
│              │ RESEARCH LENS                                     │
│              │ How TMKT preserves, organizes…                    │
│              ├──────────────────────┬────────────────────────────┤
│              │ Continue research    │ Active Activities          │
│              │ Recent Notes/Material│ My Tasks                   │
│              └──────────────────────┴────────────────────────────┘
└──────────────┴───────────────────────────────────────────────────┘
```

No vanity metrics; every card is a navigational/work continuation.

### 4. Project Notes

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ Global nav   │ Tempo / Notes                    [+ New Note]     │
│              │ Overview Notes Materials Activities Tasks…        │
│              ├───────────────────────────────────────────────────┤
│              │ [Search in Notes] [Purpose ▾] [State ▾] [View ▾] │
│              │ Private drafts (mine)                             │
│              │  • Community archive working note     Saved       │
│              │ Official Notes                                   │
│              │  • Oral histories…  Synthesis  Published-current │
│              │  • Catalogue study   Evidence   Internal          │
└──────────────┴───────────────────────────────────────────────────┘
```

### 5. Note editor/reader

```text
┌──────────┬────────────────────────────────────────┬──────────────┐
│ collapsed│ Tempo / Notes / Community memory       │ Inspector  × │
│ global   │ Private draft · Saved       [Focus]    │ Purpose      │
│          ├────────────────────────────────────────┤ Evidence (4) │
│          │ Community memory and the shared shelf  │ Versions     │
│          │                                        │ Publication  │
│          │ [universal Markdown writing canvas]    │ Metadata     │
│          │ الذاكرة المجتمعية … 漢文 … Tiếng Việt  │              │
│          │                                        │[Add evidence]│
└──────────┴────────────────────────────────────────┴──────────────┘
```

Inspector is optional. In focus mode it becomes an evidence button/drawer, not a permanent third column.

### 6. Material detail

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ Global nav   │ Tempo / Materials / Sổ tay 1972     [Edit] [•••]│
│ Project tabs │ Physical + digital · Available                    │
│              ├───────────────────────────────────────────────────┤
│              │ [Overview] [Files & versions] [Extracted text]    │
│              │ Metadata             Latest file                  │
│              │ Description…         scan-v2.pdf · processed      │
│              │ Physical copy        [Add corrected version]      │
│              │ Shelf/circulation    Research usage (3 Notes)     │
└──────────────┴───────────────────────────────────────────────────┘
```

### 7. Activity detail

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ Global nav   │ NNTT / Activities / Interview — Nguyễn… [Edit]  │
│ Project tabs │ Planned · Interview                               │
│              ├──────────────────────┬────────────────────────────┤
│              │ Context / preparation│ People                     │
│              │ Questions and notes… │ Nguyễn… · interviewee      │
│              │ Materials (3)        │ Tasks (4)                   │
│              │ Resulting Notes (1)  │ [Add existing Person]       │
│              │                      │ Activity ≠ calendar event   │
└──────────────┴──────────────────────┴────────────────────────────┘
```

### 8. Search

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ Global nav   │ Search research                                  │
│ Search    ●  │ [community memory________________________] [Go]  │
│              │ Types [All][Project][Note][Material][Person]      │
│              │ Projects [Readable projects ▾]                    │
│              ├───────────────────────────────────────────────────┤
│              │ NOTE · Tempo · Oral histories…                    │
│              │ MATERIAL · Tempo · Sổ tay 1972                    │
│              │ PERSON · NNTT, Tempo · Nguyễn Văn A               │
└──────────────┴───────────────────────────────────────────────────┘
```

Quick Search uses the same result language but prioritizes navigation and recent items in a compact overlay.

### 9. Tempo Library

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ Global nav   │ Tempo / Library                     [Checkout]   │
│ Project tabs │ Materials remain in Materials; loans live here    │
│ Library   ●  ├───────────────────────────────────────────────────┤
│              │ [Holdings] [Active loans] [Returns]               │
│              │ Search physical holdings…                         │
│              │ Title          Copy     Status       Borrower*    │
│              │ Sổ tay 1972    #A-21    On loan      restricted   │
│              │ ...                                              │
│              │ *Operational data visible only when authorized   │
└──────────────┴───────────────────────────────────────────────────┘
```

Library actions and loan data are capability/authority-driven. Core research read alone exposes Material research metadata, not this operational workspace.

## Responsive behavior

- ≥1100 px: sidebar plus horizontal Project tabs; inspector overlays or occupies a third column when requested.
- 700–1099 px: collapsible sidebar, horizontally scrollable local tabs with `More`, inspector drawer.
- <700 px: shell drawer, Project module selector, single-column master/detail, sticky save/state strip.

## Risks to validate

- Horizontal Project tabs may overflow in Vietnamese or with Library enabled.
- Evidence work may feel one click too far for heavy synthesis users.
- Overview cards must remain purposeful and not become an uncurated dashboard.
