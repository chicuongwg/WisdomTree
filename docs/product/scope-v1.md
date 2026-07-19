# V1 Scope Definition

## Purpose
- Define what is included in the first shippable release, what is intentionally excluded, and what is deferred to phase 1.5.
- Prevent scope creep across product, system, and UI workstreams.

## In Scope
- Source repository as the team storage home: space-scoped storage, library browsing, retrieval, uploads, extraction, correction, review, and publication.
- Knowledge tree for curated Markdown nodes, branches, links, tags, search, and graph exploration.
- Basic board and achievement tracking for branch completion and operational work.
- Export of tree content into a private Git content repository.
- Physical library catalog and borrow-return circulation for the community library collection.
- One-way and outbound Google bridges: Drive import, Sheets import, Forms ingestion, and an outbound calendar feed.

## Out of Scope
- Public interactive access to the app. Selective, read-only publishing of approved nodes via a Quartz-class static site is a Phase 1.5 candidate, not general public access.
- Full mobile experience.
- Rich Google Drive-class source preview for every format.
- Real-time collaborative editing.
- Full reviewer/curator/admin role separation.

## Decisions
- V1 ships with `User`, `Editor`, and `Admin/Op`.
- Storage is store-first: an uploaded file is findable and downloadable by its space members at `stored`, independent of extraction or curation outcomes.
- Sources are organized into membership-scoped `Spaces`; space membership governs browse, search, and download rights.
- Published node Markdown can be exported to common team formats (`docx`, `pdf`) through a Pandoc-class converter.
- The product UI is bilingual Vietnamese/English with Vietnamese as the default; documentation stays English.
- Tree authoring and source-driven publication both exist in V1.
- Source repo supports broad intake but does not promise rich processing for every file type.
- Unsupported source formats can be stored as `unprocessable` instead of rejected.
- V1 includes a basic board, not a full project management suite.

## Dependencies
- Product intent in [`prd.md`](./prd.md).
- Functional requirements in [`../requirements/functional-spec.md`](../requirements/functional-spec.md).
- Release sequencing in [`../roadmap/phases-0-1-1.5.md`](../roadmap/phases-0-1-1.5.md).

## Acceptance Criteria
- Every feature in active implementation can be placed in `V1`, `Phase 1.5`, or `Future`.
- Teams can clearly tell whether a request blocks V1 or belongs to later phases.
- UI and backend tasks can derive from the same scope boundary.

## V1 In Scope

### Source Repo
- Upload files from authenticated users into a chosen space.
- Organize sources into membership-scoped spaces.
- Provide `Library` browsing, search, and original-file download for space members.
- Make stored items available to space members immediately at `stored`, before extraction or curation completes.
- Accept `branch-gap requests` from authenticated users without creating `SourceVersion`.
- Let authenticated users view the status of their own submissions.
- Store original source files in object storage.
- Generate parsed or OCR-based text.
- Keep raw extracted text immutable.
- Allow corrected text editing and review.
- Generate Markdown drafts for publication.
- Maintain source trust status and provenance metadata.

### Knowledge Tree
- Create and edit Markdown-based nodes.
- Create and manage branches.
- Store links, tags, branch membership, and verification status.
- Support manual node creation with `no_source` default status.
- Support merge, archive, and redirect behavior for duplicate concepts.
- Export node Markdown to `docx` and `pdf` as derived documents.

### Discovery and Navigation
- Full-text and semantic search across tree and space-scoped source storage, with clear filters.
- Dedicated graph surface plus contextual relation views.
- User-facing node pages with branch context, trust badges, and source excerpts.

### Workflow and Operations
- Role-based permissions for User, Editor, and Admin/Op.
- Editor updates are limited to owned or assigned source and tree work.
- `Source Inbox` for intake triage and `Review Queue` plus `Publish Review` for source correction, trust checks, and publication approval.
- Basic task board and achievement log for branch progress and operational follow-up.
- Notifications for review assignments and publication-relevant events.

### Platform and Reliability
- Audit logging for meaningful user actions.
- Bilingual Vietnamese/English UI with Vietnamese as the default.
- Daily backup and manual restore process.
- Git export for tree content and CI validation for exported Markdown.

## V1 Out of Scope
- Public content portals.
- Multi-tenant organizations.
- Fine-grained custom role builders.
- Bidirectional sync between tree export repo and the app.
- OCR quality control for complex tables, handwriting, or all non-text formats.
- Native mobile apps.
- Full analytics dashboards beyond operational health.
- Per-file access control lists beyond space membership.

## Phase 1.5 Candidates
- Selective, read-only public publishing of approved nodes via a Quartz-class static site built from the content repo.
- Split `Admin/Op` into `Reviewer`, `Curator`, and `Operator`.
- Richer source preview and comparison tools.
- Better support for more file types and deeper extraction pipelines.
- Conflict-resolution improvements beyond manual operator handling.
- Extended board workflows and richer operational analytics.
