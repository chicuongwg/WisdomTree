# Stage 17.6R1 — Notes Correctness Repair Result

## 1. Verdict

**PASS**

The four authorized Note lifecycle defects are repaired without a schema migration, dependency, provenance change, or Stage 17.7 work. Queued saves use the server-confirmed draft identity/version; internal publication consumes the concrete save result and rejects intervening edits; editor fields and research purpose persist through one optimistic mutation; and relevant programmatic navigation consults the same unsaved-work contract as ordinary navigation.

Required unit, full fast-gate, build, diff, boundary, focused isolated integration, and Evidence regression checks pass. Browser interaction remains pending and is not claimed.

## 2. Tooling/sub-workers

Sol performed the repair and owned all implementation decisions. No R1 sub-worker was needed after direct inspection established the four local defects.

Repository tools used were read-only source/Git inspection, `apply_patch`, existing Prettier, existing npm validation, and a temporary migrated/seeded PostgreSQL database named `wisdomtree_test_stage17r1_20260902`. The temporary database was dropped after validation.

## 3. Recovered baseline confirmation

Before R1 edits, the exact R0 recovered baseline was protected outside the repository at:

```text
/tmp/wisdomtree-stage17-r1-pre-repair.NnG647
```

The snapshot contains repository identity, `git status --short`, a binary diff, and hashes of all 17 recovered files. Those hashes matched R0. Identity remained `main` at `1b75bba44987220d301cf71147bbdfbce680013d` in `/home/will/dev/WisdomTree`.

No reset, clean, checkout, staging, or unrelated-file restoration occurred.

## 4. Autosave queued-save defect

The recovered editor stored draft identity/version in React state and rewrote its request ref during rendering. After save A succeeded, it scheduled React state updates and immediately drained queued save B. B could therefore read the old version, and first-draft creation could leave B with a missing draft ID.

## 5. Autosave repair

`NoteEditor` now gives a mutable request snapshot explicit ownership of latest field values, `draftId`, and `draftVersion`. React state remains presentation state.

On success, `applySuccessfulNoteSave` synchronously writes the returned ID/version before the local save loop may capture another request. The loop now executes:

```text
capture request A and sequence
await A
apply returned draftId/version synchronously
mark A sequence persisted
capture/send B only when newer edits exist
```

Queued B therefore uses A's confirmed optimistic version, including newly assigned identity/version after first-draft creation.

## 6. First-save draft-ID defect

The recovered publish handler awaited a boolean save result and then read asynchronously rendered state, falling back to the official Note ID. A first save could create draft D while publication submitted the wrong identity.

## 7. Save-before-publish repair

Editor save now returns a concrete local result containing `draftId`, `draftVersion`, and `savedSequence`. Publication uses `saved.draftId` directly.

The handler captures the local edit sequence before saving and aborts unless the save succeeds, the returned sequence is the requested sequence, no newer local edit appeared, and no unpersisted sequence remains. A change typed while the save is in flight may be queued and saved, but the original publish action still aborts because its captured sequence is stale.

## 8. Atomic content/purpose mutation

The Project draft PUT route no longer performs content update followed by purpose update. It calls exactly one application mutation per Note state:

- official Note edit: `saveAppNoteDraft`;
- existing Project draft: `updateAppDraft`.

Both pass research purpose into the existing knowledge-layer draft mutation. `saveNodeDraft` and `updateDraft` write title, summary, content, associations, and purpose under one optimistic version transition. Purpose-change audit creation is in the same database transaction.

One editor save is now:

```text
draft version N + title/summary/content/purpose
→ draft version N+1
```

The older explicit purpose boundary remains for compatibility consumers, but the R1 editor route no longer uses it.

## 9. Purpose validation

Create and draft-update delivery boundaries accept only omission, `null`, `evidence`, or `synthesis`. Any other supplied value returns `invalid_input` before mutation. The knowledge layer independently retains `invalid_research_purpose` validation for direct calls.

Focused stateful tests verify malformed purpose cannot partially change title, content, purpose, or version and cannot create a first-edit draft.

## 10. Dirty-navigation defect

The recovered capture listener covered ordinary anchors but not ProjectSwitcher, the narrow ProjectNavigation selector, Quick Search activation, or Quick Search “view all.” It also conflated a visual `unsaved` label with loss risk and did not exempt modifier/middle-click navigation.

## 11. Dirty-navigation repair

One small contract now lives at:

```text
src/app/components/ui-next/navigation/unsaved-note-navigation.ts
```

The editor registers a cancelable unsaved-Note guard. Only the actual programmatic consumers above call `runGuardedNoteNavigation` before `router.push`. A rejected select navigation restores its displayed current value.

This is not a router/history patch, event bus, global editor store, or generic navigation framework.

