# Stage 17.8 — Activities, Tasks & My Work Result

## 1. Verdict

**PASS** — Project Activities, Project Tasks, optional Task→Activity context, and cross-Project My Work are now target-app workflows. No schema migration or dependency was needed: Stage 11 already supplied the explicit constrained relations.

## 2. Worker usage

- Main worker: Codex Terra High (actual tooling: Codex)
- Luna Max workers used: 0

## 3. Final Activity/Task model

- Activity ownership: `activities.project_id → projects.project_id` in `src/modules/activity/schema.ts`.
- Participants: `activity_people`, constrained to the same `project_people` Project relation.
- Material context: `activity_materials`, constrained to the same Project Material (`sources.space_id`).
- Note context: `activity_notes`, constrained to the same authoritative Project Note (`tree_nodes.project_id`).
- Task context: nullable `tasks.activity_id`; the existing composite FK/trigger constraints preserve `Task.project_id == Activity.project_id`.
- My Work is assembled by `listMyAssignedProjectTasks` in `src/modules/pm/service.ts`, joining only the current User’s live Project memberships; it is not a persisted dashboard or global Board.

## 4. Implemented workflow

- `/app/projects/:projectId/activities` lists and creates Project Activities.
- `/app/projects/:projectId/activities/:activityId` edits Activity metadata/status and manages canonical Person, Material, and official Note context; it shows linked Tasks.
- `/app/projects/:projectId/tasks` creates, assigns, updates, schedules, and optionally links target Project Tasks to an Activity.
- `/app/my-work` groups the current User’s assigned target Tasks by overdue, upcoming, unscheduled, and completed state, always showing Project and compact Activity context.
- Target APIs call only application facades. The shell `+ New` now opens the relevant Project Activity or Task workspace.

## 5. Research provenance context

Activity association is explicit context, not immutable evidence support. Exact SourceVersion/TreeNodeVersion support remains the Stage 9/17.6B model. `getAppActivityWorkspace` composes Activity, canonical participants, same-Project Materials, official Notes, and linked Tasks without exposing private drafts or extraction candidate text.

## 6. Authorization/privacy

- Activity and Task mutations retain Project operational participation checks; TMKT Core research-read alone cannot operate either workspace.
- Activity context only accepts same-Project canonical Persons, Materials, and authoritative internal Notes.
- New target Task assignment validates an active same-Project User both on creation and normal reassignment.
- My Work requires current membership in each Project. No Core-only, Personal, legacy/projectless, or other-user Task is returned.

## 7. UI/routes

New target routes:

```text
/app/projects/:projectId/activities
/app/projects/:projectId/activities/:activityId
/app/projects/:projectId/tasks
/app/my-work
```

Their delivery APIs are under `/api/app/projects/:projectId/{activities,tasks}`. The responsive `activities-tasks.css` reuses the existing UI token system. No legacy Board, calendar engine, generic relationship layer, or new dependency was added.

## 8. Tests/validation

All stateful suites ran on isolated `wisdomtree_test_stage178_20260903`, then that database was dropped.

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run test:unit` | PASS — 18 files, including UI delivery-contract coverage |
| `npm run test:integration` | PASS — 21 files, including Activity/Task/Person/Material/Note composition through application facade |
| `npm run test:usecase` | PASS — 3 files |
| `npm run test:privacy` | PASS — 2 files |
| `npm test` | PASS |
| `npm run test:boundaries` | PASS — 204 delivery files, no direct DB access |
| `npm run build` | PASS — 37 static pages generated |
| `git diff --check` | PASS |

Browser validation: **PENDING Stage 17.V**.

## 9. Files changed

```text
src/modules/pm/service.ts
src/modules/application/activities.ts
src/modules/application/tasks.ts
src/modules/application/overview.ts
src/app/api/app/projects/[projectId]/activities/**
src/app/api/app/projects/[projectId]/tasks/**
src/app/app/projects/[projectId]/activities/**
src/app/app/projects/[projectId]/tasks/**
src/app/app/my-work/**
src/app/components/ui-next/activities-tasks.css
src/app/components/ui-next/localization/locales/{en,vi}.ts
src/app/components/ui-next/shell/create-dialog.tsx
src/app/app/layout.tsx
tests/integration/zzzzzz-application-contract.test.ts
tests/unit/ui-next-activities-tasks-workflow.test.ts
tests/unit/ui-next-overview-projects.test.ts
docs/refactor-stage-17-8-activities-tasks-my-work-result.md
```

No migration was added. The normal local `wisdomtree` database remained unchanged: `projects=1`, `activities=0`, `tasks=2`, `tree_nodes=35`, `sources=37`.

## 10. Remaining risks

- Deep interactive/browser validation is intentionally deferred to Stage 17.V.
- Task editing retains the existing owner-or-assignee compatibility authorization; a broader operational-task policy is not introduced here.
- Activity has no calendar scheduling, deletion UI, or private-draft association. These were intentionally excluded.
