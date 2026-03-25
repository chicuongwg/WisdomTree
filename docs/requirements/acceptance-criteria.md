# Acceptance Criteria

## Purpose
- Define the release-level acceptance criteria that determine whether V1 is implementation-complete and operationally usable.
- Give backend, frontend, and operations teams a shared finish line.

## In Scope
- System-level acceptance criteria.
- Module-level acceptance criteria.
- Cross-cutting acceptance requirements for roles, state handling, and audit.

## Out of Scope
- Detailed test case implementation.
- Performance test tooling specifics.
- Phase 1.5 release gates.

## Decisions
- Acceptance is defined at system and module level.
- V1 is considered complete only when source-driven publication and reader discovery both work end-to-end.
- Reliability, audit, and consistency checks are part of release acceptance, not optional hardening.

## Dependencies
- Product goals in [`../product/prd.md`](../product/prd.md).
- Functional requirements in [`functional-spec.md`](./functional-spec.md).
- NFR in [`non-functional-requirements.md`](./non-functional-requirements.md).

## Acceptance Criteria
- The criteria in this file are themselves the release gate for V1 readiness.
- Every criterion must be demonstrable through product behavior, integration checks, or operational runbook review.
- There must be no unresolved contradictions with the flow and UI documents.

## System-Level Release Criteria
- A user can upload a source file and receive a visible processing state.
- The system can produce raw text, corrected text, and a Markdown draft or clearly indicate failure.
- An Admin/Op can review a source item, approve it, and publish a Markdown node into the tree.
- A Reader can discover the published node through search, branch navigation, or graph navigation.
- The published node exposes trust state and source excerpt context.
- Audit history exists for upload, correction, publish, merge, archive, and export actions.
- Export to the content repository works and validation failures are surfaced operationally.
- Daily backup jobs exist and a restore procedure is documented and testable.

## Module-Level Criteria

### Source Repo
- Supports upload and versioned storage of original files.
- Displays source lifecycle state and trust state.
- Preserves raw text as immutable and corrected text as editable.
- Supports `unprocessable` state for unsupported or failed formats.

### Review and Publish
- Supports approval and rejection decisions.
- Records reviewer identity and timestamps.
- Preserves source-to-node provenance during promotion.

### Tree
- Supports branch creation, node creation, node editing, archive, and merge.
- Manual nodes start as `no_source`.
- Verified nodes must have evidence linkage and review history.

### Search and Graph
- Search supports repository, state, and type filters.
- Archived items are hidden by default.
- Graph view and relation panels reflect primary branch and cross-link relationships.

### Board and Achievements
- Branch work can be represented with tasks and basic completion status.
- Achievement entries can be recorded and surfaced in branch context.

### Auth and Permissions
- All screens and actions align with the Reader, Editor, and Admin/Op role model.
- Unauthorized actions are rejected by backend authorization.

## Cross-Cutting Criteria
- State names are consistent between UI, API responses, worker outputs, and documentation.
- Permission boundaries are consistent across navigation, pages, and backend actions.
- Role-specific empty, loading, error, and access-denied states are present in the UI specs.
- There are no undefined transitions in the source, node, review, or conflict lifecycle.

