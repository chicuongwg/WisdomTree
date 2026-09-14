# Stage 4B — Tempo Registration Result

Date: 2026-09-01 (Asia/Ho_Chi_Minh)

## 1. Result

**PASS**

The existing Team Space `c1bb5bc6-54c2-44f2-9e66-b60de956ddc8` is now the first real confirmed Project. Registration reused the Space UUID, inserted one Project extension through the supported service boundary, and appended one `project.register` AuditEvent.

No Space, membership, Material, SourceVersion, physical item, LoanTicket, Deadline, Branch, Node, Personal record, or Task was moved or modified. No schema or canonical data migration was created.

## 2. Registration service change

Added `registerExistingTeamSpaceAsProject(actor, input)` to the existing Project service.

The operation:

- validates the research lens and explicit Project status;
- starts one database transaction;
- locks and resolves the exact existing Space;
- returns non-disclosing `not_found` for an unknown Space;
- requires current `storage.space.members.manage` authorization for that Space;
- rejects Personal Spaces with `invalid_project_space`;
- rejects an existing Project extension with `project_exists`;
- inserts one Project row using the Space's existing ID;
- appends `project.register` in the same transaction;
- returns the display name from the underlying Space.

The audit payload contains only `spaceId` and `status`; it does not copy the research-lens body.

The existing Stage 3 operations remain unchanged:

```text
createProject
getProject
listProjects
updateProject
createSpace
```

No Core/Collaborator semantics were introduced. Current Space-manager authorization remains the compatibility authority.

## 3. Tempo registration

| Field | Registered value |
| --- | --- |
| Project ID | `c1bb5bc6-54c2-44f2-9e66-b60de956ddc8` |
| Underlying Space ID | `c1bb5bc6-54c2-44f2-9e66-b60de956ddc8` |
| Current compatibility display name | Thư Viện Cộng Đồng |
| Product identity | Tempo Library & Community Space |
| Status | `active` |
| Description | `null` |
| Version | 1 |

The Space name was not changed. There is no duplicate Project-name field.

The controlled maintenance invocation:

1. verified database `wisdomtree` and the exact accepted global fingerprint;
2. verified the Tempo Space ID, Team type, lack of Project extension, and exact structural counts;
3. hashed every protected existing row set;
4. constructed the current principal from the existing user and Space membership rows;
5. required the actor to be an existing Tempo manager;
6. called `registerExistingTeamSpaceAsProject`;
7. verified the Project result, full protected-row hashes, total audit delta, and exact registration audit payload.

The temporary maintenance script was outside the repository and was deleted after success.

## 4. Project metadata

Stored research lens:

```text
How TMKT preserves, organizes, connects, and activates books, documents, research materials, and community resources through a shared library and community space.
```

Database verification:

```text
project_id  = c1bb5bc6-54c2-44f2-9e66-b60de956ddc8
status      = active
description = null
version     = 1
created_by  = 6a8b2f02-acb7-458f-b06a-5fa4075589d2
```

## 5. Before/after database fingerprint

Pre-registration snapshot: 2026-09-01T06:24:26.213277Z.
Post-registration verification: 2026-09-01T06:27:00.407026Z.

| Table | Before | After | Expected delta |
| --- | ---: | ---: | ---: |
| `spaces` | 7 | 7 | 0 |
| `projects` | 0 | 1 | +1 |
| `tree_nodes` | 34 | 34 | 0 |
| `sources` | 36 | 36 | 0 |
| `tasks` | 2 | 2 | 0 |

The only normal-database row changes were one inserted `projects` row and one inserted `audit_events` row.

## 6. Existing Tempo data preservation

| Tempo-owned structure | Before | After |
| --- | ---: | ---: |
| Memberships | 4 | 4 |
| Sources / Materials | 32 | 32 |
| SourceVersions | 6 | 6 |
| Physical items | 26 | 26 |
| LoanTickets | 16 | 16 |
| Deadlines | 2 | 2 |
| Team Branches | 0 | 0 |
| TreeNodes | 0 | 0 |

Full-row hashes for Spaces, memberships, Folders, Sources, SourceVersions, physical items, LoanTickets, Deadlines, Branches, TreeNodes, and Tasks matched before and after registration. Ownership relations were not rewritten; they now resolve to Tempo because their existing `space_id` equals the confirmed Project ID.

## 7. Legacy/Personal data preservation

| Protected context | Verified post-registration state |
| --- | --- |
| Kho tri thức chung | 6 memberships, 2 Team Branches, 14 Nodes, no Project extension |
| Kho Dự Án Cộng Đồng | 2 memberships, 3 Sources, 3 SourceVersions, 1 Deadline, no Project extension |
| Personal Spaces | 4 |
| Personal Branches | 4 |
| Personal Nodes | 20 |
| Personal Sources | 1 |
| Global Tasks | 2, unchanged and still without Project ownership |

