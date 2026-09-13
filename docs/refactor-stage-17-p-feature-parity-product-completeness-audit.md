# Stage 17.P — Legacy Feature Parity & Product Completeness Audit

## 1. Verdict

**INCOMPLETE — PRODUCT DECISIONS REQUIRED.** The target has a coherent research-workspace core, but it does not yet provide an administration or Project-lifecycle surface. A system administrator can create a Project and manage its members in the backend; a real user cannot do either through the target product. Several former workflows also survive only as legacy services/APIs rather than target application capabilities.

This is a capability audit, not a request to recreate every deleted screen. `BACKEND ONLY` means the service/API exists but there is no target user-facing workflow. No deleted UI is treated as intentionally removed merely because its route was deleted.

**Count basis.** The primary matrix contains 36 capabilities that were available in the final pre-cutover product state. Current-only Core and Library-operator administration are reported separately and are not included in those parity counts.

| Status | Count |
| --- | ---: |
| PRESERVED | 5 |
| REPLACED | 6 |
| INTENTIONALLY REMOVED | 0 |
| BACKEND ONLY | 21 |
| MISSING / REGRESSION | 3 |
| UNKNOWN | 1 |

There are no P0 findings: an existing configured Project remains operable. The P1 product gap is that a new Project, its roster, and system administration cannot be operated in the target UI.

## 2. Worker usage

- Main worker: Codex Terra Extra High — repository/history/design-doc inspection, capability classification, role matrix, and synthesis.
- Luna scouts used (read-only): legacy governance/navigation; workflows and compatibility surfaces; target routes/facades/authorization.
- No worker modified application code, tests, schema, migrations, or packages.

## 3. Old product capability map

The final meaningful pre-cutover navigation was two-context rather than Project-centric:

| Old navigation | User capability behind it |
| --- | --- |
| Root rail: Library | Browse sources/catalogue, upload/intake, source detail/download, physical holdings and loans. |
| Root rail: Tree / sidebar outline / branches | Browse and author personal or team knowledge branches; navigate canonical Wiki pages. |
| Root rail: Graph | Explore personal/team knowledge graph with filters and locally persisted display/group settings. |
| Root rail: Board | Work lanes, task detail, unassigned-task claiming, calendar/week/month presentations. |
| Sidebar: Deadlines | Create and view standalone Project/Space deadlines. |
| Sidebar: Review | Editors/Admins review change, publication, and translation proposals. |
| Sidebar: Candidate review | Review extracted candidates and evolve or reject them. |
| Sidebar: Source intake / My submissions | Upload to a Space and manage the caller's submissions. |
| Root rail: Notifications | Read/mark in-app notifications; account preferences were separate. |
| Root rail: Admin (admin_op) | Create Spaces; manage Space roster; invite/role/disable users; audit and health. |
| Account | Profile/avatar, notification preferences, and calendar-feed token. |
| Wiki releases | Managers create/verify/rebuild immutable Space Markdown/XML releases. |

Evidence is the last pre-cutover tree (`HEAD^`): `src/app/components/shell-rail.tsx`, `shell-sidebar.tsx`, and the then-real route pages under `src/app/{admin,board,deadlines,library,notifications,review,source,tree,vault,wiki}`. Commit `8738dc1` deleted those presentation routes while retaining many service and API boundaries.

## 4. Target product capability map

Confirmed target navigation is:

```text
/app
├── Overview
├── Projects
├── My Work
├── People
├── Search
├── Graph
└── Account

/app/projects/:projectId
├── Overview
├── Notes
├── Materials
├── Activities
├── Tasks
├── People
└── Library (only when Project capability + operational membership permit it)

/p and /p/:slug
└── public published-Note search and reading
```

This is defined by `src/app/components/ui-next/shell/navigation.tsx`, `src/app/app/projects/[projectId]/_components/project-navigation.tsx`, and the current route tree. `/` redirects to `/app`; `/account` and `/graph` redirect into target routes.

The target does provide these complete user workflows:

