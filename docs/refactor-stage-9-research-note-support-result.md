# Stage 9 — Research Note Purpose & Supporting Evidence Foundation Result

Date: 2026-09-01 (Asia/Ho_Chi_Minh)

## 1. Result

**PASS**

WisdomTree now supports optional research purpose and explicit, version-specific supporting research for author-private Project drafts and internal Project Notes. Support can cross confirmed Projects when the actor may mutate the target draft and read the supporting Project. No Note is merged, deduplicated, moved, classified automatically or given multi-Project ownership.

No route, UI, public reader, generic Graph, Person, Activity, Hybrid Core, seed rewrite or demo-data classification was added.

## 2. Note purpose representation

Nullable `research_purpose` columns were added to `node_drafts` and `tree_nodes` with database checks permitting only `evidence`, `synthesis` or `NULL`.

`NULL` remains valid for both legacy and new Notes. Purpose is independent of Project ownership, draft privacy, verification and publication. `createProjectNote` accepts optional purpose; `updateProjectDraftPurpose` changes it on an author-owned Vietnamese Project draft with optimistic draft-version enforcement and audit.

Project Note list reads now expose purpose for both official Notes and the caller's private drafts. Extraction-created Notes remain `NULL` unless an author classifies them later.

## 3. Supporting-evidence schema

Migration `0041_research_note_support.sql` adds four explicit many-to-many tables:

```text
draft_support_source_versions
draft_support_note_versions
note_support_source_versions
note_support_note_versions
```

Every relationship uses real foreign keys. Composite primary keys prevent duplicate support rows. Reverse indexes support lookup from a version to Notes that use it. There is no polymorphic `support_type/support_id`, generic Graph edge, position, annotation, citation formatting or content copy.

Draft target FKs use `ON DELETE CASCADE`, because discarding a private draft also discards only its unpublished working support set. Official target Note FKs use `ON DELETE CASCADE` only for relationship rows when the target Note itself is removed. Supporting SourceVersion and TreeNodeVersion FKs use `ON DELETE RESTRICT`, so evidence cannot silently disappear while official or draft provenance references it. No FK can cascade from evidence into the supported Note.

## 4. Immutable version decision

Material support targets `source_versions.id`; Note support targets `tree_node_versions.id`. Both are stable, constrained identifiers. TreeNodeVersion append-only behavior remains unchanged.

Focused coverage creates support to Evidence Note version 1, publishes version 2 later, and confirms the synthesis still references the exact version-1 UUID. The implementation does not downgrade provenance to mutable Source or TreeNode identity.

## 5. Draft support lifecycle

The target service facade provides:

```text
addDraftSupportingSourceVersion
addDraftSupportingNoteVersion
removeDraftSupportingSourceVersion
removeDraftSupportingNoteVersion
listDraftSupportingResearch
listNoteSupportingResearch
```

Only the author may inspect or mutate a private draft support set. Support mutation is limited to editable Vietnamese Project drafts; translation drafts cannot overwrite Note-level provenance. Duplicate adds are idempotent through database uniqueness. Direct self-support is rejected. Recursive cycle detection is deliberately not claimed.

When an existing internal Note first creates an edit draft, its current official support set and current purpose are copied into the draft in the same transaction. The official set remains effective and unchanged while editing. Restore-to-draft uses the same current support snapshot when it creates a new draft.

## 6. Internal publication transfer

For new and edited Vietnamese Notes, publication atomically:

1. writes the official TreeNode content and purpose;
2. appends the normal immutable TreeNodeVersion;
3. replaces the official support set from the draft snapshot;
4. preserves Stage 8 Candidate lineage where present;
5. deletes the private draft.

Protected Notes follow the same rule when an approved review consumes the submitted draft. `changes_requested` preserves the draft and its support; rejection/discard removes only draft support through the draft cascade.

The replacement occurs in the same transaction as the Note mutation. A forced official-support insert failure was tested: the TreeNode creation rolled back and the private draft plus its support remained intact.

## 7. Existing Note edit behavior

Existing support is copied when a Vietnamese edit draft is first created. Authors may add/remove support on that draft. Publishing replaces the official set with the edited snapshot; abandoning the draft leaves official support untouched.

Purpose follows the same working lifecycle. Historical TreeNodeVersion rows do not snapshot purpose in Stage 9; purpose describes the current Note rather than the version-specific evidence relation. Restoring historical content therefore starts from the current official purpose and support set, not a fabricated historical classification.

## 8. Cross-Project authorization

Target mutation requires current contributor-or-higher access to the target Project through the existing Project/Space compatibility policy.

Supporting SourceVersion authorization derives:

```text
SourceVersion → Source.space_id → confirmed Project
```

Supporting NoteVersion authorization derives:

```text
TreeNodeVersion → TreeNode.project_id → confirmed Project
```

