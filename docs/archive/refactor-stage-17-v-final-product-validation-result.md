# Stage 17.V — Final Product Validation Result

## 1. Final verdict

RELEASE READY WITH EXTERNAL BROWSER VALIDATION BLOCKER

## 2. Worker usage

Main worker: Codex Terra Extra High  
Luna Max workers used: 3

- Notes/Evidence/provenance/security.
- Materials/Extraction/Activities/Tasks/People/Search.
- Tempo/Core/public boundary, browser runtime, and legacy classification.

## 3. Browser environment/result

Browser E2E is blocked externally. Cached Chromium and its headless shell cannot load `libglib-2.0.so.0` (and other required shared libraries). The installed Firefox 152.0.4 exits with SIGSEGV under Playwright headless mode. No host package, sandbox, or browser-security change was made. Direct HTTP validation of the standalone build is not presented as browser, responsive, or keyboard validation.

## 4. Product acceptance question

PASS through `zzzzzzzz-application-provenance-discovery.test.ts`: exact official Conclusion NoteVersion resolves to its Project, exact SourceVersion/Material, exact supporting NoteVersion/Note, explicitly linked Activity, and canonical Persons. `research-note-support.test.ts` confirms V1/V2 support immutability, known-empty versus unknown, historical restore, and atomic publication transfer. Composition reads persisted relations only; Activity is labelled **Current Activity context**, not historical Activity snapshot provenance.

## 5. Security/privacy

PASS for Project membership, Core research-read, unrelated-user, and public boundaries in integration/privacy suites. Private drafts, candidates, legacy/projectless research, unauthorized Projects, and Core-only Activity context remain excluded from application search, Graph, provenance activity context, and target workspaces. Public `/p` reads only current public revisions and has no internal provenance, Tasks, Activities, history, or draft delivery.

## 6. Domain/data invariants

Fresh databases applied `0000`–`0051`; normal `wisdomtree` was only read and reports 52 migrations, latest `0051_source_current_version_same_source.sql`. Migration and regression coverage confirm version-scoped append-only support, one-way support sealing, SourceVersion original-representation immutability, same-Source `current_version_id`, and Task Activity→Project consistency. No migration or dependency file changed.

## 7. Major workflows

PASS by service/application coverage for Notes/evidence/restore; Materials/extraction/evolved draft; Activity/Person/Task/My Work; authorized internal Search; Tempo physical circulation; Core stable publication/unpublish; and authorized read-only Graph. Direct standalone HTTP checks verified anonymous `/p` search and `/p/:slug` public projection (200), unknown slug (404), and unauthenticated `/` and `/app` login redirects.

## 8. Responsive/accessibility

Contrast and UI-next contrast checks pass, including focus contrast. Semantic/focus/reflow changes from Stage 17.11 remain type- and unit-checked. Actual browser keyboard, narrow-layout, and 200% zoom execution remains pending because no safe compatible browser can launch.

## 9. Automated validation

Passed: `npm run test:unit` (19), `npm run test:integration` (24), `npm run test:usecase` (3), `npm run test:privacy` (2), `npm test` constituent gates (lint, typecheck, unit, boundaries, signing, time, contrast), production `npm run build` (standalone artifact produced and served), `git diff --check`, and `npm run test:boundaries` (218 delivery files, no direct database access).

Stateful validation used newly created, migrated, seeded, isolated databases; the suites are intentionally not rerun against already-mutated fixtures. No fixture or destructive command targeted normal `wisdomtree`.

## 10. Repairs made

- Added the missing stable public projection/search delivery at `/p` and `/p/:slug`, using the existing public application services only.
- Allowed exactly `/p` and `/p/*` through the login gate; all internal paths remain protected.
- Closed legacy circulation bypasses for confirmed Projects: legacy loan transitions and physical mutations now use the existing capability and Project-library-operator checks, while non-Project compatibility collections retain their legacy policy.
- Added direct regression coverage for those legacy boundaries, public route presence, and Unicode Search across Note, Material, Activity, and Person.

## 11. Legacy backend classification

- **STILL_REQUIRED:** target application facades and their Notes, Material, Activity, Person, Task, circulation, publication, Graph, and storage services.
- **PROVEN_DEAD (target UI only):** old Board, Tree, Review, Wiki, Vault, and global Library screens are not reachable from the canonical shell.
- **UNCERTAIN:** retained compatibility APIs/services under Board, Tree, Vault, Wiki, legacy Library/loans, and related Personal/Team routes. They still have compatibility/test consumers; do not delete in this stage.

## 12. Remaining risks

Browser-only validation remains outstanding as documented above. The provenance read deliberately filters support details to research the actor may still read; a fully hidden support set therefore appears as an empty authorized projection rather than exposing hidden evidence. This is privacy-safe, but any richer partially-visible status needs a future product decision.

## 13. Release recommendation

Proceed with release only with the stated external browser-validation exception recorded. Run the existing Playwright smoke and representative responsive/keyboard flows in CI or a supported browser runtime before treating browser evidence as complete.

## 14. Post-validation cleanup recommendation

After release validation, inventory runtime consumers of every **UNCERTAIN** compatibility API. Retire only routes with zero runtime and test consumers, beginning with legacy Board/Tree/Vault/Wiki delivery; preserve non-Project library compatibility until an owner-approved retirement plan exists.
