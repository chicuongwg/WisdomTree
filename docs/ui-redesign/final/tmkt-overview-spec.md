# TMKT Overview and Projects specification

## TMKT Overview

Primary questions:

1. Where should I go?
2. What needs my attention?
3. What research might I continue?

Stage 16 currently returns confirmed Projects plus counts for assigned Tasks and active Activities. It does not return a cross-entity recent-research feed. Therefore Stage 17 baseline must not invent detailed recent Notes/Materials on Overview without a later facade addition.

### Baseline hierarchy

```text
TMKT Overview
├── My active work
│   ├── Assigned Task count → My Work
│   └── Active Activity count → My Work
├── Projects
│   ├── operational Projects first
│   └── research-readable Projects after
└── Continue research
    └── link to Search / Quick Search recents, not invented server recency
```

Operational and research areas are labeled. Core-readable-only Project cards never show Task/Activity counts.

### States

- No operational work: say `No assigned work right now`; retain Projects and Search access.
- No Projects: explain no readable confirmed Project; no create action unless `canCreateProject` becomes part of a future application context.
- Counts are navigation cues, not KPI charts.

## Projects screen

Default representation: comfortable list with optional compact cards only if user testing supports them. Each row shows:

- name;
- status;
- research lens (two-line maximum);
- `Work access` or `Research access`;
- Library capability label when enabled.

Default sort:

1. operational-member Projects;
2. status order active, paused, completed, archived;
3. stable name order.

Supported baseline controls are local text filtering and status filtering over returned accessible Projects. Do not invent activity metrics. Project creation affordance appears only if Stage 17 receives an explicit server capability; current `ApplicationContext` does not expose one globally, so this remains unavailable in the initial screen specification.

### Empty state

`No Projects are available to you yet.` Provide Search only if it can return accessible research; do not imply that any user may create a Project.

## Project Overview

Stage 16 workspace returns Project metadata, capabilities, and module availability, but not recent Notes/Materials or module summaries in one composed DTO. Initial priority:

1. name, status, research lens, optional description;
2. module entry cards for available modules;
3. capability-aware primary action (`New Note` for contributors, none for research-only viewers);
4. concise access explanation for research-only Core outsiders.

Detailed recent Notes, Materials, Activities, My Tasks, and People may be introduced only by composing existing authorized module reads server-side or adding a narrow overview facade. They must not produce client-side N+1 waterfalls.

```text
┌────────────────────────────────────────────────────────────┐
│ Project name · status                         [+ New]       │
│ Research lens                                              │
│ Overview Notes Materials Activities Tasks People Library?  │
├────────────────────────────────────────────────────────────┤
│ What this Project investigates                             │
│ description / research lens                                │
├───────────────────────┬────────────────────────────────────┤
│ Continue research     │ Continue work                      │
│ Notes / Materials     │ Activities / Tasks (members only)  │
└───────────────────────┴────────────────────────────────────┘
```

No progress percentage, vanity metric, global operational feed, or Project analytics dashboard.