The actor must currently read the supporting Project. Project-less Notes, Personal Sources and Sources under unconfirmed Team Spaces fail non-disclosing resolution. Cross-Project support preserves both original owners and copies no content. Read models omit supporting rows whose Project the caller cannot currently access.

Hybrid Core remains unimplemented.

## 9. Stage 8 extraction provenance compatibility

Candidate lineage and supporting research remain separate:

```text
Candidate → SourceVersion → derived Draft/TreeNode
    records where extracted work came from

Note/Draft → supporting versions
    records what research supported construction of the Note
```

Stage 8 Candidate-to-draft and Candidate-to-TreeNode transfer tests continue passing. Extraction does not automatically set `research_purpose=evidence` and does not automatically add a Stage 9 support row.

## 10. Existing demo-data preservation

All 34 existing demo TreeNodes remain unclassified. No existing SourceVersion, Note version or Candidate received a support relationship. No title/content inspection or semantic backfill occurred.

Normal local database `wisdomtree` before and after migration:

| Structure                  | Before |  After |
| -------------------------- | -----: | -----: |
| Projects                   |      1 |      1 |
| Sources                    |     36 |     36 |
| SourceVersions             |     10 |     10 |
| ExtractionCandidates       |      0 |      0 |
| NodeDrafts                 |      0 |      0 |
| TreeNodes                  |     34 |     34 |
| non-null TreeNode purpose  |    n/a |      0 |
| non-null NodeDraft purpose |    n/a |      0 |
| all four support tables    |    n/a | 0 each |

Stable fingerprints:

```text
tree_nodes  bcd543428a5ad464961606fc80606483
sources     606ad341af928d29688442d721ef4e70
```

Migration head advanced from `0040_project_candidate_draft.sql` to `0041_research_note_support.sql`.

## 11. Migration result

Migration: `drizzle/0041_research_note_support.sql`.

It adds two nullable checked columns, four explicit relation tables, composite uniqueness and reverse indexes. It contains no INSERT, data UPDATE, backfill, content inspection, Project reassignment or generic Graph schema.

The full migration chain through 0041 was validated from zero on isolated PostgreSQL before application to normal `wisdomtree`.

## 12. Tests executed

Stateful tests used isolated PostgreSQL databases `wisdomtree_test_stage9_20260901` and a fresh canonical baseline `wisdomtree_test_stage9_full_20260901`. Both were disposed after validation.

| Command                                   | Result                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| Focused `research-note-support.test.ts`   | PASS                                                                      |
| Stage 8 `project-extraction-note.test.ts` | PASS through integration suite                                            |
| Project Note and Project Material tests   | PASS through integration suite                                            |
| Fresh migration chain through 0041        | PASS                                                                      |
| `npm run test:integration`                | PASS — 13 files                                                           |
| `npm run test:usecase`                    | PASS — 3 files                                                            |
| `npm run test:privacy`                    | PASS — 2 files                                                            |
| `npm test`                                | PASS — lint, typecheck, 8 unit files, boundaries, signing, time, contrast |
| `npm run test:boundaries`                 | PASS through `npm test` — 205 delivery files, no direct DB access         |
| `npm run build`                           | PASS — 35 pages generated                                                 |
| `git diff --check`                        | PASS                                                                      |

The first unprivileged `npm test` attempt was blocked by sandbox IPC (`tsx` could not listen on `/tmp/tsx-1000/66.pipe`). The same command was rerun outside that sandbox and passed; this was an execution-environment restriction, not a test failure.

## 13. Files changed

Stage 9 changed only:

```text
src/modules/knowledge/schema.ts
src/modules/knowledge/drafts.ts
src/modules/knowledge/service-mutations.ts
src/modules/knowledge/service.ts
src/modules/knowledge/support.ts
drizzle/0041_research_note_support.sql
tests/integration/research-note-support.test.ts
docs/refactor-stage-9-research-note-support-result.md
```

Accepted pre-existing Stage 1–8 changes remain untouched.

## 14. Compatibility gaps

- Purpose and supporting research have no delivery route or UI yet.
- Existing demo/legacy Notes and Materials remain outside the target provenance service.
- Purpose is current Note metadata, not a historical TreeNodeVersion snapshot.
- The model rejects direct self-support but does not perform recursive cycle detection.
- Internal support is not public citation/bibliography data and is not exposed publicly.
- The existing generic `node_links` relation remains separate; Stage 9 does not migrate or reinterpret its legacy `supports` link type.
- Hybrid Core remains unimplemented; cross-Project access still requires explicit current Project membership.
- Withdrawal/archive presentation for evidence is unchanged; immutable referenced versions are protected by restrictive FKs.

## 15. Recommended Stage 10

Recommended Stage 10: **Canonical TMKT Person foundation**.

Narrow scope: introduce an auth-independent, TMKT-wide Person identity and Project participation/reference contracts without implementing Activity, UI, public publishing, semantic Graph, GIS or Hybrid Core authorization.
