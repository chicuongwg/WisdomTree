# PC0 canonical capability ledger

Audit date: 2026-09-13. This is a source, clean-room migration, stateful-suite, and Chromium-smoke reverification of the current dirty Stage 17 checkout. `B/F/UI` means backend/application facade/target UI. Browser smoke verifies login, session/app/graph entry, and cron authorization; it is not a full visual acceptance pass for every row.

| Total | PRESERVED | REPLACED | REDESIGNED | EXPLICITLY RETIRED | BACKEND ONLY | MISSING | UNKNOWN |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 36 | 15 | 7 | 0 | 0 | 10 | 3 | 1 |

No explicit product-owner retirement decision was found.

| # | Original capability and actual current outcome | Exposure and boundary | Status | Current evidence |
| ---: | --- | --- | --- | --- |
| 1 | Sign in/out | UI; active invited user only | PRESERVED | unit/integration/e2e |
| 2 | Profile/avatar | `/app/account`; self only | PRESERVED | source/browser smoke entry |
| 3 | Notification preferences | `/app/account`; recipient only | PRESERVED | privacy suite |
| 4 | Personal ICS subscription | account + token feed; owner/token bearer | PRESERVED | PR2 integration |
| 5 | Admin creates a Shared Project | B/F/API/UI; `admin_op` | PRESERVED | PR1 integration; `/app/admin` source |
| 6 | Project metadata/status settings | B/F/UI; Project manager, version checked | PRESERVED | PR1 integration; settings route |
| 7 | Project roster and membership roles | B/F/API/UI; Project manager; Personal Project sharing refused | PRESERVED | PR1 integration |
| 8 | User role/disable administration and Core roster | B/F/API/UI; `admin_op` | PRESERVED | PR1 integration; admin routes |
| 9 | Audit and health console | B/F/API/UI; `admin_op` | PRESERVED | admin route inventory |
| 10 | Note drafting/editing/internal publication | Project Notes replace Tree presentation | REPLACED | integration |
| 11 | Note history/diff/restore | retained legacy service/API; no target workflow | BACKEND ONLY | route inventory |
| 12 | Tree/branch hierarchy and authoring | retained legacy service/API; no target workflow | BACKEND ONLY | route inventory |
| 13 | Personal-to-team knowledge promotion | retained proposal service/API; no target workflow | BACKEND ONLY | source |
| 14 | Wiki navigation and translation | retained legacy service/API; no target workflow | BACKEND ONLY | route inventory |
| 15 | Wiki links/backlinks/TOC navigation | retained data/service; no target outcome | BACKEND ONLY | source |
| 16 | Maker-checker review queue | retained proposal flow; Core publishing is not equivalent | BACKEND ONLY | source |
| 17 | Whole-Space release/Markdown/XML export | retained service/API; no target workflow | BACKEND ONLY | route inventory |
| 18 | Public published content | stable public Note slug/revision/search replaces release shape | REPLACED | public routes/source |
| 19 | Task creation/state/assignee/due/Activity link | one Project Task domain powers List, Kanban, Calendar, My Work | REPLACED | PR2 integration |
| 20 | Claim unassigned Task | target task route/UI; authorized operational member | PRESERVED | PR2 integration/source |
| 21 | Calendar/week/month schedule | `/app/calendar` over Project Tasks and Deadlines | PRESERVED | PR2 integration; calendar routes |
| 22 | Standalone Deadline | target Calendar deadline workflow, separate from Task due date | PRESERVED | PR2 and PC1 collaboration integration |
| 23 | Source intake/My Submissions entry | Project Material/version flow replaces intake | REPLACED | integration |
| 24 | Personal My Submissions queue | self-scoped legacy endpoint; no target UI | BACKEND ONLY | route inventory |
| 25 | Download/preview/rename/withdraw/folders | exact original download works; other target outcomes not found | MISSING | PR1 integration; Material download route |
| 26 | Candidate evolve/reject review | candidate reading/continue-to-Note exists; formal queue is legacy-only | BACKEND ONLY | source |
| 27 | Catalogue/circulation | conditional Project Tempo Library replaces global Library | REPLACED | PR1 integration |
| 28 | Global/non-Project catalogue and folders | retained legacy capability; no target workflow | BACKEND ONLY | route inventory |
| 29 | Physical holding registration/update/archive | Material/Library B/F/UI; enabled capability plus operator boundary | PRESERVED | PR1 integration |
| 30 | Private global search | authorized Project/entity research search replaces Space/Wiki search | REPLACED | PR2 integration |
| 31 | Graph visualization/navigation | Project research Graph replaces legacy graph | REPLACED | PR2 integration; e2e graph entry |
| 32 | Personal Graph saved query groups | Personal Project is graph scope; saved groups absent | MISSING | source |
| 33 | Notification centre/read state | `/app/notifications`; recipient-owned and click-time checked | PRESERVED | PR3/PC1 integration |
| 34 | Comments, mentions, replies, notifications, presence | Note, Material, Deadline, Activity, and Task target flows | PRESERVED | PR3 and PC1 collaboration integration; `0053` |
| 35 | Account-visible Space membership | authorized Projects list is not an Account membership equivalent | MISSING | source/route inventory |
| 36 | Password/device management | pre-cutover capability was not established | UNKNOWN | history/source inspection |

## Evidence limits

- The clean-room database applied all 54 migrations through `0053_activity_task_comment_anchors.sql`; `0048`–`0052` are assessed in [migration findings](migration-findings.md).
- PR1 is covered by `tests/integration/zzzzzzzzzz-stage17-pr1-governance.test.ts`; PR2 by `zzzzzzzzzzz-stage17-pr2-personal-projects-task-calendar-graph.test.ts`; PR3 Note/Material by `zzzzzzzzzzzz-stage17-pr3-collaboration.test.ts`; Deadline/Activity/Task collaboration by `zzzzzzzzzzzzz-pc1-collaboration.test.ts`.
- The last file’s `pc1` name does not start PC1 work here; it is pre-existing current-checkout evidence that PC0 re-ran.
