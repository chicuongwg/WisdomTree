# Codex Cumulative Audit — Stage 17.5 through 17.6

Audit date: 2026-09-02

## 1. Verdict

**BLOCKED.**

The cumulative checkpoint cannot be ratified. The current checkout contains zero-byte Stage 17.5/17.6 delivery, application, storage, and test files, so the Note detail workflow and Evidence workflow are not runnable or auditable end to end. Independent inspection also found four substantive correctness defects in surviving code:

1. queued autosave can send a stale optimistic draft version;
2. first save-before-publish can submit the official Note ID instead of the newly created draft ID;
3. title/summary/content and research purpose are two non-atomic server mutations;
4. official supporting research is stored as a replaceable current-Note projection, so support used by historical Note version v1 is lost when v2 changes the support set.

Stage 17.7 must not begin.

## 2. Tooling/sub-workers

- Primary audit and synthesis: Codex Sol.
- Read-only sub-workers: three Codex Luna Max workers covering editor/privacy, Evidence APIs/authorization, and provenance/schema/query behavior.
- Repository inspection: `rg`, `find`, `nl`, Git status/diff inspection, and direct source tracing.
- Verification: required unit, aggregate test, build, and whitespace commands; a standalone boundary check was also run.
- No browser/E2E execution: no isolated browser/database run was needed to establish the blockers, and normal `wisdomtree` was not used for stateful tests.

## 3. Files/stages audited

The Stage 17.5 and 17.5A reports were read as claims, then checked against the Note routes, editor, reader, Markdown parser, draft services, navigation components, schema, support services, and existing integration tests. The Stage 17.6 report is zero bytes and supplies no usable evidence.

The following checkpoint files are present but exactly zero bytes:

```text
docs/refactor-stage-17-6-evidence-workflow-result.md
docs/ui-redesign/implementation/stage-17-6-evidence-workflow.md
src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/_lib.ts
src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/note-version/route.ts
src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/search/route.ts
src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/source-version/route.ts
src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/versions/route.ts
src/app/app/projects/[projectId]/notes/[noteId]/page.tsx
src/app/app/projects/[projectId]/notes/_components/evidence-picker.tsx
src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx
src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx
src/modules/application/materials.ts
src/modules/application/notes.ts
src/modules/knowledge/service-queries.ts
src/modules/storage/service.ts
tests/unit/ui-next-evidence-workflow.test.ts
tests/unit/ui-next-notes-editor.test.ts
```

The four zero-byte module files under `src/modules` are tracked files with their prior contents removed in the working tree. They account for broad missing-export/type failures. No attempt was made to reconstruct or overwrite them during this audit.

## 4. Note privacy

**Surviving domain layer: PASS. Delivery checkpoint: BLOCKED.**

The existing draft service constrains Project drafts to the author and Project context (`src/modules/knowledge/drafts.ts:178-219`, `src/modules/knowledge/drafts.ts:270-280`). Existing Note mutation adapters call `requirePrincipal` (`src/app/api/app/projects/[projectId]/notes/[noteId]/draft/route.ts:13-19`).

However, `src/modules/application/notes.ts` and the Note detail page are empty. The audit therefore cannot trace the live detail route through its application boundary, verify non-disclosing direct access, or run the claimed privacy tests. UI hiding is not accepted as authorization evidence.

## 5. Autosave race

**FAIL.**

`changeSeqRef` correctly prevents response A from marking later edit B as saved (`note-editor.tsx:114-155`). It does not make the queued second save safe:

- response A calls asynchronous `setDraftVersion` (`note-editor.tsx:143-145`);
- the queued save is invoked immediately from `finally` (`note-editor.tsx:161-165`);
- `stateRef.current` receives the new version only on a later render (`note-editor.tsx:76-92`);
- the queued call can therefore reuse the old `expectedVersion` (`note-editor.tsx:100-129`) and conflict against the version just created by response A.

Edit B remains in local state, but it is not reliably persisted and can be pushed into a false conflict. A safe repair must synchronously advance the mutable save snapshot from the response before draining the queue, with a timing-focused test.

## 6. Save-before-publish

**FAIL for first edit of an official Note; otherwise partially sound.**

The handler clears the debounce, awaits save, and aborts for failed/conflicted/newly dirty state (`note-editor.tsx:244-257`). That is directionally correct.

