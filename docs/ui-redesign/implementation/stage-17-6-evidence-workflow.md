# Stage 17.6 — Evidence Workflow Implementation

## 1. Evidence Model
Evidence in WisdomTree captures exact research provenance: "Which exact immutable source/note version supports this draft or synthesis?"
The implementation consumes the accepted Stage 9 support model:
- `draftSupportSourceVersions` (linking `draftId` to exact `sourceVersionId`)
- `draftSupportNoteVersions` (linking `draftId` to exact `noteVersionId`)
- `noteSupportSourceVersions` (linking official `nodeId` to exact `sourceVersionId`)
- `noteSupportNoteVersions` (linking official `nodeId` to exact `noteVersionId`)

Evidence always references immutable versions (`SourceVersion` and `TreeNodeVersion`), never mutable parent entity IDs alone.

## 2. Search Scope
The Evidence Picker opens scoped to the `Current Project` by default to minimize accidental cross-project attachments.
Users may toggle scope to `All research I can access`, querying all projects where the actor possesses research-read authorization.
Empty queries in project scope list the project's official Materials and official Notes. Empty queries in all-access scope show a clear search prompt.

## 3. Cross-Project Authorization
Cross-project evidence is supported under strict dual authorization:
1. Target Draft Mutation Access: The actor must be authorized to mutate the target working draft in the target Project.
2. Supporting Research Access: The actor must possess research-read authorization (`requireProjectResearchRead`) on the supporting Project.
All four Evidence API endpoint groups (`/evidence/search`, `/evidence/versions`, `/evidence/source-version`, `/evidence/note-version`) verify target draft mutation access first.

## 4. Exact-Version Selection
- Material evidence attaches a specific `SourceVersion` (`sourceVersions.id`).
- Note evidence attaches a specific `TreeNodeVersion` (`treeNodeVersions.id`).
- Version metadata is requested lazily only after the user selects an evidence candidate, eliminating version-list N+1 waterfalls.

## 5. Attach / Detach Semantics
- Attach inserts a discrete relation into `draftSupportSourceVersions` or `draftSupportNoteVersions`.
- Detach removes only the support relation row. The underlying Material, Note, and immutable versions remain completely intact and unaffected in other projects or notes.
- Support relations are attached to the author's working draft. Upon internal publishing (`publishDraft`), existing Stage 9 logic atomically copies the draft support relations to the official note version.

## 6. Draft Concurrency & Autosave Safety
- In `src/modules/knowledge/support.ts`, support mutations operate strictly on relation tables and do not update `nodeDrafts.version`.
- Because `draftVersion` on `nodeDrafts` is unchanged, the `NoteEditor`'s `expectedVersion` remains completely valid. Text autosave and evidence mutations will not cause false concurrency conflicts.

## 7. Inspector Integration
The Note Inspector distinguishes reading vs authoring states:
- Reader Mode: Displays official note support relations (`listAppNoteSupportingResearch`) in read-only mode.
- Editor Mode / Working Draft Active: Displays working-draft support relations (`listAppDraftSupportingResearch`) with interactive Remove buttons and an "+ Add evidence" button.
- Official and draft evidence sets are never merged into an ambiguous composite.

## 8. Server / Client Split
- Server Component (`notes/[noteId]/page.tsx`):
  Conditionally loads initial official support (`listAppNoteSupportingResearch`) and working draft support (`listAppDraftSupportingResearch`).
- Client Islands:
  - `NoteWorkspace`: owns active evidence state and coordinates dialogs.
  - `NoteInspector`: renders the evidence provenance list.
  - `EvidencePicker`: handles scoped search, lazy version fetching, and attachment confirmation.

## 9. Accessibility & Responsive Ergonomics
- On mobile/narrow viewports, opening `EvidencePicker` from the Inspector Drawer suspends the drawer first to prevent nested modal dialogs and stacked backdrops.
- Full keyboard navigation (Tab, Shift+Tab, Escape) supported.
- `dir="auto"` applied to all research titles and snippets.

## 10. Simplicity Choices
- 0 new external dependencies.
- 0 generic relation frameworks (concrete endpoints for `source-version` and `note-version`).
- 0 global stores (local React island state).

## 11. Codex-Audit Considerations
- Re-check official support/version provenance semantics during the first cumulative Codex audit after quota reset. Note that official support currently associates with official `treeNodes.id` while drafts attach to `nodeDrafts.id`, copied upon publishing.

## 12. Stage 17.7 Handoff
Ready for **Stage 17.7 — Materials / Extraction**:
- Project Material collection
- Material detail & digital versions
- Upload & new version intake
- Extraction status and candidate review
