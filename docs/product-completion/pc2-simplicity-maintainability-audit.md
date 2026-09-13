# PC2 simplicity and maintainability audit

Date: 2026-09-13. This is a full-repository source and validation audit, not a cleanup implementation. PC3 remains locked.

## Scope and verdict

- 377 source files, 43,630 source lines, 63 test files, and 54 forward-only migrations (`0000`–`0053`) were scanned.
- Delivery boundaries pass: 266 delivery files have no direct database access.
- The current target surface is Project-first and has no active legacy navigation entries for Tree, Board, Library, Review, or WikiRelease.

**Verdict: the target product is functionally compact enough to ship, but the repository is not yet structurally simple.** The user-facing target is bounded; the remaining complexity is mainly retained migration compatibility. Do not try to remove it in PC2.

## Findings

1. **P2 — Legacy compatibility remains the largest maintenance cost.** `src/modules/knowledge/drafts.ts` is 1,113 lines and still combines Project Note compatibility Branches with retired translation and maker-checker behavior. `src/modules/storage/service.ts` (1,103 lines) and `src/modules/pm/service.ts` (1,084 lines) likewise carry both target and retained legacy concerns. This is intentional data/migration compatibility, not active target UI. Removing it now would violate the explicit PC2 retirement/data-retention guard. **Action:** defer to PC3 only after a retention/export/migration plan, as listed in `pc2-remaining-cleanup-candidates.md`.

2. **P2 — Two localization/copy systems coexist.** Current target UI uses `ui-next` locales, while older target-adjacent screens still import `src/lib/vi` (`T`, state maps, and copy). The Account screen already uses both. This increases the chance of inconsistent wording and untranslated additions. **Action:** choose one localization boundary in a dedicated maintenance batch; do not mechanically merge maps while legacy routes still consume `src/lib/vi`.

3. **P2 — Some PC2 reader/settings copy is hard-coded English.** History, Note promotion/navigation, and Project export use direct English strings, whereas the active browser fixture uses Vietnamese locale. It works, but it violates the existing locale seam and weakens product polish. **Action:** localize these strings through the existing `ui-next` locale files in the next small UI maintenance batch. This is not an authorization, privacy, or data-integrity failure.

4. **P3 — Large modules are serviceable but are natural future split points.** The three modules above exceed 1,000 lines and cover multiple bounded concerns. The application facade keeps delivery code out of the database and current tests enforce that boundary, so a broad rewrite would add risk without improving user outcome. **Action:** split only when modifying a specific concern; do not introduce a generic framework or repository-wide reorganization.

5. **P3 — Stateful suite fixtures needed one isolation repair.** The privacy test assumed a seeded restricted Note had no pending translation; integration can legitimately create one. The privacy fixture now creates its own restricted Note through the approved draft/publish path. This removes test-order coupling without adding product code.

6. **P3 — Migration history is long but correct.** The 54 migrations include historical create/drop transitions and compatibility records. Fresh zero-to-`0053` migration and seed pass. Squashing or rewriting committed history would raise deployment risk and is not a simplification worth doing now.

## Deliberate non-findings

- No active target screen resurrects Tree/Branch, formal translation workflow, maker-checker queue, non-Project catalogue, saved Graph groups, or WikiRelease UI.
- No direct database access was found in target delivery code.
- No authorization/privacy regression was found in PC2 seams.
- No generic abstraction or new framework was added for PC2; each seam uses existing Project, Note, Material, notification, and export services.

## Recommended operating rule

Keep the current target model: **Project → Note/Material/Task/Activity**, with provenance and collaboration as focused seams. Treat compatibility code as a contained migration burden. Future work should remove one retired cluster at a time only after its data/export obligation is discharged; it should not re-architect the working target.
