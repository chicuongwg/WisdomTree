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

| Module | Responsibility | Canonical data owned | Runs on |
| --- | --- | --- | --- |
| `storage` | Space-scoped file storage, upload, library browsing, retrieval, extraction orchestration | Sources, source versions, spaces, membership, raw and corrected text refs | App + worker |
| `catalog` | Physical library catalog: inventory of book copies with identifiers and locations | Catalog items | App |
| `circulation` | Borrow and return workflow for physical items | Loan tickets | App |
| `knowledge` | Curated Markdown tree: nodes, branches, links, tags, verification, promotion | Tree nodes, node versions, branches, links | App |
| `pm` | Projects, tasks, milestones, achievements, and the deadline registry | Tasks, milestones, deadlines, achievements | App |
| `bridge-google` | One-way and outbound integration with Drive, Sheets, Forms, and Calendar | Import job state, external-object mappings, calendar tokens | App + worker |
| `notify` | In-app, email, and Zalo OA notifications; object-anchored comments | Notifications, delivery state, comments | App + worker |
| `search` | Full-text and, later, semantic finding across tree and space-scoped storage | Search and graph projections (never canonical) | App + worker |
| `export` | One-way tree export to the content repo; document rendering to docx and pdf | Export jobs, export manifests | App + worker |
| `auth` | Google OIDC identity, sessions, role and space claims | Role assignment, session state | App |
| `audit` | Cross-module actor, action, target, timestamp, outcome records | Audit events | App |

## Dependency Rules
- `knowledge` may reference a `storage` source version for provenance, but never writes storage data.
- `circulation` depends on `catalog` for item identity and status; `catalog` does not depend on `circulation`.
- `search` and `export` are downstream projections and consumers; nothing depends on them for canonical truth.
- `bridge-google` writes into `storage`, `pm`, and `catalog` only through those modules' normal creation paths, so lifecycle, audit, and permission rules always apply.
- `notify` observes events from any module but owns only notification and comment records; it never mutates another module's canonical state.
- `auth` and `audit` are cross-cutting: every module depends on them, and they depend on no business module.

## Runtime Placement
- App host (primary VPS): `auth`, `storage` (request paths), `catalog`, `circulation`, `knowledge`, `pm`, `notify` (dispatch), `bridge-google` (triggers), `audit`, reverse proxy, PostgreSQL, Redis.
- Worker host: extraction (OCR and parsing), document rendering, Drive and Sheets imports, Forms polling, search reindexing, and, in Phase 1.5, embedding generation. All local-only, backed by Ollama.
- Object storage: original files and evidence artifacts, addressed by opaque keys.
- Content repo: derived export target for backup, validation, and Quartz publishing.

## Adding a Pillar
- Communication, publishing, and PM pillars are realized without new services: `notify` plus `knowledge` cover object-anchored discussion, `export` plus the content repo cover publishing, and `pm` covers projects and deadlines.
- If a future need cannot fit an existing module, add a new module inside the monolith with its own canonical data and a clear dependency direction, and record it here before implementation.
