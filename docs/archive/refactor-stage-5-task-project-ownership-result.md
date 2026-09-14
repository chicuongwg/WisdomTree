# Stage 5 — Task Project Ownership Result

Date: 2026-09-01 (Asia/Ho_Chi_Minh)

## 1. Result

**PASS**

Tasks now support authoritative ownership by one confirmed Project. New target-product Tasks use a Project-aware service boundary; the existing global Board path remains compatible and creates `legacy_unassigned` Tasks.

The two existing local Tasks were not assigned, copied, renamed, or otherwise updated. No route or UI changed.

## 2. Schema migration

Migration: `drizzle/0038_task_project_ownership.sql`

The migration:

- adds nullable `tasks.project_id`;
- adds `tasks_project_id_projects_project_id_fk` referencing `projects.project_id` with `ON DELETE RESTRICT`;
- adds `tasks_project_id_idx` for Project-scoped lookup;
- performs no `INSERT`, `UPDATE`, backfill, or semantic inference.

The column is nullable only for migration compatibility. Existing Task IDs, optimistic versions, audit history, DeadlineLinks, targets, and dates remain unchanged.

## 3. Task ownership model

```text
project_id IS NOT NULL
→ authoritative Project Task
→ FK proves the owner is a confirmed Project extension

project_id IS NULL
→ legacy_unassigned compatibility Task
→ never returned by a Project Task list
```

One database row remains one Task. No Project-specific Task copy or Activity relation was introduced.

Normal Task updates do not accept or write `projectId`, so they cannot clear or reassign ownership. Existing optimistic version checks remain unchanged.

## 4. Project Task service

Added `createProjectTask(actor, input)` in `src/modules/pm/service.ts`.

Its contract requires:

- a non-null `projectId`;
- a matching `projects.project_id`, not merely a Space row;
- a non-empty title;
- current Project/Space contributor participation or higher;
- an assignee, when supplied, who is an active member of the same Project.

It creates the Task and `task.create` AuditEvent in one transaction. The audit metadata includes `projectId`, title, state, and assignee; Task notes are not copied into audit.

Added `listProjectTasks(actor, projectId)` as the minimum Project read model. It requires a confirmed Project and current viewer-or-higher membership, filters strictly by authoritative `tasks.project_id`, and returns non-disclosing `not_found` for inaccessible or non-Project contexts.

`listBoard` and `getTask` now expose `projectId` additively. No delivery route was changed.

## 5. Authorization compatibility

Two narrowly scoped catalog permissions preserve current Space membership semantics:

| Capability | Current compatibility source |
| --- | --- |
| Read Project Tasks | Project Space membership at `viewer` or higher |
| Create Project Tasks | Project Space membership at `contributor` or higher |

Managers satisfy the contributor threshold. A global role alone does not create Project participation through these permissions. Hybrid Core semantics were not implemented.

Existing global Board permissions and owned-or-assigned update rules remain unchanged.

## 6. Assignee validation

For `createProjectTask`, an assignee must have an active user row and a current `space_members` row for the owning Project. An unrelated global user is rejected with `invalid_project_assignee`. Omitting an assignee remains valid.

Legacy Tasks are exempt until an explicit migration decision is made.

## 7. Project Task reads

Focused coverage verifies that a Project Task list:

- includes only Tasks owned by the requested confirmed Project;
- excludes legacy-unassigned Tasks;
- excludes Tasks owned by another Project;
- permits current Project viewers;
- returns non-disclosing `not_found` to an outsider;
- rejects Personal Spaces and legacy Team Spaces because they have no Project extension.

## 8. Existing Task preservation

The two accepted legacy Tasks remain:

| Task ID | Title | Project ownership |
| --- | --- | --- |
| `0c2bd456-cd73-4dbb-b9c1-8fef660b94a8` | Số hóa sổ ghi chép cũ trước mùa mưa | `NULL` / `legacy_unassigned` |
| `7e70ffdb-a65d-4389-a89b-5e87fc076e02` | Soạn danh mục sách bổ sung cho thư viện | `NULL` / `legacy_unassigned` |

