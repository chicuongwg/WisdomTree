# Stage 4A — Existing Space / Project Registration Inventory

Generated: 2026-09-01 (Asia/Ho_Chi_Minh)  
Database snapshot: 2026-08-31T20:31:58.473743Z  
Environment: local Docker PostgreSQL, database `wisdomtree` (credentials omitted)

Evidence labels used below:

- **OBSERVED** — returned by read-only SQL or directly implemented in the cited file.
- **INFERRED** — supported by matching repository/database evidence but not an authoritative product decision.
- **PRODUCT DECISION** — supplied in the accepted Stage 1–4A instructions.
- **UNKNOWN** — cannot be established safely from repository/database evidence.

All database queries ran inside explicit `BEGIN READ ONLY` transactions. No Note body, extracted text, file content, token, secret, OAuth data, task notes, private comment, or proposal content was read or included.

## 1. Executive summary

| Inventory class | Count |
| --- | ---: |
| Confirmed Projects | 2 |
| Legacy Team Spaces | 5 |
| Personal Spaces | 4 |
| Team Branches | 2 |
| Personal Branches | 4 |
| Tasks | 2 |

**OBSERVED:** The database contains 11 Spaces total: seven Team and four Personal. A Team Space only becomes a confirmed Project when a same-ID `projects` extension exists; the extension is a PK/FK over `spaces.id` and carries the Project metadata (`src/modules/project/schema.ts:10-36`). Exactly two current Team Spaces have that extension.

**PRODUCT DECISION:** The five other Team Spaces remain `legacy_shared`. Their name, type, content, membership, or apparent use is context only and is not authority to register them.

**INFERRED:** Both current confirmed Projects and two empty `Legacy Space ...` rows match the exact names, metadata, and paired suffixes created by the Stage 3 integration test (`tests/integration/project-foundation.test.ts:55-60`, `tests/integration/project-foundation.test.ts:90-100`). They are still reported as current database facts and were not modified.

Database fingerprint before inventory:

| Table | Rows |
| --- | ---: |
| `spaces` | 11 |
| `projects` | 2 |
| `tree_nodes` | 34 |
| `sources` | 36 |
| `tasks` | 2 |

Closing fingerprint at 2026-08-31T20:43:32.377402Z returned the same counts: `spaces=11`, `projects=2`, `tree_nodes=34`, `sources=36`, `tasks=2`. **OBSERVED:** no domain-row count changed during Stage 4A.

## 2. Confirmed Projects

| Project ID | Space name | Research lens | Status | Created by | Version | Structural data |
| --- | --- | --- | --- | --- | ---: | --- |
| `d1dbca51-1dc7-4125-b6fe-cc79a3530252` | Project foundation 1788206959313-c81730d7 | How Project identity remains stable during migration | active | Phạm Thu Hương | 1 | 1 manager; otherwise empty |
| `48e2f318-0c78-442f-831f-c0b8fa208f88` | Project foundation 1788206992920-ca6c7064 | Updated research lens | completed | Phạm Thu Hương | 2 | 1 manager, 1 viewer, 1 folder; otherwise empty |

**OBSERVED:** Both IDs equal their underlying Team Space IDs and both have `project.create` audit events. The second also has a `project.update` audit event.

**INFERRED:** Their names, first research lens, first description, folder name, access membership, and second Project update exactly follow the focused Stage 3 test fixture (`tests/integration/project-foundation.test.ts:55-79`, `tests/integration/project-foundation.test.ts:109-134`). This is a review concern, not an integrity violation. Stage 4A does not delete or unregister them.

## 3. Legacy Team Spaces

Space, membership, Folder, Source, and physical-item ownership are explicit Space relations in the current schema (`src/modules/storage/schema.ts:18-68`, `src/modules/storage/schema.ts:79-136`, `src/modules/storage/schema.ts:176-180`). Samples below are capped and are recognition context only.

### Kho Dự Án Cộng Đồng

- ID: `1f66cc2e-b970-4574-88d5-bccc0b89b0b3`
- Created by: Phạm Thu Hương at 2026-08-23T04:52:16.435464Z; not archived.
- Membership: 2 — Phạm Thu Hương (`manager`), Lê Văn Minh (`contributor`).
- Counts: 0 Folders; 3 Sources; 1 Deadline; 0 Team Branches; 0 TreeNodes; 0 Wiki Releases; 0 calendar tokens; 0 physical items; 0 pending extractions.
- Capped Source samples: “Bản đồ khu vực khảo sát”; “Danh sách nhà tài trợ”; “Kế hoạch dự án cộng đồng 2026”.
- Registration: **NEEDS_HUMAN_DECISION**.

