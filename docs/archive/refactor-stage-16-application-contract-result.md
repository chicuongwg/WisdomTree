# Stage 16 — Target Application Contract / Delivery Foundation Result

## 1. Result

**PASS.** WisdomTree now exposes a Project-centric application facade for the future internal UI without changing schema, routes, UI, navigation, ownership, seed data, or legacy delivery behavior.

The facade composes the accepted domain services rather than duplicating their business rules. It exposes confirmed Projects, Notes, Materials, Activities, Tasks, canonical People, research search, stable publication, and Tempo circulation through target DTOs and server-computed capabilities. `Space`, `Branch`, Personal/Team scope, legacy WikiRelease, raw permission strings, storage object keys, and global-library assumptions do not appear in target DTOs.

No target HTTP namespace was added. The application facade is the stable server-side delivery boundary; thin route adapters can be added with the new UI when its server/client transport requirements are known.

## 2. Target application architecture

The new `src/modules/application` module is a composition layer:

```text
new UI / future thin delivery adapters
              ↓
     application facade + DTOs
              ↓
 accepted Project/domain services
              ↓
       repository/database layer
```

The application layer does not query the database directly. Narrow domain read helpers were added only where the accepted service surface lacked a safe target read: Project application access, exact Project Note detail, Note publication status, Project Material extraction state, and library-operator capability state.

The existing delivery routes remain unchanged and continue to use legacy contracts. No cutover occurred.

## 3. DTO conventions

Target DTOs use product terms:

```text
Project
Note / Draft
Material
Activity
Task
Person
Publication
Library capability
```

They use stable IDs, explicit discriminants where needed, `ProjectRefDto` for context, ISO timestamps at the delivery boundary, and named capability booleans. They do not expose ORM rows or legacy storage/scope decisions.

The focused contract test recursively rejects these legacy keys in target DTOs:

```text
spaceId
spaceType
branchId
branchType
personal
team
wikiRelease
```

Material DTOs omit storage object keys. Public DTOs continue to expose only the immutable public projection accepted in Stage 13.

## 4. Authorization/capability presentation

`getProjectApplicationAccess` computes current capabilities from durable database state on every call. It separates:

- `researchReadable`: Project membership or explicit TMKT Core;
- `operationalMember`: actual current Project membership;
- Project mutation capabilities: current contributor/manager membership only;
- `canPublish`: explicit current TMKT Core membership;
- `isLibraryOperator`: enabled capability, explicit Project operator relation, and current Project membership;
- `canManageLibraryOperators`: Project manager plus enabled library capability.

Target DTOs expose named booleans such as `canCreateNote`, `canCreateTask`, and `canPublish`; they do not require the frontend to interpret `viewer`, `contributor`, `manager`, `admin_op`, `editor`, or raw permission strings.

Core retains cross-Project research read and publish eligibility, but not private-draft access, Tasks, Activities, authoring, Project management, or circulation operations without the required Project participation/operator state.

## 5. UI locale contract

The authenticated application context now includes:

```text
locale: "vi" | "en"
supportedLocales: ["vi", "en"]
```

Vietnamese is the fallback for missing or unsupported persisted values. `setApplicationLocale` validates the two supported interface locales, persists the User preference, and audits `user.locale.update` without changing research content.

Locale is an interface preference only. It does not imply content translation or restrict the language of Notes, Materials, Persons, Activities, or Projects.

## 6. Unicode research-content contract

Application contracts preserve arbitrary valid Unicode strings. The focused test round-trips Vietnamese, English, CJK, Japanese, Korean, French, Arabic, and a supplementary-plane character through Project Note, Material, and Person write/read paths. It also verifies that returned DTOs contain no replacement character.

The application layer performs no ASCII-only validation, transliteration, or UI-locale-driven content rewriting.

## 7. TMKT Overview contract

`getTmktOverview(actor)` composes:

- application context;
- accessible confirmed Projects;
- `getMyWork(actor)`.

`getMyWork` includes assigned Project Tasks and non-cancelled Activities only from Projects where the actor has current operational membership. Core research-read alone does not create operational work visibility.

## 8. Project workspace contract

`getProjectWorkspace(actor, projectId)` returns:

