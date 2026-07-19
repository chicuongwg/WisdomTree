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

## Capability 1: Source Intake, Storage, and Library

### User Stories
- As an authenticated user, I can upload a source file into a space so that it is stored safely and my teammates can find it.
- As a User, I can browse and search the `Library` of my spaces and download the original files stored there.
- As a User, I can create a `branch-gap request` when I do not have a file yet but know the tree is missing a concept.
- As a User, I can view the status of my submitted intake items.
- As an Editor, I can continue follow-up work on my own submissions or items assigned to me when the content needs correction or update.
- As an Admin/Op, I can inspect source files, raw text, corrected text, provenance, and trust status.
- As an Admin/Op, I can triage a `branch-gap request` and convert it into branch work without creating a source version.
- As an Admin/Op, I can classify unsupported files as `unprocessable` without losing the source record.

### Business Rules
- Every source belongs to exactly one `Space`; upload requires membership in the target space.
- Storage is store-first: once a source version is `stored`, space members can find it in `Library` and search, and can download the original file, independent of extraction or curation outcomes.
- Extraction or curation failure never removes a stored item from `Library` availability.
- Intake history is modeled as a logical `Intake Item` projection shown in `My Submissions` and `Source Inbox`.
- `Intake Item` exposes at least:
  - `submission_id`
  - `item_type`
  - `title`
  - `state`
  - `submitted_by`
  - `last_updated_at`
  - `next_action`
- Every upload creates a source record and a source version.
- Source intake accepts both file-backed submissions and `branch-gap requests`.
- `branch-gap requests` are intake items, not `Source` aliases, and do not create `SourceVersion`.
- Original source files are stored in the Source Repo, not in the Knowledge Tree.
- Raw extracted text is immutable.
- Corrected text is editable and versioned.
- Source trust status is independent from node verification status.
- Users can browse stored items within member spaces; submission workflow detail stays limited to their own submissions, and cross-space visibility stays limited to `Admin/Op`.
- Editors may edit source-derived working content only when the item is owned by them or assigned to them.
- Uploader, editor/updater, and approver actions must be recorded separately in audit history.
- Unsupported formats may be retained as `unprocessable`.

### Acceptance Criteria
- Upload produces a trackable source item with a stable identifier, stored in the chosen space.
- A space member can find a newly stored item in `Library` and download the original file without any review step.
- A non-member cannot browse, search, or download another space's items.
- `branch-gap requests` produce a trackable intake item with an `item_type` visible in `My Submissions`.
- Users can see the current intake state and next expected action for both file-backed submissions and `branch-gap requests`.
- Editors can identify which own or assigned items need their follow-up action.
- Admin/Op can open the source item and inspect evidence artifacts.
- Admin/Op can triage a `branch-gap request` from `Source Inbox` and convert it into branch work.

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
- Search is unified but filterable by repository, space, role-allowed surface, trust state, and type.
- Source-side search results are scoped to the user's spaces; `Admin/Op` searches across all spaces.
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

## Capability 8: Board, Deadlines, and Achievements

### User Stories
- As an Editor, I can track work required to complete a branch.
- As an Admin/Op, I can assign and close operational tasks related to source review and publication.
- As a User, I can see branch progress signals without entering the source workflow.
- As a project member, I can register a deadline for a conference, funding round, report, or milestone so the team keeps up with parallel projects.
- As a project member, I can subscribe my project's deadlines into my own calendar and be reminded before they are due.

### Business Rules
- V1 board scope is limited to knowledge workflow and branch completion.
- Achievements can be auto-derived from milestone completion and added manually when needed.
- Board state must not replace node verification or source trust state.
- A `Deadline` belongs to one project or space, may link a checklist and documents, and drives reminders at its configured offsets.
- Deadlines surface through the outbound ICS calendar feed and never gate storage, catalog, or knowledge workflows.

### Acceptance Criteria
- Branches can show checklist completion and milestone progress.
- Tasks can be created, assigned, and completed.
- Achievement logs reflect meaningful progress events.
- A deadline can be created, linked to a project, and appears in that project's calendar feed.
- Members receive reminders before a deadline is due through their chosen channels.

