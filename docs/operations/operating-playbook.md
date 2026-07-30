# Operating Playbook

## Purpose
- Define the minimum operating procedures required to keep WisdomTree usable for a small private team.
- Turn backup, restore, degraded mode, and publish recovery from vague expectations into executable steps.

## In Scope
- Incident classes and response expectations.
- Daily and weekly operational checks.
- Degraded mode behavior for worker, publish, storage, and restore scenarios.
- Backup and restore targets.
- Recovery procedures for the main V1 operational failures.

## Out of Scope
- 24/7 enterprise on-call rotations.
- Provider-specific infrastructure scripts.
- Incident tooling integration beyond the current V1 scope.

## Decisions
- V1 uses business-hours operating response, not always-on support.
- Recovery prioritizes canonical data integrity over fastest feature restoration.
- The active environment must have at least two trained users with `Admin/Op` access: one primary and one backup.

## Dependencies
- Operational targets in [`../requirements/non-functional-requirements.md`](../requirements/non-functional-requirements.md).
- Release gates in [`../requirements/acceptance-criteria.md`](../requirements/acceptance-criteria.md).
- Runtime assumptions in [`../system/deployment-topology.md`](../system/deployment-topology.md).
- Team operating ownership in [`delivery-operating-model.md`](./delivery-operating-model.md).

## Acceptance Criteria
- A new `Admin/Op` can use this file to respond to worker outage, publish failure, full restore, and single-record restore cases.
- Recovery targets and degraded-mode rules are explicit enough to support release readiness review.
- This playbook does not invent lifecycle or trust state names that conflict with the canonical flow docs.

## Current Operating Assumptions
- The repository is currently in `Phase 0 documentation-complete` and tracked implementation has not yet started outside `/docs`.
- V1 prioritizes recoverability and clarity over full automation.
- One trained `Admin/Op` user owns the daily queue and one trained `Admin/Op` user acts as backup for publish, export, and restore work.

## Incident Classes

| Class | Meaning | Expected response |
| --- | --- | --- |
| `class_1` | Canonical data integrity is uncertain, or a user-visible workflow is blocked end-to-end. | Respond the same business day. Freeze publish, merge, and archive when canonical state is unclear. |
| `class_2` | The system is degraded but still usable in a constrained mode. | Respond by the next business day. Keep the degraded mode visible to operators. |
| `class_3` | Minor or localized issue with low immediate user impact. | Track in the weekly ops review and fix without emergency handling. |

## Daily Checks
- Confirm the latest backup job succeeded and no restore prerequisite is missing.
- Review failed worker jobs and export failures.
- Review `Review Queue` items older than 7 days.
- Check whether queue latency or search freshness has crossed warning thresholds.
- Confirm there is no unresolved publish failure or ambiguous merge outcome.
- Confirm audit trails remain queryable from uploader to editor/updater to approving `Admin/Op` for recent published items.

## Weekly Checks
- Review the [`../product/v1-scorecard.md`](../product/v1-scorecard.md) with the primary and backup `Admin/Op` users.
- Review recurring incident patterns and update this playbook if a new failure path appeared.
- Confirm the backup `Admin/Op` can still access the required recovery surfaces.
- Verify the next restore drill date and any open blockers for backup validation.

## Degraded Modes

### Worker or OCR Runtime Unavailable
- New uploads may continue, but fresh parse, OCR, and Markdown draft generation are considered delayed.
- Existing processing states must remain visible; no item may silently disappear from operational queues.
- Publish may continue only for items that already have reviewed corrected text and an approved Markdown draft.
- No node may be upgraded to `verified` from an incomplete evidence chain while the worker path is unavailable.
- Escalate from `class_2` to `class_1` if no source reaches a processing outcome within one business day.

### Publish Pipeline Partially Failing
- Preserve the human review decision even when publish fails after approval.
- If the canonical node version exists, treat search or export failures as projection failures and rerun projections without rolling back canonical content.
- If the canonical node version does not exist, retry publish from the already approved Markdown draft and keep the item visible in the operational queue.
- Freeze further merge or archive work if the canonical result of the failed publish is unclear.

### Object Storage Degraded
- Block new uploads and original source downloads, including `Library` downloads, until storage access is reliable again.
- Keep tree reading and manual node authoring available if the app and database remain healthy.
- Block source-driven publish until source artifacts and provenance references are reachable again.

### Google API Unavailable
- Treat Drive, Sheets, and Forms bridge failures as `class_3` unless an import is blocking onboarding, in which case escalate to `class_2`.
- Core storage, catalog, and knowledge workflows continue unaffected; only imports and the calendar feed are delayed.
- Retry imports after the outage clears; because import jobs are idempotent, replay is safe.
- Keep any partially reported import visible as an operational follow-up item rather than silently dropping it.

