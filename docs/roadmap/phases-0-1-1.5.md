# Phased Roadmap

## Purpose
- Break implementation into practical phases that can be staffed and delivered without reopening the overall product model.

## In Scope
- Phase 0 foundation.
- Phase 1 shippable V1 scope.
- Phase 1.5 hardening and controlled expansion.

## Out of Scope
- Sprint-by-sprint planning.
- Long-term platform strategy beyond phase 1.5.
- Staffing assignments.

## Decisions
- Delivery is organized into `Phase 0`, `Phase 1`, and `Phase 1.5`.
- `Phase 0` may be partially complete at the documentation layer before tracked implementation work begins.
- Phase 1 is the first usable release and must include the full core knowledge loop plus a basic board.
- Phase 1.5 focuses on hardening, deeper role separation, and better operations rather than changing the architecture.

## Dependencies
- Scope in [`../product/scope-v1.md`](../product/scope-v1.md).
- Functional requirements in [`../requirements/functional-spec.md`](../requirements/functional-spec.md).
- Operating model in [`../operations/delivery-operating-model.md`](../operations/delivery-operating-model.md).
- Future backlog in [`backlog-future.md`](./backlog-future.md).

## Acceptance Criteria
- Every active work item can be assigned to one roadmap phase.
- Phase boundaries are specific enough to support planning and implementation sequencing.
- Phase 1.5 captures known follow-up work without contaminating the V1 scope.

## Current Repo State
- The repository has completed `Phase 0` and `Phase 1` implementation, validated by 213 automated integration proofs (`npm run proofs`).
- All 10 core backend modules are implemented on a single deployable (Next.js App Router + Drizzle ORM + PostgreSQL) with bilingual Vietnamese-default UI.
- Phase 1.5 hardening and external integrations (real Google OIDC, AWS S3, local AI embeddings) remain pending.

## Phase 0: Foundation
- Complete the documentation layer for glossary, roles, lifecycle vocabulary, operations recovery, verification policy, scorecard, delivery operating model, and design system governance.
- Complete the platform layer and module docs: platform context and module map, catalog and circulation, Google bridge, notifications and comments, technology stack, intake constraints, Vietnamese UI vocabulary, and adoption onboarding.
- Establish docs, glossary, roles, and state vocabulary.
- Set up app shell, auth, and baseline database structure.
- Implement space model, intake projection, source storage, upload flow, `Library` scaffold, and job orchestration scaffold.
- Implement tree node and branch core models.
- Establish export and backup strategy.

## Phase 1: Core Knowledge Loop + Basic Board
- Complete source intake, branch-gap request intake, OCR/parsing pipeline, corrected text flow, Markdown draft flow, and `Admin/Op` review.
- Complete tree authoring, branching, source-linked publish, search, graph basics, and user discovery.
- Ship `Library` browsing, space-scoped search and retrieval, and original-file download for space members.
- Ship `My Submissions`, Editor-assigned correction flow, and User-facing tree consumption flow.
- Ship document export of nodes to `docx` and `pdf`, and the bilingual Vietnamese/English UI.
- Ship the physical catalog and borrow-return circulation for the community library.
- Ship minimal Google bridges: Drive import, Sheets import, Forms ingestion, and the outbound calendar feed.
- Ship basic board, tasks, and achievement logging.
- Ship audit, export validation, and operational health surfaces required for usable private-team operation.

## Phase 1 Implemented Enhancements (Beyond Initial Design)
During Phase 1 implementation and production hardening, several capabilities were developed beyond the original specification to improve reliability, UX, and multi-user collaboration:
- **Serverless-Reliable Notification Dispatcher (`after()` + Safety Cron)**: Replaced in-memory background promise dispatching with Next.js 15 `after()` runtime lifecycle management and added a bearer-authenticated safety net Cron route (`POST /api/cron/dispatch`) so Transactional Outbox deliveries are never dropped on serverless/edge containers.
- **Live Markdown & Wiki-links Preview**: Integrated real-time Markdown preview directly into `NodeEditor` and `NodeCreateForm`, allowing users to see formatted content, internal `[[Wiki-links]]`, and resolved/unresolved backlink states before saving.
- **Diacritic-Insensitive Mention Resolution**: Implemented a Vietnamese diacritic normalizer (`foldName` in `src/lib/mention-fold.ts`) so @mentions with or without accents (`@Lan Anh`, `@Pham Thu Huong`) reliably resolve target users while enforcing Space Scoping rules.
- **Unified Timestamp Sorting (`updatedAt DESC`)**: Switched sidebar tree nodes and branch listings from alphabetical `title ASC` to `updatedAt DESC` so newly edited or created notes always bubble to the top across both navigation and main views.
- **Source Nomination Revert**: Added the UI capability and backend state transitions for normal users to revert/un-nominate a source document before Admin/Op curation review.
- **Strict Team vs. Personal Space Segregation**: Upgraded sidebar navigation (`ShellSidebar`) to explicitly separate Team Branches from Personal Branches, enforcing strict permission boundaries so users cannot edit or create notes in branches where they lack write access.

## Phase 1.5: Hardening and Role Refinement
- Add selective, read-only public publishing of approved nodes via a Quartz-class static site from the content repo.
- Separate `Admin/Op` concerns into clearer role-ready workflows.
- Improve source preview and correction ergonomics.
- Improve conflict handling and merge assistance.
- Improve observability and queue management.
- Expand supported format quality and operational safeguards.
