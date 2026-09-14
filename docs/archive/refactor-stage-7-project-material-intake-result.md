# Stage 7 — Project Material Intake Result

Date: 2026-09-01 (Asia/Ho_Chi_Minh)

## 1. Result

**PASS**

The target application boundary now creates Materials only inside a confirmed Project. Existing Space-oriented upload and physical-library behavior remains compatible, and no existing demo Source was migrated or backfilled.

No schema migration, route, UI, seed, extraction-candidate evolution, Hybrid Core rule, Tempo feature, Note taxonomy, Person, Activity, search, Graph, or public publishing behavior changed.

## 2. Material ownership representation

No duplicate `Source.project_id` was added.

```text
target Project Material
→ sources.space_id
→ spaces.id
→ same ID exists in projects.project_id
```

The Project-aware service validates the Project extension before creating or listing a Material. Therefore a new target Material's existing `Source.space_id` is authoritative Project ownership. Personal Spaces, unconfirmed Team Spaces and unknown UUIDs cannot enter through the target boundary.

This invariant is enforced at the target application boundary rather than as a database constraint because legacy/demo Sources under non-Project Spaces must remain representable. Ordinary rename, folder move and version operations do not write `space_id`.

## 3. Project Material creation contract

Added `createProjectMaterial(actor, input)` in `src/modules/storage/service.ts`.

Target input:

```text
projectId
title
description?
file?
extractionMethod?
```

The service:

1. resolves `projects.project_id`, not arbitrary `spaces.id`;
2. requires current contributor-or-higher Project participation through the existing Space membership model;
3. validates and normalizes the title and description;
4. creates one Source whose `space_id` equals the Project ID;
5. creates the first SourceVersion when a file is supplied;
6. records Project context in the Source audit event.

The caller does not choose Personal/Team or generic Space ownership.

A Material without a file creates only its Source identity and metadata. It does not create a fake empty object or SourceVersion. The Source and `source.create` audit event commit in one transaction.

## 4. Digital upload/version behavior

The Project boundary reuses the existing storage mechanics through a shared internal primitive:

- 100 MB file-size limit;
- executable MIME denylist;
- SHA-256 checksum;
- opaque object key;
- stored SourceVersion with sequence `1`;
- current-version pointer;
- extraction status and queue handoff;
- transactional Source/SourceVersion/audit persistence.

Added `addProjectMaterialVersion(actor, input)` for a scan, corrected file or replacement representation. It resolves the confirmed Project, requires exact `Source.id + Source.space_id`, preserves the Source ID and Project ownership, appends the next SourceVersion, and re-enqueues extraction. It also supports attaching the first digital version to a previously fileless Material.

The scan model is therefore:

```text
one Material / Source
→ SourceVersion v1: original scan
→ SourceVersion v2: corrected scan
```

No `Scan` table or duplicate Material is introduced.

## 5. Physical Material compatibility

The current model already supports one Material identity with optional shelf facts:

```text
Source 1:1 optional SourcePhysical
Source 1:N SourceVersion
LoanTicket → SourcePhysical
```

Added `addProjectMaterialPhysical(actor, input)` as a narrow Project-safe attachment boundary. It validates the confirmed Project and exact Material, then attaches one `source_physical` row to the existing Source instead of creating another Source. Existing item-code, book-category, copy-count and audit conventions are reused.

Current compatibility authorization still requires both Project membership and the existing global physical-library operator permission. Tempo feature assignment and future operator roles were deliberately not introduced.

## 6. Scan representation decision

A scan is a SourceVersion, not a new domain entity. Physical metadata remains on `source_physical`, digital files remain append-only SourceVersions, and both representations retain the same Source/Material ID.

Scanner hardware, scanner workflow and OCR UI remain out of scope. A scanner output is currently an ordinary file supplied to `addProjectMaterialVersion`.

## 7. Project Material reads

Added `listProjectMaterials(actor, projectId, options)` as a confirmed-Project wrapper over the existing paginated Library query.

It:

- requires a confirmed Project;
- requires current viewer-or-higher Project participation;
- filters exactly by `sources.space_id = projectId`;
- excludes Sources from Personal, legacy Team and other Project Spaces;
- returns non-disclosing `not_found` when the actor cannot access the Project;
- preserves existing pagination, search, sorting, folder and category behavior.

Unlike the legacy Library list, the target Project list includes metadata-only Materials before a file or physical row is attached. The legacy `listLibrary` default remains unchanged.

## 8. Authorization compatibility

| Capability | Stage 7 compatibility source |
| --- | --- |
| Read Project Materials | Project Space membership at `viewer` or higher |
| Create/upload Project Materials | Project Space membership at `contributor` or higher |
| Add a digital version | Project contributor participation plus existing owned-or-assigned Source management |
| Attach physical facts | Project membership plus existing global physical-library operator capability |

No global role is reinterpreted as TMKT Core. Hybrid Core remains unimplemented.

## 9. Existing uploadSource compatibility

The existing boundary remains operational:

