# Admin/Op Flows

## Purpose
- Describe the operational and approval workflows handled by the V1 `Admin/Op` role.

## In Scope
- Review source.
- Review corrected text.
- Approve Markdown draft.
- Publish to tree.
- Merge and archive nodes.
- Taxonomy and operational task handling.

## Out of Scope
- Phase 1.5 role decomposition into reviewer, curator, and operator.
- Low-level deployment procedures.
- Replacing the canonical operating playbook or editorial policy.

## Decisions
- `Admin/Op` is the final decision-maker for trust, publication, merge, archive, and export actions in V1.
- Review and publication are explicit workflows, not invisible background side effects.
- Operations work is visible in the same product, not hidden in an external admin-only tool.
- Trust, verification, reject, merge, and archive decisions follow the editorial verification policy.

## Dependencies
- Permissions in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).
- System contracts in [`../system/integration-contracts.md`](../system/integration-contracts.md).
- UI specs in [`../ui/admin-op-screen-specs.md`](../ui/admin-op-screen-specs.md).
- Operating procedures in [`../operations/operating-playbook.md`](../operations/operating-playbook.md).
- Content quality policy in [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md).

## Acceptance Criteria
- `Admin/Op` can execute the full source-to-tree promotion loop without leaving the platform.
- Merge, archive, trust, and verification decisions have clear UI and state outcomes.
- Error and permission behaviors are explicit and operationally actionable.

## Flow 1: Triage Intake Item
1. `Admin/Op` opens `Source Inbox`.
2. `Admin/Op` filters by `item_type`, status, assignee, branch relevance, or processing issues.
3. `Admin/Op` opens an intake item.
4. If the item is `source_upload`, `Admin/Op` inspects:
   - original file preview
   - raw text
   - corrected text
   - trust state
   - extraction warnings
5. If the item is `branch_gap_request`, `Admin/Op` inspects:
   - request text
   - requester
   - suggested branch or topic hint
   - prior matching knowledge if available
6. `Admin/Op` updates the intake outcome:
   - for `source_upload`: continue work, request changes, reject, or mark `unprocessable`
   - for `branch_gap_request`: triage, convert to branch work, reject, or archive
7. If the item is converted, the system records the resulting branch or node target and reflects the outcome back into `My Submissions`.

## Flow 2: Approve Markdown Draft
1. `Admin/Op` opens a ready-for-review draft.
2. `Admin/Op` compares corrected text and Markdown draft.
3. `Admin/Op` verifies structure, source mapping, branch placement, and verification readiness according to the editorial verification policy.
4. `Admin/Op` sets the intended node verification outcome and then requests changes or approves publication.

## Flow 3: Publish to Tree
1. `Admin/Op` approves the draft.
2. System creates or updates the tree node.
3. System records source excerpt, provenance, review record, node version, and verification status.
4. Search and graph reindex jobs run.
5. Export job is queued.

## Flow 4: Merge or Archive
1. `Admin/Op` identifies duplicate or superseded content.
2. `Admin/Op` chooses the canonical node according to the editorial verification policy.
3. System archives the non-canonical node and creates redirect metadata.
4. Search and relation views update to prefer the canonical node.

## Flow 5: Taxonomy and Ops
1. `Admin/Op` reviews tags, branch health, and operational tasks.
2. `Admin/Op` resolves export validation failures, failed jobs, and stale review queue items by following the operating playbook where recovery steps are needed.
3. `Admin/Op` closes tasks or logs achievements as part of branch progress.

## Error Path
- OCR output is poor:
  - request more correction
  - keep source in review queue
  - if the worker or OCR path is unavailable, follow [`../operations/operating-playbook.md`](../operations/operating-playbook.md)
- Publish fails after approval:
  - keep the review decision intact
  - surface publish failure and allow retry
  - follow the publish retry and rollback procedure in [`../operations/operating-playbook.md`](../operations/operating-playbook.md)
- Merge causes unresolved link ambiguity:
  - block completion until redirect mapping is confirmed
  - apply canonical node choice using [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md)

## Permission Path
- `Admin/Op` can access all source items, review actions, and original file downloads.
- `Admin/Op` can approve or reject trust and publication actions.
- `Admin/Op` can archive, merge, export, and inspect operational health.

## Operating References
- Use [`../operations/operating-playbook.md`](../operations/operating-playbook.md) for incident class, degraded mode, publish retry, and restore procedures.
- Use [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md) for trust, verification, reject, merge, and archive decisions.
