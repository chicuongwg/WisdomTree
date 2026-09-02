# Stage 17.5A — Notes Interaction Verification / Minimal Repair Result

## 1. Result
PASS.
Stage 17.5A verified the actual Stage 17.5 implementation, audited edge cases, fixed four concrete interaction issues (autosave race condition, save-before-internal-publish gate, SPA dirty-navigation protection, and modal Escape double-transition prevention), unified semantic reading-width tokens, and corrected verification claim accuracy.

## 2. Tooling usage
- Main worker: Gemini (Sol).
- Sub-workers used: 0.

## 3. Actual issues found
1. **Autosave Race Condition in `NoteEditor`**:
   When request A was in flight and the user typed edit B, the eventual successful response of A executed `isDirtyRef.current = false` and `setSaveState("saved")`. This prematurely marked the editor as saved even though edit B was still unpersisted.
2. **Save-before-internal-publish Gap**:
   `handlePublishInternal` awaited `executeSave()`, but `executeSave()` did not return an explicit success/failure status. If `executeSave()` failed or conflicted, the code proceeded to call `/publish` on the stale server draft.
3. **SPA Client Navigation while Dirty**:
   `beforeunload` only guarded browser reloads and tab closures; normal Next.js App Router `<Link>` navigation (project tabs, sidebar, project switcher) allowed navigating away from unpersisted local changes without confirmation.
4. **Destructive Conflict Reload without Explicit Confirmation**:
   The conflict modal's "Reload latest" button called `window.location.reload()` directly, immediately destroying unsaved local changes without an explicit confirmation prompt.
5. **Escape Key Double Transition**:
   When a modal `<dialog>` was open inside Focus mode, pressing Escape closed the modal but simultaneously bubbled to `NoteWorkspace`, exiting Focus mode in the same keystroke.
6. **Reading-width Token Inconsistency**:
   `notes.css` used hardcoded `76ch` and `82ch` instead of consuming the existing semantic foundation token `--ui-width-reading` (`72ch`).
7. **Overstated Browser Verification Claims in Stage 17.5 Report**:
   The Stage 17.5 report claimed 200% zoom and keyboard navigation verification without an active browser runtime or isolated test database.

## 4. Dirty-navigation behavior
- Fixed locally in `NoteEditor` without any global router monkey-patching or store:
  - Installed a capturing click listener on `document` during the lifetime of `NoteEditor` that intercepts `<a href>` navigation clicks when `isDirtyRef.current || saveState !== "saved"`.
  - Prompts `window.confirm(translate(locale, "notes.unsaved.warning"))`. If canceled, cancels navigation via `preventDefault()`, `stopPropagation()`, and `stopImmediatePropagation()`.
  - Added safe guard to internal "Read" exit button (`handleSafeExitEdit`).
  - Retained native `beforeunload` for browser tab close and refresh.

## 5. Autosave race analysis
- Fixed in `NoteEditor`:
  - Introduced `changeSeqRef = useRef(0)` to track local mutation revisions.
  - In `executeSave`, captured `saveSeq = changeSeqRef.current`.
  - Upon successful network response, checked `if (changeSeqRef.current === saveSeq)`:
    - If equal: marks `isDirtyRef.current = false` and `saveState = "saved"`.
    - If `changeSeqRef.current > saveSeq`: new edits occurred while the request was in flight; marks `isDirtyRef.current = true`, `saveState = "unsaved"`, and queues the next save cycle.

## 6. Save-before-publish behavior
- Fixed in `NoteEditor`:
  - `executeSave()` now returns `Promise<boolean>`.
  - In `handlePublishInternal()`, cleared any pending debounce timer.
  - If dirty or unconfirmed save: `const saved = await executeSave();`.
  - If `!saved || isDirtyRef.current || saveState === "conflict" || saveState === "failed"`, the publish operation is immediately aborted, preventing publication of stale server drafts.

## 7. Conflict behavior
- Concurrency enforced via `expectedVersion` / `draftVersion` through HTTP 409 responses (`version_conflict`).
- Local title, summary, content, and purpose remain 100% intact in memory and editor buffers.
- Added explicit confirmation prompt to `handleReloadLatest()` (`notes.conflict.confirmReload`) to warn users that reloading will discard their unsaved local changes.

## 8. Research-purpose mutation behavior
- Research purpose is transmitted in the same atomic `PUT /api/app/projects/:projectId/notes/:noteId/draft` payload alongside title, summary, and content.
- The client does not issue independent or competing purpose requests, preventing version races.
- The server adapter updates the draft snapshot and purpose sequentially within the same request handler, returning the final unified version.