### Kho tri thức chung

- ID: `a202b3c5-a331-4dce-8d8f-0c91d5e9ee71`
- Created by: Lê Văn Minh at 2026-08-31T02:45:35.254939Z; not archived.
- Membership: 6, all `viewer` — Lê Văn Minh, Phạm Thu Hương, Tiến Đức, Trần Thị Lan, and two distinct users displayed as “Thành viên mới”.
- Counts: 0 Folders; 0 Sources; 0 Deadlines; 2 Team Branches; 14 TreeNodes; 0 Wiki Releases; 0 calendar tokens; 0 physical items; 0 pending extractions.
- Registration: **NEEDS_HUMAN_DECISION**.

Branch detail:

| Branch ID | Name | Nodes | Created / updated |
| --- | --- | ---: | --- |
| `a48052db-3c13-4067-a5e5-0d55c42c10b8` | Lịch Sử Địa Phương | 2 | 2026-08-23T04:52:16.435464Z |
| `105951e5-cc5b-4235-bedb-57d3b1866867` | Văn Hóa Dân Gian | 12 | 2026-08-23T04:52:16.435464Z |

The current Branch schema makes Team Branches Space-owned and Personal Branches owner-scoped (`src/modules/knowledge/schema.ts:24-59`). Branch names are not Project identity evidence.

### Legacy Space 1788206959313-c81730d7

- ID: `09b1a031-30f5-4237-90f3-328342002612`
- Created by: Phạm Thu Hương at 2026-08-31T20:09:19.346024Z; not archived.
- Membership: 1 manager (Phạm Thu Hương).
- Counts: zero Folders, Sources, Deadlines, Branches, Nodes, Wiki Releases, calendar tokens, physical items, extractions, and loans.
- **INFERRED:** Stage 3 integration-test fixture, based on its exact naming template and paired suffix (`tests/integration/project-foundation.test.ts:90-100`).
- Registration: **NEEDS_HUMAN_DECISION**.

### Legacy Space 1788206992920-ca6c7064

- ID: `47cb8ad1-a0f1-493b-9bdd-8632a92a396f`
- Created by: Phạm Thu Hương at 2026-08-31T20:09:52.957044Z; not archived.
- Membership: 1 manager (Phạm Thu Hương).
- Counts: zero Folders, Sources, Deadlines, Branches, Nodes, Wiki Releases, calendar tokens, physical items, extractions, and loans.
- **INFERRED:** Stage 3 integration-test fixture for the same reason above.
- Registration: **NEEDS_HUMAN_DECISION**.

### Thư Viện Cộng Đồng

- ID: `c1bb5bc6-54c2-44f2-9e66-b60de956ddc8`
- Created by: Phạm Thu Hương at 2026-08-23T04:52:16.435464Z; not archived.
- Membership: 4 — Phạm Thu Hương (`manager`); Lê Văn Minh, Tiến Đức, Trần Thị Lan (`contributor`).
- Counts: 0 Folders; 32 Sources; 2 Deadlines; 0 Team Branches; 0 TreeNodes; 0 Wiki Releases; 0 calendar tokens; 26 physical items; 0 pending extractions; 16 loan tickets.
- Loan states: 1 borrowed, 4 declined, 11 returned. Current active circulation workload: 1 borrowed item.
- Capped Source samples: “Biên bản họp nhóm tháng 6”; “Báo cáo khảo sát thực địa 2025”; “Bí Mật Của Naoko”; “Bản scan sổ ghi chép cũ”; “Chí Phèo — Tuyển Tập”; “Cẩm Nang Sơ Cấp Cứu”; “Danh mục tài liệu tham khảo”; “Dế Mèn Phiêu Lưu Ký”.
- **INFERRED:** Its authoritative stored name and physical/circulation records make it a Tempo recognition candidate for the human, but do not establish that it is Tempo.
- Registration: **NEEDS_HUMAN_DECISION**.

## 4. Kho tri thức chung

**OBSERVED:** UUID `a202b3c5-a331-4dce-8d8f-0c91d5e9ee71`; six viewer memberships; two Branches; 14 Nodes; zero Sources, Deadlines, Wiki Releases, physical items, calendar tokens, and pending extractions.

