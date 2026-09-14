# PC5 — Independent Final Product Validation

Date: 2026-09-13

## Verdict

**PC5 COMPLETE.** This work treated PC0–PC4 as claims and re-ran migrations,
stateful suites, production build, and Chromium against a newly created
disposable database. No product implementation was needed.

## Independent technical gate

| Check | Result |
| --- | --- |
| Fresh install | PASS — all 54 SQL migrations, `0000` through `0053`, applied to an empty database, then demo seed completed. |
| Upgrade path | PASS — a schema constructed at `0052` was advanced by the production runner; it skipped `0000`–`0052` and applied only `0053_activity_task_comment_anchors.sql`. |
| Unit and static gates | PASS — `npm test`: lint, typecheck, 20 unit files, 266-file boundary check, signing, time, and both contrast gates. |
| Stateful gates | PASS — 29 integration files, 3 use-case files, and 2 privacy files. |
| Formatting/integrity | PASS — Prettier check and `git diff --check`. |
| Production build | PASS — optimized Next build completed. Next printed its existing non-fatal ESLint-plugin configuration warning. |

## Product-completeness and parity gate

The finalized ledger was checked as the parity baseline: **35 evidenced
capabilities = 15 PRESERVED, 8 REPLACED, 7 REDESIGNED, 5 explicitly
owner-approved retirements; 0 BACKEND ONLY, 0 MISSING, 0 UNKNOWN.**

- Admin/Project/roster/user/Core/Library-operator/holding outcomes: independent
  PR1 governance and Tempo tests, plus Admin and Library target entry points.
- Research outcome: Project Note draft, immutable version/provenance, exact
  Material version, extraction candidate, working Note/evidence, and internal
  publishing: independent integration/use-case evidence. Project Note history,
  diff/restore, navigation, Personal-to-Shared provenance, Material stewardship,
  candidate disposition, submissions, and Project export were re-exercised by
  the PC2 resolution test and browser-visible entry points.
- Task outcome: one Project Task domain feeds task detail, List/Kanban,
  Calendar, and My Work; Personal and Shared isolation is re-exercised by PR2.
- Collaboration: Note, Material, Deadline, Activity, and Task each have the
  common comment/mention/notification/reply/presence loop in PR3/PC1 tests;
  Activity and Task target pages were additionally opened in Chromium.
- Owner-approved retirements remain accounted for and do not require a legacy
  screen: Tree/Branch hierarchy, formal translation workflow, maker-checker,
  global non-Project catalogue, and saved Personal Graph groups. The Projects
  list remains the accepted complete replacement for Account membership view.

No required target workflow depends on a removed legacy UI. Retained
compatibility/persistence code is still treated as required for history,
provenance, export, or compatibility; PC5 did not delete it.

## Authorization and privacy gate

The independently run PR1, PR2, PR3, PC1, PC2, application-contract, Tempo,
and privacy tests exercise ordinary user, viewer, contributor, manager, Core,
Library operator, `admin_op`, combined Core/operator, unrelated, and disabled
actors. They verify allowed completion and persisted state as well as denied
reads/writes.

Personal Project isolation was re-exercised for Notes, Materials, Activities,
Tasks, comments, search, Graph, Calendar, ICS, Core reads, provenance,
notifications, and presence. In particular, Core status does not grant
operational Personal Project access; non-members cannot list/comment/presence;
disabled accounts leave historical data intact but leave mention/presence
eligibility.

Public delivery was independently checked in both integration and Chromium:
the public DTO excludes provenance and Activity metadata, and an anonymous
public Note rendered without collaboration or presence UI. Public search and
published Note routes remained reachable without private Project data.

## Real browser workflow gate

Chromium was launched temporarily through `nixpkgs#chromium` against the PC5
database.

| Viewport / journey | Result |
| --- | --- |
| Default desktop | PASS — 7/7 E2E: signed-out gate, authenticated app/Graph, cron boundary, PC2 research seams, PC3 workspaces, mobile-responsive route test, and notification click-time deep-link. |
| Tablet 768×1024 | PASS — same 7/7 suite. |
| Mobile 390×844 | PASS — Activity mention picker keyboard selection, reply visibility, Inspector Drawer Enter/Escape/focus restoration, Kanban lane overflow, and public Graph/search/Note no page overflow. |
| Wide desktop 1440×900 | PASS — Task comment submission, mention selection, persisted reply, and anonymous public Note absence of collaboration/presence UI. |

The browser fixture uses a fresh Personal Project for an invited user, an
admin-created Shared Project with a collaborator, long multilingual Project,
Note, Material, and User data, Activity/Task, public Note, and a notification
recipient. Full state transitions not practical to duplicate as browser clicks
(admin provisioning, extraction/version persistence, publication authority,
and Tempo request-to-return) were independently re-run in the stateful
use-case/integration tests, while their canonical target entry points were
opened in Chromium. Tempo request → approval → handover → return persists in
the library use-case and Tempo integration tests.

## Accessibility evidence limitation

Keyboard focus/Drawer/Escape, labels, focus styles, contrast, reduced-motion
code path, and no-overflow checks have automated or Chromium evidence. The
environment has Firefox but no installed screen-reader such as Orca, so PC5
does **not** claim direct screen-reader-session evidence. This is a bounded
evidence limitation, not a reproduced defect.

## Final gates

```text
Technical correctness            PASS
Product capability completeness  PASS
Authorization/privacy            PASS
Migration integrity              PASS
Browser workflows                PASS
Responsive/accessibility         PASS with explicit screen-reader evidence limitation
Legacy parity accounted for      PASS
Workspace hygiene                PASS
```

## Workspace hygiene

- Temp DBs created: `wisdomtree_test_pc5_20260913` (one disposable DB).
- Temp DBs removed: `wisdomtree_test_pc5_20260913`.
- DB absence verified: PASS — queried `pg_database` after `DROP DATABASE`.
- Temp files/dirs created: E2E auth state, Playwright result directory,
  temporary tablet/wide configs, a temporary PC5 browser spec, and
  `/tmp/wisdomtree-pc5-upgrade-base.log`.
- Temp files/dirs removed: all; absence verified.
- Temp processes started: temporary Next E2E server, Playwright, and nixpkgs
  Chromium.
- Temp processes stopped: all exited; port 3000 and work-specific processes
  verified absent.
- Remaining temp resources: none.
- Intentionally retained artifacts: this report and normal `.next` production
  build output. The report is required product documentation; `.next` is normal
  repository build output, not PC5-only evidence.

No release approval is issued by PC5.