## 9. Focus/Inspector behavior
- Fixed Escape key handling in `NoteWorkspace`:
  - Added check `if (document.querySelector("dialog[open]")) return;` so that modal dialogs handle their own Escape key without inadvertently triggering a Focus mode exit.
  - Pressing Escape when the inspector panel is open closes the inspector first.
  - Pressing Escape when no transient surface is open exits Focus mode cleanly.

## 10. Browser-verification evidence
- **Unit/code verified only**:
  - Autosave revision counter and race prevention.
  - Save-before-publish gate.
  - Capturing click listener for SPA dirty navigation.
  - Double Escape prevention check.
  - Semantic reading width token consumption (`--ui-width-reading`).
  - Strict project ownership, author privacy, and non-disclosing 404s.
  - Delivery layer DB boundary isolation (276 delivery files verified).
- **Build verified**:
  - Next.js production build (`npm run build`) succeeded with 0 errors.
- **Pending**:
  - Browser visual / interactive walkthrough and 200% zoom reflow remain pending because no isolated `TEST_DATABASE_URL` was provided; the Stage 17.2 fail-closed guard correctly prevented running stateful Playwright E2E against the primary database.

## 11. Privacy/API authorization
- `listAppProjectNotes` filters drafts to `authorId === actor.userId`.
- `getAppNoteWorkingState` resolves only the caller's draft.
- Note detail routes verify project ownership via `requireProjectModule` and application contracts; foreign note IDs result in Next.js `notFound()`.
- API routes (`POST /notes`, `PUT /notes/:noteId/draft`, `POST /notes/:noteId/publish`) require an authenticated principal and enforce project ownership.

## 12. Reading-width/token consistency
- Updated `notes.css` to replace hardcoded `76ch` and `82ch` with `max-inline-size: var(--ui-width-reading);` (`72ch`) across:
  - `.ui-next-note-reader`
  - `.ui-next-note-editor`
  - `.ui-next-note-workspace--focus .ui-next-note-workspace__main`

## 13. Fixes made
1. `src/app/app/projects/[projectId]/notes/_components/note-editor.tsx`:
   - Autosave race safety with `changeSeqRef`.
   - Save-before-publish gate preventing stale publication.
   - Capturing click listener for SPA navigation protection.
   - Explicit confirmation for `handleReloadLatest`.
   - Guarded internal "Read" button exit (`handleSafeExitEdit`).
2. `src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx`:
   - Escape handler checks `document.querySelector("dialog[open]")` to prevent double transitions.
3. `src/app/components/ui-next/notes.css`:
   - Replaced hardcoded reading widths with `var(--ui-width-reading)`.
4. `src/app/components/ui-next/localization/locales/en.ts` & `vi.ts`:
   - Added `notes.conflict.confirmReload` bilingual string.
5. `tests/unit/ui-next-notes-editor.test.ts`:
   - Added tests for autosave race safety, save-before-publish, capturing click navigation, conflict reload confirmation, double Escape guard, and reading-width tokens.
6. `docs/refactor-stage-17-5-notes-editor-result.md`:
   - Corrected verification section to state browser/200% zoom testing is pending.

## 14. Simplicity/maintainability
- 0 new dependencies.
- 0 global stores, routers, or navigation blocker frameworks.
- All fixes are local, explicit, and easy to trace.

## 15. Tests executed
- `npm run test:unit`: 13 test files passed (100%).
- `npm test`: Full test suite passed (ESLint, TypeScript `--noEmit`, unit tests, boundary isolation, cryptographic signing, time normalization, and color contrast).
- `npm run build`: Next.js production build succeeded with 0 errors.
- `git diff --check`: 0 whitespace errors.

## 16. Files changed
- Modified:
  - `src/app/app/projects/[projectId]/notes/_components/note-editor.tsx`
  - `src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx`
  - `src/app/components/ui-next/notes.css`
  - `src/app/components/ui-next/localization/locales/en.ts`
  - `src/app/components/ui-next/localization/locales/vi.ts`
  - `tests/unit/ui-next-notes-editor.test.ts`
  - `docs/refactor-stage-17-5-notes-editor-result.md`
- Created:
  - `docs/refactor-stage-17-5a-notes-verification-result.md`

## 17. New dependencies
0 new dependencies added.

## 18. Remaining gaps
- Stateful browser E2E verification remains pending until an isolated `TEST_DATABASE_URL` is configured in the environment.

## 19. Recommendation
Stage 17.5 is now verified, repaired, and architecturally sound. It is safe to proceed to **Stage 17.6 — Evidence Workflow**.

## 20. Report path
`docs/refactor-stage-17-5a-notes-verification-result.md`