When the first save creates an edit draft, the response calls `setDraftId` (`note-editor.tsx:143-146`), but the same publish action immediately reads `stateRef.current.draftId` (`note-editor.tsx:259-268`). Before a rerender, that ref can still be null, causing fallback to `initialNoteId`, which is the official Node ID. The publish adapter resolves the supplied value as a draft ID (`src/app/api/app/projects/[projectId]/notes/[noteId]/publish/route.ts:21-31`), so the operation can fail instead of publishing the just-saved draft.

The response draft ID and version must be synchronously propagated to the save snapshot or returned directly to the publish flow.

## 7. Dirty navigation

**FAIL.**

The capturing listener covers anchor clicks and exempts `_blank`, downloads, and same-path/search hash changes (`note-editor.tsx:197-235`). Keyboard activation of an anchor normally produces a click and is covered. It does not cover programmatic App Router navigation:

- Project switcher: `src/app/app/projects/[projectId]/_components/project-switcher.tsx:38`;
- Project module selector: `src/app/app/projects/[projectId]/_components/project-navigation.tsx:70-73`;
- Quick Search result and “view all”: `src/app/components/ui-next/shell/quick-search.tsx:143-146`, `src/app/components/ui-next/shell/quick-search.tsx:232-239`.

Those common paths can silently discard dirty, failed, or conflicted buffers. Modifier and middle clicks are not filtered before prompting (`note-editor.tsx:204-225`), producing unnecessary prompts for navigation that usually leaves the current tab intact. A clean official editor also starts with `saveState = "unsaved"` when no draft exists (`note-editor.tsx:60-66`), so it can warn before any edit.

`beforeunload` correctly covers dirty, unsaved, failed, and conflict states (`note-editor.tsx:180-195`) but cannot repair App Router navigation.

## 8. Conflict handling

**PARTIAL.**

The client preserves its controlled field values when a 409 occurs and displays conflict state (`note-editor.tsx:133-139`). “Reload latest” now requires explicit confirmation (`note-editor.tsx:304-308`). This is sound by code inspection.

The focused test file is empty, the Note workspace is empty, and no browser timing test was run. The autosave stale-version defect can also manufacture avoidable conflicts.

## 9. Focus/Inspector behavior

**BLOCKED / absent in the current checkout.**

The reader/editor expose focus and Inspector callbacks, but `note-workspace.tsx` and `note-inspector.tsx` are zero bytes. Therefore there is no auditable owner for focus state, Inspector state, responsive drawer behavior, or Escape precedence. CSS cannot establish interaction correctness. Gemini’s Escape and focus claims are not ratified.

## 10. Markdown safety

**PASS by code inspection; browser verification pending.**

`MarkdownView` constructs React elements and does not use `dangerouslySetInnerHTML` (`src/app/components/ui-next/typography/markdown-view.tsx:18-57`, `src/app/components/ui-next/typography/markdown-view.tsx:180-186`). The parser only permits `/`, `#`, HTTP(S), and mail links, and restricts images to internal blob/avatar endpoints (`src/lib/markdown-core.ts:163-171`). External links receive `noopener noreferrer` (`markdown-view.tsx:34-43`). Raw text is rendered as React text.

## 11. Evidence authorization

**Domain primitive PASS; Stage 17.6 boundary BLOCKED.**

Surviving support services require the target author’s editable Project draft and resolve supporting immutable versions through a confirmed Project research-read check (`src/modules/knowledge/support.ts:22-81`). That correctly separates target mutation authority from supporting-item read authority.

All Stage 17.6 Evidence routes and their shared adapter are empty. Authentication, non-disclosing behavior, input validation, cross-Project HTTP behavior, and error mapping cannot be verified or exercised.

## 12. GET purity

**BLOCKED.**

The Evidence search and versions GET route files are zero bytes. There is no implementation from which to prove that GET uses an existing author draft without creating or mutating one. No claimed GET-purity test exists in executable form.

## 13. Search privacy

**PARTIAL at the older service; Stage 17.6 BLOCKED.**

The surviving generic internal Note search reads official `tree_nodes`, not `node_drafts` (`src/modules/search/service.ts:146-168`), which avoids private-draft search leakage. Draft-support reads also filter returned supporting rows to research-readable confirmed Projects (`src/modules/knowledge/support.ts:200-234`).

