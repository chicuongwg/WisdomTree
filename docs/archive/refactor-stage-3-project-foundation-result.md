# Stage 3 — Project Identity Foundation Result

Result: **PASS**

Baseline: repository HEAD `c60620f`. Stage 3 implements Project as a first-class domain/service concept while preserving existing Space, Note, Task, authorization, route and UI behavior.

## Implemented

### Schema

- Added the `project` module and `projects` metadata extension. `project_id` is the primary key and a restrictive foreign key to `spaces.id`; Project name remains composed from `spaces.name`. `src/modules/project/schema.ts:1-39`.
- Added only the accepted metadata: `research_lens`, optional `description`, `active | paused | completed | archived` status, creator/timestamps and optimistic `version`. No slug, dates, progress, feature, tenant, Activity, Person or publication fields were added. `src/modules/project/schema.ts:10-39`.
- Re-exported the Project schema through the existing Drizzle schema aggregator. `src/db/schema.ts:1-12`.

### Migration

- Added forward-only migration `drizzle/0037_project_foundation.sql`.
- The migration creates the extension table, non-empty lens/status/version checks, a status index, Team-Space enforcement triggers and `ON DELETE RESTRICT`. `drizzle/0037_project_foundation.sql:5-57`.
- The migration contains no data mutation or backfill. On both the existing local database and a new isolated database, the Project count immediately after applying it was `0`.

### Services

- Added `createProject`, `getProject`, `listProjects` and `updateProject`. `src/modules/project/service.ts:36-161`.
- `createProject` uses existing `storage.space.manage`, creates Team Space + creator `manager` membership + Project extension + audit records in one transaction, and returns the name from Space. `src/modules/project/service.ts:36-71`.
- `getProject` requires an extension row and then applies existing non-disclosing Space knowledge-read authorization. A Team Space without an extension returns `not_found`. `src/modules/project/service.ts:73-83`.
- `listProjects` starts from extension rows and applies existing `scopedToSpaces`; it cannot list Personal or unconfirmed Team Spaces. `src/modules/project/service.ts:85-95`.
- `updateProject` changes only lens, description or status, requires current Space-manager authority, uses `expectedVersion`, and writes its audit in the same transaction. `src/modules/project/service.ts:97-161`.
- Extracted the existing Team-Space insert/membership/audit sequence into one transaction helper. Existing `createSpace` still authorizes, validates and returns the same shape; it does not create a Project extension. `src/modules/storage/service.ts:575-612`.

### Audit integration

- Project creation records existing `space.create` plus distinct `project.create` events in the same transaction.
- Metadata updates record `project.update`, target type `project`; research-lens and description bodies are not copied into the audit log. `src/modules/project/service.ts:61-67`, `src/modules/project/service.ts:147-157`.
- Historical Space events were not rewritten.

### Tests

Added `tests/integration/project-foundation.test.ts`, covering:

- missing-Space FK and Personal-Space rejection;
- reverse protection against retyping a Project Space as Personal;
- same Project/Space UUID;
- Team Space, default status, research lens and creator manager membership;
- atomic rollback after a forced extension-insert failure;
- create/update audit events;
- authorized/non-disclosing reads and membership-filtered lists;
- exclusion of Personal and legacy Team Spaces;
- optimistic conflict and unauthorized update;
- preservation of Space-owned data on Project status change;
- unchanged `createSpace` behavior without implicit Project registration.

Evidence: `tests/integration/project-foundation.test.ts:16-215`.

## Deliberately not implemented

- no registration or backfill of existing Team Spaces;
- no Task ownership or `tasks.project_id`;
- no Note/Branch/Node/Draft ownership changes;
- no Personal Space or Personal Note migration;
- no Core/Collaborator/global-role authorization redesign;
- no Activity;
- no canonical Person;
- no public publishing changes;
- no Tempo/Project-feature system;
- no Calendar, Graph or search changes;
- no routes, API handlers, navigation or UI.

## Database invariant

The database enforces:

