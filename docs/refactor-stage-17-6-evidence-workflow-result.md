# Stage 17.6 — Evidence Workflow Result

## 1. Result
PASS.
Stage 17.6 implements the complete research evidence workflow for Project Notes:
- Scoped Evidence Picker (`Current Project` vs `All research I can access`).
- Search for Materials and official Notes (excluding all private drafts).
- Exact immutable version selection (`SourceVersion` and `TreeNodeVersion`).
- Discrete attach and detach mutations on working drafts.
- Inspector provenance presentation distinguishing official support vs working-draft support.
- Zero impact on `nodeDrafts.version`, keeping text autosave completely safe and conflict-free.
- Target draft mutation authorization enforced across all evidence endpoints.

## 2. Tooling usage
- Main worker: Gemini 3.7 High.
- Sub-workers used: 0.

## 3. Contracts consumed
- `src/modules/storage/service.ts`: `listSourceVersions(actor, sourceId)`.
- `src/modules/knowledge/service-queries.ts`: `listProjectNoteVersions(actor, nodeId)`.
- `src/modules/application/materials.ts`: `listAppMaterialVersions`, `listAppProjectMaterials`.
- `src/modules/application/notes.ts`: `listAppNoteVersions`, `listAppProjectNotes`, `listAppDraftSupportingResearch`, `listAppNoteSupportingResearch`, `addAppDraftSupportingSourceVersion`, `addAppDraftSupportingNoteVersion`, `removeAppDraftSupportingSourceVersion`, `removeAppDraftSupportingNoteVersion`.
- `src/modules/application/search.ts`: `searchAppResearch`.

## 4. Evidence domain mapping
Evidence maps directly to accepted Stage 9 support relations:
- `draftSupportSourceVersions` (`draftId`, `sourceVersionId`)
- `draftSupportNoteVersions` (`draftId`, `noteVersionId`)
- `noteSupportSourceVersions` (`nodeId`, `sourceVersionId`)
- `noteSupportNoteVersions` (`nodeId`, `noteVersionId`)
Relations point to immutable versions (`SourceVersion`, `TreeNodeVersion`), not mutable parent entity IDs.

## 5. Picker flow
- Launched via "+ Add evidence" button in Note Inspector.
- Presents scope toggle: `[ Current Project ]` (default) vs `[ All research I can access ]`.
- Live debounced search input (250ms).
- Grouped results: Materials and Notes with title, project name, and type badge.
- Clicking an item loads version list lazily; user selects exact version and confirms Attach.