- Project-scoped Note drafts, editing/autosave, internal publishing, exact-version evidence/provenance, and Core-authorized stable public Note publishing.
- Project Materials intake, immutable SourceVersions, extraction/retry, candidate reading, and continuation into a working Note.
- Project Activities with People, Material, Note, and Task relations.
- Project Tasks plus My Work; task status, assignee, due date, and Activity relation are editable as authorized.
- Project/global research People, cross-Project authorized Search, and a read-only Project research Graph.
- Conditional Tempo Project Library holdings, borrowing, and operator loan transitions.
- Profile/avatar, notification preferences, and personal ICS calendar subscription under `/app/account`.

The target has no `/app/admin`, Project settings/members route, Project creation endpoint, Project membership endpoint, notifications centre, calendar page, Tree/Wiki page, review queue, export/release page, or global Library/Board route.

## 5. Feature parity matrix

| Capability | Old product | Target product | Status | Evidence | User impact |
| --- | --- | --- | --- | --- | --- |
| Sign in and sign out | Google OIDC/dev sign-in and logout | Same auth routes remain | PRESERVED | `src/app/login/page.tsx`; `api/auth/logout/route.ts` | No parity loss. |
| Profile and avatar | Account profile/avatar edit | `/app/account` uses the same profile APIs | PRESERVED | `app/app/account/page.tsx`; `components/account-profile.tsx` | No parity loss. |
| Notification preferences | Per-event in-app preference toggles | Same form is rendered in `/app/account` | PRESERVED | `components/notification-prefs.tsx` | No parity loss. |
| Calendar subscription | Personal tokenized ICS feed and regeneration | Same feed/token workflow in `/app/account` | PRESERVED | `components/account-calendar.tsx`; `app/calendar/[token]/route.ts` | No parity loss. |
| Create Team Space / Project equivalent | `admin_op` created a Team Space in `/admin` | `createProject`/`createAppProject` exist, but neither target route/API nor form invokes them | BACKEND ONLY | `modules/project/service.ts`; `modules/application/projects.ts`; no `api/app/projects/route.ts` | P1: a new workspace cannot be created in the target product. |
| Project metadata/status configuration | Space administration; current Project service additionally supports lens/description/status | `updateProject` exists but Project header has no edit workflow | BACKEND ONLY | `modules/project/service.ts:updateProject`; `project-header.tsx` | P2: managers cannot configure an existing Project in target UI. |
| Add/remove members and assign viewer/contributor/manager | `/admin` SpaceAdmin managed roster and member role | Services and legacy `/api/spaces/:id/members` remain; no target Project-members surface | BACKEND ONLY | `modules/storage/service.ts`; pre-cutover `components/space-admin.tsx` | P1: managers cannot form or maintain a Project team in target UI. |
| Invite users, change global role, disable/enable | `/admin` UserAdmin | `auth/admin.ts` and `/api/admin/users/*` remain; `/admin` is absent | BACKEND ONLY | `modules/auth/admin.ts`; pre-cutover `components/user-admin.tsx` | P1: system account administration is inaccessible in the target product. |
| Audit trail and health console | `/admin` displayed audit and linked health | APIs/services remain; no target Admin route/nav | BACKEND ONLY | `api/admin/{audit,health}`; pre-cutover `app/admin/page.tsx` | P2: operational oversight has no target UI. |
| Note authoring, author-private drafts, autosave, internal publish | Tree drafts/editor and official nodes | Project Notes uses the same safe draft/publish model | PRESERVED | `modules/application/notes.ts`; target Notes routes/components | No parity loss; Project context replaces branch context. |
| Note history, diff, and restore-to-draft | Node history and restore controls were real Tree pages | Versions are used for evidence selection, but no target history/compare/restore UI or target route exists | BACKEND ONLY | legacy `tree/node/[id]/history`; `api/tree/nodes/.../versions/.../restore-draft`; Stage 17 plan §17.5 | P2: researchers cannot inspect/restore a Note revision in target UI. |
| Tree/Branch hierarchy and branch authoring | Personal/team branches, hierarchy, branch creation and archival | Services/APIs remain, but Project Notes is a flat collection and exposes no hierarchy | BACKEND ONLY | legacy `app/tree/*`; `api/tree/branches/*`; current Notes list | P2: structured knowledge navigation/organization is unavailable in target UI. |
| Personal knowledge promoted to a team branch | Personal node publication proposal with independent decision | Proposal service/API remain; target Notes has no personal scope or promotion workflow | BACKEND ONLY | `modules/knowledge/publication.ts`; `api/tree/...publication-proposals` | P2: personal-to-shared knowledge promotion has no target workflow. |
| Canonical Wiki navigation and English translation | Wiki canonical paths, translation editor/decision | Tree/Wiki service/API remain; no target Wiki or translation UI | BACKEND ONLY | legacy `app/wiki/*`, `tree/.../translate`; retained `api/tree/.../translations` | P2: legacy wiki/translation work is inaccessible through TMKT. |
| Wiki links, backlinks, table of contents, and previous/next navigation | Node reader exposed linked knowledge navigation | Link data/services remain, but target Note reader exposes none of these navigational outcomes | BACKEND ONLY | legacy Tree node reader; `modules/knowledge` link services; target Note reader | P2: research navigation between related Notes is inaccessible in target UI. |
| Maker-checker review queue | Editors/Admins listed and approved/rejected change, publication, translation proposals | Legacy proposals and APIs remain; target public Note publishing is Core-authorized but not a second-person review queue | BACKEND ONLY | legacy `app/review/*`; `modules/knowledge/publication.ts:listPendingProposals` | P2: independent review remains an unresolved parity/product-policy boundary. |
| Whole-Space WikiRelease / Markdown/XML export | Managers created, verified, and rebuilt releases | Export/release APIs/services remain; public target publishes individual Notes instead | BACKEND ONLY | legacy `app/wiki/releases`; `modules/export/service.ts`; `api/export/tree` | P2: whole-Space release/export has no target workflow. |
| Public published content | Release/export-oriented Wiki publication | Stable per-Note public slug, revision, search, and read routes | REPLACED | `modules/publication/service.ts`; `app/p/*` | Public outcome is preserved in a narrower, Note-centric form; it does not replace export. |
| Task creation, state, assignee, due date, and Activity link | Board/task detail | Project Tasks and My Work expose the same operational outcome | REPLACED | legacy `app/board`; `app/projects/[projectId]/tasks`; `modules/application/tasks.ts` | Board presentation need not be restored for basic task work. |
| Claim unassigned pool work | Board let members claim an unassigned task | `pm.task.claim` and legacy API remain; target Task UI has no claim action | BACKEND ONLY | `modules/auth/authorize.ts`; `api/tasks/[taskId]/claim` | P2: shared work-pool workflow is not available in target UI. |
| Calendar/week/month Board schedule | Board calendar rendered scheduled work | Account exposes ICS only; target has no calendar view | BACKEND ONLY | legacy `components/board-calendar.tsx`; `api/board?from&to`; target Account | P1: time-based planning is absent from the target product. |
| Standalone deadlines | `/deadlines` create/read/edit workflow | Task due date exists, but standalone deadline API/service has no target workflow | BACKEND ONLY | legacy `app/deadlines/*`; `api/deadlines/*`; target Tasks | P1: non-task deadline tracking is unavailable in target UI. |
| Source intake and My Submissions | Global/personal source flows | Project Material create/upload/version flow | REPLACED | legacy `app/source/{intake,mine}`; target Materials | Project-scoped Material identity replaces the old entry points. |
| Personal My Submissions queue | Caller could inspect personal submissions outside a Project | Legacy source-submission API remains; no target personal submission list | BACKEND ONLY | legacy `app/source/mine`; `api/source/my-submissions` | P2: contributors lose a cross-Project personal submission view. |
| Download/preview/rename/withdraw/folder material files | Source detail gave authorized download/preview and owner storage controls | Target has a download-token facade but no target download route/control; plan §17.7 explicitly scoped versions/download | MISSING / REGRESSION | `modules/application/materials.ts:getAppMaterialDownloadToken`; target `material-detail.tsx`; legacy `api/source/[sourceId]/download` | P1: a researcher cannot retrieve an original file through the target workflow. |
| Extracted-candidate evolve/reject review | `/vault/review` listed candidates and supported evolve/reject | Target Material can read candidate text and create/continue a working Note; evolve/reject queue APIs remain unexposed | BACKEND ONLY | legacy `app/vault/review`; `api/vault/candidates/*`; target material detail | P2: formal candidate disposition is missing from target UI. |
| Catalog browsing, availability, requests, and loan transitions | Global Library, item detail, borrower request, admin loan desk | Conditional Project Tempo Library has holdings, request, approve/decline/handover/return | REPLACED | legacy `app/library*`; `app/projects/[projectId]/library`; `modules/application/tempo.ts` | Project-scoped Tempo replaces global browsing/circulation. |
| Global/non-Project catalogue and folder browsing | Library could browse sources across accessible Spaces/folders | Target exposes only confirmed-Project Materials and capability-enabled Project Library | BACKEND ONLY | legacy `app/library`; retained storage/catalog APIs; target route inventory | P2: legacy or non-Project collections have no target user workflow. |
| Physical holding registration/copy/location/archive management | Admin created/edited/archived physical catalogue records | Target Library reads holdings; physical add facade exists but no target Material/Library management surface | MISSING / REGRESSION | legacy catalog forms; `modules/application/tempo.ts:addAppProjectMaterialPhysical`; `tempo-library-spec.md` §Physical holdings | P2: a Project cannot grow or maintain its physical holdings in target UI. |
| Private global search with Space filter | Search nodes/sources across visible Spaces | Authorized Project research search for Project, Note, Material, Activity, Person | REPLACED | legacy `app/search`; `modules/search/service.ts`; `/app/search` | Equivalent discovery is Project/entity-oriented rather than Space/Wiki-oriented. |
| Graph visualization/navigation | Personal/team graph with node navigation and settings | Read-only Project research Graph with filters, selection, and local display controls | REPLACED | legacy `app/graph`; `modules/application/graph.ts`; `/app/graph` | Core graph outcome remains. |
| Personal Graph scope and saved query groups | Personal scope and configurable graph groups | Target graph deliberately suppresses groups and only composes confirmed Project research | MISSING / REGRESSION | `knowledge-map/index.tsx` (`targetGraph` disables groups); `application/graph.ts` | P2: personal-map and group-query capabilities were lost without approval evidence. |
| Notification centre/read state | Rail badge and `/notifications` list/mark-read actions | Notifications service/API still exist; target only exposes preferences | BACKEND ONLY | legacy `app/notifications`; `api/notifications/*`; target Account | P2: users cannot consume in-app notifications in target UI. |
| Comments, mentions, and presence | Comment surface and live presence row on legacy pages | notify/presence APIs remain; no target Note/Material/Activity conversation or presence surface | BACKEND ONLY | legacy `comments-section.tsx`, `presence-row.tsx`; `api/comments`, `api/presence` | P2: collaboration signals are not available in target UI. |
| Account-visible Space membership | Account previously surfaced the caller's Spaces | `listMemberSpaces` remains; target Account deliberately omits Space/membership state | BACKEND ONLY | pre-cutover Account; `modules/storage/service.ts:listMemberSpaces`; target Account | P3: a user cannot see their organizational memberships from target Account. |
| Password settings / device-session management | No pre-cutover password/device-management page found; OIDC was the login mechanism | No target page found beyond sign-out/session endpoint | UNKNOWN | `app/login/page.tsx`; `api/session/route.ts`; history route inventory | No evidenced parity claim can be made. |