```text
Project
→ exactly one existing Space with the same UUID
→ Space must be type=team
→ Space cannot later be retyped while Project exists
```

Enforcement has four parts:

1. `projects.project_id` is both PK and FK to `spaces.id`.
2. `ON DELETE RESTRICT` prevents removal of the underlying Space while the Project extension exists; there is no Project-delete application service.
3. `projects_team_space_check` validates Team type on Project insert/project-ID update.
4. `project_space_type_check` rejects changing an associated Space away from Team. The insert-side trigger locks the referenced Space `FOR SHARE`, closing the concurrent insert/type-change race. `drizzle/0037_project_foundation.sql:16-57`.

Supported application creation cannot accept an existing Space ID: it always creates a Team Space inside the same transaction. A Personal Space therefore cannot become a Project through the service or through direct database insertion.

## Compatibility

- Existing Space tables and ownership foreign keys are unchanged.
- Existing `createSpace` still creates a Team Space and manager membership but no Project row.
- Existing Space APIs do not require or inspect Project extension rows.
- Existing memberships remain the sole Stage 3 access source; extension existence grants no access.
- Notes, Branches, Personal/Team behavior, Tasks and Wiki Releases were not modified.
- Existing Space, Branch, Node, Source, Deadline, Task and WikiRelease IDs remain unchanged.
- Migration applies with zero Project rows, so legacy application behavior continues before any new Project service is invoked.

`Project.status` and `Space.archivedAt` are intentionally independent during compatibility. Stage 3 does not synchronize, reinterpret or filter either field. This permits temporary mismatch, which a later lifecycle/registration stage must resolve explicitly; no data is deleted when Project status changes.

## Known migration state

After Stage 3:

```text
new Project created through Project service
    = confirmed Project

existing Team Space
    = legacy_shared until explicit registration

Personal Space
    = legacy_private
```

The extension row, not `Space.type`, is the authoritative Project-registration marker.

## Validation performed

All destructive fixture loading was confined to task-specific PostgreSQL databases and `/tmp` object storage. The pre-existing local database was migrated forward but was not seeded, truncated or backfilled.

| Command | Result |
| --- | --- |
| `npm run db:migrate` on existing DB | PASS; applied only `0037`; Project count afterward `0` |
| `npm run db:migrate` on fresh isolated DB | PASS; all migrations applied; Project count before seed `0` |
| focused `npx tsx tests/integration/project-foundation.test.ts` | PASS |
| `npm test` | PASS; lint, typecheck, 8 unit files, boundaries, signing, time and contrast |
| canonical isolated `npm run test:integration` | PASS; 8 files |
| canonical isolated `npm run test:usecase` | PASS; 3 files |
| canonical isolated `npm run test:privacy` | PASS; 2 files |
| `npm run build` | PASS; production build generated 35 pages |

After the insert-side trigger gained its final `FOR SHARE` concurrency lock, the already-applied local development function was synchronized with `CREATE OR REPLACE FUNCTION` without changing rows. The final migration file was then applied from scratch on a second fresh database, again produced zero Project rows, and passed the focused Project test.

An initial privacy run against the pre-existing local database failed at its seed premise because that database no longer contained the expected restricted Team Branch. It failed before Project behavior. The suite passed on a fresh repository-seeded isolated database. A second privacy run on an already-mutated fixture encountered its pre-existing non-idempotent pending-translation condition; the canonical clean sequence `integration → usecase → privacy` passed.

## Follow-up requirement

Before any existing Team Space is registered as a Project, TMKT must provide an explicit reviewed mapping containing:

- exact Team Space UUID;
- confirmation that it is an operational Project rather than a legacy shared container;
- Project research lens;
- initial Project status;
- decision for migration-created `Kho tri thức chung` and any other unconfirmed Team Space.

No registration should be inferred from Space type, name, Branch/Source content, tags, Tasks or seed conventions.

The next stage should inventory and explicitly register confirmed existing Projects. It should not yet migrate Tasks, Notes, Personal data or authorization semantics.
