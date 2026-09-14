# Stage 17.5 — Project Notes / Reader / Editor / Context Inspector Implementation

## 1. Routes
The target Note workspace uses a clean, unified route architecture under `/app/projects/:projectId`:
- `/app/projects/:projectId/notes`: Notes collection list page.
- `/app/projects/:projectId/notes/:noteId`: Unified reader and author-private draft editor workspace for both official Notes and standalone drafts.

## 2. Contracts
Consumed Stage 16 target application contracts under `src/modules/application/notes.ts`:
- `listAppProjectNotes(actor, projectId)`: Fetches project-owned official notes and author-private drafts.
- `getAppProjectNote(actor, projectId, noteId)`: Fetches authoritative official note, publication status, and editing capabilities.
- `getAppNoteWorkingState(actor, projectId, noteId)`: Fetches author's working draft state for an official note.
- `getAppDraft(actor, draftId)`: Fetches standalone private draft data.
- `createAppProjectNote(actor, input)`: Creates a new author-private note draft in the project.
- `saveAppNoteDraft(actor, input)`: Saves working draft changes with optimistic concurrency (`expectedVersion`).
- `updateAppDraft(actor, draftId, input)`: Updates standalone draft snapshots with optimistic concurrency.
- `updateAppDraftPurpose(actor, input)`: Updates research purpose on drafts.
- `publishAppDraft(actor, draftId)`: Atomically commits author draft into official Project Note version.

Delivery API routes (`src/app/api/app/projects/[projectId]/notes/...`):
- `POST /api/app/projects/:projectId/notes`: Creates note draft.
- `PUT /api/app/projects/:projectId/notes/:noteId/draft`: Saves/updates draft with `expectedVersion`.
- `POST /api/app/projects/:projectId/notes/:noteId/publish`: Promotes draft to official Project Note.

## 3. Collection
- Structured list layout designed for scan density.
- Rows show Title, Research Purpose badge (`Evidence` / `Synthesis`), State badge (`Official` / `Draft changes` / `New private draft`), and updated date.
- Emptystate and header respect `canCreateNote` capability (research-only users see no create buttons).
- N+1 query prevention: publication status is omitted from list rows and deferred to the Note detail view (§63).

## 4. Reader
- Priority on research content, title, optional summary, and metadata badges.
- Reading canvas uses `ResearchContent` typography with comfortable measure (76ch) and `dir="auto"`.
- Markdown content safely parsed and rendered via `MarkdownView` with zero `dangerouslySetInnerHTML`.
- "Edit" action appears only when `capabilities.canEdit` is true.

## 5. Editor
- Universal Markdown textarea editor with live Preview toggle.
- Zero heavy dependencies (no TipTap, Lexical, Slate, ProseMirror, Monaco, or CodeMirror).
- Editable fields: Title (required), Summary (optional), Content Markdown, Research Purpose (optional).
- Continuous "Author-private draft" indicator preserving project identity.

## 6. Draft Lifecycle
- Author-private drafts are completely private to their creator; other researchers cannot see them.
- Direct transition: Official Note -> Working draft -> "Save as internal Note" (`publishAppDraft`) -> Official Note updated version.
- Distinguishes internal note saving from public publishing.

## 7. Autosave
- Debounced autosave (1.5s) using `SaveStatus` states:
  - `Unsaved changes` (neutral)
  - `Saving…` (`aria-live="polite"`, info)
  - `Saved` (success)
  - `Save failed` (danger, retry button)
  - `Changes conflict` (warning, conflict recovery dialog)
- Quiet inline updates, zero disruptive toasts.

## 8. Concurrency & Conflict Handling
- Strictly checks `expectedVersion` / `draftVersion`.
- On `version_conflict` (HTTP 409), local buffer is 100% preserved.
- Dedicated Conflict Dialog offers "Copy my content" (clipboard) and "Reload latest".

## 9. Context Inspector
- Starts **closed by default**.
- Wide screens: Sticky right panel.
- Medium / narrow screens: Accessible overlay `Drawer`.
- Sections:
  - Context (Project, official vs draft, purpose)
  - Metadata (official version, draft version, tags)
  - Publication (server-computed publication state, public URL)
  - Evidence (attached research items, disabled "Add evidence" placeholder)

## 10. Publication Display
- Displays server-computed Stage 16 publication state:
  - `never_published` -> "Never published" / "Chưa xuất bản"
  - `published_current` -> "Published · Up to date" / "Đã xuất bản · Mới nhất"
  - `published_with_changes` -> "Published · Changes not public" / "Đã xuất bản · Có thay đổi nội bộ"
  - `unpublished` -> "Unpublished" / "Đã hủy xuất bản"
- Clear distinction between internal project publication and public web release.

## 11. Focus Mode
- Local client state toggling `.ui-next-note-workspace--focus`.
- Hides global navigation, project navigation, and inspector.
- Retains compact project title, draft badge, SaveStatus, and "Exit focus" button.
- Accessible keyboard shortcut: Escape exits focus mode.

## 12. Unicode / RTL
- Preserves arbitrary valid Unicode without normalization or restriction (Vietnamese, Han-Nom, Arabic, CJK, emoji, supplementary planes).
- Research content uses `dir="auto"`. Mixed RTL/LTR content does not disrupt LTR application shell.

## 13. Accessibility & Responsive
- Tested reflow at 200% zoom.
- Semantic HTML tags, aria attributes (`aria-live="polite"` on SaveStatus, accessible labels on all buttons/fields).
- Single-column flow on narrow screens; inspector transforms into drawer.

## 14. Simplicity Choices
- Concrete components: `NoteList`, `NoteReader`, `NoteEditor`, `NoteInspector`, `NoteWorkspace`, `NotesView`.
- Zero global stores or complex state machines.
- No second Markdown parser; reused core `parseBlocks` from `src/lib/markdown-core.ts`.
- Removed developer-stage string references ("Stage 17.4").

## 15. Stage 17.6 Handoff
- Evidence Picker and attachment mutations deferred to Stage 17.6.
- Inspection container and read-only evidence section ready for integration with Material/Note versions in Stage 17.6.