The intended Evidence picker/search route and UI are empty, so exclusion of all drafts, scoped cross-Project results, response shape, and direct HTTP privacy are not independently verified.

## 14. Exact version provenance

**PARTIAL.**

The domain support relations accept exact `source_version_id` and `note_version_id` foreign keys with restrictive deletion behavior (`src/modules/knowledge/schema.ts:280-317`, `src/modules/knowledge/schema.ts:319-357`). Supporting Note edits therefore do not change the supporting version ID already attached.

The Evidence picker and version routes are absent. Existing generic search returns parent Note/Material identities rather than an immutable version selection (`src/modules/search/service.ts:146-218`). Stage 17.6’s exact-version selection UX/API is not implemented in the current checkout.

## 15. Attach/detach

**Domain primitive PASS; delivery BLOCKED.**

Attach inserts the exact draft/support-version relation and detach deletes only that exact relation (`src/modules/knowledge/support.ts:83-197`). Duplicate identity is constrained by composite primary keys in the schema (`src/modules/knowledge/schema.ts:280-317`). These operations neither copy nor move the supporting research item.

The HTTP mutation adapters and unit test are empty, so the Stage 17.6 user-facing boundary cannot be ratified.

## 16. Draft-version interaction

**PASS at the surviving support service.**

Support attach/detach touches only `draft_support_*` rows and audit records; it does not update `node_drafts.draft_version` (`src/modules/knowledge/support.ts:83-197`). This avoids false text conflicts from evidence-only mutations. The empty delivery files prevent end-to-end verification.

## 17. Official provenance-history audit

**FAIL — high-severity correctness gap.**

Official support is keyed by mutable `node_id`, not by the exact target `tree_node_version_id` (`drizzle/0041_research_note_support.sql:32-50`, `src/modules/knowledge/schema.ts:319-357`). On publication, the system appends a Note version and then deletes/replaces all official support rows for the Node (`src/modules/knowledge/drafts.ts:619-620`, `src/modules/knowledge/drafts.ts:664-665`, `src/modules/knowledge/support.ts:305-334`). Review publication follows the same model (`src/modules/knowledge/service-mutations.ts:640-680`). Restore-to-draft restores old content but copies the current support projection (`src/modules/knowledge/drafts.ts:837-864`, `src/modules/knowledge/drafts.ts:908-909`).

Consequently:

```text
Note v1 supported by A
→ Note v2 changes support to B
→ v1 content remains immutable
→ v1 → A support cannot be reconstructed
```

The current integration test verifies that a supporting Note’s old immutable version remains selected after that supporting Note changes; it does not test historical support sets across versions of the target synthesis Note (`tests/integration/research-note-support.test.ts:269-288`).

Minimum design repair before ratification:

1. add append-only official support relations keyed by the target `tree_node_version_id` plus the exact supporting SourceVersion/NoteVersion ID;
2. have Note-version creation return its ID and snapshot the draft support set into those relations in the same publish/review transaction;
3. retain the current `node_id` projection temporarily if compatibility consumers need it;
4. resolve history/restore from version-scoped relations;
5. add a focused v1→A, v2→B reconstruction test.

Any existing current-node relation can at most be mechanically associated with the latest known version. Earlier historical support must remain explicitly unknown; it must not be invented.

## 18. Unicode/RTL

**Unicode: PASS by code inspection. RTL interaction/layout: PARTIAL.**

Markdown parsing and React rendering preserve arbitrary strings (`src/lib/markdown-core.ts:41-44`, `src/lib/markdown-core.ts:173-209`). The editor sends content without normalization and uses `dir="auto"`; `MarkdownView` also defaults to `dir="auto"` (`note-editor.tsx:117-130`, `markdown-view.tsx:12-16`, `markdown-view.tsx:180-185`).

Some Note CSS remains physically left-specific rather than flow-relative (`src/app/components/ui-next/notes.css:432-470`). Browser RTL, selection, dialog, and 200% zoom validation are pending.

## 19. API/boundary audit

**Boundary rule PASS; Stage 17.6 API BLOCKED.**

`npm run test:boundaries` passed: 282 delivery files, no direct database access. Existing Note adapters authenticate and map through the application error boundary (`draft/route.ts:13-19`, `draft/route.ts:104-107`).

