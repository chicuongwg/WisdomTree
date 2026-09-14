# Stage 15 — Tempo Capability Cleanup Result

## 1. Result

PASS.

Stage 15 introduces one explicit Project capability (`library_circulation`), a
Project-scoped library-operator roster, and target circulation boundaries that
derive Project authority from the Material/Loan graph. No target service uses a
Project name, a special Tempo type, TMKT Core, or a global library role as
circulation authority.

## 2. Project capability model

`project_capabilities` stores `(project_id, capability)` with a database check
limiting Stage 15 to `library_circulation`. A confirmed Project has no
capability by default. Enable/disable is explicit, idempotent, audited, and uses
the existing system administration boundary (`storage.space.manage`); it does
not grant Project membership or circulation authority.

This is domain configuration, not a generic feature-flag system.

## 3. Tempo representation

Tempo remains an ordinary confirmed Project. Its product identity is not
encoded in a name, Project type, boolean, or special UUID branch in application
code.

Migration `0047_tempo_project_capability.sql` is schema-only. The normal demo
Tempo representation (`c1bb5bc6-54c2-44f2-9e66-b60de956ddc8`) was deliberately
not capability-enabled: current records are demo/seed, and no operator identity
was inferred. Explicit Tempo configuration belongs in controlled configuration
or the later target-aligned seed rewrite.

## 4. Project-scoped library operator model

`project_library_operators` stores `(project_id, user_id)` plus grant audit
metadata. It is not a User role, Space membership role, Core membership, Person
relation, or Activity participation relation.

The database has a composite FK from `(project_id, user_id)` to
`space_members(space_id, user_id)` with `ON DELETE CASCADE`. Therefore an
operator must already be a real member of the same Project, operator grant does
not synthesize membership, and membership removal immediately removes the
operator relation.

Project managers may grant, revoke, and list their Project's operators. A
manager does not become an operator automatically. Duplicate grant/revoke calls
are safe and create audit history only when state actually changes.

## 5. Capability/operator authorization

Target authorization is split deliberately:

- system administrator: enable/disable structural Project capability;
- Project manager: administer the Project library-operator roster;
- current Project library operator: attach physical circulation metadata and
  perform target circulation transitions/listing;
- Project member: request a loan through the target boundary;
- TMKT Core: research-read only, never circulation authority.

`requireProjectLibraryOperator` reads current durable capability, operator, and
membership rows on every call. It does not trust global role names or cached
Core state.

## 6. Physical Material behavior

The existing model remains unchanged:

```text
Project Material (Source)
├── SourceVersion*
└── SourcePhysical?
```

No Tempo-specific Material table was added. The target
`addProjectMaterialPhysical` boundary now requires `library_circulation` and a
current Project library operator. Existing legacy physical-management services
remain available for archived delivery compatibility and still use their old
global permission.

## 7. Circulation Project derivation

Target requests derive Project from:

```text
SourcePhysical → Source.space_id → confirmed Project
```

Target approval, decline, handover, return, and operational listing derive or
constrain Project from:

```text
LoanTicket → SourcePhysical → Source.space_id → confirmed Project
```

The caller cannot provide a Project ID to authorize a ticket transition. A
Project ID is accepted only by `listProjectLoans` as a narrowing scope, and the
query constrains `Source.space_id` before returning rows.

New target boundaries:

- `requestProjectMaterialLoan`
- `approveProjectLoan`
- `declineProjectLoan`
- `handoverProjectLoan`
- `returnProjectLoan`
- `listProjectLoans`

Their audit details include Project context while preserving the existing loan
lifecycle, optimistic versions, availability synchronization, and notifications.

## 8. Core vs operational boundary

An explicit Core outsider can still read Tempo-like Material metadata and find
it through Stage 14 research search. The same actor cannot list loans, attach
physical circulation metadata, approve, hand over, return, or manage the
operator roster without the required Project membership/operator relation.

Project managers likewise cannot operate the circulation desk unless separately
granted as an operator.

## 9. Legacy global-library compatibility

Legacy APIs, routes, and UI were not changed. The following compatibility
services still consume the old global permissions:

- `createPhysicalItem`, `updatePhysicalItem`, `setPhysicalCover`, and
  `archivePhysicalItem` use `library.physical.manage`;