## Capability 9: Export and Validation

### User Stories
- As an Admin/Op, I can export tree content into a content repository for backup and validation.
- As a User, I can export a published node to `docx` or `pdf` so I can use the knowledge in familiar office formats.
- As an engineer, I can rely on exported Markdown to match in-app state without being the source of truth.

### Business Rules
- Export is one-way from the app to the content repository.
- Export occurs on meaningful publish or change events.
- Validation checks front matter, schema conformance, and link integrity.
- Document export renders node Markdown through a Pandoc-class converter into derived `docx`/`pdf` artifacts; rendered documents never mutate canonical content.
- Public web publishing is selective and read-only: only nodes flagged `publish: true` in front matter and approved for publication are built into a Quartz-class static site from the content repo.
- Publishing runs in the content repo's CI, not the app runtime; the app database stays canonical.

### Acceptance Criteria
- Export jobs can run without changing the canonical tree state.
- Validation failures create an operational follow-up signal.
- Exported content is traceable back to node versions.
- A published node can be exported to `docx` and `pdf`.
- Only nodes flagged and approved for publication appear on the public Quartz site; unflagged nodes never leak.

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

## Capability 11: Physical Catalog and Circulation

### User Stories
- As a librarian, I can add a physical book to the catalog and have the system assign it a unique identifier so I can label and find the copy.
- As a librarian, I can bulk-load the existing collection of roughly one thousand books from a spreadsheet.
- As a member of the library space, I can browse and search the catalog by title, author, or identifier.
- As a member, I can request to borrow an available book.
- As a librarian, I can approve or decline a borrow request, mark a book borrowed and returned, and see overdue loans.
- As a librarian, I can mark a copy lost or in repair without deleting its history.
- As an Admin/Op, I can link a digitized scan to its physical catalog item.

### Business Rules
- A `Catalog Item` represents one physical copy and stores identifier, cover title, author, optional cover photo, location, and status, but not book content.
- Every catalog item belongs to exactly one space, the library collection's space.
- A catalog item has at most one active `Loan Ticket` at a time.
- Catalog item status `available <-> borrowed` is driven by the loan lifecycle; `lost` and `repair` are librarian actions.
- Borrow approval, lend, return, and catalog editing are librarian actions held by `Admin/Op`; browsing and requesting are open to library-space members.
- A catalog item may optionally link to a `Source` when digitized, without merging the two records.
- Loan actions must record the handling librarian and timestamps for audit.

### Acceptance Criteria
- Adding a book produces a catalog item with a stable unique identifier.
- Members can find a catalog item by title, author, or identifier and request a loan on an available copy.
- A librarian can move a loan through request, approve, borrow, and return, and overdue loans are visible.
- Spreadsheet import creates catalog items in bulk and reports rows that fail validation.
- A digitized copy links to its catalog item while both records remain distinct.

## Capability 12: Notifications and Discussion

### User Stories
- As a member, I receive a notification through my preferred channels when something relevant to me happens, so I do not have to poll the app.
- As a member, I can comment on a source, node, loan ticket, or deadline to discuss it in context.
- As a member, I can keep private notes in my personal space.
- As an Admin/Op, I can rely on notifications reaching the team on Zalo and email without hosting a chat server.

### Business Rules
- Notification channels are in-app, email, and Zalo Official Account; real-time chat is not built and stays on Messenger and Zalo.
- Each member sets per-event channel preferences.
- A `Comment` anchors to exactly one work object and follows that object's permission scope.
- Comments are preserved with the object and never mutate its canonical state.
- Private notes live in a `personal` space visible only to the owner.
- Notification delivery is best-effort with retry; a channel outage never blocks the triggering workflow.

### Acceptance Criteria
- Relevant events produce notifications through the member's chosen channels.
- A member can comment on a source, node, loan ticket, or deadline, and the comment persists.
- A member can keep private notes no one else can see.
- A Zalo or email outage delays alerts without blocking the workflow.