```text
uploadSource(actor, { spaceId, ... })
→ legacy Space-oriented compatibility

createProjectMaterial(actor, { projectId, ... })
→ target Project contract
```

The existing route/UI was not renamed or changed. Legacy uploads continue using the same behavior and audit shape; target uploads add `projectId` to structured audit metadata.

Existing `addSourceVersion`, `createPhysicalItem`, Source detail, download, rename, move, withdraw and restore boundaries remain available. The internal Source loader now uses a left join so a legitimate fileless Material can be renamed, moved or receive its first digital version without inventing a current SourceVersion.

## 10. Existing demo-data preservation

Normal local Docker PostgreSQL database: `wisdomtree`.

| Structure | Before | After |
| --- | ---: | ---: |
| `spaces` | 7 | 7 |
| `projects` | 1 | 1 |
| `tree_nodes` | 34 | 34 |
| `sources` | 36 | 36 |
| `source_versions` | 10 | 10 |
| `source_physical` | 26 | 26 |
| `tasks` | 2 | 2 |

Before/after relationship hashes were identical:

```text
sources          1d22510e9d51bd33556ec320be3c2d39
source_versions  d1f6ef5b572c81ecd4f8ee14c2cd40d7
source_physical  cb985155174bd6222a9ce1d4a8d61e7c
```

No migration ran against `wisdomtree`. No Source, SourceVersion, SourcePhysical, Project, Note, Task or other normal-database row changed. All Project Material fixtures were created only in isolated test databases and their object files were stored under temporary `/tmp` directories.

## 11. Extraction handoff

Digital Project Material creation and Project-safe version addition preserve the current extraction queue behavior and requested method.

The current endpoint remains:

```text
Project Material
→ SourceVersion
→ extraction candidate
→ legacy candidate evolution
```

Candidate evolution was not changed and can still depend on Personal Branch behavior. The authoritative Project for Stage 8 can now be derived from:

```text
ExtractionCandidate
→ SourceVersion
→ Source.space_id
→ confirmed Project
```

Stage 8 can then call `createProjectNote` without accepting a caller-selected Branch or Project override.

## 12. Tests executed

All stateful tests used isolated databases whose names contained a distinct `test` segment. They were migrated from zero, seeded, used for validation, then dropped. Test object files were written only under `/tmp` and removed.

| Command | Result |
| --- | --- |
| Direct focused `project-material-intake.test.ts` on a freshly migrated isolated DB | PASS |
| `npm run test:integration` on isolated DB | PASS — 11 files, including Project Material coverage |
| `npm run test:usecase` on isolated DB | PASS — 3 files |
| `npm run test:privacy` on isolated DB | PASS — 2 files |
| `npm test` | PASS — lint, typecheck, 8 unit files, boundaries, signing, time and contrast |
| `npm run typecheck` | PASS |
| `npm run test:boundaries` | PASS through `npm test` — 205 delivery files, no direct DB access |
| `npm run build` | PASS — production build generated 35 pages |
| `git diff --check` | PASS |

The first sandboxed `npm test` attempt was blocked by the environment's `tsx` IPC `EPERM`; the identical command passed with the required execution permission. Two initial attempts to invoke one test file used unsupported runner/module entry shapes; the canonical integration suite already passed, and the corrected direct focused invocation then passed on a newly created isolated database.

## 13. Files changed

Stage 7 changed only:

```text
src/modules/storage/service.ts
src/modules/storage/physical.ts
tests/integration/project-material-intake.test.ts
docs/refactor-stage-7-project-material-intake-result.md
```

No schema or migration file changed in Stage 7. Accepted pre-existing Stage 1–6 worktree changes remain untouched.

## 14. Compatibility gaps

- The old Space-oriented upload and physical-item creation boundaries can still create Sources under non-Project Spaces for legacy UI compatibility.
- Confirmed-Project ownership is enforced by the target service boundary, not a database Source→Project FK, because demo/legacy Sources must coexist.
- Existing Project Materials in the normal database remain demo-shaped and were not backfilled or rewritten.
- Project Material management still uses existing uploader/assignee rules; Project-manager-wide Material management is not a Stage 7 contract.
- Physical attachment still uses the existing global library operator capability; Tempo features and operators are not modeled.
- Cross-Project citation/reuse is not implemented; ownership remains single-Project.
- Extraction-candidate evolution still follows the legacy Personal/Branch path.
- No Project upload, scan, folder or Material UI/route exists yet.
- No explicit Material move between Projects exists; ordinary operations preserve ownership.

## 15. Recommended Stage 8

Recommended Stage 8: **Project-aware extraction candidate → Project Note boundary**.

Narrow scope:

- derive the authoritative Project only through Candidate → SourceVersion → Source;
- require that Source ownership resolves to a confirmed Project;
- create the working Note through `createProjectNote`;
- prevent a caller from overriding Project or selecting Personal/Team Branch on the target path;
- retain current candidate evolution only as explicit legacy/demo compatibility;
- do not add Note taxonomy, UI, seed rewrite, search, Graph or public publishing.
