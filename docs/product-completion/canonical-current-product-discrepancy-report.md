# Canonical Current Product Discrepancy Report

Audit date: 2026-09-13. Scope is PC0 only: no product implementation was started. The audit preserved the existing dirty worktree and corrected stale PC0 draft claims with current source and clean-room evidence.

## Verdict

**CURRENT PRODUCT REVERIFIED.** PR1–PR3 behavior is present in the current checkout, including the current `0053` Activity/Task collaboration migration. This does not mean parity is complete: the ledger records 10 `BACKEND ONLY`, 3 `MISSING`, and 1 `UNKNOWN` original outcomes.

## Confirmed current product truth

- PR1: Admin, Project create/settings/members, user/Core administration, capability/operator management, exact Material download, and physical-holding management have target API/UI paths and passing governance coverage.
- PR2: one Personal Project per active User is protected by a partial unique index, space-kind trigger, and advisory-lock provisioning. Fresh-seed checks found zero active-user cardinality or Project-space mismatches. Personal data is excluded from unrelated users and Core/admin-only access. List/Kanban/Calendar/My Work use Project Tasks; Personal Graph is the owner’s Personal Project graph; ICS is membership/token scoped.
- PR3: Note, Material, Deadline, Activity, and Task have comments, `@mention`, notifications/deep links, replies, and presence. The notification resolver reauthorizes at click time; recipient removal makes a previously issued Activity link unavailable. Public Note DTO/routes do not expose internal collaboration data.

## Remaining discrepancies

| Severity | Class | Discrepancy | Required disposition |
| --- | --- | --- | --- |
| P1 | MISSING | The target offers exact original download, but not a demonstrated target rename, withdraw, or folder workflow. | Product-owner choice; see DQ-2. |
| P2 | BACKEND ONLY | Note history/compare/restore; Tree/Branch; promotion; Wiki/translation/navigation; review; and release/export remain retained services/APIs without target workflow. | Product-owner choices; see DQ-1. |
| P2 | BACKEND ONLY | My Submissions, formal candidate disposition, and global/non-Project catalogue/folders remain without target workflow. | Product-owner choice; see DQ-2. |
| P2 | MISSING | Saved Personal Graph query groups are absent. | Product-owner choice; see DQ-3. |
| P3 | MISSING | Account membership visibility has no Account-equivalent target surface. | Product-owner IA choice; see DQ-4. |
| P3 | UNKNOWN | Pre-cutover password/device-management behavior was not established. | Do not infer a parity requirement without historical evidence. |
| P3 | PROCESS | The package exposes `test:usecase`, not `test:usecases`; the requested plural invocation fails before running tests. | Use the defined singular script or add an alias only under a future explicit change request. |
| P3 | PROCESS | `npm run build` reports that the Next.js ESLint plugin is not detected, although the build succeeds. | Tooling configuration follow-up; it is not evidence of a product defect. |

No current authorization/privacy discrepancy was reproduced in tested target systems. The remaining entries are capability/IA gaps, not permission exceptions.

## Validation evidence

- Fresh disposable PostgreSQL database: zero-to-current migration and seed passed; 54 migrations applied through `0053_activity_task_comment_anchors.sql`.
- Fresh-data SQL checks: zero active users without exactly one Personal Project; zero Personal/shared Project space-kind mismatches.
- Current stateful suites: integration 28/28, use-case 3/3, privacy 2/2.
- Current Chromium smoke through `nix shell nixpkgs#chromium`: 3/3 Playwright tests passed.
- Stabilization gate immediately preceding PC0: formatting, lint, typecheck, unit, boundaries, signing/time/contrast, integration/use-case/privacy, production build, and `git diff --check` passed.

See [authorization matrix](authorization-matrix.md), [privacy matrix](privacy-matrix.md), [migration findings](migration-findings.md), [remaining parity gaps](remaining-parity-gaps.md), and [Decision Queue](decision-queue.md).
