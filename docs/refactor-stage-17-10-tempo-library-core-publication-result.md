# Stage 17.10 — Tempo Library + Core Publication

## 1. Verdict

PASS. Stage 17.10 completes the target `/app` Library and Core-publication composition without a schema migration, dependency, legacy UI restoration, or Stage 17.11 work.

## 2. Worker usage

Main worker: Codex Terra Extra High  
Luna Max workers used: 3

- Tempo/Library domain, capability, and circulation tracing.
- Core stable-public publication and public-boundary tracing.
- Target route, application-boundary, and test-isolation tracing.

## 3. Tempo/Library

- `/app/projects/:projectId/library` is now a physical-holdings workspace, not a placeholder. It lists only `source_physical` holdings, opens a selected holding, shows total/available copies, links back to its Material, accepts a member loan request, and gives a current Project operator the existing approve/decline/handover/return workflow.
- The new read composition is one scoped holdings query; it does not call a detail query per row. Materials remain source management; Library excludes digital-only Materials.
- Tempo remains an ordinary Project with `library_circulation`. A non-capable Project is denied by the application facade and target API.

## 4. Core/publication

- The canonical Note Inspector now exposes Core-only `Publish publicly`, `Publish changes`, and `Unpublish` controls through a distinct `/publication` endpoint; internal draft publication remains the separate existing `/publish` endpoint.
- The first public action optionally accepts a slug and confirms the immutable public-revision boundary. Unpublish confirms that identity/history remain.
- Existing Stage 13 service semantics were retained: internal change does not alter the current public revision; explicit publication creates the next immutable revision; unpublish hides the public projection without deleting internal history.

## 5. Authorization/privacy

- Library module visibility requires both the Project capability and current operational membership. Core-only research access therefore cannot open the Library, holdings, availability, or loan queue.
- Borrowing remains the existing Stage 15 member request capability; loan transitions and queue data require a durable same-Project Library operator. Manager without operator is denied.
- Core-only can publish but cannot circulate; operator-only can circulate but cannot publish; the focused integration test also covers both and neither.
- Public reads remain the existing published-revision projection only. No public provenance, Activity, participant, draft, extraction, Task, Material, or internal-version data was added.

## 6. Routes/UI

- Added target routes under `/api/app/projects/:projectId/library` for read, request, and scoped loan transition; they use application facades only.
- Added `/api/app/projects/:projectId/notes/:noteId/publication` for stable public publish/unpublish; it first verifies the Note belongs to the path Project.
- No old `/library`, Proposal, Review, CMS, or duplicate public-search UI was restored. Provenance display and immutable support snapshots were not changed.

## 7. Validation

Normal `wisdomtree` was migrated read/write only through `0051_source_current_version_same_source.sql` (52 recorded migrations) and was never seeded.

Fresh isolated DB lifecycle: `wisdomtree_test_stage1710_final_20260911` was dropped, created, migrated through 0051, seeded, used for stateful suites, then dropped after validation.

- `npm run test:unit` / `npm test`: PASS — 18 unit files; lint, typecheck, signing, time, and contrast checks passed.
- `npm run test:integration`: PASS — 23 files, including `zzzzzzz-stage1710-tempo-publication.test.ts`.
- `npm run test:usecase`: PASS — 3 files.
- `npm run test:privacy`: PASS — 2 files.
- `npm run test:boundaries`: PASS — 214 delivery files, no direct database access.
- `npm run build`: PASS (Next printed its lint-plugin configuration advisory; it did not fail the build).
- `git diff --check`: PASS.
- Browser E2E: PENDING. Playwright started its isolated server and the cron request test passed, but cached Chromium cannot start because `libglib-2.0.so.0` is missing; no browser-flow claim is made.

## 8. Files changed

- Target Library page, component, scoped API routes, localized strings, and narrow Library CSS.
- Application Tempo composition plus physical-holdings query; Project module visibility now requires operational membership.
- Note Inspector publication controls and distinct stable-public API route.
- Focused Stage 17.10 integration coverage and adjusted existing workspace expectations.

No migration or dependency files changed.

## 9. Remaining risks

- Browser interaction, narrow layout, and keyboard walkthrough remain pending until a browser environment provides `libglib-2.0.so.0`.
- Public Explore delivery was intentionally not added: the existing Stage 13 public projection/read/search services remain the public boundary, consistent with the existing publishing specification.

Stage 17.11 has not been started.
