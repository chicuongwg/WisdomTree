# Stage 4B0.1 — Proven Stage 3 Fixture Cleanup Result

Date: 2026-09-01 (Asia/Ho_Chi_Minh)
Database: normal local Docker PostgreSQL database `wisdomtree`

## 1. Result

**PASS**

The four proven Stage 3 fixture Space graphs were removed in one fail-closed transaction. No AuditEvent was deleted or modified. No product registration, schema migration, application code change, test execution against `wisdomtree`, or unrelated cleanup occurred.

## 2. Precondition verification

The live pre-cleanup fingerprint exactly matched accepted Stage 4B0 state at 2026-09-01T06:07:10.163405Z:

```text
spaces      11
projects     2
tree_nodes  34
sources     36
tasks        2
```

Before mutation, the serializable transaction locked and verified:

- four exact fixture Space IDs, names, Team types, and unarchived/no-owner state;
- two exact Project extensions and their accepted metadata/version states;
- five exact membership tuples and roles;
- exact Folder `d30446b0-da63-4ce3-8560-461fc140b587`, owned by fixture Project Space `48e2f318-0c78-442f-831f-c0b8fa208f88`;
- all eight exact AuditEvents `3151–3158`, their actions, target types, target IDs, successful outcomes, and fixture actor;
- zero fixture-owned Sources, SourceVersions, physical items, LoanTickets, Deadlines, Team Branches, TreeNodes, WikiReleases, or CalendarTokens;
- zero Tasks or DeadlineLinks targeting any fixture Space ID;
- the three protected business/legacy Space IDs and names;
- four Personal Spaces and four Personal Branches.

The transaction also snapshotted every Source, SourceVersion, physical item, LoanTicket, Deadline, Branch, TreeNode, WikiRelease, CalendarToken, Task, protected business Space, Personal Space, and preserved AuditEvent for exact post-delete comparison.

Every assertion passed. No stop condition was encountered.

## 3. Deleted domain rows

Deletion occurred in the authorized order inside one transaction:

| Order | Table | Rows | Exact identity |
| ---: | --- | ---: | --- |
| 1 | `folders` | 1 | `d30446b0-da63-4ce3-8560-461fc140b587` |
| 2 | `space_members` | 5 | All memberships whose `space_id` was one of the four fixture IDs |
| 3 | `projects` | 2 | `d1dbca51-1dc7-4125-b6fe-cc79a3530252`; `48e2f318-0c78-442f-831f-c0b8fa208f88` |
| 4 | `spaces` | 4 | `d1dbca51-1dc7-4125-b6fe-cc79a3530252`; `48e2f318-0c78-442f-831f-c0b8fa208f88`; `09b1a031-30f5-4237-90f3-328342002612`; `47cb8ad1-a0f1-493b-9bdd-8632a92a396f` |

Post-commit verification returned zero remaining fixture Spaces, Project rows, memberships, and Folder rows.

No Source, SourceVersion, physical item, LoanTicket, Deadline, Branch, TreeNode, WikiRelease, CalendarToken, Task, or Personal record was deleted or updated.

The one-time maintenance SQL existed only at `/tmp/wisdomtree-stage4b0-1-cleanup.sql` and was removed immediately after successful execution. No canonical migration was created.

## 4. Preserved AuditEvents

All eight authorized historical AuditEvents remain unchanged:

| Audit ID | Action | Target type | Target ID |
| ---: | --- | --- | --- |
| 3151 | `space.create` | `space` | `d1dbca51-1dc7-4125-b6fe-cc79a3530252` |
| 3152 | `project.create` | `project` | `d1dbca51-1dc7-4125-b6fe-cc79a3530252` |
| 3153 | `space.create` | `space` | `09b1a031-30f5-4237-90f3-328342002612` |
| 3154 | `space.create` | `space` | `48e2f318-0c78-442f-831f-c0b8fa208f88` |
| 3155 | `project.create` | `project` | `48e2f318-0c78-442f-831f-c0b8fa208f88` |
| 3156 | `space.create` | `space` | `47cb8ad1-a0f1-493b-9bdd-8632a92a396f` |
| 3157 | `space.member.add` | `space` | `48e2f318-0c78-442f-831f-c0b8fa208f88` |
| 3158 | `project.update` | `project` | `48e2f318-0c78-442f-831f-c0b8fa208f88` |

The transaction took a full-row snapshot of these events and compared both directions after domain deletion. The comparison passed. The append-only audit trigger was never disabled, and no audit payload was rewritten.

These historical target IDs now intentionally refer to deleted fixture domain records.

## 5. Before/after fingerprint

