# Stage 8 — Project-aware Extraction Candidate → Project Note Result

Date: 2026-09-01 (Asia/Ho_Chi_Minh)

## 1. Result

**PASS**

The target extraction handoff now derives one confirmed Project from the Candidate's Material chain and atomically creates an author-private Project Note draft. The caller supplies only Candidate identity and an optional title; it cannot select Project, Branch, Personal/Team scope, or another ownership context.

No existing Candidate, Material or Note was migrated or evolved. No route, UI, worker, OCR, scanner, seed, Note taxonomy, public publishing, Hybrid Core, Person, Activity, search, or Graph behavior changed.

## 2. Authoritative Project derivation

`evolveCandidateIntoProjectNote` resolves exactly:

```text
extraction_candidates.source_version_id
→ source_versions.source_id
→ sources.space_id
→ projects.project_id
```

The query uses inner joins through the full chain and locks the Candidate row for update. A missing Candidate, missing chain member, Personal Source, unconfirmed Team Space Source, or arbitrary Space therefore returns non-disclosing `not_found`.

Project is not inferred from Candidate creator, uploader, title, content, Branch, global role, or caller input. Tests pass extra `projectId` and `branchId` properties at runtime and verify that the derived Material Project remains authoritative.

## 3. Target candidate evolution service

Added:

```text
evolveCandidateIntoProjectNote(actor, {
  candidateId,
  title?
})
```

The service:

1. validates the Candidate ID;
2. resolves and locks the complete Candidate→Material→Project chain;
3. requires current Project visibility and contributor-or-higher Note creation capability;
4. requires Candidate state `pending_review`;
5. passes the derived Project, existing Candidate Markdown and optional normalized title to the Stage 6 Project Note boundary;
6. marks the Candidate evolved and records its resulting draft;
7. records structured provenance in an append-only AuditEvent.

Candidate content is copied without semantic enhancement. Source title is used only as the default Note title. The Note remains unverified working research; it is not automatically classified as Evidence or synthesis.

## 4. Candidate → Note provenance

Migration `0040_project_candidate_draft.sql` adds nullable `extraction_candidates.evolved_draft_id` for the author-private phase.

```text
while working:
Candidate.evolved_draft_id → NodeDraft

after internal draft publication:
Candidate.evolved_draft_id = NULL
Candidate.evolved_node_id  → TreeNode
```

The draft FK uses `ON DELETE SET NULL`. Internal publication explicitly transfers the relation to `evolved_node_id` before deleting the draft, within the same transaction. An intentionally discarded draft leaves the historical Candidate and audit event but no live resulting Note.

The target evolution audit contains only structured identifiers:

```text
candidateId
sourceVersionId
sourceId
projectId
draftId
```

No extracted Markdown or document contents are copied into audit.

## 5. Atomicity/idempotency

The Stage 6 Note creator now exposes a narrow transaction-aware seam. Normal `createProjectNote` still opens its own transaction; target Candidate evolution calls the same implementation inside the Candidate transaction. Project validation, compatibility Branch resolution/creation, NodeDraft creation, Candidate transition and both audits therefore commit or roll back together.

Idempotency is protected by:

- `SELECT ... FOR UPDATE` on the Candidate chain;
- required `pending_review` state;
- conditional `UPDATE ... WHERE state = 'pending_review'`;
- unique partial index on non-null `evolved_draft_id`.

Focused tests verify:

- a second evolution attempt returns `invalid_state` and creates no second draft;
- Markdown validation failure leaves the Candidate pending and creates no draft;
- a database trigger that forcibly rejects the Candidate update rolls back the newly created draft, compatibility Branch and audits;
- publishing the draft transfers provenance to the TreeNode atomically.

## 6. Authorization compatibility

Authorization remains based on current Project/Space participation:

| Actor | Result |
| --- | --- |
| Contributor or manager in derived Project | May evolve Candidate |
| Viewer in derived Project | `forbidden` mutation |
| Project outsider | non-disclosing `not_found` |
| Global role without Project participation | no future Core interpretation |

The service first requires Project read visibility so an outsider cannot use mutation error differences to discover a Candidate. `createProjectNoteInTransaction` then applies the existing contributor mutation permission.

Hybrid Core is not implemented.

## 7. Legacy evolution compatibility

The existing boundary remains unchanged:

```text
evolveCandidate(actor, candidateId, { branchId, title? })
→ Personal/Project-less compatibility TreeNode

evolveCandidateIntoProjectNote(actor, { candidateId, title? })
→ Project-owned author-private working Note
```

The existing API route and Candidate review UI still call the legacy boundary and still require a Personal Branch. Stage 8 adds no route or UI for the target service.

Focused coverage confirms legacy evolution still creates a Project-less Personal Node and records `evolved_node_id`. Proposal, Personal privacy and current delivery behavior remain unchanged through the broader suites.