- `approveLoan`, `declineLoan`, `borrowLoan`, `returnLoan`, and `listTickets`
  use `circulation.loan.manage`;
- current `/api/library`, `/api/loans`, and Library screens call those legacy
  services.

This is intentional compatibility, not the target application contract. Stage
16 must expose only the new Project-centric seams to the replacement frontend.

## 10. Hard-coded library assumptions removed

No target Project capability or circulation service checks:

- `Thư Viện Cộng Đồng`;
- `Tempo`;
- a special Space/Project UUID;
- physical-item counts;
- global editor/admin/Core roles.

Name-based references remain only in legacy tests/seed-facing compatibility
flows and unchanged UI copy. They are not consumed by the new target services.

## 11. Schema/migration

Migration: `0047_tempo_project_capability.sql`.

It creates:

- `project_capabilities` with Project/User restrictive FKs, one supported
  capability check, and `(project_id, capability)` primary key;
- `project_library_operators` with Project/User metadata, composite membership
  FK, `(project_id, user_id)` primary key, and user lookup index.

No canonical Project, User, membership, Material, physical item, loan, Note,
Task, Activity, Person, or publication row was inserted, updated, deleted, or
reassigned.

## 12. Existing normal DB preservation

Normal database: local Docker PostgreSQL database `wisdomtree`.

| Row set | Before | After |
| --- | ---: | ---: |
| Projects | 1 | 1 |
| TreeNodes | 34 | 34 |
| Sources | 36 | 36 |
| Persons | 0 | 0 |
| Activities | 0 | 0 |
| Tasks | 2 | 2 |
| NotePublications | 0 | 0 |
| NotePublicRevisions | 0 | 0 |
| Spaces | 7 | 7 |
| Space memberships | 16 | 16 |
| LoanTickets | 16 | 16 |
| SourcePhysical | 26 | 26 |

After migration:

```text
project_capabilities = 0
project_library_operators = 0
Tempo capability rows = 0
migration head = 0047_tempo_project_capability.sql
```

## 13. Tests executed

- Focused Stage 15 module against isolated `wisdomtree_test_stage15`: PASS.
- `npm run test:integration`: PASS, 19 files, including Project, Material,
  circulation, Core, publishing, search, and Stage 15 coverage.
- `npm test`: PASS after rerunning outside the filesystem sandbox; the first
  sandboxed attempt stopped at tsx IPC creation (`EPERM`) before unit tests ran.
- `npm run test:usecase`: PASS, 3 files.
- `npm run test:privacy`: PASS, 2 files.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run test:boundaries` (inside `npm test`): PASS; 205 delivery files, no
  direct database access.
- `npm run build`: PASS; Next.js production build completed.
- `git diff --check`: PASS.

The isolated database was migrated through 0047 and seeded explicitly. No
stateful test targeted normal `wisdomtree`; the isolated database was disposed
after validation.

## 14. Files changed

Stage 15 files:

- `src/modules/project/schema.ts`
- `src/modules/project/capabilities.ts`
- `src/modules/storage/physical.ts`
- `src/modules/circulation/service.ts`
- `drizzle/0047_tempo_project_capability.sql`
- `tests/integration/project-material-intake.test.ts`
- `tests/integration/zzzzz-tempo-capability-cleanup.test.ts`
- `docs/refactor-stage-15-tempo-capability-cleanup-result.md`

Pre-existing accepted Stage 1–14 changes remain untouched except the narrow
Stage 7 physical test adaptation required by the new Stage 15 target invariant.

## 15. Compatibility gaps

- Normal demo Tempo has no capability/operator configuration; target
  circulation is ready but intentionally inactive there.
- Legacy routes/UI still use global physical/circulation permissions.
- Target Project-aware update/cover/archive delivery seams are not exposed; the
  existing functions remain legacy compatibility boundaries.
- Borrower identity remains User-based.
- No operator administration UI or public Library catalog exists.

## 16. Recommended Stage 16

Implement the Target Application Contract / Delivery Foundation: compose stable
Project-centric application/DTO boundaries for TMKT Overview, Projects, Notes,
Materials, Activities, Tasks, People, Search, Tempo circulation, and Core
publishing without exposing Space/Branch/Personal compatibility concepts to the
new frontend. Keep legacy delivery paths alongside the target contracts until
explicit cutover gates close.