## 6. Admin/governance findings

### Old Admin surface: YES

`/admin` was a real `admin_op` page, not test tooling. It combined:

- Team Space creation and roster selection/add/remove/role change;
- account invitation, role assignment, disable/re-enable;
- audit log;
- health-page entry point.

It consumed `SpaceAdmin`, `UserAdmin`, and `AuditLog` in the pre-cutover `src/app/admin/page.tsx`.

### Current Admin target surface: NO

There is no `/app/admin`, no global navigation item, and no target administration dialog. The target application context computes `canManageCoreRoster` and `canAccessAdministration`, but `AppShell` does not render an administration destination from either flag (`src/modules/application/context.ts`, `src/app/components/ui-next/shell/app-shell.tsx`).

### Current administration capabilities

The following are real backend/API capabilities, not target workflows:

| Capability | Current authority | Current exposure | Status |
| --- | --- | --- | --- |
| User invite/list/role/disable | `admin_op` via `admin.users.manage` | `modules/auth/admin.ts`, `/api/admin/users/*` | BACKEND ONLY |
| Audit/health | `admin_op` | `/api/admin/audit`, `/api/admin/health` | BACKEND ONLY |
| Project creation | `admin_op` via `storage.space.manage` | `createProject` and `createAppProject` only | BACKEND ONLY |
| Project configuration | Project manager | `updateProject` only | BACKEND ONLY |
| Project membership | Project manager | storage service and legacy `/api/spaces/*` only | BACKEND ONLY |
| TMKT Core roster | `admin_op` | `grant/list/revokeTmktCore` and application aliases | BACKEND ONLY |
| Library capability enable/disable | `admin_op` | `project/capabilities.ts` / application aliases | BACKEND ONLY |
| Library operator roster | Project manager of capability-enabled Project | `grant/list/revokeProjectLibraryOperator` / application aliases | BACKEND ONLY |