## 8. Schema changes

Migration: `drizzle/0040_project_candidate_draft.sql`.

It:

- adds nullable `extraction_candidates.evolved_draft_id`;
- adds FK to `node_drafts.id` with `ON DELETE SET NULL`;
- adds a unique partial index for non-null draft relations;
- repairs the existing immutable-content trigger function so it no longer reads removed column `vault_id`.

The trigger defect originated when migration `0028` removed `vault_id` but left the migration `0012` function referencing `NEW.vault_id`. Before repair, every Candidate lifecycle update failed at runtime, including legacy reject/evolve. The replacement retains immutability for all remaining Candidate content/provenance-input fields and permits only lifecycle/result fields to change.

The migration contains no `INSERT`, data `UPDATE`, backfill, Project column, Candidate Project ownership, or generic provenance graph.

## 9. Existing demo-data preservation

Normal local Docker PostgreSQL database: `wisdomtree`.

| Structure | Before | After |
| --- | ---: | ---: |
| `projects` | 1 | 1 |
| `sources` | 36 | 36 |
| `source_versions` | 10 | 10 |
| `extraction_candidates` | 0 | 0 |
| `node_drafts` | 0 | 0 |
| `tree_nodes` | 34 | 34 |

Relationship fingerprints remained identical:

```text
sources     1d22510e9d51bd33556ec320be3c2d39
tree_nodes  21a43785cafdf16b6ca5719b4e6384a6
candidates  NULL (zero rows before and after)
```

Migration head advanced from `0039_note_project_ownership.sql` to `0040_project_candidate_draft.sql`. Post-migration inspection confirmed the column, `SET NULL` FK and unique index exist, and the trigger function no longer mentions `vault_id`.

No normal-database Candidate, Material, SourceVersion, Draft or TreeNode content row changed.

## 10. Tests executed

All stateful tests used isolated PostgreSQL database `wisdomtree_test_stage8_20260901`, migrated from zero and seeded. It was disposed after validation; final database existence count was `0`. Test object files under `/tmp` were removed.

| Command | Result |
| --- | --- |
| Direct focused `project-extraction-note.test.ts` | PASS |
| Fresh migration chain through `0040` | PASS |
| `npm run test:integration` on fresh isolated baseline | PASS — 12 files |
| `npm run test:usecase` on isolated DB | PASS — 3 files |
| `npm run test:privacy` on isolated DB | PASS — 2 files |
| `npm test` | PASS — lint, typecheck, 8 unit files, boundaries, signing, time and contrast |
| `npm run typecheck` | PASS |
| `npm run test:boundaries` | PASS through `npm test` — 205 delivery files, no direct DB access |
| `npm run build` | PASS — production build generated 35 pages |
| `git diff --check` | PASS |

The first focused run exposed the stale `vault_id` trigger defect and stopped before a Candidate transition. After the narrow trigger repair, focused coverage passed. An integration attempt on a database already contaminated by repeated focused fixtures failed a Stage 6 seed-baseline assertion; recreating the isolated database from zero produced the canonical 12-file PASS.

## 11. Files changed

Stage 8 changed only:

```text
src/modules/storage/candidates.ts
src/modules/storage/schema.ts
src/modules/knowledge/drafts.ts
drizzle/0040_project_candidate_draft.sql
tests/integration/project-extraction-note.test.ts
docs/refactor-stage-8-project-extraction-note-result.md
```

Accepted pre-existing Stage 1–7 changes remain untouched.

## 12. Compatibility gaps

- Existing Candidate route/UI still invokes Personal Branch evolution; the target service has no delivery adapter yet.
- A deliberately discarded derived draft leaves Candidate state `evolved`, clears its live draft FK through `SET NULL`, and relies on append-only audit for the historical result ID.
- Candidate listing remains creator-oriented legacy behavior and does not expose derived Project context.
- Target Candidate evolution creates a generic Project working Note; Evidence/Synthesis purpose is not modeled.
- Provenance is limited to direct extraction derivation. Note-to-Note and multi-source synthesis support are not implemented.
- Material moves are not implemented; an incorrectly owned Material must be corrected before target evolution in a future explicit workflow.
- Hybrid Core, Project UI, public publishing, search and Graph remain unimplemented.

## 13. Recommended Stage 9

Recommended Stage 9: **Research Note purpose and supporting-evidence relationship foundation**.

Narrow scope:

- represent Evidence versus Synthesis purpose without changing Project ownership;
- allow one synthesis Note to cite multiple Notes and SourceVersions;
- allow one Note or Material version to support multiple synthesis Notes;
- preserve original evidence and extraction provenance;
- do not implement semantic similarity, generic Graph, public publishing, Person, Activity, or UI redesign.
