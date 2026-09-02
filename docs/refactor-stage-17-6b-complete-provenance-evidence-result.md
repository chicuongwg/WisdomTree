# Stage 17.6B — Complete Provenance & Evidence Result

## 1. Verdict

**PASS.** Internal Note evidence is now snapshotted against the exact immutable target Note version. Historical reads and restores no longer depend on the mutable current-support projection.

## 2. Tooling/sub-workers

Sol owned implementation and validation. Three read-only scouts audited schema/migration design, all official-version writers and restore behavior, and Evidence API/UI authorization. No worker modified repository files.

## 3. Problem

The existing `note_support_*` tables identified only a mutable Note. Publishing a later version replaced that set, so evidence for an earlier version could not be reconstructed. Restore also copied the current set into historical content.

## 4. Final provenance model

Canonical history is now:

```text
TreeNodeVersion
├── note_version_support_source_versions → exact SourceVersion
└── note_version_support_note_versions   → exact supporting TreeNodeVersion
```

There is one target Note identity and one immutable support snapshot per official version. No polymorphic relation or generic graph was introduced.

## 5. Schema/migration

`drizzle/0048_note_version_support.sql` adds:

- `tree_node_versions.support_snapshot_complete`;
- `note_version_support_source_versions`;
- `note_version_support_note_versions`;
- explicit restrictive foreign keys, composite primary keys, reverse indexes, and immutability triggers.

The TreeNodeVersion append-only guard permits exactly one additional mutation: `support_snapshot_complete: false → true` with every other column unchanged. Version-support rows accept inserts only while the target snapshot is incomplete and reject later insert/update/delete.

## 6. Unknown vs known-empty

```text
support_snapshot_complete = false → UNKNOWN
support_snapshot_complete = true, zero rows → KNOWN EMPTY
support_snapshot_complete = true, relation rows → COMPLETE SNAPSHOT
```

The version-scoped read returns `snapshotStatus: "unknown" | "complete"`; the Inspector renders unknown history separately from an empty evidence set.

## 7. Backfill truth policy

Migration 0048 copies the current node-level projection only to the latest version of each authoritative Project Note and marks that latest version complete. Older versions remain unknown. Project-less demo/legacy Notes remain unknown. A Project Note without any official version aborts migration instead of receiving an invented state.

## 8. Publish transaction

`snapshotNoteVersionSupport` is the single write path. In one transaction it reads the draft/current set, writes exact version-scoped relations, updates the temporary current projection when publishing a draft, and seals the version marker. Any failure rolls back the Note version, evidence rows, current projection, and draft publication.

The exact inserted `TreeNodeVersion.id` is obtained with `RETURNING`; no query-latest write pattern is used.

## 9. All official-version writers

All six runtime insertion sites now create an incomplete version, pass its returned ID to the canonical helper, and commit only after sealing:

- new and edited draft publication through `appendNodeVersion`;
- protection-change versioning through `appendNodeVersion`;
- legacy personal Node create/update;
- reviewed change approval, using the submitted draft set when present;
- legacy Personal-to-Team publication;
- legacy extraction evolution.

The review path snapshots before deleting its submitted draft.

## 10. Compatibility projection

```text
note_version_support_* = canonical immutable historical truth
note_support_*         = temporary mutable current-state projection
draft_support_*        = author-private working state
```

The old node-scoped tables remain for compatibility and are updated from the same selected draft rows as the canonical snapshot.

## 11. Version-scoped read

`listNoteVersionSupportingResearch(actor, noteVersionId)` is the canonical historical read. It authorizes the target through its confirmed Project and constrains both supporting-item queries to currently research-readable confirmed Projects before rows are returned. It performs two bounded bulk queries, not one query per relation.

The older node-ID read now resolves the current official version and delegates to this service.

## 12. Restore behavior

`restoreNodeVersionToDraft` now rejects `support_snapshot_complete = false` with `historical_support_unavailable`. For complete history it replaces both support sets on either a new or existing draft from the exact selected version. It never falls back to current support.

## 13. Evidence workflow integration

Reader Inspector uses `officialNote.currentVersionId` and the canonical version-scoped read. Editor Inspector uses only the working draft set. Reader and editor purpose/version metadata are mode-correct. The UI does not offer evidence mutation before an author-owned draft exists, and the editor reports the first successful autosave back to the workspace.

Read-only draft evidence remains readable by its author while in review; mutation still requires `editing`. Empty-query Project evidence results now carry the real Project display name.

## 14. Cross-Project authorization

Target draft mutation still requires author ownership and Project contributor authority. Supporting versions require research-read in their owning confirmed Project. Snapshot reads filter inaccessible supporting Project metadata in SQL. Core research-read behavior remains as defined by Stage 12; it does not grant draft mutation.

## 15. Standalone draft publication