The final two are current-only target administration capabilities, so they are excluded from the 32 legacy-capability count. They are nevertheless release-blocking governance gaps when Tempo or public publication is used.

## 7. Project creation/membership findings

### Explicit Project-creation answer

**OLD**

- Who: `admin_op`.
- UI/API: `/admin` → `SpaceAdmin` → `POST /api/spaces`.
- Result: a Team Space. It was not automatically a Project because the Project extension did not exist in the old UI model.

**CURRENT**

- Backend authorization: only `admin_op`; `createProject()` calls `authorize(actor, "storage.space.manage", { kind: "write" })`.
- Application facade: yes, `createAppProject()` in `src/modules/application/projects.ts`.
- Target API: no. There is no `src/app/api/app/projects/route.ts`.
- Target UI: no. `/app/projects` only lists accessible Projects and the Project header only renders identity/navigation.
- `+ New`: no Project choice. `create-dialog.tsx` offers Note, Material, Activity, Task, and Person; only Note has an implemented inline create flow.
- Legacy `/api/spaces` is not a substitute: `createSpace()` creates a Team Space with no `projects` row, verified by `tests/integration/project-foundation.test.ts`.

**Classification: BACKEND ONLY.** The implementation plan is internally unresolved: §17.3 says to omit Project creation until a named global capability exists, while §17.4 lists a global `+ New` Project choice. The actual application context has no `canCreateProject`. This is a product decision/gating omission, not evidence of an intentional retirement.