## 6. Search/scope behavior
- Authorization-first search via `searchAppResearch` filtering `types: ["material", "note"]`.
- Empty query in Current Project scope returns project materials and official project notes.
- Private drafts are strictly excluded from evidence search (even the caller's own drafts).

## 7. Material version selection
- Queries `listAppMaterialVersions(actor, materialId)`.
- Lists exact immutable `SourceVersion` entries (`seq`, `originalFilename`, `storedAt`).
- Attaches `sourceVersionId` UUID.

## 8. Note version selection
- Queries `listAppNoteVersions(actor, noteId)`.
- Lists exact immutable official `TreeNodeVersion` entries (`seq`, `title`, `createdAt`), excluding archived or unverified versions.
- Attaches `noteVersionId` UUID.

## 9. Attach behavior
- Attaches to author's private working draft.
- Endpoints: `POST /api/app/projects/:projectId/notes/:noteId/evidence/source-version` and `.../note-version`.
- Updates client evidence state immediately.

## 10. Detach behavior
- Deletes only the relation row from `draftSupportSourceVersions` or `draftSupportNoteVersions`.
- Preserves the underlying Material, Note, and versions completely intact.
- Endpoints: `DELETE /api/app/projects/:projectId/notes/:noteId/evidence/source-version` and `.../note-version`.

## 11. Cross-Project authorization
- Target draft mutation authorization: Verified by `resolveExistingTargetDraft` before any search, version lookup, or mutation.
- Supporting research read authorization: Verified by `requireProjectResearchRead` on the supporting object's project.
- Research-only users cannot access evidence picker endpoints.

## 12. Draft/editor concurrency behavior
- Audit confirmed `addDraftSupportingSourceVersion` and `removeDraftSupportingSourceVersion` operate strictly on support relation tables and do NOT bump `nodeDrafts.version`.
- `NoteEditor`'s `expectedVersion` remains completely valid; text autosaves after evidence mutations succeed without false conflicts.

## 13. Inspector integration
- Reader Mode: Displays official note support relations (`listAppNoteSupportingResearch`) in read-only mode.
- Editor Mode / Working Draft Active: Displays working-draft support relations (`listAppDraftSupportingResearch`) with interactive Remove buttons and "+ Add evidence".
- No blind merging of official and draft evidence sets.

## 14. Unicode + VI/EN
- Arbitrary Unicode preserved in titles and snippets with `dir="auto"`.
- Complete bilingual localization catalog in `en.ts` and `vi.ts` (`notes.evidence.*`).

## 15. Accessibility/responsive
- Accessible Dialog with focus management and keyboard navigation (Tab, Escape).
- Narrow screen ergonomics: Closes Inspector Drawer before opening EvidencePicker Dialog to prevent nested dialog conflicts.
- Inline status and accessible labels on all controls.

## 16. Server/client boundary
- Server Component (`notes/[noteId]/page.tsx`): Conditionally loads initial official support and working-draft support.
- Client Island (`NoteWorkspace`): Owns active evidence state, coordinates picker dialog and mutations.

## 17. Simplicity/maintainability
- Dependencies added: 0.
- Components added: 1 concrete component (`EvidencePicker`).
- Abstractions deliberately avoided: generic relation engine, polymorphic relation tables, universal version provider, global draft store.
- N+1 queries introduced: No (lazy version loading for single selected item only).

## 18. Codex-audit notes
- Re-check official support/version provenance semantics during the first cumulative Codex audit after quota reset. Note that official support currently associates with official `treeNodes.id` while drafts attach to `nodeDrafts.id`, copied upon publishing.

## 19. Tests executed
- `npm run test:unit`: 14 test files passed (including `ui-next-evidence-workflow.test.ts`).
- `npm test`: Full test suite passed (lint, typecheck, unit tests, 282 delivery files boundaries check, signing, time, contrast).
- `npm run build`: Next.js production build succeeded with dynamic rendering.
- `git diff --check`: 0 whitespace issues.
- Browser visual / stateful E2E: Accurately reported as **PENDING** (no isolated `TEST_DATABASE_URL` configured; fail-closed guard correctly preserved primary database).

## 20. Files changed
- Modified:
  - `src/modules/storage/service.ts`
  - `src/modules/knowledge/service-queries.ts`
  - `src/modules/application/materials.ts`
  - `src/modules/application/notes.ts`
  - `src/app/app/projects/[projectId]/notes/[noteId]/page.tsx`
  - `src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx`
  - `src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx`
  - `src/app/components/ui-next/notes.css`
  - `src/app/components/ui-next/localization/locales/en.ts`
  - `src/app/components/ui-next/localization/locales/vi.ts`
  - `tests/unit/ui-next-notes-editor.test.ts`
- Created:
  - `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/_lib.ts`
  - `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/search/route.ts`
  - `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/versions/route.ts`
  - `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/source-version/route.ts`
  - `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/note-version/route.ts`
  - `src/app/app/projects/[projectId]/notes/_components/evidence-picker.tsx`
  - `tests/unit/ui-next-evidence-workflow.test.ts`
  - `docs/ui-redesign/implementation/stage-17-6-evidence-workflow.md`
  - `docs/refactor-stage-17-6-evidence-workflow-result.md`

## 21. New dependencies
0 new dependencies added.

## 22. Risks/gaps
- Stateful browser E2E verification remains pending until an isolated `TEST_DATABASE_URL` is configured in the environment.

## 23. Recommended Stage 17.7
Proceed to **Stage 17.7 — Materials / Extraction**:
- Project Material collection
- Material detail & digital versions
- Upload & new version intake
- Extraction status and candidate review