A standalone author-private Project draft can attach exact evidence versions and publish its first official Note version. The helper receives the newly created Note ID explicitly, so the first version and its current projection are complete even though the draft previously had no `node_id`.

## 16. Historical provenance tests

Focused integration coverage proves:

- V1 with evidence A remains A after V2 publishes evidence B;
- V3 with no evidence is complete and known-empty;
- a supporting Note later creating Y does not change a target relation to exact version X;
- restoring V1 restores A, not current evidence;
- an unknown historical version fails without changing the existing draft;
- canonical relation rows cannot be changed after sealing;
- reviewed publication and all protection-created versions are complete;
- a forced current-projection failure rolls back the new Note/version/snapshot transaction.

## 17. Migration tests

A disposable PostgreSQL database was migrated through 0047, populated with the pre-0048 shape, then migrated with the exact 0048 SQL. Observed result:

```text
V1 older                  false / 0 relations
V2 latest, projection B   true  / 1 relation to B
latest known-empty        true  / 0 relations
```

A unit guard also checks the migration truth predicates, explicit marker, schema columns, immutable guards, and coverage of all six runtime version writers.

## 18. Query/performance

Exact support reads use one target lookup plus two bulk relation queries. Authorization is included in the supporting-row SQL predicates. Draft/current snapshot writes select each relation set once and bulk insert. No N+1 path or asynchronous projection was added.

## 19. Maintainability

### Historical write

`src/modules/knowledge/support.ts` → `snapshotNoteVersionSupport`.

### Historical read

`src/modules/knowledge/support.ts` → `listNoteVersionSupportingResearch`.

### Truth state

`tree_node_versions.support_snapshot_complete` distinguishes unknown from known-empty.

### Compatibility

`note_version_support_*` is canonical history; `note_support_*` is the temporary current projection.

## 20. Validation

```text
npm run test:unit
PASS — 15 files

focused research-note-support integration test
PASS — isolated migrated PostgreSQL database

two-phase 0047 → 0048 migration probe
PASS — truthful latest-only/known-empty result

npm run test:integration
PASS — 20 files, isolated database

npm run test:usecase
PASS — 3 files, isolated database

npm run test:privacy
PASS — 2 files, isolated database

npm test
PASS — lint, typecheck, unit, boundaries, signing, time, and contrast checks

npm run build
PASS — 37 static pages generated; production build completed

git diff --check
PASS

npm run test:boundaries
PASS — 284 delivery files, no direct database access
```

Both disposable databases were dropped after validation.

## 21. Browser status

**PENDING.** Browser validation was optional and was not run. The UI change is limited to truthful Inspector state and first-save evidence availability; build and UI contract tests pass.

## 22. Files changed

- `drizzle/0048_note_version_support.sql`
- `src/modules/knowledge/schema.ts`
- `src/modules/knowledge/support.ts`
- `src/modules/knowledge/drafts.ts`
- `src/modules/knowledge/service-mutations.ts`
- `src/modules/knowledge/service-queries.ts`
- `src/modules/knowledge/publication.ts`
- `src/modules/storage/candidates.ts`
- `src/modules/application/notes.ts`
- `src/app/app/projects/[projectId]/notes/[noteId]/page.tsx`
- `src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx`
- `src/app/app/projects/[projectId]/notes/_components/note-editor.tsx`
- `src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx`
- `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/search/route.ts`
- `src/app/components/ui-next/localization/locales/en.ts`
- `src/app/components/ui-next/localization/locales/vi.ts`
- `tests/integration/research-note-support.test.ts`
- `tests/unit/note-version-provenance.test.ts`
- `tests/unit/ui-next-evidence-workflow.test.ts`
- `docs/refactor-stage-17-6b-complete-provenance-evidence-result.md`

Pre-existing Stage 17 working-tree changes were preserved.

## 23. New dependencies

None.

## 24. Remaining risks

- Historical support for older pre-0048 Project Note versions is intentionally unknown and cannot be reconstructed without authoritative external evidence.
- Project-less legacy/demo Note versions remain outside the target provenance model.
- Node-scoped current support remains temporarily present for legacy consumers and must not be treated as historical truth.
- Browser interaction validation remains pending.

Normal local `wisdomtree` advanced from migration 0047 to 0048. Counts remained `tree_nodes=35` and `tree_node_versions=57`; no version-support relation was fabricated. The database currently has no authoritative Project Note versions, so both the latest-complete and older-unknown Project Note counts are zero.

## 25. Recommendation for Stage 17.6V

Perform the planned independent Notes & Evidence validation against this completed implementation. Recheck migration/backfill truth, all six writers, append-only enforcement, exact-version reads/restores, cross-Project privacy, API interaction, and the browser Inspector/editor behavior. Do not begin Stage 17.7 Materials until that independent gate accepts 17.6B.
