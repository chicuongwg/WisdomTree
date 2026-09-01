# Final information architecture

## Status

Implementation-ready interaction specification for the approved Concept A + B hybrid. This document defines product hierarchy, not production routes or component code.

## Mental model

```text
TMKT
├── Overview
├── Projects
├── My Work
├── People
└── Search

Confirmed Project
├── Overview
├── Notes
├── Materials
├── Activities       operational members only
├── Tasks            operational members only
├── People
└── Library          only when library_circulation is enabled
```

`Space`, `Branch`, Personal/Team ownership, global Library, global Board, WikiRelease, and legacy Proposal are absent from target labels, navigation, URLs, and creation flows.

## Screen hierarchy

```text
Authenticated application
├── TMKT Overview
├── Projects
│   └── Project workspace
│       ├── Overview
│       ├── Notes
│       │   ├── Note reader
│       │   └── Note editor / private working draft
│       │       └── Evidence Picker
│       ├── Materials
│       │   ├── Material detail
│       │   └── Extraction review
│       ├── Activities
│       │   └── Activity detail
│       ├── Tasks
│       ├── People
│       └── Library
├── My Work
├── People
│   └── Person detail
└── Search

Global overlays
├── Create Menu
├── Quick Search / Command
├── Context Inspector or narrow-screen drawer
├── Confirm Dialog
└── Conflict Dialog
```

## Conceptual URL architecture

Stage 17 may adjust the `/app` namespace to Next.js constraints, but must preserve this product shape:

```text
/app
/app/projects
/app/projects/:projectId
/app/projects/:projectId/notes
/app/projects/:projectId/notes/:noteId
/app/projects/:projectId/materials
/app/projects/:projectId/materials/:materialId
/app/projects/:projectId/activities
/app/projects/:projectId/activities/:activityId
/app/projects/:projectId/tasks
/app/projects/:projectId/people
/app/projects/:projectId/library
/app/my-work
/app/people
/app/people/:personId
/app/search
```

Draft editing may use a stable draft child route or mode parameter. It must not expose Branch IDs or Personal/Team scope. Quick Search and inspectors do not need canonical routes, but selected full objects do.

## Global versus Project scope

| Surface | Scope | Product question |
| --- | --- | --- |
| TMKT Overview | mixed, explicitly separated | Where should I go? What needs me? What research can I continue? |
| Projects | confirmed Projects readable to actor | Which research initiative should I enter? |
| My Work | operational memberships only | What Tasks and Activities are mine/in my work context? |
| People | canonical Persons through readable Projects | Who is represented in research I may read? |
| Search | authorized confirmed-Project research | What Project, Note, Material, or Person am I looking for? |
| Project Overview | one confirmed Project | What is this Project and where do I continue? |
| Project modules | one authoritative owner/context | Work and research inside this Project. |

## Cross-Project rules

- Core may discover confirmed Projects and read official Notes, Materials, and Persons across them.
- Core-only access does not reveal Project Tasks, Activities, private drafts, or circulation operations.
- Cross-Project evidence attachment is available only when the actor can mutate the target draft and read the supporting Project.
- My Work never includes Core-readable-only Projects.
- Switching Projects preserves the same module only when that module is available in the destination Project; otherwise land on Project Overview with a short explanation.

## Global accelerators

- `+ New`: Project-required, capability-aware creation.
- `Ctrl/Cmd+K`: recent authorized objects, fast navigation, research query, and safe commands.
- No persistent Favorites or Recents in the baseline shell. Recents exist only in Quick Search.

## Future extension points

- Research Desk may later be a view inside Notes, Materials, and Search.
- Graph may later appear as a secondary related-research/special view.
- Neither enters the baseline global or Project navigation.