- Project identity and metadata;
- server-computed access/capability booleans;
- module availability for Overview, Notes, Materials, Activities, Tasks, People, and conditional Library.

Library visibility is determined only by the `library_circulation` Project capability. Project name has no effect. Confirmed Project resolution remains mandatory; legacy Team Spaces and Personal Spaces cannot enter this target contract.

Project collection/create/update contracts are also exposed through the facade. Their DTOs preserve `Project.id == Space.id` internally without exposing Space as a product concept.

## 9. Notes/Materials/Activities/Tasks/People contracts

### Notes

The facade supports Project Note list/detail, private author draft reads, Project Note creation, draft update, edit-draft save, working-state inspection, purpose changes, internal draft publication, and research-support mutations. Callers never select Branch or Personal/Team scope.

Note detail includes exact Project context, current official content/version, tags, working-state summary, publication state, and server-computed action capabilities. Publication state is one of:

```text
never_published
published_current
published_with_changes
unpublished
```

### Materials

The facade supports Project Material list/detail/create, version upload, safe download token acquisition, and Project-derived extraction state. Material ownership remains `Source.space_id == Project.id` internally. The target DTO calls this `project`, does not expose a generic Space, and never returns the storage object key.

### Activities

The Activity detail contract composes Activity metadata with participants, Materials, Notes, and Tasks. Mutation capabilities remain Project-member based. Relation operations reuse the Stage 11 same-Project invariants.

### Tasks

Project Task list/detail/create/update and Activity attach/detach contracts preserve one Task identity and immutable Project ownership. Legacy unassigned Tasks cannot enter Project lists.

### People

The facade exposes canonical Person list/detail/search/create/attach/update behavior. Person identity remains global while visible Project contexts remain authorization-filtered. Project-Person relations do not grant access.

## 10. Search contract

The application module exports two explicit boundaries:

```text
searchAppResearch(actor, input)
searchPublicNotes(input)
```

Internal search retains the Stage 14 authorization-first Project scope for Project, Note, Material, and Person results. Public search continues to query only current, available immutable public revisions. Neither contract searches drafts, Personal/legacy content, operational work, or historical public revisions as separate hits.

Search results are explicit DTOs suitable for navigation by kind and stable identity; they do not expose raw ORM/storage/auth state.

## 11. Tempo/circulation contract

Tempo remains an ordinary confirmed Project with `library_circulation`. The application facade exposes capability-gated Project library operations and Project-scoped operator administration without identifying Tempo by name.

Target contracts cover:

- Project loan list;
- Material loan request;
- approve/decline/handover/return transitions;
- physical representation attachment;
- Project library-operator list/grant/revoke.

Material/loan ownership derives the Project internally. Transition DTOs use `loanId`, `materialId`, state, dates, and borrower display data; they do not expose legacy item/source authorization scope. Core research read alone does not reveal operational loan lists or authorize a transition.

## 12. Publishing/Core contracts

The facade exposes explicit Core roster administration and stable Note publish/unpublish operations. Publication authorization still consumes durable explicit Core state and does not require Project membership.

Public reads continue through the Stage 13 immutable revision DTO. The application facade never uses mutable internal Note state for anonymous delivery and does not expose internal research support, drafts, membership, or audit data.

## 13. Target delivery/API strategy

Stage 16 deliberately uses server-side TypeScript application facades as the delivery foundation. No HTTP routes were necessary to establish or test the target contracts.

Recommended delivery strategy for Stage 17:

1. Server-rendered reads call these facades directly.
2. Add thin target mutation adapters only where client interactions require HTTP.
3. Translate failures with `toApplicationError` into stable classes: `not_found`, `forbidden`, `invalid_input`, `version_conflict`, `invalid_state`, or `internal_error`.
4. Keep domain validation and authorization in accepted services.

This avoids inventing a large API surface before the replacement UI determines actual transport needs.

## 14. Legacy isolation

Stage 16 did not change or delete legacy routes, UI, Branch, Personal/Team compatibility, WikiRelease, global Board, or old library flows.

The target application module has no direct database import. Its outward DTOs hide legacy abstractions and raw global permission names. Internal adapters may compose accepted legacy-shaped service data, but that shape stops at the application boundary.

Boundary validation reports 205 delivery files with no direct database access.

## 15. Database/schema impact