### Membership answer

Old members could be administered through `/admin`. Current Project managers are authorized to manage the underlying Project Space membership in the service layer, but target People deliberately represents research Persons rather than Users/members (`docs/ui-redesign/final/people-spec.md`). Therefore Project People is not a membership equivalent. Membership is **BACKEND ONLY** and requires a dedicated administration decision/surface.

## 8. Role/capability matrix

`user`, `editor`, and `admin_op` are global roles. Project viewer/contributor/manager are membership roles on the underlying Team Space. TMKT Core and Library operator are additional durable assignments, not role labels. `hasTmktCoreCapability()` currently treats Core membership as sufficient for every listed Core capability, so there is no separate reader-only versus publisher-only roster in the implemented model.

| Actor | Create Project | Manage Project/members | Notes/Materials/People | Activities/Tasks | Library | Publish publicly | Administer users |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anonymous | No | No | Public published Notes only | No | No | No | No |
| Authenticated unrelated user | No | No | No confirmed Project access | No | No | No | No |
| Project viewer | No | No | Read Project research | Read operational modules where member | Request loans only if Project Library enabled | No unless also Core | No |
| Project contributor | No | No | Read/create/edit Project Notes, Materials, People | Read/create/update as task ownership permits | As viewer; no operator transitions unless also operator | No unless also Core | No |
| Project manager | No | Backend only: update Project and roster | Contributor-level rights | Contributor-level rights | Can manage operator roster in backend when capability enabled; cannot circulate unless also operator | No unless also Core | No |
| TMKT Core member (research reader/publisher) | No | No | Read confirmed Project research; not others' drafts | No Activity/Task access without membership | No operational access without membership/operator | Yes for official Notes | No |
| Library operator | No | No unless also manager | Per Project membership role | Per Project membership role | Approve/decline/handover/return in assigned Project | No unless also Core | No |
| `admin_op` | Yes, backend only | Backend-only global Space/admin functions; not automatically a Core member or Project operational member | Project research only through membership/Core; legacy knowledge break-glass differs | No automatic operational grant | Physical/loan APIs globally exist; target library action still depends on Project operator assignment | Only if also Core | Yes, backend only |