The result does not validate empty files. Every Evidence route is zero bytes, while `src/modules/application/notes.ts` and `materials.ts` are also empty. Authentication, validation, status mapping, raw-error suppression, and route methods for Stage 17.6 are absent/unverifiable.

The draft adapter also silently maps invalid purpose values to null rather than rejecting malformed input (`draft/route.ts:44-47`; create route `src/app/api/app/projects/[projectId]/notes/route.ts:31-34`).

## 20. Query/performance

**PARTIAL / no obvious surviving N+1; intended workflow unavailable.**

The older Notes collection uses two fixed queries (`src/modules/knowledge/drafts.ts:182-218`). Official support loading uses two parallel bulk queries (`src/modules/knowledge/support.ts:246-277`), although it obtains a complete readable-Project list and filters returned support rows in memory. Note list draft matching is an in-memory O(notes × drafts) scan (`src/app/app/projects/[projectId]/notes/_components/note-list.tsx:75-87`).

Evidence search, lazy version selection, and Inspector loading cannot be audited because their implementation files are empty. There is no evidence that version history is loaded lazily only for the selected picker item.

## 21. Maintainability

**FAIL at checkpoint level.**

The intended local component split is understandable, and the surviving Markdown/support primitives are narrow. The checkout nevertheless has four tracked core service modules truncated to zero, untracked empty routes/components/tests, a client save state split between React state and mutable refs without synchronized response updates, and a draft endpoint composed from two non-atomic mutations. This is not a maintainable or releasable checkpoint.

## 22. Tests executed

| Command | Result |
| --- | --- |
| `npm run test:unit` | **FAIL** — `tests/unit/ui-next-evidence-workflow.test.ts` is empty and exports no `run()` function. |
| `npm test` | **FAIL** — lint completed, then TypeScript failed on empty non-modules and missing exports; later test steps did not run. |
| `npm run build` | **FAIL** — compilation completed, but type validation rejected the empty Evidence route as “not a module.” |
| `git diff --check` | **PASS** — no whitespace errors. |
| `npm run test:boundaries` | **PASS** — 282 delivery files, no direct database access. This does not establish behavior for empty routes. |

No stateful suite or browser test was run against normal `wisdomtree`.

## 23. Repairs made

No application, schema, test, or Stage report repair was made. Only this independent audit report was added.

Repairing zero-byte tracked/untracked files without an authoritative checkpoint source would risk overwriting or fabricating concurrent work. The provenance defect also requires an explicit migration/design decision rather than an improvised audit-time patch.

## 24. Remaining risks

1. **P0:** zero-byte core modules, Note detail composition, Evidence routes/components, tests, and Stage 17.6 reports make the checkout non-buildable.
2. **P1:** historical official evidence sets are not reconstructable per target Note version.
3. **P1:** queued autosave can conflict on its own stale version.
4. **P1:** first save-before-publish can use the wrong draft ID.
5. **P1:** purpose and content updates can partially commit or interleave.
6. **P1:** Project switcher, module selector, Quick Search, and other programmatic navigation can discard unsaved state.
7. **P2:** clean official editors and modifier/middle-click navigation can produce false warnings.
8. Browser focus, Inspector, keyboard, RTL, responsive, and zoom claims remain unverified.

## 25. Final recommendation

Do not ratify the Gemini checkpoint. First:

1. recover the exact intended contents of the zero-byte files from an authoritative source or known commit; do not hand-reconstruct them from reports;
2. repair and directly test autosave response-state synchronization and first-save draft-ID publication;
3. make content/purpose persistence one atomic optimistic mutation;
4. cover every app navigation entry point with a small shared dirty-navigation contract, preserving modifier/middle/new-tab behavior;
5. approve and implement version-scoped official provenance before claiming historical evidence auditability;
6. rerun the focused privacy/timing/evidence tests, `npm run test:unit`, `npm test`, `npm run build`, and `git diff --check`;
7. keep browser/RTL/accessibility claims pending until a safe isolated browser run is available.

## 26. Whether Stage 17.7 may begin

**No. Stage 17.7 may not begin.**

The prerequisite Note/Evidence checkpoint is absent in material parts, the repository does not typecheck/build, and exact official provenance history has a confirmed design gap.
