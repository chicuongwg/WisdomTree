# Admin/Op Flows

## Purpose
- Describe the operational and approval workflows handled by the V1 Admin/Op role.

## In Scope
- Review source.
- Review corrected text.
- Approve Markdown draft.
- Publish to tree.
- Merge and archive nodes.
- Taxonomy and operational task handling.

## Out of Scope
- Detailed incident management runbooks.
- Phase 1.5 role decomposition into reviewer, curator, and operator.
- Low-level deployment procedures.

## Decisions
- Admin/Op is the final decision-maker for trust, publication, merge, archive, and export actions in V1.
- Review and publication are explicit workflows, not invisible background side effects.
- Operations work is visible in the same product, not hidden in an external admin-only tool.

## Dependencies
- Permissions in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).
- System contracts in [`../system/integration-contracts.md`](../system/integration-contracts.md).
- UI specs in [`../ui/admin-op-screen-specs.md`](../ui/admin-op-screen-specs.md).

## Acceptance Criteria
- Admin/Op can execute the full source-to-tree promotion loop without leaving the platform.
- Merge, archive, and trust decisions have clear UI and state outcomes.
- Error and permission behaviors are explicit and operationally actionable.

## Flow 1: Review Source
1. Admin/Op opens the review inbox.
2. Admin/Op filters by status, assignee, branch relevance, or processing issues.
3. Admin/Op opens a source item.
4. Admin/Op inspects:
   - original file preview
   - raw text
   - corrected text
   - trust state
   - extraction warnings
5. Admin/Op approves continued work, requests changes, rejects, or marks `unprocessable`.

## Flow 2: Approve Markdown Draft
1. Admin/Op opens a ready-for-review draft.
2. Admin/Op compares corrected text and Markdown draft.
3. Admin/Op verifies structure, source mapping, and branch placement.
4. Admin/Op requests changes or approves publication.

## Flow 3: Publish to Tree
1. Admin/Op approves the draft.
2. System creates or updates the tree node.
3. System records source excerpt, provenance, review record, and node version.
4. Search and graph reindex jobs run.
5. Export job is queued.

## Flow 4: Merge or Archive
1. Admin/Op identifies duplicate or superseded content.
2. Admin/Op chooses the canonical node.
3. System archives the non-canonical node and creates redirect metadata.
4. Search and relation views update to prefer the canonical node.

## Flow 5: Taxonomy and Ops
1. Admin/Op reviews tags, branch health, and operational tasks.
2. Admin/Op resolves export validation failures, failed jobs, and stale review queue items.
3. Admin/Op closes tasks or logs achievements as part of branch progress.

## Error Path
- OCR output is poor:
  - request more correction
  - keep source in review queue
- Publish fails after approval:
  - keep review decision intact
  - surface publish failure and allow retry
- Merge causes unresolved link ambiguity:
  - block completion until redirect mapping is confirmed

## Permission Path
- Admin/Op can access all source items, review actions, and original file downloads.
- Admin/Op can approve or reject trust and publication actions.
- Admin/Op can archive, merge, export, and inspect operational health.