The anchor guard skips already-prevented events, modifier clicks, middle/non-primary clicks, new browsing contexts, downloads, and same-path/same-query hash changes. Ordinary destructive anchor navigation remains guarded. Browser unload and reader/editor exit use the same sequence-based loss-risk definition.

## 12. Initial clean-state behavior

Loss risk is derived from:

```text
hasUnpersistedWork = changeSequence > savedSequence
```

An untouched official Note starts clean and does not prompt. An untouched new Note may retain the meaningful `unsaved` label because no draft exists, but is not dirty until a local modification increments the sequence. Failed/conflicted saves remain protected because their sequence is never marked persisted.

## 13. Evidence regression

The Stage 17.6 Evidence unit test and isolated `research-note-support` integration test pass. R1 changed no Evidence route, attach/detach mutation, schema, or draft-version behavior.

Markdown safety, Inspector contracts, Focus mode, Escape ordering, and Evidence Picker structural checks remain covered by the passing unit suite. No visual redesign occurred.

## 14. Maintainability

### Autosave

Read `note-editor.tsx` for network sequencing and `note-editor-state.ts` for the pure request-snapshot/persisted-sequence helpers.

### Navigation

The single contract is `unsaved-note-navigation.ts`. NoteEditor registers it; ProjectSwitcher, ProjectNavigation, and QuickSearch consume it.

### Draft mutation

The atomic editor save is defined by `knowledge/drafts.ts` (`saveNodeDraft`/`updateDraft`), thin adapters in `application/notes.ts`, and one delivery dispatch in `draft/route.ts`.

No generic state abstraction, router interception, duplicate authorization path, schema, or dependency was introduced.

## 15. Tests executed

| Command | Result |
| --- | --- |
| `npm run test:unit` | PASS — 14 files including timing/navigation/Evidence checks |
| `npm test` | PASS — lint, typecheck, unit, boundaries, signing, time, and contrast gates |
| `npm run build` | PASS — production build; 37 static pages |
| `git diff --check` | PASS — no output |
| `npm run test:boundaries` | PASS — 284 delivery files, no direct database access |
| `DATABASE_URL=$TEST_DATABASE_URL npx tsx tests/integration/note-project-ownership.test.ts` | PASS — isolated atomic save, validation, conflict, and first-draft checks |
| `DATABASE_URL=$TEST_DATABASE_URL npx tsx tests/integration/research-note-support.test.ts` | PASS — isolated Evidence/support regression |

An initial attempt to pass one file to `tests/run-all.ts` returned `ENOTDIR` because that runner accepts directories. The corrected direct invocation used matching isolated database variables and passed. This was an invocation error, not a product failure.

The build emitted the existing informational Next.js ESLint-plugin warning; compilation and static generation completed.

## 16. Browser verification status

| Verification level | Status |
| --- | --- |
| Code inspected | VERIFIED |
| Unit verified | VERIFIED |
| Focused integration verified | VERIFIED in isolated database |
| Build verified | VERIFIED |
| Browser verified | PENDING |

No browser/E2E run was performed. Unit tests verify the navigation decision contract and consumer wiring, but R1 does not claim interactive focus, layout, or visual behavior.

## 17. Files changed

R1 changed or created:

```text
src/modules/knowledge/drafts.ts
src/modules/application/notes.ts
src/app/api/app/projects/[projectId]/notes/route.ts
src/app/api/app/projects/[projectId]/notes/[noteId]/draft/route.ts
src/app/app/projects/[projectId]/notes/_components/note-editor.tsx
src/app/app/projects/[projectId]/notes/_components/note-editor-state.ts
src/app/components/ui-next/navigation/unsaved-note-navigation.ts
src/app/components/ui-next/index.ts
src/app/app/projects/[projectId]/_components/project-switcher.tsx
src/app/app/projects/[projectId]/_components/project-navigation.tsx
src/app/components/ui-next/shell/quick-search.tsx
tests/unit/ui-next-notes-editor.test.ts
tests/integration/note-project-ownership.test.ts
docs/refactor-stage-17-6r1-notes-correctness-result.md
```

All other dirty/untracked Stage 17 files predated R1 and were preserved.

## 18. New dependencies

```text
0
```

No package/lock file or schema migration changed.

## 19. Remaining known defects

R1 deliberately leaves the separate high-severity provenance limitation unchanged: official Note support is keyed to mutable Note identity, not immutable target `TreeNodeVersion`. Historical official evidence sets therefore remain non-reconstructable.

R1 also makes no browser-level claim and does not repair unrelated Evidence UI, RTL, Graph, Materials, legacy UI, or Project/Space compatibility concerns.

## 20. Stage 17.6R2 recommendation

Proceed to coordinator review, then Stage 17.6R2 as a separate migration/design stage for:

```text
immutable Note revision
→ immutable evidence support snapshot
```

R2 must define migration/backfill truth limits explicitly and must not infer unavailable historical evidence relationships.

Stop after R1. Do not begin R2 or Stage 17.7 automatically.
