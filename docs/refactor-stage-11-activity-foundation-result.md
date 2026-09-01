# Stage 11 — Project Activity Foundation Result

## 1. Result

**PASS.** Activity is now a first-class, confirmed-Project-owned domain object with explicit Person, Task, Material, and internal Note context. No routes, UI, Calendar integration, Hybrid Core behavior, seed rewrite, or inferred data backfill was added.

## 2. Activity identity/model

`activities.id` is a stable UUID. `activities.project_id` is mandatory and references `projects.project_id`, so an arbitrary Team or Personal Space cannot own a target Activity.

The minimal persisted model is:

- title;
- optional free-text `activity_type`;
- optional summary;
- status;
- creator and timestamps;
- optimistic version.

The service boundary provides `createProjectActivity`, `getActivity`, `listProjectActivities`, and `updateActivity`. Creation defaults to `planned`, is transactional with its audit record, and update requires `expectedVersion`. There is no Activity delete service.

## 3. Type/lifecycle decision

`activity_type` is normalized optional text, not a PostgreSQL enum. Empty values are rejected and the stored label is capped at 80 characters, leaving interdisciplinary Activity types open.

Status is constrained to `planned`, `active`, `completed`, or `cancelled`. It is descriptive rather than a workflow lock: a completed Activity remains editable by an authorized contributor.

## 4. Person participant model

`activity_people` is an explicit Activity-to-Person relation with an optional free-text `role_label`. The composite foreign keys require both:

- the Activity to belong to the recorded Project; and
- the Person to already have `project_people(Project, Person)`.

Adding a participant does not create a Person, attach that Person to the Project, create a User, create `space_members`, or grant authorization. Duplicate attachment is idempotent. Removing the relation never deletes the canonical Person.

## 5. Task relation

`tasks.activity_id` is nullable and references the Activity together with `tasks.project_id`. The composite database foreign key rejects a Project A Task attached to a Project B Activity. Existing project-less/demo Tasks remain unassociated.

`createProjectTask` now accepts optional `activityId`. `attachTaskToActivity` and `detachTaskFromActivity` preserve the Task ID and Project ownership; detach clears only `activity_id`. Ordinary Task updates still cannot change Project or Activity ownership.

## 6. Material relation

`activity_materials` explicitly relates an Activity to stable `Source.id`. A composite foreign key requires `Activity.project_id == Source.space_id`, and the service also resolves the Source through the same confirmed Project.

The relation is Activity workspace context, not version-specific research support. Removing it does not delete or copy the Material. Stage 9 `Note -> SourceVersion` evidence remains separate.

## 7. Note relation

`activity_notes` explicitly relates an Activity to stable `TreeNode.id`. Its composite foreign key requires the authoritative Note Project to equal the Activity Project. Project-less demo Nodes and cross-Project Nodes are rejected.

This relation represents an Activity-associated internal outcome/context. It neither creates evidence support nor alters Stage 9 support relations. Private `NodeDraft` association is deliberately not implemented.

## 8. Project consistency invariants

The database, not only service code, enforces:

- Activity Project is a confirmed Project;
- Activity participant already belongs to the same `project_people` context;
- Activity Material is owned by the same Project/Space;
- Activity Note has the same authoritative Project;
- Activity Task has the same authoritative Project.

Composite reference targets required narrow unique keys on `(sources.id, sources.space_id)` and `(tree_nodes.id, tree_nodes.project_id)`. Relationship primary keys prevent duplicates.

Deletion behavior is explicit: Project and Task-to-Activity references use `RESTRICT`; Activity-owned relation rows may cascade only if a future controlled Activity deletion occurs; linked Person, Source, and TreeNode rows are never cascaded from Activity relations.

## 9. Authorization separation

Stage 11 adds compatibility permissions only:

- `project.activity.read`: Project viewer or higher;
- `project.activity.manage`: Project contributor or higher.

Space membership remains the authorization source. Activity participants are never authorization principals. Global roles were not reinterpreted as TMKT Core, and the approved Hybrid Core policy remains unimplemented.

## 10. Calendar boundary

