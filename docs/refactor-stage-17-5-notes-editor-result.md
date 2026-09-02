# Stage 17.5 — Project Notes / Reader / Editor / Context Inspector Result

## 1. Result
PASS.
Stage 17.5 implements the complete research-content workflow under `/app/projects/:projectId/notes` and `/app/projects/:projectId/notes/:noteId`, providing:
- Project Notes collection list (structured scan-dense view with draft distinction).
- Official Note reader with `ResearchContent` typography, safe Markdown rendering, and server-driven capability gates.
- Author-private draft editor with live Markdown preview, debounced autosave, and explicit save fallback.
- Optimistic concurrency control (`expectedVersion` / `draftVersion`) with safe non-destructive conflict handling preserving local buffers.
- Optional research purpose selector (`Unspecified` / `Evidence` / `Synthesis`).
- Server-computed publication-state presentation (`never_published`, `published_current`, `published_with_changes`, `unpublished`).
- Optional Context Inspector (starts closed by default, responsive drawer on narrow viewports).
- Focus mode (local client canvas, hides global sidebar/project navigation, retains save status and escape exit).
- Zero new heavy dependencies (no TipTap, Lexical, Slate, etc.).
- Complete bilingual localization (VI/EN) and arbitrary Unicode/`dir="auto"` support.
- Full legacy preservation and boundary isolation verified.

## 2. Tooling / Sub-worker usage
- Main worker: Sol (owned reasoning, architectural decisions, code modifications, test authoring, and verification).
- Worker pool: Direct repository inspections and contract audits conducted safely without external API dependencies.

## 3. Contracts consumed
Consumed existing Stage 16 target application contracts from `src/modules/application/notes.ts`:
- `listAppProjectNotes(actor, projectId)`
- `getAppProjectNote(actor, projectId, noteId)`
- `getAppNoteWorkingState(actor, projectId, noteId)`
- `getAppDraft(actor, draftId)`
- `createAppProjectNote(actor, input)`
- `saveAppNoteDraft(actor, input)`
- `updateAppDraft(actor, draftId, input)`
- `updateAppDraftPurpose(actor, input)`
- `publishAppDraft(actor, draftId)`
- `toApplicationError(error)`

## 4. Route structure
Canonical target routes under App Router:
- `/app/projects/:projectId/notes`: Collection list.
- `/app/projects/:projectId/notes/:noteId`: Unified reader / editor / inspector workspace for both official notes and standalone author-private drafts.

Delivery mutation routes:
- `POST /api/app/projects/:projectId/notes`: Create note draft.
- `PUT /api/app/projects/:projectId/notes/:noteId/draft`: Save working draft changes with optimistic concurrency.
- `POST /api/app/projects/:projectId/notes/:noteId/publish`: Promote draft to official Project Note.

## 5. Notes collection
- Structured scanning list showing Title, Research Purpose badge, State badge (`Official`, `Draft changes`, `New private draft`), and last updated date.
- Empty state and header display "+ New Note" affordance only when `workspace.project.capabilities.canCreateNote` is true.
- N+1 query prevention: publication status is omitted from collection rows (§63) and rendered on Note detail.

## 6. Note reader
- Prioritizes research content with clean measure (max-width 76ch) using `ResearchContent` typography.
- Safe Markdown rendering via `MarkdownView` with zero `dangerouslySetInnerHTML`.
- Displays project name, official version, research purpose, and server-computed publication badge.
- Secondary controls: "Edit" (rendered only when `canEdit` capability is granted), "Focus mode", and "Details" (Inspector).

## 7. Private draft editor
- Universal Markdown textarea editor with live Preview toggle.
- Form fields: Title (required), Summary (optional), Content Markdown, Research Purpose (optional selector).
- Author-private status continuously indicated in toolbar.