**OBSERVED REPOSITORY EVIDENCE:** Migration 0031 creates a Team Space literally named `Kho tri thức chung`, gives every enabled user viewer membership, and assigns all then-existing Team Branches to it. Its stated purpose is preserving previous readership without guessing true Project ownership (`drizzle/0031_knowledge_space_scope.sql:1-35`). The actual row and its viewer membership pattern match that migration exactly.

**PRODUCT DECISION:** Registration remains **NEEDS_HUMAN_DECISION**. The compatibility origin does not make this Space a Project.

## 5. Personal data migration inventory

No private Note content or file content was inspected. Personal Space workload:

| Personal Space ID | Owner | Folders | Sources | Source versions | Deadlines | Physical | Extraction candidates / pending |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `add43bcb-3ace-4a09-a7ff-39769f3add55` | Lê Văn Minh | 0 | 0 | 0 | 0 | 0 | 0 / 0 |
| `4caac612-916b-4d47-9a36-c08d4f1d36a5` | Phạm Thu Hương | 0 | 0 | 0 | 0 | 0 | 0 / 0 |
| `76616171-de7d-4ef8-891c-832d61a68e1b` | Tiến Đức | 0 | 0 | 0 | 0 | 0 | 0 / 0 |
| `03d3381c-777c-4f88-a830-5aa2509e7ead` | Trần Thị Lan | 0 | 1 | 1 | 0 | 0 | 0 / 0 |

Personal Branch workload:

| Owner | Branch ID | Branch name | Nodes | Pending proposals |
| --- | --- | --- | ---: | ---: |
| Lê Văn Minh | `009ff678-e96f-4aa6-9179-75851c1bfbf8` | Ghi chú cá nhân — Lê Văn Minh | 4 | 0 |
| Phạm Thu Hương | `19cb209f-dead-4453-8a01-19498e656c4d` | Ghi chú cá nhân — Phạm Thu Hương | 0 | 0 |
| Tiến Đức | `f8d41e53-686a-4427-afd1-d66f5fd7bf4a` | Ghi chú cá nhân — Tiến Đức | 0 | 0 |
| Trần Thị Lan | `10e025be-9586-495e-90d9-23a87ddea91e` | Ghi chú cá nhân — Trần Thị Lan | 16 | 0 |

**PRODUCT DECISION:** None of these records receives a Project assignment in Stage 4A. Personal Branches structurally have no `space_id`; owner identity is their visibility boundary (`src/modules/knowledge/schema.ts:29-43`). Future assignment requires explicit owner/product review and must not widen access.

## 6. Global Task inventory

Tasks currently have no Space/Project FK; `target_type` and `target_id` are optional, while Deadline links are polymorphic (`src/modules/pm/schema.ts:28-39`, `src/modules/pm/schema.ts:55-74`).

| Task ID | Title | State | Creator | Assignee | Start / due | Target | Linked deadline | Possible context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `0c2bd456-cd73-4dbb-b9c1-8fef660b94a8` | Số hóa sổ ghi chép cũ trước mùa mưa | doing | Phạm Thu Hương | Lê Văn Minh | none / none | none | Báo cáo tổng kết quý III | Thư Viện Cộng Đồng — **NON-AUTHORITATIVE**, based only on linked Deadline |
| `7e70ffdb-a65d-4389-a89b-5e87fc076e02` | Soạn danh mục sách bổ sung cho thư viện | todo | Phạm Thu Hương | unassigned | none / none | none | none | none |

**OBSERVED:** One of two Tasks has non-authoritative Space context through a Deadline link; neither has a direct target; neither has start/due dates.

**PRODUCT DECISION:** No Task is asserted to belong to a Project. Both require later explicit assignment unless a future approved migration rule supplies authoritative evidence.

## 7. Current membership/role context

Global roles:

| Role | Count |
| --- | ---: |
| `admin_op` | 1 |
| `editor` | 3 |
| `user` | 2 |

Editors/admin operator:

| User ID | Display name | Current global role |
| --- | --- | --- |
| `6a8b2f02-acb7-458f-b06a-5fa4075589d2` | Phạm Thu Hương | `admin_op` |
| `046fa604-c437-4df7-bb23-2ea03e829da3` | Lê Văn Minh | `editor` |
| `7a93e3f9-215f-4a8d-85e8-9800d744942c` | Thành viên mới | `editor` |
| `d669a67a-3b1f-4a7b-88b6-c717ac19c088` | Thành viên mới | `editor` |

