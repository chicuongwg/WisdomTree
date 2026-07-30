# Module Map

## Purpose

- Define the module structure of the WisdomTree platform as a modular monolith, so a single developer plus AI agents can build and operate it without microservice overhead.
- Extend the storage-era module boundaries to the full platform scope and fix the dependency rules between modules.

## In Scope

- The full platform module list, each module's responsibility, and the data it owns.
- Allowed dependency direction between modules.
- Runtime placement relative to the app host and the worker host.

## Out of Scope

- Class-level or package-level code structure.
- Endpoint lists (see [`../system/integration-contracts.md`](../system/integration-contracts.md)).
- The storage-era responsibility table, which this file supersedes at platform scope (see [`../system/module-boundaries.md`](../system/module-boundaries.md)).

## Decisions

- The platform is one deployable modular monolith in one monorepo; modules are logical boundaries, not separate services.
- Each module owns its canonical data; other modules read through the owning module, not by reaching into its tables.
- Heavy or slow work (OCR, document rendering, embeddings, imports) runs as worker jobs, never inline in a request.
- New pillars are added as modules inside the same monolith, not as new services or repos.

## Dependencies

- Platform strategy in [`platform-context.md`](./platform-context.md).
- Storage-era boundaries in [`../system/module-boundaries.md`](../system/module-boundaries.md).
- Contracts in [`../system/integration-contracts.md`](../system/integration-contracts.md).

## Acceptance Criteria

- Every platform capability maps to exactly one owning module.
- The dependency rules are specific enough to prevent a new module from bypassing an owner's canonical data.
- An agent can place a new feature in the correct module without reopening the architecture.

## Module List

| Module          | Responsibility                                                                           | Canonical data owned                                                      | Runs on      |
| --------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------ |
| `storage`       | Space-scoped file storage, upload, library browsing, retrieval, extraction orchestration | Sources, source versions, spaces, membership, raw and corrected text refs | App + worker |
| `catalog`       | Physical library catalog: inventory of book copies with identifiers and locations        | Catalog items                                                             | App          |
| `circulation`   | Borrow and return workflow for physical items                                            | Loan tickets                                                              | App          |
| `knowledge`     | Curated Markdown tree: nodes, branches, links, tags, verification, promotion             | Tree nodes, node versions, branches, links                                | App          |
| `pm`            | Projects, tasks, milestones, achievements, and the deadline registry                     | Tasks, milestones, deadlines, achievements                                | App          |
| `bridge-google` | One-way and outbound integration with Drive, Sheets, Forms, and Calendar                 | Import job state, external-object mappings, calendar tokens               | App + worker |
| `notify`        | In-app, email, and Zalo OA notifications; object-anchored comments                       | Notifications, delivery state, comments                                   | App + worker |
| `search`        | Full-text and, later, semantic finding across tree and space-scoped storage              | Search and graph projections (never canonical)                            | App + worker |
| `export`        | One-way tree export to the content repo; document rendering to docx and pdf              | Export jobs, export manifests                                             | App + worker |
| `auth`          | Google OIDC identity, sessions, role and space claims                                    | Role assignment, session state                                            | App          |
| `audit`         | Cross-module actor, action, target, timestamp, outcome records                           | Audit events                                                              | App          |

## Dependency Rules

- `knowledge` may reference a `storage` source version for provenance, but never writes storage data.
- `circulation` depends on `catalog` for item identity and status; `catalog` does not depend on `circulation`.
- `search` and `export` are downstream projections and consumers; nothing depends on them for canonical truth.
- `bridge-google` writes into `storage`, `pm`, and `catalog` only through those modules' normal creation paths, so lifecycle, audit, and permission rules always apply.
- `notify` observes events from any module but owns only notification and comment records; it never mutates another module's canonical state.
- `auth` and `audit` are cross-cutting: every module depends on them, and they depend on no business module.

## Runtime Placement

The current Compose deploy profile runs the Next.js standalone app,
PostgreSQL, and Ollama together. Uploaded originals and the local content
repository persist in the `appdata` volume. Extraction, rendering, imports,
indexing, and notification dispatch run behind module interfaces in the app
process.

The accepted target placement moves heavy jobs to a worker host, replaces
local files with object storage, and may add Redis for job orchestration.
Those are adapter changes: the module list and canonical ownership above stay
the same. See
[`../system/deployment-topology.md`](../system/deployment-topology.md).

## Current Code Structure

Delivery code lives in `src/app/**` and may call module services but may not
import the database, Drizzle, or module schemas. `npm run test:boundaries`
enforces that rule across the delivery tree.

Most modules expose a direct `service.ts`. Two larger workflows keep that
public import stable while splitting implementation by responsibility:

| Public facade                      | Internal slices                                                    |
| ---------------------------------- | ------------------------------------------------------------------ |
| `src/modules/knowledge/service.ts` | `service-core.ts`, `service-queries.ts`, `service-mutations.ts`    |
| `src/modules/storage/curation.ts`  | `curation-core.ts`, `curation-queries.ts`, `curation-workflows.ts` |

The same compatibility-facade pattern is used outside the business modules:

| Public facade                          | Implementation                                        |
| -------------------------------------- | ----------------------------------------------------- |
| `src/app/components/knowledge-map.tsx` | `knowledge-map/index.tsx`, `model.ts`, `use-media.ts` |
| `src/lib/vi.ts`                        | `vi/index.ts`, `copy.ts`, `states.ts`                 |

These are file-level splits inside the existing modular monolith. They do not
create new runtime services or change canonical data ownership.

## Verification Boundaries

- Unit tests cover isolated helpers and policies.
- Module checks enforce delivery/database separation and the authorization
  matrix.
- Contract checks cover signed tokens and timezone behavior.
- UI audits cover contrast and generated diagram geometry.
- Integration tests exercise API, database, login, vault, and maker-checker
  behavior against PostgreSQL.
- Playwright runs three production-build smoke paths through the standalone
  server harness.

The exact commands and database prerequisites are maintained in
[`../../tests/README.md`](../../tests/README.md).

## Adding a Pillar

- Communication, publishing, and PM pillars are realized without new services: `notify` plus `knowledge` cover object-anchored discussion, `export` plus the content repo cover publishing, and `pm` covers projects and deadlines.
- If a future need cannot fit an existing module, add a new module inside the monolith with its own canonical data and a clear dependency direction, and record it here before implementation.
