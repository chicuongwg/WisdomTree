# Activity, Task, and My Work specification

## Activities collection

Activity is a Project workspace, not a calendar event.

Default list groups by `planned`, `active`, and `completed`; `cancelled` is available through a filter or collapsed group. Fields are limited to supported DTO data: title, free-text type, status, updated time. Do not invent schedule/timezone fields.

Controls:

- local text filter;
- status filter;
- create action only with `canCreateActivity`;
- row activation opens canonical detail.

## Activity detail

```text
Activity title · free-text type · status                    [Edit]
Summary/context
─────────────────────────────────────────────────────────────────
People              Materials             Tasks
participants        same-Project links    same-Project work
─────────────────────────────────────────────────────────────────
Resulting internal Notes
```

Progressive layout:

1. summary/context and status;
2. People with optional role labels;
3. Tasks as preparation/coordination work;
4. Materials;
5. resulting official Notes.

Add/remove controls appear only with Activity mutation capability. Pickers only return same-Project eligible objects. Removing a relation never deletes the Person, Material, Task, or Note.

No private draft association is shown: Stage 11/16 do not support it. No Calendar affordance is implied.

## Activity participants

- `Add Person` searches canonical Persons already attached to the Activity's Project.
- If a new Person is needed, leave the Activity flow and use Project Person creation, or offer a clearly separate capability-aware create flow that first creates/attaches the canonical Person through Stage 16.
- Activity role label is contextual free text.
- Participation never means account access or Project membership.

## Project Tasks

Baseline list columns:

```text
Title | State | Assignee | Due date | Activity
```

- List supports accessible inline state/assignee/due-date updates when expected version is available.
- Board is an optional view grouped only by supported Task state.
- Drag/drop is a client enhancement; every move has a keyboard/menu equivalent and uses optimistic concurrency.
- Task Project ownership is immutable and not editable.
- Activity association may be attached/detached only within the same Project.

Task detail may be a collection-preserving preview on wide screens, with a stable full route/dialog for deep link and narrow screens. It shows title, state, assignee, dates, notes, Activity, and version conflict state.

## Task creation

From Project Tasks: Project is fixed. From Activity: Project and Activity are fixed. From global `+ New`: choose Project before form. Fields: title required; assignee, start, due, notes, Activity optional. Assignee picker contains eligible Project members only.

## My Work

My Work is a global operational aggregation from `getMyWork`:

```text
My Work
├── Tasks assigned to me
└── Non-cancelled Activities from operational Projects
```

Default tabs: Tasks, Activities. Each item shows Project context. Group Tasks by Project or state; “Today/upcoming” is allowed only when due dates are present and date semantics are explicit. Activities cannot be grouped by date because the domain exposes no schedule.

Core-readable-only Projects are excluded. Empty state says `No assigned Project work right now`, not `No research access`.

## States and errors

- Inline Task mutation pending: disable only the affected control, retain context.
- Task version conflict: revert optimistic visual state, show `Task changed elsewhere`, reload current data, let user retry.
- Relation invalid state: explain same-Project requirement without exposing inaccessible target metadata.
- Activity becomes unavailable: non-disclosing route state; return to Project Overview/Activities.
- Board/list empty: capability-aware creation action only when authorized.

## Responsive

- Task table becomes a structured list; fields remain labeled.
- Board may horizontally scroll with keyboard-accessible columns, but list remains the narrow default.
- Activity sections stack; related objects open through full-screen sheets/master-detail.