**OBSERVED:** Phạm Thu Hương manages six Team Spaces, the only user currently managing more than one. Space membership roles remain `viewer`, `contributor`, and `manager` (`src/modules/storage/schema.ts:32-51`). No user is designated Core by this inventory.

> **Product decision still required:**
>
> Does TMKT Core capability itself grant access to all Projects?
>
> A. Core still requires explicit Project membership  
> B. Core automatically has internal Project access  
> C. Hybrid policy
>
> Current safe compatibility assumption: **A**.

## 8. Data-quality anomalies

No actual integrity violation was found in the checked relations:

- 0 Project extensions on non-Team Spaces.
- 0 Team Branches on unexpected Space types and 0 Branch scope-boundary mismatches.
- 0 Wiki Releases on non-Team Spaces.
- 0 duplicate normalized Space names.
- 0 unresolved Deadline links.
- 0 unresolved or unknown non-null Task targets.
- 0 Personal Spaces carrying unexpected Team Branch, Deadline, Wiki Release, or calendar-token records.

Review concerns, not integrity violations:

1. **INFERRED — likely Stage 3 fixture data:** two confirmed Projects, two legacy Team Spaces, and one folder match the exact Stage 3 integration-test creation pattern. Human review must decide whether these current rows are intended to remain. Stage 4A did not modify them.
2. **OBSERVED — ambiguous display name:** two distinct editor user IDs are both displayed as “Thành viên mới”. Future Core mapping must identify users by stable ID, not display name.
3. **OBSERVED — valid legacy compatibility state:** `Kho tri thức chung` is migration-created and holds the two legacy Team Branches. This is expected by migration 0031, not an orphan or automatic Project candidate.

## 9. Registration manifest

| Space ID | Space name | Current type | Already Project? | Data summary | Registration decision | Research lens | Initial status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `d1dbca51-1dc7-4125-b6fe-cc79a3530252` | Project foundation 1788206959313-c81730d7 | team | yes | 1 manager; otherwise empty | ALREADY_REGISTERED | How Project identity remains stable during migration | active | Likely Stage 3 fixture; review only |
| `48e2f318-0c78-442f-831f-c0b8fa208f88` | Project foundation 1788206992920-ca6c7064 | team | yes | 2 members; 1 folder | ALREADY_REGISTERED | Updated research lens | completed | Likely Stage 3 fixture; review only |
| `1f66cc2e-b970-4574-88d5-bccc0b89b0b3` | Kho Dự Án Cộng Đồng | team | no | 2 members; 3 Sources; 1 Deadline | NEEDS_HUMAN_DECISION |  |  | Do not infer from name/content |
| `a202b3c5-a331-4dce-8d8f-0c91d5e9ee71` | Kho tri thức chung | team | no | 6 viewers; 2 Branches; 14 Nodes | NEEDS_HUMAN_DECISION |  |  | Migration 0031 compatibility Space |
| `09b1a031-30f5-4237-90f3-328342002612` | Legacy Space 1788206959313-c81730d7 | team | no | 1 manager; empty | NEEDS_HUMAN_DECISION |  |  | Likely Stage 3 fixture |
| `47cb8ad1-a0f1-493b-9bdd-8632a92a396f` | Legacy Space 1788206992920-ca6c7064 | team | no | 1 manager; empty | NEEDS_HUMAN_DECISION |  |  | Likely Stage 3 fixture |
| `c1bb5bc6-54c2-44f2-9e66-b60de956ddc8` | Thư Viện Cộng Đồng | team | no | 4 members; 32 Sources; 26 physical; 16 loans; 2 Deadlines | NEEDS_HUMAN_DECISION |  |  | Tempo recognition candidate only |

For a later `REGISTER_AS_PROJECT` decision, the required input is `spaceId`, `researchLens`, `status`, and optional `description`. Name continues to derive from Space. No new UUID is required.

## 10. Human decisions required

Every legacy Team Space requires exactly one future choice: `REGISTER_AS_PROJECT`, `KEEP_LEGACY_SHARED`, `MIGRATE_CONTENT_LATER`, or `NEEDS_DISCUSSION`. No choice is made below.

### Decision form 1