No migration was created or applied. Normal database migration head remains:

```text
0047_tempo_project_capability.sql
```

Normal `wisdomtree` before and after fingerprints are identical:

| Table | Before | After |
| --- | ---: | ---: |
| projects | 1 | 1 |
| tree_nodes | 34 | 34 |
| sources | 36 | 36 |
| persons | 0 | 0 |
| activities | 0 | 0 |
| tasks | 2 | 2 |
| note_publications | 0 | 0 |
| note_public_revisions | 0 | 0 |
| project_capabilities | 0 | 0 |
| project_library_operators | 0 | 0 |

All stateful validation used the explicitly isolated `wisdomtree_test_stage16` database.

## 16. Tests executed

| Command | Result |
| --- | --- |
| Focused `zzzzzz-application-contract.test.ts` with explicit isolated `DATABASE_URL`/`TEST_DATABASE_URL` | PASS |
| Fresh migrate + seed through `0047` on `wisdomtree_test_stage16` | PASS |
| `TEST_DATABASE_URL=... npm run test:integration` | PASS — 20 files |
| `TEST_DATABASE_URL=... npm run test:usecase` on a fresh isolated reset | PASS — 3 files |
| `TEST_DATABASE_URL=... npm run test:privacy` on a fresh isolated reset | PASS — 2 files |
| `npm test` | PASS — lint, typecheck, 8 unit files, boundaries, signing, time, contrast |
| `npm run typecheck` | PASS |
| `npm run test:boundaries` | PASS |
| `npm run build` | PASS — 35 static pages generated; existing ESLint-plugin warning only |
| `git diff --check` | PASS |

The first full integration invocation was intentionally not counted as a regression result: it reused the database already mutated by the focused test and reached the seed-count guard (`5 !== 7`). The isolated database was dropped, recreated, migrated, and seeded; the canonical clean run then passed all 20 integration files. No normal database was involved.

## 17. Files changed

Stage 16 files:

- `src/modules/application/activities.ts`
- `src/modules/application/context.ts`
- `src/modules/application/dto.ts`
- `src/modules/application/errors.ts`
- `src/modules/application/extraction.ts`
- `src/modules/application/index.ts`
- `src/modules/application/materials.ts`
- `src/modules/application/notes.ts`
- `src/modules/application/overview.ts`
- `src/modules/application/people.ts`
- `src/modules/application/projects.ts`
- `src/modules/application/publication.ts`
- `src/modules/application/search.ts`
- `src/modules/application/tasks.ts`
- `src/modules/application/tempo.ts`
- `src/modules/auth/profile.ts`
- `src/modules/knowledge/drafts.ts`
- `src/modules/project/capabilities.ts`
- `src/modules/project/service.ts`
- `src/modules/publication/service.ts`
- `src/modules/storage/candidates.ts`
- `tests/integration/zzzzzz-application-contract.test.ts`
- `docs/refactor-stage-16-application-contract-result.md`

Pre-existing cumulative Stage 1–15 changes and untracked audit artifacts were preserved.

## 18. Compatibility gaps

- The replacement UI and target route namespace are not implemented. Stage 17 should consume the facade and add only the delivery adapters its client interactions require.
- Legacy routes continue to expose legacy concepts to the old UI; no cutover was authorized.
- Localization provides a durable `vi`/`en` preference and fallback contract, but translated UI message catalogs belong to the new UI stage.
- My Work is a narrow foundation: assigned Project Tasks plus operational Project Activities. Product-specific prioritization and richer status grouping remain UI/application refinements.
- Activity draft association remains absent as accepted in Stage 11.
- Public byline, public citations, public People, and public Material catalog remain intentionally out of scope.

No unresolved issue blocks Stage 17.

## 19. Recommended Stage 17

**New Internal UI Implementation.**

Build the replacement interface against the Stage 16 application contracts while keeping the old UI available. Use the approved information architecture:

```text
TMKT / Overview
Projects
My Work
People
Search

Project workspace
├── Overview
├── Notes
├── Materials
├── Activities
├── Tasks
├── People
└── Library (only when capability-enabled)
```

The new UI must support Vietnamese and English interface locales while preserving arbitrary-Unicode research content. Full old-to-new UI cutover remains a separate explicit gate.
