# Acceptance Criteria

## Purpose
- Define the release-level acceptance criteria that determine whether V1 is implementation-complete and operationally usable.
- Give backend, frontend, product, and operations teams a shared finish line.

## In Scope
- System-level acceptance criteria.
- Module-level acceptance criteria.
- Cross-cutting acceptance requirements for roles, state handling, audit, recovery, and scorecard readiness.

## Out of Scope
- Detailed test case implementation.
- Performance test tooling specifics.
- Phase 1.5 release gates.

## Decisions
- Acceptance is defined at system and module level.
- V1 is considered complete only when source-driven publication and user discovery both work end-to-end.
- Reliability, audit, recovery, and consistency checks are part of release acceptance, not optional hardening.

## Dependencies
- Product goals in [`../product/prd.md`](../product/prd.md).
- Scorecard in [`../product/v1-scorecard.md`](../product/v1-scorecard.md).
- Functional requirements in [`functional-spec.md`](./functional-spec.md).
- NFR in [`non-functional-requirements.md`](./non-functional-requirements.md).
- Recovery procedures in [`../operations/operating-playbook.md`](../operations/operating-playbook.md).
- Verification policy in [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md).

## Acceptance Criteria
- The criteria in this file are themselves the release gate for V1 readiness.
- Every criterion must be demonstrable through product behavior, integration checks, or operational runbook review.
- There must be no unresolved contradictions with the flow, policy, and UI documents.

## System-Level Release Criteria
- A user can upload a source file and receive a visible processing state.
- A user can open personal submissions and see only their own source items and statuses.
- The system can produce raw text, corrected text, and a Markdown draft or clearly indicate failure.
- An `Admin/Op` can review a source item, approve it, and publish a Markdown node into the tree.
- A `User` can discover the published node through search, branch navigation, or graph navigation.
- The published node exposes trust state and source excerpt context.
- Audit history exists for upload, correction, publish, merge, archive, export, and restore-related actions.
- Audit history can reconstruct the accountability chain `upload -> edit/update -> approve/publish` for any published node or source item under investigation.
- Export to the content repository works and validation failures are surfaced operationally.
- Daily backup jobs exist and a restore procedure is documented, drillable, and testable.
- The operating playbook covers worker outage, publish failure, full-environment restore, and single-record restore scenarios.
- The active environment has primary and backup `Admin/Op` coverage.
- The V1 scorecard can be computed from system events, audit, or direct queries without a separate analytics platform.

## Module-Level Criteria

### Source Repo
- Supports upload and versioned storage of original files.
- Displays source lifecycle state and trust state.
- Preserves raw text as immutable and corrected text as editable.
- Supports `unprocessable` state for unsupported or failed formats.
- Allows authenticated `User` accounts to view only their own submissions.
- Prevents `Editor` accounts from modifying unowned and unassigned source work.

### Review and Publish
- Supports approval and rejection decisions.
- Records reviewer identity and timestamps.
- Preserves source-to-node provenance during promotion.
- Publish, reject, and verification decisions align with the editorial verification policy.
- Ensures only `Admin/Op` can approve corrected text, change trust, approve Markdown drafts, and publish.

### Tree
- Supports branch creation, node creation, node editing, archive, and merge.
- Manual nodes start as `no_source`.
- Verified nodes must have evidence linkage and review history.
- Editor mutation rights are limited to owned or assigned content in V1.

### Search and Graph
- Search supports repository, state, and type filters.
- Archived items are hidden by default.
- Graph view and relation panels reflect primary branch and cross-link relationships.

### Board and Achievements
- Branch work can be represented with tasks and basic completion status.
- Achievement entries can be recorded and surfaced in branch context.

### Operations and Recovery
- Operational surfaces expose failed jobs, queue age, backup status, and publish failures clearly enough for `Admin/Op`.
- Restore drill results can be reviewed against the `1 business day` and `4h` recovery targets.
- Degraded modes are visible and do not depend on undocumented operator memory.

### Auth and Permissions
- All screens and actions align with the `User`, `Editor`, and `Admin/Op` role model.
- Unauthorized actions are rejected by backend authorization.
- Screen visibility and API enforcement must agree on the accountability split between uploader, editor/updater, and approver/publisher.

## Cross-Cutting Criteria
- State names are consistent between UI, API responses, worker outputs, and documentation.
- Permission boundaries are consistent across navigation, pages, and backend actions.
- Role-specific empty, loading, error, and access-denied states are present in the UI specs.
- There are no undefined transitions in the source, node, review, or conflict lifecycle.
- There is no contradiction between role docs, permissions, flows, policy, and screen inventory for source intake, own submissions, or assigned edit work.
- Recovery targets, scorecard definitions, and quality policies do not contradict the canonical flow or lifecycle docs.