## 8. Autosave
- Debounced save (1.5s) using `SaveStatus`:
  - `Unsaved changes` (neutral)
  - `Saving…` (`aria-live="polite"`, info)
  - `Saved` (success)
  - `Save failed` (danger, persistent inline retry action)
  - `Changes conflict` (warning, conflict recovery dialog)
- Quiet inline updates; no repetitive toasts.
- Explicit save fallback: triggers the same mutation endpoint before internal publication or on manual retry.

## 9. Conflict handling
- Concurrency enforced via `expectedVersion` / `draftVersion`.
- On `version_conflict` (HTTP 409), local buffer is 100% preserved.
- Dedicated Conflict Dialog offers "Copy my content" (to clipboard) and "Reload latest".
- Unsaved changes warning via `beforeunload` when navigation is attempted with dirty/failed local state.

## 10. Research purpose
- Supported states: `null` (Unspecified), `evidence` (Evidence), `synthesis` (Synthesis).
- Classification is optional during creation and editing.
- Localized labels in VI and EN.

## 11. Publication-state presentation
Presents server-computed publication state from `getAppProjectNote`:
- `never_published` -> Never published / Chưa xuất bản
- `published_current` -> Published · Up to date / Đã xuất bản · Mới nhất
- `published_with_changes` -> Published · Changes not public / Đã xuất bản · Có thay đổi nội bộ
- `unpublished` -> Unpublished / Đã hủy xuất bản
- Displays public URL slug when published.

## 12. Context Inspector
- Starts **closed by default** (§29).
- Responsive layout: sticky right side panel on desktop; overlay `Drawer` on narrow viewports (<= 900px).
- Sections:
  - Context: Project name, note state, research purpose.
  - Metadata: official version, draft version, tags.
  - Publication: publication status, public URL.
  - Evidence: attached research display + disabled "Add evidence" placeholder.

## 13. Focus mode
- Local client state toggling `.ui-next-note-workspace--focus`.
- Fixed overlay hiding global sidebar, project header, and navigation tabs.
- Retains compact project title, private draft badge, `SaveStatus`, and "Exit focus" button.
- Escape key closes transient inspector/drawers first, then exits focus mode.

## 14. Unicode / RTL
- Full preservation of arbitrary Unicode (Vietnamese, Han-Nom, Arabic, CJK, emoji, supplementary planes).
- Research content uses `dir="auto"`. Application chrome remains stable LTR.

## 15. VI / EN
- Complete bilingual catalog in `locales/vi.ts` and `locales/en.ts`.
- Removed obsolete developer-stage wording `"Stage 17.4"` from `page.projectEntry.description`.
- Clear vocabulary distinction between "Save draft", "Save as internal Note", and public publication.

## 16. Responsive / Accessibility
- Responsive architecture: Designed for Wide desktop, medium desktop, and single-column mobile.
- Semantic HTML tags, aria attributes (`aria-live="polite"` on SaveStatus, accessible labels on all buttons/fields).
- Verification status:
  - Unit/code verification: PASSED.
  - Browser visual / interactive keyboard walkthrough / 200% zoom reflow: PENDING (no isolated TEST_DATABASE_URL provided; fail-closed guard correctly prevented stateful E2E against primary database).

## 17. Server / Client boundary
- Server Components:
  - `src/app/app/projects/[projectId]/notes/page.tsx`
  - `src/app/app/projects/[projectId]/notes/[noteId]/page.tsx`
- Client Islands:
  - `notes-view.tsx` (collection interaction & new note dialog)
  - `note-workspace.tsx` (reader vs editor mode, inspector toggle, focus mode)
  - `note-editor.tsx` (form state, autosave timer, preview toggle, conflict modal)
  - `note-inspector.tsx` (drawer & panel toggling)

## 18. Simplicity / maintainability review
- Dependencies added: 0.
- Components added: 6 concrete components (`NoteList`, `NoteReader`, `NoteEditor`, `NoteInspector`, `NoteWorkspace`, `NotesView`).
- Abstractions deliberately avoided: generic document framework, universal editor engine, global editor store, plugin architecture, entity inspector framework, diff/merge algorithms.
- N+1 queries introduced: No (publication status omitted from list rows as mandated by §63).

