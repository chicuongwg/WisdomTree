# Stage 6 — Note Project Ownership Result

Date: 2026-09-01 (Asia/Ho_Chi_Minh)

## 1. Result

**PASS**

Authoritative Project ownership now exists for target Notes and their author-private working drafts. Existing demo Nodes, Personal Notes, Team Notes, Branches, versions, proposals, and extraction behavior were not migrated or rewritten.

No route, API handler, UI, search, Graph, public publishing, Note taxonomy, Hybrid Core rule, Person, Activity, or seed data changed.

## 2. Chosen ownership representation

Chosen representation: direct nullable `project_id` on `tree_nodes`, with the same Project context carried by `node_drafts` while a new Note is still an author-private working copy.

```text
tree_nodes.project_id IS NOT NULL
→ authoritative internal Project Note

node_drafts.project_id IS NOT NULL
→ author-private working Note in that Project

project_id IS NULL
→ demo/legacy compatibility only
```

This keeps one Project owner per Note, preserves TreeNode identity/history, supports eventual Branch retirement, and avoids a second one-to-one ownership table with another lifecycle. `NodeDraft.project_id` is supporting context rather than a separate ownership model: publication carries it onto the new TreeNode.

Project ownership remains separate from:

- Branch organization;
- draft visibility;
- verification;
- internal draft publication;
- future public-web publication.

## 3. Schema migration

Migration: `drizzle/0039_note_project_ownership.sql`

It adds:

- nullable `tree_nodes.project_id` FK to `projects.project_id` with `ON DELETE RESTRICT`;
- `tree_nodes_project_id_idx`;
- nullable `node_drafts.project_id` FK to `projects.project_id` with `ON DELETE RESTRICT`;
- `node_drafts_project_author_idx` for Project + author working-copy reads;
- database triggers enforcing Project/Branch consistency in both directions;
- a draft/official-Node Project consistency trigger.

The migration contains no content inspection, `INSERT`, `UPDATE`, or backfill.

## 4. Project Note creation contract

Added `createProjectNote(actor, input)` in `src/modules/knowledge/drafts.ts`.

Required product input:

```text
projectId
title
contentMd
summary? 
tags?
```

The caller cannot choose Personal/Team scope or Branch. The service:

1. resolves `projects.project_id`, rejecting arbitrary Spaces;
2. requires current contributor-or-higher Project participation;
3. validates Markdown and normalizes title, summary and tags;
4. resolves or creates one internal Team Branch named `Ghi chú dự án` inside the confirmed Project;
5. creates an author-private `NodeDraft` with authoritative `project_id`;
6. records Project context in the existing draft audit convention.

The internal Branch creation and draft creation occur in one transaction. A Project-scoped advisory lock prevents concurrent first-note creation from racing the compatibility Branch unique key.

Existing `createNode` and `createTeamDraft` remain legacy compatibility paths and create Project-less records.

## 5. Privacy/working-state separation

`createProjectNote` returns an author-private working draft while retaining the Project ID:

```text
Project ownership = Project ID
Working visibility = author_private
```

Existing `getDraft` continues requiring the exact draft author plus current Project/Space write access. A manager or another Project member cannot read someone else's private working draft merely through Project membership.

`listProjectNotes` returns:

- official Project Nodes visible to the Project participant;
- only the current actor's Project drafts.

It never returns another author's draft. `NodeDraft` optimistic `draftVersion`, Markdown validation, edit/rebase/review lifecycle and author ownership remain intact.

## 6. Branch compatibility

Branches remain required internally by the current Node/Draft, title uniqueness, wiki, history and navigation implementations. They are not the target ownership source.

For the new target boundary:

```text
Project context
→ service-owned compatibility Branch resolution
→ private NodeDraft
→ internal TreeNode
```

The caller never supplies Branch ownership. Existing `/tree`, Branch IDs, Branch hierarchy and legacy routes remain unchanged.

Current compatibility limitation: the internal Branch is still visible to old Branch-oriented read surfaces after it exists. Hiding or retiring Branch from the user mental model belongs to later route/UI recomposition, not this stage.

## 7. Project consistency invariant

The database enforces:

```text
authoritative Note/Draft Project P
→ Branch.scope = team
→ Branch.space_id = P
→ P exists in projects
```

It rejects:

- Project A Note using Project B Branch;
- Project Note using Personal Branch;
- Project draft linked to an official Node in another Project;
- moving/retyping a Branch so its authoritative Notes or drafts would contradict ownership.

The reverse Branch trigger prevents a later Branch update from invalidating already-authoritative Note ownership. Project deletion remains restrictive.

## 8. Project Note reads

Added `listProjectNotes(actor, projectId)`.

It:

- requires a confirmed Project extension;
- requires current viewer-or-higher Project participation;
- returns only `tree_nodes.project_id = projectId` official Notes;
- returns only the caller's `node_drafts.project_id = projectId` working drafts;
- excludes Project-less demo/legacy Notes;
- excludes Notes and drafts from other Projects;
- returns non-disclosing `not_found` for inaccessible or non-Project contexts.

No search or Graph behavior changed.

## 9. Existing demo Note preservation

Local Docker PostgreSQL database: `wisdomtree`.

| Structure | Before | After |
| --- | ---: | ---: |
| `tree_nodes` | 34 | 34 |
| authoritative Project Nodes | 0 | 0 |
| `node_drafts` | 0 | 0 |
| `tree_node_versions` | 56 | 56 |
| `branches` | 6 | 6 |
| `projects` | 1 | 1 |

Migration head advanced from `0038_task_project_ownership.sql` to `0039_note_project_ownership.sql`.

The pre-migration TreeNode full-row hash was `c0a00d941836f37278a4150879ab4b2f`. After migration, hashing all original columns while excluding the new `project_id` produced the same value.

All 34 current demo Nodes remain `project_id = NULL`. No Team-Branch derivation, Personal classification, title/content/tag inspection, or manual assignment occurred.

## 10. Proposal compatibility

The existing Personal→Team Proposal workflow was not modified and is not used by `createProjectNote`.

Legacy proposal approval may still create a Project-less Team Node because it remains a compatibility path. Existing proposal, review, version and privacy suites pass unchanged. New target Notes use Project context directly and do not require Personal→Team copying.

Internal `publishDraft` terminology still means draft → internal TreeNode. It does not mean public web publication. For Project drafts, the service now carries `NodeDraft.project_id` to the created TreeNode and records Project context in the audit metadata.

## 11. Extraction follow-up seam

No extraction code changed.

The new service boundary permits a later flow:

```text
Project-owned Material
→ extraction candidate
→ createProjectNote(projectId from authoritative Material ownership)
```

Current candidate evolution still creates a Personal/Project-less Node and remains legacy compatibility. The next extraction stage can call the Project Note boundary without exposing Branch or relying permanently on Personal Branch promotion.

## 12. Tests executed

All stateful tests used disposable database `wisdomtree_test_stage6_20260901`. It was migrated from zero, seeded, used for validation, then dropped; the final existence count was `0`.

| Command | Result |
| --- | --- |
| Focused `note-project-ownership.test.ts` on freshly migrated isolated DB | PASS |
| `npm test` | PASS — lint, typecheck, 8 unit files, boundaries, signing, time and contrast |
| `npm run test:integration` on isolated DB | PASS — 10 files |
| `npm run test:usecase` on isolated DB | PASS — 3 files |
| `npm run test:privacy` on isolated DB | PASS — 2 files |
| `npm run typecheck` | PASS |
| `npm run test:boundaries` | PASS — 205 delivery files, no direct DB access |
| `npm run build` | PASS — production build generated 35 pages |
| `git diff --check` | PASS |

An initial focused run on the disposable database exposed that a generic PostgreSQL trigger referenced the draft-only `node_id` field while running for `tree_nodes`. The invariant was split into a table-specific draft trigger, the database was recreated from zero, and focused plus canonical suites passed. The normal database never received the faulty migration version.

## 13. Files changed

Stage 6 changed only:

```text
src/modules/auth/authorize.ts
src/modules/knowledge/schema.ts
src/modules/knowledge/drafts.ts
drizzle/0039_note_project_ownership.sql
tests/integration/note-project-ownership.test.ts
docs/refactor-stage-6-note-project-ownership-result.md
```

Accepted pre-existing Stage 1–5 changes remain untouched.

## 14. Compatibility gaps

- Existing 34 demo Nodes remain Project-less.
- Legacy `createNode`, `createTeamDraft`, proposal approval and extraction evolution can still create Project-less Nodes.
- Old Tree/Branch UI remains Branch-oriented and can display the compatibility Branch.
- The internal compatibility Branch is identified by a reserved service name; archive/collision lifecycle policy is not yet a target product contract.
- Project Note edits reuse existing internal draft publication terminology.
- Evidence/Synthesis purpose taxonomy is not implemented.
- Project-aware search, Graph and cross-Project discovery are not implemented.
- Public publishing is not implemented.
- Hybrid Core is not implemented.
- Demo seed data remains legacy-shaped.

## 15. Recommended Stage 7

Recommended Stage 7: **Project-aware extraction-to-Note boundary**.

Narrow scope:

- derive Project only from the extraction candidate's authoritative owning Material/Source;
- create the resulting working Note through `createProjectNote`;
- stop the target extraction path from requiring Personal Branch evolution;
- retain the current Personal evolution path only as explicit demo/legacy compatibility;
- do not yet redesign upload UI, extraction review UI, Note taxonomy, search, Graph, or seed data.