Evidence: `src/modules/auth/authorize.ts`, `src/modules/auth/core.ts`, `src/modules/project/service.ts:getProjectApplicationAccess`, `src/modules/project/capabilities.ts`, and the Core/privacy integration tests.

## 9. Missing/regressed capabilities

| ID | Severity | Capability | Evidence | Restoration candidate |
| --- | --- | --- | --- | --- |
| P-01 | P1 | Target Project creation, Project settings, membership, user administration, Core roster, and library-operator administration have no target surface. | Existing old `/admin`; retained services/APIs; no target route/navigation. | NEEDS PRODUCT DECISION. Choose one bounded administration surface and state who may create Projects. |
| P-02 | P1 | Original Material files cannot be downloaded through target UI, despite target-plan scope for versions/download. | Target facade supplies download token but target route/detail has no download action. | RESTORE IN TARGET UI. This is a bounded Material-detail workflow, not legacy Library restoration. |
| P-03 | P1 | Calendar views and standalone deadlines are unavailable; ICS subscription does not replace in-product scheduling. | Legacy Board calendar/Deadline pages plus retained PM APIs; target Tasks/My Work only. | NEEDS PRODUCT DECISION. Decide whether task-only scheduling is acceptable or add a target calendar/deadline view. |
| P-04 | P2 | Project physical holdings cannot be registered, updated, or archived in target UI. | Physical-add application facade; Tempo spec assigns this to Material detail; no current control. | RESTORE IN TARGET UI. Keep it on Material detail, as specified. |
| P-05 | P2 | Note version history/diff/restore, Tree/Wiki structure, proposals/review, releases/export, notifications, comments, and presence remain compatibility-only. | Retained service/API families; deleted user routes; no target consumers. | NEEDS PRODUCT DECISION per cluster; do not restore all legacy pages by default. |
| P-06 | P2 | Personal graph scope and query groups are absent from the target Project Graph. | Target graph data is Project-only and disables groups. | INTENTIONALLY RETIRE or RESTORE IN TARGET UI after confirming desired research model. |

## 10. Intentional replacements/removals

### Replacements with evidence

- Team-Space/Board-oriented daily task work → Project Tasks + My Work.
- Source intake/My Submissions → Project Materials with Material identity and SourceVersions.
- Global Library/circulation → conditional Project Tempo Library.
- Space/Wiki-oriented private search → authorized Project/entity search.
- General graph browsing → read-only Project research Graph.
- Whole-space release-shaped public outcome → stable public Note publication/search.

### Intentional removals

None are counted. The repository contains intentional historical simplifications — for example migration `0028_drop_vaults.sql` documents removal of the redundant Vault container, and `0020_drop_review_bureaucracy.sql` documents removal of an earlier review overlay — but those are not proof that the final pre-cutover Tree/Wiki, review, export, notification, or administration workflows were approved for retirement in TMKT. Stage 17.C deletion alone is not sufficient evidence.

