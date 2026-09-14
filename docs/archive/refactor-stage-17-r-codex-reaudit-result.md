# Stage 17.R — Consolidated Codex Re-Audit & Repair

## 1 Verdict

**RATIFIED WITH MINOR REPAIRS.** The Stage 17.6B–17.9 and 17.C foundation is trustworthy enough to continue Stage 17.10 after the normal deployment applies migrations `0050` and `0051`. Stage 17.10 was not started.

## 2 Worker usage

Main worker: Codex Terra Extra High

Luna Max workers used: 3

- Notes/Evidence/provenance audit
- Materials/Extraction audit
- Activities/Tasks/People/Search audit

## 3 Areas audited

- Immutable NoteVersion evidence, all six official version writers, publish rollback, historical restore, and provenance composition.
- Project Materials, SourceVersions, extraction candidates, source lineage, and target/legacy boundary.
- Activity/Person/Task constraints, My Work, Core research-only access, internal Search, GET purity, and application-facade boundaries.
- `/app` cutover, root redirect, target routes, navigation, removed shell references, and retained backend/API classification.

## 4 Defects found

1. A Project contributor adding a SourceVersion was incorrectly subjected to legacy uploader/assignee ownership.
2. PostgreSQL allowed `tasks.activity_id` with a null `tasks.project_id` because the composite FK used nullable `MATCH SIMPLE` columns.
3. `sources.current_version_id` could reference a SourceVersion belonging to another Source.
4. Legacy personal-candidate APIs could list/evolve a confirmed Project candidate.
5. Historical supporting NoteVersion labels could borrow the current Note title when the exact version had no title snapshot.
6. E2E standalone output nested below an inferred parent workspace root, so the test harness could not start it.

## 5 Repairs made

- Allowed the Project Material version path to use confirmed Project contributor authorization; retained legacy source ownership rules for legacy routes. Added workflow coverage.
- Added `0050_task_activity_requires_project.sql` and a direct DB regression: an Activity-linked Task now requires a Project.
- Added `0051_source_current_version_same_source.sql` and a direct DB regression: a current-version pointer must belong to its Source.
- Excluded confirmed Project candidates from legacy personal-candidate listing/evolution; retained all legacy non-Project candidate flows.
- Returned `null` for a missing historical NoteVersion title and rendered a neutral dash instead of using the current Note title. Added provenance coverage.
- Set `outputFileTracingRoot` to the repository root so standalone E2E output is stable despite a parent lockfile.

## 6 Security/privacy

Direct services, not UI visibility, enforce the audited boundaries. Contributor mutations require Project participation; Core can discover/read confirmed Project research but cannot read candidate text or operate Activities/Tasks; unrelated users receive scoped not-found/forbidden outcomes; target API route handlers require a principal. Search reads only confirmed readable Projects and excludes drafts, candidates, personal/projectless research, and Core-only Activity results. Person is independent of auth User, with optional explicit linkage.

## 7 Provenance acceptance test

`zzzzzzzz-application-provenance-discovery.test.ts` verifies:

```text
Conclusion NoteVersion -> Project
  -> exact SourceVersion -> Material -> explicit Activity -> X/Y
  -> exact NoteVersion   -> Note     -> explicit Activity -> X/Y
```

The test verifies persisted relations only, unknown snapshot output, and no historical title fallback. `research-note-support.test.ts` verifies V1/V2 evidence remains distinct, known-empty versus unknown, sealed append-only support, rollback, and explicit failure for restoring unknown history.

## 8 Cutover/routes

`/` redirects to `/app`; the root layout is document-only; `/app` owns the sole application shell. Build artifacts confirm all 12 required routes, including Project Notes, Materials, Activities, Tasks, People, My Work, People detail, and Search. No target navigation references Tree, Board, global Library, Review, WikiRelease, or the former shell/palette.

Retained backend/API classification:

| Classification | Boundary |
| --- | --- |
| STILL_REQUIRED | Project Note/Material/Activity/Task/Person/Search services and their target APIs; authentication, account, graph, download, and cron delivery. |
| PROVEN_DEAD | Deleted legacy browser pages, root shell, sidebar/rail, command palette, preview shell, and their exclusive CSS/components. |
| UNCERTAIN | Legacy Board/Library/Tree/Review/Vault APIs and compatibility services: no target UI calls them, but compatibility and integration/use-case/privacy coverage still reaches their domain paths. No ambiguous backend was deleted. |

## 9 Browser/accessibility

Accessibility spot-check found labelled native controls, semantic headings, skip link, keyboard paths, visible focus tokens, status/error text, and responsive target CSS. Contrast checks passed.

Browser validation is **PENDING**. Playwright located Chromium and the repaired standalone server started, but Chromium could not load `libglib-2.0.so.0`; two browser tests therefore could not launch. The non-browser cron request test passed. No browser/product claim is made.

## 10 Database/test isolation

Normal `wisdomtree` was read only: 50 migrations through `0049`, counts `projects=1`, `tree_nodes=35`, `sources=37`, `source_versions=11`, `extraction_candidates=1`, `activities=0`, `tasks=2`; no mismatched current-version pointers or Activity-without-Project rows were found. It was never seeded or fixture-mutated.

Fresh isolated databases were dropped/created, migrated, seeded, used, and dropped. Final stateful validation used `wisdomtree_test_stage17r_final_20260911`, migrated through `0051`.

## 11 Validation results

| Command | Result |
| --- | --- |
| `npm run test:unit` | PASS — 18 files |
| `npm run test:integration` | PASS — 22 files |
| `npm run test:usecase` | PASS — 3 files |
| `npm run test:privacy` | PASS — 2 files |
| `npm test` | PASS |
| `npm run build` | PASS — 37 static pages; 12 required target route artifacts |
| `git diff --check` | PASS |
| `npm run test:boundaries` | PASS — 209 delivery files, no direct DB access |

## 12 Remaining risks

- Browser walkthrough, keyboard/zoom/reflow inspection, and interactive autosave remain pending solely because the available Chromium lacks `libglib-2.0.so.0`.
- Project Material detail does not yet link an already-evolved working draft after reload; persisted lineage remains intact. This is a recovery UX gap, not a provenance loss.
- Task edit UI can open for a contributor who is neither creator nor assignee; service authorization safely rejects the mutation. This is a non-leaking UX mismatch.
- Operational authorization uses request-resolved Principal memberships. Callers must not reuse a Principal after changing membership within the same request.

## 13 Whether Stage 17.10 may begin

**Yes, after coordinator review and normal migration deployment through `0051`.** Stop here; Stage 17.10 was not implemented or started.