| Table | Before | After | Change |
| --- | ---: | ---: | ---: |
| `spaces` | 11 | 7 | -4 |
| `projects` | 2 | 0 | -2 |
| `tree_nodes` | 34 | 34 | 0 |
| `sources` | 36 | 36 | 0 |
| `tasks` | 2 | 2 | 0 |

Independent post-commit verification completed at 2026-09-01T06:10:10.849603Z.

## 6. Business/legacy records verified untouched

| Space | ID | Members | Sources | Deadlines | Branches | Nodes | Physical | Loans |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Kho Dự Án Cộng Đồng | `1f66cc2e-b970-4574-88d5-bccc0b89b0b3` | 2 | 3 | 1 | 0 | 0 | 0 | 0 |
| Kho tri thức chung | `a202b3c5-a331-4dce-8d8f-0c91d5e9ee71` | 6 | 0 | 0 | 2 | 14 | 0 | 0 |
| Thư Viện Cộng Đồng | `c1bb5bc6-54c2-44f2-9e66-b60de956ddc8` | 4 | 32 | 2 | 0 | 0 | 26 | 16 |

Additional preserved counts:

```text
Personal Spaces    4
Personal Branches  4
Personal Nodes    20
Tasks              2
```

Full-row transaction snapshots confirmed that Sources, SourceVersions, physical items, loans, Deadlines, Branches, Nodes, WikiReleases, CalendarTokens, and Tasks were unchanged.

## 7. Post-cleanup Project registration inventory

### Confirmed Projects

```text
0
```

### Legacy Team Spaces

| Space | ID | Current decision carried forward | Registration state |
| --- | --- | --- | --- |
| Kho Dự Án Cộng Đồng | `1f66cc2e-b970-4574-88d5-bccc0b89b0b3` | DEMO / SEED DATA; disposition separate | Legacy Team Space; untouched |
| Kho tri thức chung | `a202b3c5-a331-4dce-8d8f-0c91d5e9ee71` | MIGRATE_CONTENT_LATER; must not become Project | Legacy compatibility Space; untouched |
| Thư Viện Cộng Đồng | `c1bb5bc6-54c2-44f2-9e66-b60de956ddc8` | Confirmed as Tempo Library & Community Space; future `REGISTER_AS_PROJECT`, status `active` | Not registered in this stage |

### Personal state

```text
Personal Spaces:   4
Personal Branches: 4
```

### Authorization decision carried forward

`HYBRID`: TMKT Core receives cross-Project research discovery/read, curation, and publication capability; Project membership controls operational participation, Tasks, Activities, and Project management. No authorization behavior changed here.

Stage 4A artifacts were intentionally not overwritten and remain historical pre-cleanup inventories.

## 8. Repository files changed

Only this Stage 4B0.1 maintenance record was created:

```text
docs/refactor-stage-4b0-1-fixture-cleanup-result.md
```

No production source, schema, migration, service, test, route, UI, or prior report was modified in this stage.

Stage 4B0 test-isolation guard files were not edited. Their post-cleanup hashes are recorded for traceability:

```text
c853e6598f2b923ee6120be4737e87de737899c6233969de960c04b81e334ca2  tests/db-safety.ts
c8f004f1f198c726b1c2133f93fd472887377976fc9e8f4c6a199c96a43ae31a  tests/run-all.ts
5856f3ec7a6eb2d773ebd9ebb9823093e979dbba9816173a066a4575ecfcb1a9  tests/setup.ts
016e59e0200d88695834c5052a615700ee2bec6121cfe7e4d0e2f19607b39bbb  tests/integration/api.test.ts
b6d4c10b350fb125203db14b034bf30e75d425ec063205d7411ca9a349de712e  tests/README.md
```

## 9. git status --short

Recorded after cleanup and report validation. Pre-existing Stage 1–4B0 changes remain present and untouched:

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
?? docs/refactor-stage-4b0-1-fixture-cleanup-result.md
?? docs/refactor-stage-4b0-test-isolation-result.md
?? docs/ux-product-audit-artifact.json
?? docs/ux-product-audit.html
?? drizzle/0037_project_foundation.sql
?? src/modules/project/
?? tests/db-safety.ts
?? tests/integration/project-foundation.test.ts
```

## 10. Recommended Stage 4B

Proceed with one narrowly scoped registration plan for Tempo only:

```text
Space ID: c1bb5bc6-54c2-44f2-9e66-b60de956ddc8
Name: Thư Viện Cộng Đồng
Target: Tempo Library & Community Space
Initial status: active
Research lens: still required from product owner
Optional description: still optional
```

Stage 4B must not register `Kho tri thức chung`, must not infer a Project from `Kho Dự Án Cộng Đồng`, and must not combine Project registration with Core authorization implementation, Tasks, Notes, Activities, People, Tempo feature flags, routes, or UI.