No registration or cleanup was inferred for either legacy Team Space.

## 8. Audit result

Exactly one new registration event was appended:

```text
Audit ID:       3161
Action:         project.register
Target type:    project
Target ID:      c1bb5bc6-54c2-44f2-9e66-b60de956ddc8
Actor role:     admin_op
Accountability: operator
Outcome:        success
Details:        {"spaceId":"c1bb5bc6-54c2-44f2-9e66-b60de956ddc8","status":"active"}
```

Historical Stage 3 fixture AuditEvents `3151–3158` remained byte-for-row equivalent under the maintenance snapshot and were independently re-read after registration.

## 9. Tests executed

All stateful commands targeted the disposable isolated database `wisdomtree_test_stage4b_20260901`. It was migrated, seeded, and dropped after testing. Its temporary object directory was also removed.

| Command | Result |
| --- | --- |
| Focused `project-foundation.test.ts` registration coverage | PASS |
| `npm test` | PASS — lint, typecheck, 8 unit files, boundaries, signing, time, contrast |
| `npm run test:integration` | PASS — 8 files |
| `npm run test:usecase` | PASS — 3 files |
| `npm run test:privacy` | PASS — 2 files |
| `npm run typecheck` | PASS |
| `npm run test:boundaries` | PASS — 205 delivery files, no direct DB access |
| `npm run build` | PASS — production build generated 35 pages |

One initial focused run failed safely on the isolated database because its newly created test Space required a refreshed membership-bearing Principal. The test setup was corrected to follow the repository's existing Principal-refresh pattern; the focused test and all canonical suites then passed. No stateful test ran against `wisdomtree`.

Focused coverage now verifies:

- valid existing-Team-Space registration and same UUID;
- metadata, version, membership, Folder, and audit preservation;
- Personal, unknown, already-registered, and unauthorized rejection;
- failed insert atomicity with unchanged Space, membership, Folder, and no audit;
- compatibility with existing Project/Space behavior.

## 10. Files changed

Stage 4B changed only:

```text
src/modules/project/service.ts
tests/integration/project-foundation.test.ts
docs/refactor-stage-4b-tempo-registration-result.md
```

No schema, migration, route, UI, authorization catalog, Task, Note, publication, Personal-data, or Project-feature file changed.

## 11. git status --short

Recorded after final validation. The worktree still includes accepted, pre-existing Stage 1–4B0.1 changes:

```text
 M src/db/schema.ts
 M src/modules/storage/service.ts
 M tests/README.md
 M tests/integration/api.test.ts
 M tests/run-all.ts
 M tests/setup.ts
?? "docs/WisdomTree \342\200\224 Product Context & User Needs.md"
?? docs/refactor-stage-1-domain-map.md
?? docs/refactor-stage-2-project-contract.md
?? docs/refactor-stage-3-project-foundation-result.md
?? docs/refactor-stage-4a-registration-inventory.json
?? docs/refactor-stage-4a-registration-inventory.md
?? docs/refactor-stage-4b-tempo-registration-result.md
?? docs/refactor-stage-4b0-1-fixture-cleanup-result.md
?? docs/refactor-stage-4b0-test-isolation-result.md
?? docs/ux-product-audit-artifact.json
?? docs/ux-product-audit.html
?? drizzle/0037_project_foundation.sql
?? src/modules/project/
?? tests/db-safety.ts
?? tests/integration/project-foundation.test.ts
```

## 12. Carried-forward decisions

```text
Kho tri thức chung → MIGRATE_CONTENT_LATER; not a Project
Kho Dự Án Cộng Đồng → DEMO / SEED DATA; untouched
Core policy → HYBRID; not implemented
Tempo feature system → not implemented
```

Additional boundaries retained:

- Project membership remains the current operational authorization source.
- Core cross-Project discovery/curation/publication is a later authorization stage.
- Two global legacy Tasks remain unassigned.
- Tempo's product identity and compatibility Space display name remain distinct until a later Project/UI naming decision.

## 13. Recommended Stage 5

Recommended Stage 5: **Project ownership foundation for Tasks**.

Narrow scope:

- add authoritative Project ownership for new Tasks;
- keep the two existing Tasks in an explicit legacy-unassigned compatibility state until human assignment;
- require Project context in the Task application boundary;
- preserve one Task identity across Project/My Work/future Activity views;
- do not infer ownership from title, linked Deadline, or apparent library context.

Must not include Activity, Person, Core authorization, Tempo features, Note ownership, public publishing, routes, navigation, or UI.
