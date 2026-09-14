# PC0 migration findings

The fresh disposable database applied 0000 through 0053 in order and seeded successfully. schema_migrations recorded 54 entries, with 0053_activity_task_comment_anchors.sql as the current head. The requested 0048–0052 audit is below; 0053 is recorded because it is already part of the current checkout and changes PR3 truth.

| Migration | Finding | Status |
| --- | --- | --- |
| 0048_note_version_support.sql | Adds immutable exact-version Note support snapshots. It deliberately backfills only each latest Project Note version and labels older historical support unknown; append-only constraints protect completed snapshots. | PASS; historical incompleteness is explicit, not silently fabricated. |
| 0049_source_version_original_immutable.sql | Trigger prevents replacing original SourceVersion identity/bytes while allowing derived processing-state updates. | PASS. |
| 0050_task_activity_requires_project.sql | Check prevents an Activity-linked Task without a Project. | PASS. |
| 0051_source_current_version_same_source.sql | Composite FK ensures a Material current version belongs to that Material rather than merely existing. | PASS. |
| 0052_personal_projects.sql | Partial unique owner index, Project/Space kind invariant, active-user backfill, and owner manager membership establish Personal Projects. The trigger correctly includes personal_owner_id updates, closing the prior direct-update hole. Fresh SQL checks found zero cardinality and space-kind violations. | PASS. |
| 0053_activity_task_comment_anchors.sql | Extends concrete comment anchors to Activity and Task and validates existence. It is outside the requested migration range but is required to state current PR3 behavior accurately. | PASS; include in deployment/current-head checks. |

## Migration discrepancy

The task wording named 0052 as head, but the repository head is 0053. This is a scope/documentation drift, not a failed migration. Any runbook that says “zero through current head (0052)” is stale and must be read as 0053 for this checkout.

No destructive migration or residual temporary database was retained by this audit.
