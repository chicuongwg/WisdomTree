# Functional Specification

## Purpose
- Translate product intent into actionable, implementation-facing capabilities and user stories.
- Define business rules and acceptance criteria per module without dropping into code-level detail.

## In Scope
- Capability groups for Source Repo, Knowledge Tree, Search and Graph, Workflow, Board, Export, Auth, and Notifications.
- User stories for User, Editor, and Admin/Op.
- Business rules that must remain stable across backend and frontend implementation.

## Out of Scope
- Database schema field lists.
- Full API reference.
- Component-level UI layout details.

## Decisions
- Functional requirements are organized by capability module.
- Each module includes user stories, business rules, and acceptance criteria.
- Tree publication always requires Markdown as the final content format.
- Source-driven publication and manual tree authoring both exist in V1.

## Dependencies
- Product intent in [`../product/prd.md`](../product/prd.md).
- Scope boundaries in [`../product/scope-v1.md`](../product/scope-v1.md).
- Roles in [`../product/roles-personas.md`](../product/roles-personas.md).
- System constraints in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).

## Acceptance Criteria
- Each major product surface has explicit user stories and business rules.
- Functional requirements can be directly mapped to system modules and screen specs.
- No core workflow remains undefined for User, Editor, or Admin/Op.

## Capability 1: Source Intake and Repository

### User Stories
- As an authenticated user, I can upload a source file so that the team can extract and review knowledge from it.
- As a User, I can view the status of my submitted source items.
- As an Editor, I can continue follow-up work on my own submissions or items assigned to me when the content needs correction or update.
- As an Admin/Op, I can inspect source files, raw text, corrected text, provenance, and trust status.
- As an Admin/Op, I can classify unsupported files as `unprocessable` without losing the source record.

### Business Rules
- Every upload creates a source record and a source version.
- Original source files are stored in the Source Repo, not in the Knowledge Tree.
- Raw extracted text is immutable.
- Corrected text is editable and versioned.
- Source trust status is independent from node verification status.
- Users can view only their own submissions and limited status information, not the full Source Repo.
- Editors may edit source-derived working content only when the item is owned by them or assigned to them.
- Uploader, editor/updater, and approver actions must be recorded separately in audit history.
- Unsupported formats may be retained as `unprocessable`.

### Acceptance Criteria
- Upload produces a trackable source item with a stable identifier.
- Users can see upload outcome and processing state.
- Editors can identify which own or assigned items need their follow-up action.
- Admin/Op can open the source item and inspect evidence artifacts.

## Capability 2: OCR, Parsing, and Text Correction

### User Stories
- As an Admin/Op, I need extraction output to distinguish raw text from corrected text.
- As an Editor, I can correct extracted text when the item is owned by me or assigned to me.
- As an Admin/Op, I can review the corrected text before allowing Markdown publication.

### Business Rules
- Parser-first extraction is preferred for text-based formats; OCR is used when parsing is weak or input is image-based.
- Raw text cannot be overwritten.
- Corrected text must preserve a clear audit trail of who changed it and when.
- Corrected text edits must not be available to baseline `User` accounts.
- OCR confidence and parsing errors must surface in the review workflow.

### Acceptance Criteria
- Extraction jobs produce either parsed text, OCR text, or an explicit failure state.
- Owned or assigned Editors can edit corrected text without modifying raw text.
- Reviewers can compare raw and corrected text before approval.

## Capability 3: Markdown Drafting and Promotion

### User Stories
- As an Admin/Op, I can review a Markdown draft created from corrected text.
- As an Editor, I can help shape the Markdown draft before final review if the item is owned by me or assigned to me.
- As an Admin/Op, I can publish an approved Markdown draft into the tree.

### Business Rules
- Tree publication always produces or updates a Markdown node.
- Every promotion stores the link between source version, corrected text, Markdown draft, reviewer action, and published node version.
- A single source may contribute to multiple tree nodes.
- Promotion may create a new node or a new version of an existing node.
- Markdown draft approval and trust decisions remain exclusive to `Admin/Op`.

### Acceptance Criteria
- Admin/Op can approve or reject a Markdown draft.
- Published nodes preserve source linkback and review provenance.
- Promotion results appear in the tree and are indexed for discovery.

## Capability 4: Manual Tree Authoring

### User Stories
- As an Editor, I can create a branch manually.
- As an Editor, I can create a node directly in the tree even when no source exists yet.
- As an Editor, I can edit an owned or assigned node when the content is wrong, outdated, or incomplete.
- As an Admin/Op, I can later attach evidence and verify a manual node.