## 11. Backend-only capabilities

The largest backend-only clusters are:

- **Governance:** Project create/update, membership, user admin, audit/health, Core roster, Library capability/operator roster.
- **Knowledge compatibility:** Tree/branches, personal-to-team promotion, translation, maker-checker review, Wiki releases/export, version restore.
- **Work planning:** claim pool, Board calendar, standalone deadlines.
- **Storage/collaboration:** candidate evolve/reject, source controls, notifications, comments, presence.

Retaining these APIs protects existing consumers and tests, but it does not preserve a target user capability. Compatibility routes must not be described as a supported TMKT workflow until a target UI/API contract exists.

## 12. Unknown/product-decision items

1. **Project creation policy.** The backend permits `admin_op`; the design plan calls for a named global capability and is contradictory about whether `+ New` should expose it. Decide whether Project creation belongs to system administration, a separate operator workflow, or a broader role.
2. **Administration placement.** The people specification correctly excludes membership from research People, but no replacement administration surface was accepted. Decide the bounded location and capability model.
3. **Review policy.** Target Core publication is not maker-checker review. Decide whether legacy independent review is a retained governance requirement or deliberately retired.
4. **Calendar/deadline policy.** ICS delivery is implemented. No evidence supports treating it as an equivalent to scheduling views or Google Calendar integration.
5. **Tree/Wiki/export policy.** Decide whether Project Notes deliberately supersede hierarchy, releases, translations, and export or whether a minimal target subset is required.
6. **Password/device management.** OIDC is implemented; no evidence of an old or current password/device-management product surface was found.

## 13. Severity ranking

### P1

- P-01 governance and Project lifecycle inaccessible in target UI.
- P-02 Material original-file download inaccessible in target UI.
- P-03 no calendar/deadline workflow beyond ICS subscription.

### P2

- P-04 physical holdings management missing.
- P-05 knowledge compatibility/collaboration clusters backend-only.
- P-06 personal Graph scope/groups omitted without approval evidence.

### P0 / P3

- P0: none found.
- P3: none separately ranked; low-impact presentation differences are outside this product-completeness audit.

## 14. Restoration recommendations

| Capability cluster | Recommendation | Reason |
| --- | --- | --- |
| Project creation + admin + membership | NEEDS PRODUCT DECISION | Authority and placement are product governance choices. Do not put User membership into Project People. |
| Core and Library-operator roster | RESTORE IN TARGET UI after administration decision | The design spec requires manager/operator separation; backend-only assignment is unsafe operationally. |
| Material download | RESTORE IN TARGET UI | A concrete planned research-material outcome; use the existing target facade rather than legacy Library UI. |
| Physical holdings management | RESTORE IN TARGET UI | Tempo spec assigns this to Material detail. |
| Tasks versus Board | KEEP REPLACED | Target Tasks/My Work covers ordinary task creation, status, assignee, due date, and Activity context. |
| Calendar/deadlines | NEEDS PRODUCT DECISION | Task due dates and ICS do not prove parity for planning/deadlines. |
| Tree/Wiki/hierarchy/review/releases/export | NEEDS PRODUCT DECISION | Preserve user outcomes selectively; do not restore the old shell wholesale. |
| Notifications/comments/presence | NEEDS PRODUCT DECISION | Backend remains, but current collaboration expectations are not documented. |
| Personal Graph scope/groups | INTENTIONALLY RETIRE or RESTORE IN TARGET UI | Confirm whether the Project-only graph is the approved product boundary. |

## 15. Product completeness verdict

**INCOMPLETE — PRODUCT DECISIONS REQUIRED.**

The target is complete enough for users already placed in configured Projects to research, write, work, circulate physical holdings, and publish Notes according to existing capabilities. It is not product-complete for operation of the system itself: Project creation, Project membership, system administration, Core/operator administration, Material download, and planning-policy parity are unresolved. Automated tests/builds validate implemented behavior; they do not establish that these missing target workflows are intentionally retired or release-ready.