```text
SPACE:
Kho Dự Án Cộng Đồng

ID:
1f66cc2e-b970-4574-88d5-bccc0b89b0b3

CURRENT CONTENT:
2 members; 3 Sources; 1 Deadline; no Branches, Nodes, Wiki Releases or physical items.

DECISION REQUIRED:
[ ] REGISTER_AS_PROJECT
[ ] KEEP_LEGACY_SHARED
[ ] MIGRATE_CONTENT_LATER
[ ] NEEDS_DISCUSSION

IF REGISTER:
Research lens:
Initial status: active / paused / completed / archived
Optional description:
```

### Decision form 2

```text
SPACE:
Kho tri thức chung

ID:
a202b3c5-a331-4dce-8d8f-0c91d5e9ee71

CURRENT CONTENT:
Migration 0031 compatibility Space; 6 viewers; 2 Team Branches; 14 Nodes; no Sources or Deadlines.

DECISION REQUIRED:
[ ] REGISTER_AS_PROJECT
[ ] KEEP_LEGACY_SHARED
[ ] MIGRATE_CONTENT_LATER
[ ] NEEDS_DISCUSSION

IF REGISTER:
Research lens:
Initial status: active / paused / completed / archived
Optional description:
```

### Decision form 3

```text
SPACE:
Legacy Space 1788206959313-c81730d7

ID:
09b1a031-30f5-4237-90f3-328342002612

CURRENT CONTENT:
1 manager; otherwise structurally empty; likely Stage 3 fixture.

DECISION REQUIRED:
[ ] REGISTER_AS_PROJECT
[ ] KEEP_LEGACY_SHARED
[ ] MIGRATE_CONTENT_LATER
[ ] NEEDS_DISCUSSION

IF REGISTER:
Research lens:
Initial status: active / paused / completed / archived
Optional description:
```

### Decision form 4

```text
SPACE:
Legacy Space 1788206992920-ca6c7064

ID:
47cb8ad1-a0f1-493b-9bdd-8632a92a396f

CURRENT CONTENT:
1 manager; otherwise structurally empty; likely Stage 3 fixture.

DECISION REQUIRED:
[ ] REGISTER_AS_PROJECT
[ ] KEEP_LEGACY_SHARED
[ ] MIGRATE_CONTENT_LATER
[ ] NEEDS_DISCUSSION

IF REGISTER:
Research lens:
Initial status: active / paused / completed / archived
Optional description:
```

### Decision form 5

```text
SPACE:
Thư Viện Cộng Đồng

ID:
c1bb5bc6-54c2-44f2-9e66-b60de956ddc8

CURRENT CONTENT:
4 members; 32 Sources; 26 physical items; 16 loan tickets; 2 Deadlines; no Team Branches. Tempo recognition candidate only.

DECISION REQUIRED:
[ ] REGISTER_AS_PROJECT
[ ] KEEP_LEGACY_SHARED
[ ] MIGRATE_CONTENT_LATER
[ ] NEEDS_DISCUSSION

IF REGISTER:
Research lens:
Initial status: active / paused / completed / archived
Optional description:
```

Additional human decisions:

1. Confirm disposition of the two already-registered, likely Stage 3 fixture Projects. They cannot enter the legacy registration manifest because Project extensions already exist.
2. Confirm whether the two empty `Legacy Space ...` rows are disposable test fixtures or retained legacy containers. No cleanup is authorized in Stage 4A.
3. Identify whether `Thư Viện Cộng Đồng` is Tempo; its name and circulation records are recognition context only.
4. Choose Core access policy A, B, or C. Until then, explicit Project membership remains the safe compatibility assumption.
5. Later Task review: explicitly assign both global Tasks; the Deadline-derived context for one Task is not authoritative.

## 11. Recommended Stage 4B

Recommended Stage 4B: **Human-approved legacy Team Space registration plan and narrowly scoped registration execution**.

Inputs required before implementation:

- One checked decision for each of the five legacy Team Spaces.
- For each `REGISTER_AS_PROJECT`: authoritative `researchLens`, initial `status`, and optional `description`.
- Explicit disposition for the two likely Stage 3 fixture Projects and two likely Stage 3 fixture legacy Spaces.
- Confirmation of whether `Thư Viện Cộng Đồng` is Tempo; this does not yet authorize a library feature system.

Stage 4B must register only explicitly approved Space IDs, preserve IDs/memberships/data, use the supported Project registration boundary, and verify no access widening. It must not include Task migration, Personal data migration, Core authorization redesign, Tempo feature implementation, Note migration, routes, or UI.

The JSON artifact records matching before/after fingerprints. No database mutation was performed.