### Business Rules
- Manual nodes default to `no_source`.
- Manual nodes may be promoted to `verified` after source attachment and review.
- Tree content is authored as structured Markdown, not free-form rich text blobs.
- Node templates vary by node type and branch type.
- Editor update authority in V1 is intentionally limited to owned or assigned content to preserve accountability.

### Acceptance Criteria
- Editors can create and edit tree nodes in Markdown with preview.
- Editors cannot modify arbitrary unassigned tree content in V1.
- Manual nodes show their `no_source` state clearly.
- Verification upgrade path exists once evidence is attached.

## Capability 5: Branches, Linking, and Graph

### User Stories
- As a User, I can open a branch and understand the core nodes and learning path.
- As an Editor, I can place a node under a primary branch.
- As an Admin/Op, I can merge duplicate concepts and redirect old references.

### Business Rules
- Each node has exactly one primary branch in V1.
- Nodes may appear in many contexts through cross-links and backlinks.
- Duplicate concept handling ends with archive plus redirect to the canonical node.
- Graph edges use a controlled type set.

### Acceptance Criteria
- Branch pages show their owned nodes and key linked nodes.
- Node pages show related edges and backlink context.
- Merged nodes no longer appear as active canonical content.

## Capability 6: Search and Discovery

### User Stories
- As a User, I can search across the tree and optionally inspect source-side results.
- As an Editor, I can find weak or missing areas of a branch.
- As an Admin/Op, I can search for items requiring review or correction.

### Business Rules
- Search is unified but filterable by repository, role-allowed surface, trust state, and type.
- Archived content is hidden by default.
- Tree results must expose trust badges and source excerpts when available.
- Search freshness matters after publish, archive, merge, and correction events.

### Acceptance Criteria
- Users can search with filters for tree content, source items, and stateful workflow queues.
- Result cards display state and provenance context appropriate to the user's permission level.
- Search reflects recent publishes and archive events within the freshness target defined in NFR.

## Capability 7: Review, Trust, and Audit

### User Stories
- As an Admin/Op, I can review source trust and node verification independently.
- As an Admin/Op, I can inspect who changed what before approving publication.
- As a User, I can see whether a node is verified, unverified, or lacks sources.

### Business Rules
- Source trust states and node verification states must never be conflated.
- Verification changes require an auditable actor and timestamp.
- Review history must allow reconstruction of uploader, editor/updater, and approver/publisher for a published node.
- Published nodes must display trust state on their primary surfaces.
- Review actions must produce durable audit events.

### Acceptance Criteria
- Review queues separate source review tasks from tree verification concerns.
- Audit history exists for upload, correction, trust update, publish, merge, archive, and export actions.
- Trust state is visible wherever a user makes content consumption decisions.

## Capability 8: Board and Achievements

### User Stories
- As an Editor, I can track work required to complete a branch.
- As an Admin/Op, I can assign and close operational tasks related to source review and publication.
- As a User, I can see branch progress signals without entering the source workflow.

### Business Rules
- V1 board scope is limited to knowledge workflow and branch completion.
- Achievements can be auto-derived from milestone completion and added manually when needed.
- Board state must not replace node verification or source trust state.

### Acceptance Criteria
- Branches can show checklist completion and milestone progress.
- Tasks can be created, assigned, and completed.
- Achievement logs reflect meaningful progress events.

## Capability 9: Export and Validation

### User Stories
- As an Admin/Op, I can export tree content into a content repository for backup and validation.
- As an engineer, I can rely on exported Markdown to match in-app state without being the source of truth.

### Business Rules
- Export is one-way from the app to the content repository.
- Export occurs on meaningful publish or change events.
- Validation checks front matter, schema conformance, and link integrity.

### Acceptance Criteria
- Export jobs can run without changing the canonical tree state.
- Validation failures create an operational follow-up signal.
- Exported content is traceable back to node versions.

## Capability 10: Authentication, Authorization, and Notification

### User Stories
- As a team member, I can sign in through a familiar identity provider.
- As an Admin/Op, I can rely on role-based access to protect review and source surfaces.
- As a User, I receive notifications when my submission changes state or needs action.
- As an Editor, I receive notifications when owned or assigned content requires correction or draft work.

### Business Rules
- V1 uses Google OIDC for sign-in.
- Role-based access controls all major product surfaces.
- Notification channels are in-app plus email.
- Permissions must be consistent across routing, API, and UI action visibility.

### Acceptance Criteria
- Authenticated users see only the surfaces allowed by their role.
- Review and publish tasks trigger actionable notifications.
- Route guards, backend authorization, and UI visibility align on the same permission model.
