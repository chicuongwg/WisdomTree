# Stage 17.UX-R1 — Global Layout, Project Alignment & Responsive Foundation Repair

## 1. Verdict

**PASS — scoped source repair and structural validation complete.**

This batch closes the shared wide-container defect, supplies one Project module frame, removes Project People's duplicate frame/title, makes the compact-shell navigation discoverable at tablet widths, and anchors Material detail upload controls to the content grid.

No domain behavior, route, authorization, provenance, publication, circulation, migration, or dependency changed. The normal `wisdomtree` database was not migrated, seeded, or tested.

## 2. Worker usage

Main worker: Codex Terra Extra High — implementation, test provisioning, validation, and report.

Luna Max workers used: 3 read-only scouts.

- Container/shell and responsive-breakpoint inspection.
- Project workspace, People, and Material-detail inspection.
- Test-scope and dirty-worktree inspection.

No scout changed files.

## 3. Shared container repair

`PageContainer` now resolves its width through one `--ui-container-width` contract in `src/app/components/ui-next/styles.css`.

- `reading`, `standard`, and `wide` each provide their own width token while retaining the existing 2rem desktop and 1.25rem narrow gutters.
- `wide` now resolves against `--ui-width-wide` rather than inheriting the standard-width cap.
- `full` remains full-width without a second container primitive.

This fixes the desktop workspace canvas while preserving bounded reading surfaces inside modules.

## 4. Project workspace alignment

`src/app/app/projects/[projectId]/layout.tsx` now owns one `ui-next-project-module-frame` below the Project header and local navigation.

- Notes and Materials no longer introduce their own page-level width or auto-margin frame.
- Activities and Tasks retain their standalone `/app/my-work` spacing, but are reset centrally only when rendered in the Project module frame.
- Project People now renders a module-level `People` heading and description in the Project frame; it no longer repeats the Project `h1` or nests a second wide `PageContainer`.
- Project header identity text can shrink and wrap safely beside badges; long Project titles use `overflow-wrap: anywhere`.

This is one shared frame rather than page-specific horizontal margin compensation.

## 5. Material detail repair

The user-provided browser observation established the acceptance target for this route. No new browser claim is made here.

`src/app/components/ui-next/materials.css` now makes the existing upload form a left-aligned grid:

- file field: `minmax(0, 40rem)`;
- upload action: adjacent and bottom-aligned;
- existing border, padding, and tokens retained;
- one-column stack with full-width action at 48rem.

The Material header now aligns its identity block and status from a stable top edge. Header titles, descriptions, and version filenames can wrap without forcing the grid wider. Existing upload, review, retry, continue-working-note, create-note, and lineage actions are unchanged and structurally asserted.

## 6. Responsive shell repair

At the existing `64rem` compact-rail transition, the existing menu trigger is now visible. It opens the existing `Drawer` with the existing `GlobalNavigation`; no second navigation system was added.

The shell retains visible header identity through the tablet interval and hides it only at the existing `44rem` narrow layout. Material's split detail grid now changes at `48rem`, matching the similar Library split-layout threshold. The 46rem Activities/Tasks transition and 900px Notes Inspector handoff remain feature-specific and outside this batch.

## 7. Validation

| Command / check | Result |
| --- | --- |
| `npm run test:unit` | PASS — 19 files |
| `npm run test:integration` | PASS — 24 files |
| `npm run test:usecase` | PASS — 3 files |
| `npm run test:privacy` | PASS — 2 files |
| `npm test` | PASS — lint, typecheck, unit, boundaries, sign, time, contrast |
| `npm run build` | PASS after deleting only the stale ignored `.next` build output |
| `npm run test:boundaries` | PASS — 218 delivery files, no direct database access |
| `git diff --check` | PASS |

Stateful suites ran only against fresh `wisdomtree_test_stage17uxr1_20260911`, migrated through `0051` and seeded for the run. It was dropped afterward; the final existence count was `0`.

The first build compiled but failed while resolving a stale Turbopack chunk in ignored `.next`. A clean production build then passed. No source change was made to address that cache artifact.

## 8. Files changed

UX-R1 implementation/test changes:

- `src/app/components/ui-next/styles.css`
- `src/app/components/ui-next/shell.css`
- `src/app/components/ui-next/project-workspace.css`
- `src/app/components/ui-next/notes.css`
- `src/app/components/ui-next/materials.css`
- `src/app/components/ui-next/activities-tasks.css`
- `src/app/app/projects/[projectId]/layout.tsx`
- `src/app/app/projects/[projectId]/people/page.tsx`
- `src/app/app/people/_components/people-directory.tsx`
- `tests/unit/ui-next-app-shell.test.ts`
- `tests/unit/ui-next-project-workspace.test.ts`
- `tests/unit/ui-next-materials-workflow.test.ts`
- this report

Schema migrations: 0. Dependencies: 0.

## 9. Browser status

**Browser validation = BLOCKED.**

Playwright Chromium still exits before opening a page because `libglib-2.0.so.0` is unavailable. No browser package, browser-security setting, host configuration, deployment, or application source was changed to bypass this limitation.

The Material-detail symptom is recorded as **USER-PROVIDED browser evidence**. All other completion claims in this report are source-level and structural-test claims, not new visual-browser observations. Desktop/tablet/mobile and 200% visual confirmation remain required when a compatible browser runtime is available.

## 10. Remaining UX-A findings

| Audit ID | UX-R1 status | Scope note |
| --- | --- | --- |
| UXA-01 | CLOSED | Wide `PageContainer` has a distinct gutter-aware width contract. |
| UXA-02 | CLOSED | Project layout owns one module frame; competing module page insets were removed or centrally neutralized. |
| UXA-03 | CLOSED | Project People no longer duplicates Project title or outer container. |
| UXA-07 | CLOSED | Existing Drawer affordance appears when the sidebar becomes icon-only. |
| UXA-14 | CLOSED | Shell and target split-grid transitions were reconciled without a new breakpoint framework; unrelated feature thresholds remain intentionally deferred. |
| UXA-04 to UXA-06 | NOT CLOSED | Tasks, Notes Inspector, and Activity hierarchy are later batches. |
| UXA-08 | NOT CLOSED | Public presentation is deferred. |
| UXA-09 and UXA-15 | PARTIALLY CLOSED | Material filename and Project header wrapping improved as a direct foundation effect; broader card/row treatment is deferred. |
| UXA-10 to UXA-13 | NOT CLOSED | Library, People/Search, Graph, and Account visual work is deferred. |
| UXA-16 to UXA-18 | NOT CLOSED | Notes density, public search, and Account mobile polish are deferred. |

UX-R1 stops here. No later visual-repair batch was started.
