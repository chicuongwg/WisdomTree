# PC3 — Product Consistency & Legacy Cleanup Result

## Result

**PC3 COMPLETE.** Every legacy component inspected has an explicit retention reason or compatibility classification. No data-bearing or externally reachable compatibility code was falsely treated as dead.

## Bounded maintenance completed

- Consolidated the target Account screen onto `ui-next` localization; it no longer imports the legacy `lib/vi` copy/state layer.
- Localized the confirmed Vietnamese-locale English PC2 copy for Note history, TOC/navigation, Personal-to-Shared promotion, and Project export.
- Repaired privacy-test isolation: it now creates its own restricted Note through the approved draft/publish flow rather than assuming seed content has no translation proposal.

## Consumer and vocabulary audit

- Target UI/API still follows `delivery → application facade → domain service → database`; boundary test passes with 266 delivery files and no direct database access.
- No active target navigation points to Tree, Branch, WikiRelease, Board, Vault, or old Space screens. Root, Account, and Graph compatibility pages only redirect into the target shell.
- Target application DTOs keep Project/Note/Material terminology; remaining `Space`, `Branch`, and Wiki terms are storage, export, migration, or compatibility details rather than user-facing target concepts.
- PC2 History, navigation, promotion, Material stewardship/candidate review, submissions, and Project export remain backed by required compatibility data/services; none was indirectly broken or removed.

## Retained legacy code

See [legacy retention/deletion ledger](pc3-legacy-retention-deletion-ledger.md). The largest retained clusters are Tree/Branch compatibility, translations, maker-checker records, WikiRelease persistence/export, and Space identity/APIs. Their removal requires a future explicit data-retention and external-API sunset plan.

## Remaining maintainability debt

1. `knowledge/drafts.ts`, `storage/service.ts`, and `pm/service.ts` remain large. They were not split because PC3 found no single boundary whose extraction reduces current coupling without risking authorization/history behavior.
2. `lib/vi` remains for legacy routes; target delivery no longer imports it. A future bounded retirement can remove it only with the last legacy delivery consumer.
3. Compatibility APIs remain unversioned and lack a documented external sunset policy. That policy is the prerequisite for a future deletion pass.

## Removed compatibility code

None. No cluster met the **PROVEN DEAD** standard after its current consumers,
retention duties, and externally reachable route contract were traced. This is
intentional: deleting an unversioned authenticated route merely because the
target UI does not link to it would be an unsupported compatibility break.

## Validation

- Prettier fix and targeted check: PASS.
- Migration from zero through `0053`, then destructive demo seed: PASS.
- `npm test`: PASS (lint, typecheck, 20 unit files, boundary, signing, time,
  and contrast checks).
- Integration: 29 files PASS; usecase: 3 files PASS; privacy: 2 files PASS.
- Production build: PASS.
- Real Chromium E2E (temporary `nixpkgs#chromium`): 5/5 PASS. It exercised
  Notes, Materials, Activity, Task detail and Kanban, Calendar, Graph, Admin,
  and the Project-export entry point.
- `git diff --check`: PASS.

## Workspace hygiene

- Temp DBs created: `wisdomtree_test_pc3_20260913` (one logical PC3 DB; recreated
  once after an E2E fixture contaminated a seeded-count assertion).
- Temp DBs removed: `wisdomtree_test_pc3_20260913`.
- DB absence verified: PASS, queried `pg_database` after the final drop.
- Temp files/dirs created: Playwright `tests/e2e/.auth` and `test-results`.
- Temp files/dirs removed: both; absence verified.
- Temp processes started: temporary Next standalone server, Playwright, and
  nixpkgs Chromium for E2E.
- Temp processes stopped: all exited with Playwright; port 3000 and
  work-specific server/browser processes verified absent.
- Remaining temp resources: none.
- Intentionally retained artifacts: normal `.next` production-build output,
  because it is the repository's standard build output rather than a PC3-only
  temporary artifact.

## Exit conditions

```text
Every remaining legacy component: explicit reason to exist  PASS
No capability regression                                  PASS
No historical-data regression                             PASS
No migration regression                                   PASS
No target authorization/privacy regression                PASS
Workspace hygiene                                         PASS
```
