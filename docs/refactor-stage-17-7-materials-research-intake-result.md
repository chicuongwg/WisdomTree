# Stage 17.7 — Materials & Research Intake

## 1. Verdict

**PASS.** `/app/projects/:projectId/materials` now supports target Project Material intake: register a fileless physical/digital-source record, append immutable original SourceVersions, inspect extraction state, review machine-derived text, and create a Project working Note with exact SourceVersion lineage.

## 2. Worker usage

No sub-workers were used. The existing Project Material, extraction, Note, and target UI seams were sufficiently bounded for direct implementation.

## 3. Final Material model

`Source` remains the Material identity. Target ownership is `sources.space_id = projects.project_id`; no duplicate Project column or second upload system was introduced. A fileless Source is a valid physical-only/metadata-only Material. Each upload is a new `SourceVersion` and becomes current without replacing prior rows.

Migration `0049_source_version_original_immutable.sql` protects original SourceVersion identity and representation fields at the database layer. Extraction may update only derived processing state; changing original filename, object key, checksum, MIME type, byte size, uploader, sequence, or source is rejected.

## 4. Implemented workflow

```text
Project Materials
→ register Material (file optional)
→ append SourceVersion
→ existing extraction worker/candidate
→ contributor review of machine-derived text
→ create author-private Project Note draft
→ existing Note editor/publication flow
```

Target delivery routes use the application facade only. The Material detail shows version metadata, extraction state, retry for an unprocessable version, source-version upload, and a clear machine-derived notice before creating the Note.

## 5. Provenance/lineage

`ExtractionCandidate → SourceVersion → Source → Project` remains authoritative. Target evolution derives this chain internally; the UI never submits Project, Space, Branch, or candidate scope choices. `ExtractionCandidate.evolved_draft_id`/`evolved_node_id` preserves source lineage to the resulting working/official Note. Material detail lists official Notes created from each exact SourceVersion.

This remains distinct from Stage 17.6B evidence support: source lineage says where a Note originated; immutable evidence support says what supports a Note version.

## 6. Authorization/privacy

- Research-readable Project members/Core may read Material metadata and version state.
- Project contributors may register Materials, upload SourceVersions, retry extraction, review candidate text, and evolve it into a Project draft.
- Core research-read without Project participation cannot read machine candidate text or mutate intake/extraction.
- Candidate text is not exposed in the Material read DTO or to anonymous/public routes.

## 7. UI/routes

Implemented:

```text
/app/projects/:projectId/materials
/app/projects/:projectId/materials/:materialId
/api/app/projects/:projectId/materials
/api/app/projects/:projectId/materials/:materialId/versions
/api/app/projects/:projectId/materials/:materialId/versions/:versionId/{candidate,extract,note}
```

The UI uses server-first data, small client islands for forms/actions, current UI tokens, labelled native controls, visible focus, status text, and a stacked narrow layout. No legacy Space/Branch terminology appears in target DTOs or UI. No dependencies were added.

## 8. Tests/validation

All stateful suites used fresh isolated PostgreSQL databases and were dropped afterward.

| Command | Result |
| --- | --- |
| focused `project-materials-target-workflow.test.ts` | PASS |
| `npm run test:integration` | PASS — 21 files |
| `npm run test:usecase` | PASS — 3 files |
| `npm run test:privacy` | PASS — 2 files |
| `npm run test:unit` | PASS — 17 files |
| `npm test` | PASS |
| `npm run test:boundaries` | PASS — 193 delivery files |
| `npm run build` | PASS — 37 static pages |
| `git diff --check` | PASS |

Normal local `wisdomtree` received only migration 0049. Before/after business counts were identical: `spaces=7`, `projects=1`, `tree_nodes=35`, `sources=37`, `source_versions=11`, `extraction_candidates=1`, `tasks=2`.

## 9. Files changed

- `drizzle/0049_source_version_original_immutable.sql`
- `src/modules/storage/{service,candidates}.ts`
- `src/modules/application/{materials,extraction}.ts`
- target Material UI, routes, localization, and CSS
- focused Material workflow integration/unit tests
- this report

## 10. Remaining risks

- Browser validation is **PENDING** for Stage 17.V; build and service/UI-contract tests pass.
- Extraction remains the existing process-local worker. This stage deliberately does not redesign its queue/worker lifecycle.
- Physical circulation remains the separate Tempo capability workflow; Project Materials does not become a Library catalog.