Their pre-migration full-row hash was `f27129a9f2c6dc351bd5d122a9b2f057`. After migration, hashing all original columns while excluding the newly added `project_id` produced the same value. No legacy Task assignment API was added.

## 9. Normal DB migration result

Database: local Docker PostgreSQL database `wisdomtree`.

| Table | Before | After |
| --- | ---: | ---: |
| `spaces` | 7 | 7 |
| `projects` | 1 | 1 |
| `tasks` | 2 | 2 |
| `tree_nodes` | 34 | 34 |
| `sources` | 36 | 36 |

Migration head advanced from `0037_project_foundation.sql` to `0038_task_project_ownership.sql`.

Post-migration verification confirmed:

- both exact Task IDs still exist with `project_id = NULL`;
- the FK uses restrictive deletion behavior;
- `tasks_project_id_idx` exists;
- the Tempo Project row, 4 memberships, 32 Materials, 26 physical items, 16 LoanTickets, and 2 Deadlines retained identical before/after row hashes;
- Kho tri thức chung retained 6 memberships, 2 Team Branches, and 14 Nodes;
- Kho Dự Án Cộng Đồng retained 2 memberships, 3 Sources, and 1 Deadline;
- Personal data remains 4 Spaces, 4 Personal Branches, 20 Personal Nodes, and 1 Personal Source.

No normal-database Task was created by testing. The isolated database `wisdomtree_test_stage5_20260901` was migrated, seeded, used for stateful validation, and dropped; the final existence check returned `0`.

## 10. Tests executed

| Command | Result |
| --- | --- |
| Direct focused `task-project-ownership.test.ts` on isolated DB | PASS |
| `npm test` | PASS — lint, typecheck, 8 unit files, boundaries, signing, time, contrast |
| `npm run test:integration` on isolated DB | PASS — 9 files |
| `npm run test:usecase` on isolated DB | PASS — 3 files |
| `npm run test:privacy` on isolated DB | PASS — 2 files |
| `npm run typecheck` | PASS |
| `npm run test:boundaries` | PASS — 205 delivery files, no direct DB access |
| `npm run build` | PASS — production build generated 35 pages |
| `git diff --check` | PASS |

The first sandboxed `npm test` attempt was blocked by `tsx` IPC socket `EPERM`; the same command passed when rerun with the required execution permission. This was an execution-environment restriction, not a test failure.

## 11. Files changed

Stage 5 changed only:

```text
src/modules/auth/authorize.ts
src/modules/pm/schema.ts
src/modules/pm/service.ts
drizzle/0038_task_project_ownership.sql
tests/integration/task-project-ownership.test.ts
docs/refactor-stage-5-task-project-ownership-result.md
```

Pre-existing accepted Stage 1–4B worktree changes were preserved.

## 12. Compatibility gaps

- The old Board is still global and is not Project-filtered.
- The old `createTask` compatibility boundary and current UI can still create `project_id = NULL`.
- The two existing Tasks remain unassigned and need explicit human decisions.
- No legacy Task assignment/reassignment operation exists.
- `DeadlineLink` does not establish Project ownership and no same-Project link invariant exists yet.
- `targetType` / `targetId` remain compatibility metadata, not Project authority.
- Existing global get/update/claim/archive behavior was not redesigned.
- Hybrid Core authorization was not implemented.
- Activity does not exist and no Activity FK was added.

## 13. Recommended Stage 6

Recommended Stage 6: **Legacy Task Project-assignment decision and migration contract**.

First obtain an explicit human decision for each of the two `legacy_unassigned` Task IDs. Then define the narrow, audited, one-time assignment boundary and same-Project integrity requirements without changing the Board UI, adding Activity, or inferring ownership from DeadlineLink, title, target, creator, or assignee.
