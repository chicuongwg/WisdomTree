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
- The repository is currently in `Phase 0 documentation-complete`.
- The planning docs, scorecard, policy, and recovery playbook are in place before tracked implementation starts.
- App shell, auth, database structure, source storage, and worker scaffolding are not yet present in this repository.

## Phase 0: Foundation
- Complete the documentation layer for glossary, roles, lifecycle vocabulary, operations recovery, verification policy, scorecard, delivery operating model, and design system governance.
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
- Ship basic board, tasks, and achievement logging.
- Ship audit, export validation, and operational health surfaces required for usable private-team operation.

## Phase 1.5: Hardening and Role Refinement
- Separate `Admin/Op` concerns into clearer role-ready workflows.
- Improve source preview and correction ergonomics.
- Improve conflict handling and merge assistance.
- Improve observability and queue management.
- Expand supported format quality and operational safeguards.