## 19. Maintainer test
- **If a maintainer needs to change Note editor autosave behavior, which files must they understand?**
  - `src/app/app/projects/[projectId]/notes/_components/note-editor.tsx` (client debounce & state machine)
  - `src/app/api/app/projects/[projectId]/notes/[noteId]/draft/route.ts` (draft mutation endpoint)
  - `src/modules/application/notes.ts` (`saveAppNoteDraft` contract)
- **If a maintainer needs to change Note reader layout, which files must they understand?**
  - `src/app/app/projects/[projectId]/notes/_components/note-reader.tsx` (layout & metadata presentation)
  - `src/app/components/ui-next/notes.css` (reader canvas styling)

## 20. Legacy preservation
- No modifications to legacy Tree, Branch, Node, or Review controllers.
- No direct database imports in delivery code (276 delivery files verified by boundaries test).
- Zero database migrations or schema alterations.

## 21. Tests executed
1. `npm run test:unit`: 13 test files passed (including `ui-next-notes-editor.test.ts`).
2. `npm test`: Full test suite passed (ESLint, TypeScript `--noEmit`, unit tests, boundary isolation, cryptographic signing, time normalization, and color contrast checks).
3. `npm run build`: Next.js production build succeeded with dynamic rendering for `/app/projects/[projectId]/notes` and `/app/projects/[projectId]/notes/[noteId]`.
4. `git diff --check`: Passed with 0 whitespace issues.

## 22. Files changed
- Modified:
  - `src/app/components/ui-next/localization/locales/en.ts`
  - `src/app/components/ui-next/localization/locales/vi.ts`
  - `src/app/components/ui-next/index.ts`
  - `src/app/app/layout.tsx`
  - `src/app/components/ui-next/shell/create-dialog.tsx`
- Created:
  - `src/app/api/app/projects/[projectId]/notes/route.ts`
  - `src/app/api/app/projects/[projectId]/notes/[noteId]/draft/route.ts`
  - `src/app/api/app/projects/[projectId]/notes/[noteId]/publish/route.ts`
  - `src/app/components/ui-next/typography/markdown-view.tsx`
  - `src/app/components/ui-next/notes.css`
  - `src/app/app/projects/[projectId]/notes/_components/note-list.tsx`
  - `src/app/app/projects/[projectId]/notes/_components/note-reader.tsx`
  - `src/app/app/projects/[projectId]/notes/_components/note-editor.tsx`
  - `src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx`
  - `src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx`
  - `src/app/app/projects/[projectId]/notes/_components/notes-view.tsx`
  - `src/app/app/projects/[projectId]/notes/page.tsx`
  - `src/app/app/projects/[projectId]/notes/[noteId]/page.tsx`
  - `tests/unit/ui-next-notes-editor.test.ts`
  - `docs/ui-redesign/implementation/stage-17-5-notes-editor.md`
  - `docs/refactor-stage-17-5-notes-editor-result.md`

## 23. New dependencies
0 new dependencies added.

## 24. Risks / Gaps
- Browser tab closing during active in-flight network save is guarded via `beforeunload`, but abrupt process termination may leave unpersisted keystrokes since the last debounce (1.5s window).
- Evidence picker and attachment mutations are intentionally absent, awaiting Stage 17.6.

## 25. Recommended Stage 17.6
Proceed to **Stage 17.6 — Evidence Workflow**:
- Implement Evidence Picker dialog within Project scope and authorized cross-project scope.
- Support attaching exact `MaterialVersion` and `NoteVersion` provenance.
- Wire attach / detach mutations to Note author drafts.
- Populate the Evidence section of `NoteInspector` with interactive evidence items and provenance details.