### Restore Mode
- Freeze publish, merge, archive, and export triggers until backup integrity is confirmed.
- Reopen read-only surfaces first, then review surfaces, then write actions.
- Record the restore window and the restored backup timestamp in the operational log.

## Publish Retry and Rollback Rules

| Scenario | Required action |
| --- | --- |
| Approval recorded but canonical node version missing | Retry publish from the approved Markdown draft. |
| Canonical node version exists but search or export failed | Rerun search or export projections only. Do not roll back canonical node content. |
| Merge creates redirect ambiguity | Stop merge completion and keep the duplicate relationship unresolved until the redirect target is confirmed. |
| Human review mistake discovered before publish succeeds | Return the item to operational review and require a fresh review decision before another publish attempt. |

## Backup and Restore Targets
- Recovery point objective (`RPO`) is `24h`.
- Full-environment restore target is `1 business day`.
- Single source record or single node restore target is `4h`.
- Required backup assets:
  - PostgreSQL logical backup
  - object storage snapshot or replication
  - static vault Git mirrors from `VAULT_GIT_DIR`

The static vault is a verified projection, not the transaction authority. It
contains active topic metadata, canonical non-archived node Markdown, tags, and
graph links. It does not contain identities, grants, source files, provenance,
audit history, sessions, candidates, or other operational state. Keep the
PostgreSQL and object-storage backups even when every static vault Git mirror is
healthy.

## Recovery Procedure: Worker Unavailable
1. Confirm the failure from queue latency, failed jobs, or worker reachability.
2. Classify the incident and announce degraded mode to the operating team.
3. Verify Redis connectivity, worker host reachability, parser availability, and OCR runtime availability.
4. Restore the worker path and replay queued jobs.
5. Close the incident only after at least three successful processing jobs complete and queue latency returns below warning level.

## Recovery Procedure: Publish Failure
1. Open the failed publish item from the operational queue.
2. Verify whether the canonical node version and provenance record were written.
3. If the canonical node version is missing, retry publish from the same approved Markdown draft.
4. If the canonical node version exists, rerun search and export projections only.
5. If canonical integrity is unclear, treat the incident as `class_1` and freeze additional publishes until the canonical record is confirmed.

## Recovery Procedure: Full Environment Restore
1. Declare a change freeze for publish, merge, archive, and export actions.
2. Restore the latest valid PostgreSQL backup.
3. Restore object storage from snapshot or replication.
4. Restore `VAULT_GIT_DIR`, then verify the static vault Git mirrors and export runner access.
5. Run smoke checks for auth, node detail, source detail, Review Queue, Publish Review, and backup status visibility.
6. Reopen write operations only after the audit tail and the most recent successful publish reconcile correctly.

## Recovery Procedure: Single Record Restore
1. Identify the target `Source`, `Source Version`, or `Node` and the required restore timestamp.
2. Restore the database record and version history from a valid backup.
3. Restore related object storage artifacts and confirm their object references.
4. Rerun affected search or export projections.
5. Verify audit and provenance links before closing the incident.

## Recovery Procedure: Single Vault Content
Use this procedure only for topic, canonical node, tag, and graph-link recovery.
Use the full database and object-storage backups when identity, source,
provenance, audit, or operational state is also required.

1. Keep the target vault row, but confirm it has no branches or nodes.
2. Verify the selected Git snapshot before touching PostgreSQL:
   `npm run vault:verify -- --repo <bare-or-working-repo>`.
3. Preview the rebuild and confirm the reported vault ID and counts:
   `npm run vault:rebuild -- --repo <repo> --vault-id <uuid>`.
4. Apply the rebuild:
   `npm run vault:rebuild -- --repo <repo> --vault-id <uuid> --apply`.
5. Verify topic hierarchy, node content, tags, graph links, scoped search, and
   the next Git mirror run.

The apply step is one PostgreSQL transaction. A checksum error, missing
`createdBy` user, non-empty target vault, duplicate, or database conflict aborts
the whole rebuild. Stable topic/node/tag IDs and the current node revision are
retained; prior revision rows are supplied by Git history rather than duplicated
in the snapshot.

Static vault format v1 has `schemaVersion="1"` and no volatile generation
timestamp. Its bytes and meaning must not be changed in place; a future format
change requires a versioned migrator.

## Post-Incident Review
- Record incident class, impact, root cause, recovery time, and unresolved follow-up work.
- Reconstruct and record the uploader, editor/updater, and approver/publisher chain when the incident affects trust, leakage risk, or incorrect publication.
- Update this playbook when a new failure pattern or missing step is discovered.
- Update linked requirements or flow documents if the incident exposed a contradiction in the current docs.
