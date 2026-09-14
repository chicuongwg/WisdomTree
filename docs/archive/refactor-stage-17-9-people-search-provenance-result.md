# Stage 17.9 — People, Research Search & Provenance Discovery

## 1. Verdict

**PASS.** Full mandatory validation gate completed 2026-09-03 (Asia/Ho_Chi_Minh, UTC+7). Stage 17.9 adds target application read/delivery contracts only; no schema migration or normal-domain data mutation is required.

## 2. Worker usage

Main worker: **Codex Terra High**
Luna Max workers used: **0**

## 3. People/Search model

- `/app/people` lists canonical Persons discoverable through confirmed readable Projects.
- `/app/people/:personId` presents canonical Project contexts and only operational Activity context the current actor may view.
- `/app/projects/:projectId/people` uses the existing Project↔Person relation, explicitly separate from Project membership. A contributor/manager with the existing capability may create a Person in the Project context.
- `/app/search` uses the existing PostgreSQL text search for Projects, official Notes, Materials, canonical Persons, and Activities. Result DTOs use target terms only.

## 4. Provenance composition

`getAppNoteResearchProvenance(actor, noteVersionId)` composes the Stage 9 immutable support snapshot for one exact official Note version. It returns the target Project, supporting Material version and supporting Note version identities, and any currently visible Activity context with canonical participants.

The model distinguishes immutable source/support evidence from current operational Activity context. It does not infer missing relationships. `snapshotStatus: unknown` returns no fabricated support data.

## 5. Authorization/privacy

Search constrains Project scope before ranking/returning results. It excludes drafts, candidates, legacy/projectless Notes, Personal research, and unconfirmed Spaces.

Core research read enables Project/Note/Material/Person discovery across confirmed Projects. It does not widen Activity search or Activity provenance context: those remain limited to actual current Project membership, preserving Stage 12's operational boundary. Provenance reads use existing research-read checks for the target and each supporting item.

## 6. UI/routes

Implemented target routes:

- `/app/people`
- `/app/people/:personId`
- `/app/projects/:projectId/people`
- `/app/search`
- `POST /api/app/projects/:projectId/people`
- `PATCH /api/app/people/:personId`

The Note inspector now displays exact-version research provenance and links to target Project Material/Note and authorized Activity pages. Private draft evidence remains private and does not use this official provenance view.

## 7. Acceptance-question result

Stage 12's two access modes remain intentionally distinct: Core without membership may discover/read official research in another confirmed Project, but cannot see its Activities or Activity-derived context. No operational access is synthesized from Core membership.

## 8. Tests/validation

Stateful checks used disposable `wisdomtree_test_stage179_20260903`, migrated and seeded independently of normal `wisdomtree`. The previous stale test database (accumulated from earlier focused runs) was dropped and recreated fresh before the full gate run.

### `npm run test:unit` — PASS

```
Running tests/unit/auth.test.ts
Running tests/unit/authorize.test.ts
Running tests/unit/content.test.ts
Running tests/unit/diff.test.ts
Running tests/unit/error-translator.test.ts
Running tests/unit/errors.test.ts
Running tests/unit/graph-settings.test.ts
Running tests/unit/note-version-provenance.test.ts
Running tests/unit/ui-next-activities-tasks-workflow.test.ts
Running tests/unit/ui-next-app-shell.test.ts
Running tests/unit/ui-next-cutover.test.ts
Running tests/unit/ui-next-evidence-workflow.test.ts
Running tests/unit/ui-next-foundation.test.tsx
Running tests/unit/ui-next-materials-workflow.test.ts
Running tests/unit/ui-next-notes-editor.test.ts
Running tests/unit/ui-next-overview-projects.test.ts
Running tests/unit/ui-next-project-workspace.test.ts
Running tests/unit/vault.test.ts
Passed 18 test files.
```

### `npm run test:integration` — PASS

```
Running tests/integration/api.test.ts
[cron:dispatch] CRON_SECRET is not configured
Running tests/integration/db.test.ts
Running tests/integration/drafts.test.ts
Running tests/integration/library-loans.test.ts
Running tests/integration/note-project-ownership.test.ts
Running tests/integration/person-foundation.test.ts
Running tests/integration/project-extraction-note.test.ts
Running tests/integration/project-foundation.test.ts
Running tests/integration/project-material-intake.test.ts
Running tests/integration/project-materials-target-workflow.test.ts
Running tests/integration/research-note-support.test.ts
Running tests/integration/session.test.ts
Running tests/integration/task-project-ownership.test.ts
Running tests/integration/wiki-release.test.ts
Running tests/integration/z-activity-foundation.test.ts
Running tests/integration/z-maker-checker.test.ts
Running tests/integration/zz-hybrid-core-authorization.test.ts
Running tests/integration/zzz-stable-public-publishing.test.ts
Running tests/integration/zzzz-cross-project-search.test.ts
Running tests/integration/zzzzz-tempo-capability-cleanup.test.ts
Running tests/integration/zzzzzz-application-contract.test.ts
Running tests/integration/zzzzzzzz-application-provenance-discovery.test.ts
Passed 22 test files.
```

### `npm run test:usecase` — PASS

```
Running tests/usecase/admin-journey.test.ts
Running tests/usecase/knowledge-journey.test.ts
Running tests/usecase/library-journey.test.ts
Passed 3 test files.
```

### `npm run test:privacy` — PASS

```
Running tests/privacy/account-privacy.test.ts
Running tests/privacy/isolation.test.ts
Passed 2 test files.
```

### `npm test` — PASS

```
> npm run lint && npm run typecheck && npm run test:unit && npm run test:boundaries \
    && npm run test:sign && npm run test:time && npm run test:contrast \
    && npm run test:ui-next-contrast

lint:              PASS (no warnings)
typecheck:         PASS (tsc --noEmit)
test:unit:         PASS (18 files)
test:boundaries:   PASS (209 delivery files, no direct database access)
test:sign:         PASS (6 checks)
test:time:         PASS (56 checks across 4 timezones)
test:contrast:     PASS (15 WCAG checks)
test:ui-next-contrast: PASS (24 WCAG checks)
```

### `npm run build` — PASS

```
▲ Next.js 15.5.22
✓ Compiled successfully in 15.7s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (37/37)

Stage 17.9 routes confirmed in build output:
  ƒ /app/people
  ƒ /app/people/[personId]
  ƒ /app/projects/[projectId]/people
  ƒ /app/search
```

### `git diff --check` — PASS

No whitespace errors (exit 0).

### `npm run test:boundaries` — PASS

```
Layer boundaries: 209 delivery files, no direct database access.
```

## 9. Files changed

- application/domain provenance composition and Person context reads
- target People and Search pages/API routes
- Activity-aware internal search, constrained to operational membership
- Note inspector provenance presentation
- focused provenance integration test and Stage 14 search regression
- this result report

## 10. Remaining risks

- Activity contexts are current operational context, not immutable historical Activity snapshots; the UI labels them accordingly.
- There is no Person edit form yet despite the target PATCH boundary; this preserves scope while leaving the existing service contract usable.
- Browser walkthrough, keyboard flow, and responsive visual validation require an isolated browser/E2E environment (deferred to Stage 17.V).
