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
- Phase 1 is the first usable release and must include the full core knowledge loop plus a basic board.
- Phase 1.5 focuses on hardening, deeper role separation, and better operations rather than changing the architecture.

## Dependencies
- Scope in [`../product/scope-v1.md`](../product/scope-v1.md).
- Functional requirements in [`../requirements/functional-spec.md`](../requirements/functional-spec.md).
- Future backlog in [`backlog-future.md`](./backlog-future.md).

## Acceptance Criteria
- Every active work item can be assigned to one roadmap phase.
- Phase boundaries are specific enough to support planning and implementation sequencing.
- Phase 1.5 captures known follow-up work without contaminating the V1 scope.

## Phase 0: Foundation
- Establish docs, glossary, roles, and state vocabulary.
- Set up app shell, auth, and baseline database structure.
- Implement source storage, upload flow, and job orchestration scaffold.
- Implement tree node and branch core models.
- Establish export and backup strategy.

## Phase 1: Core Knowledge Loop + Basic Board
- Complete source intake, OCR/parsing pipeline, corrected text flow, Markdown draft flow, and Admin/Op review.
- Complete tree authoring, branching, source-linked publish, search, graph basics, and reader discovery.
- Ship Editor-assigned correction flow and Reader-facing tree consumption flow.
- Ship basic board, tasks, and achievement logging.
- Ship audit, export validation, and operational health surfaces required for usable private-team operation.

## Phase 1.5: Hardening and Role Refinement
- Separate `Admin/Op` concerns into clearer role-ready workflows.
- Improve source preview and correction ergonomics.
- Improve conflict handling and merge assistance.
- Improve observability and queue management.
- Expand supported format quality and operational safeguards.