No date/time engine, Google OAuth, Google Event ID, synchronization, invitations, reminders, recurrence, or availability model was added. Activity owns research/work context; Google Calendar remains the future scheduling boundary.

## 11. Schema/migration

Migration: `drizzle/0043_activity_foundation.sql`.

It creates `activities`, `activity_people`, `activity_materials`, and `activity_notes`; adds nullable `tasks.activity_id`; adds the required foreign keys, checks, uniqueness constraints, and lookup indexes; and performs no data backfill.

Audit actions implemented:

- `activity.create`, `activity.update`;
- `activity.person.add`, `activity.person.remove`;
- `activity.material.add`, `activity.material.remove`;
- `activity.note.add`, `activity.note.remove`;
- `task.activity.attach`, `task.activity.detach`.

Audit details contain identifiers and changed-field names, not Activity summaries or Note/Material bodies.

## 12. Existing demo-data preservation

Normal `wisdomtree` before migration:

```text
spaces=7
projects=1
tasks=2
tree_nodes=34
sources=36
persons=0
project_people=0
latest migration=0042_person_foundation.sql
```

Normal `wisdomtree` after migration:

```text
spaces=7
projects=1
tasks=2
tree_nodes=34
sources=36
persons=0
project_people=0
activities=0
activity_people=0
activity_materials=0
activity_notes=0
tasks with activity_id NULL=2
latest migration=0043_activity_foundation.sql
```

Both existing Task IDs remain unchanged and have `project_id = NULL`, `activity_id = NULL`. Source and TreeNode row fingerprints were unchanged:

```text
sources  30872ee2f9ecdf44341cf2072411c2af
nodes    ffeac6fc3161e2a8f91cc7e785e79659
```

No Activity or relationship was inferred from Tasks, Deadlines, Materials, Notes, Persons, or audit history.

## 13. Tests executed

All stateful tests used explicitly named isolated databases protected by `TEST_DATABASE_URL`; the temporary databases were disposed afterward.

```text
npx tsx tests/integration/z-activity-foundation.test.ts
PASS

npm run test:integration
PASS — 15 files

npm run test:usecase
PASS — 3 files

npm run test:privacy
PASS — 2 files

npm test
PASS — lint, typecheck, 8 unit files, boundaries, signing, time, contrast

npm run build
PASS — Next.js 15.5.22 production build, 35 static pages

git diff --check
PASS
```

The first sandboxed `npm test` attempt was blocked before unit execution because `tsx` could not create its IPC socket (`EPERM`). The same canonical command passed outside that sandbox restriction; this was not a repository test failure.

## 14. Files changed

Stage 11 files:

- `drizzle/0043_activity_foundation.sql`
- `src/modules/activity/schema.ts`
- `src/modules/activity/service.ts`
- `src/modules/auth/authorize.ts`
- `src/db/schema.ts`
- `src/modules/pm/schema.ts`
- `src/modules/pm/service.ts`
- `src/modules/storage/schema.ts`
- `src/modules/knowledge/schema.ts`
- `tests/integration/z-activity-foundation.test.ts`
- `docs/refactor-stage-11-activity-foundation-result.md`

Accepted Stage 1–10 and test-isolation changes remain present and were not reverted or cleaned.

## 15. Compatibility gaps

- No Activity routes, UI, Project workspace composition, or Board filtering exists yet.
- No Calendar integration or scheduling fields exist.
- Activity Notes support official internal `TreeNode` only, not private drafts.
- Existing demo Tasks remain project-less and Activity-less.
- Deadlines remain separate and are not attached to Activities.
- Hybrid Core and cross-Project research authorization are not implemented.
- No destructive Activity deletion boundary exists.

## 16. Recommended Stage 12

Implement the **Hybrid Core and Project authorization foundation** as one narrow authorization slice: introduce explicit TMKT research-curation capabilities for cross-Project discovery/read, curation, and later publication while keeping Tasks, Activities, participant management, and Project administration dependent on explicit Project membership. Do not include public publishing, UI/navigation, Calendar integration, or seed rewrite.
