# V1 Scorecard

## Purpose
- Define the minimum measurable scorecard for WisdomTree V1 without requiring a heavy analytics stack.
- Give product and operations a shared way to judge whether the product is healthy and useful for a small team.

## In Scope
- Six V1 KPIs.
- Metric definitions, minimum data sources, review cadence, and green/yellow/red thresholds.
- Interpretation rules suitable for a team of fewer than 20 users.

## Out of Scope
- Enterprise BI tooling.
- Long-term business metrics beyond V1.
- Public growth analytics.

## Decisions
- V1 health is judged from a small scorecard, not a large analytics program.
- The scorecard must be computable from audit logs, event history, or direct database queries.
- Green/yellow/red thresholds are meant for operational decision-making, not vanity reporting.

## Dependencies
- Product goals in [`prd.md`](./prd.md).
- Release gates in [`../requirements/acceptance-criteria.md`](../requirements/acceptance-criteria.md).
- Operational signals in [`../requirements/non-functional-requirements.md`](../requirements/non-functional-requirements.md).
- Operating review cadence in [`../operations/delivery-operating-model.md`](../operations/delivery-operating-model.md).

## Acceptance Criteria
- Product and operations can compute every KPI without a separate analytics platform.
- The scorecard covers ingestion, review, publication, usage, and provenance health.
- Thresholds are explicit enough to trigger weekly discussion and corrective action.

## Reading Rules
- Review the scorecard weekly during operations review and monthly during release readiness review.
- Treat any red KPI as a required discussion item, not background noise.
- Use the trailing seven days for weekly review unless a KPI explicitly states otherwise.

## KPI Table

| KPI | Definition | Minimum data source | Review cadence | Green | Yellow | Red |
| --- | --- | --- | --- | --- | --- | --- |
| `upload_to_processing_outcome` | Median elapsed time from `source.uploaded` to either `source.processed` or `source.processing_failed`. | Worker job events or audit log timestamps. | Weekly | Median `<= 30 min` and no item waits `> 1 business day`. | Median `> 30 min` and `<= 4h`, or up to 2 items wait `> 1 business day`. | Median `> 4h`, or more than 2 items wait `> 1 business day`. |
| `ready_for_review_to_publish` | Median elapsed time from `source.ready_for_review` to successful publish of a tree node. | Review timestamps, publish audit events. | Weekly | Median `<= 2 business days`. | Median `> 2` and `<= 5 business days`. | Median `> 5 business days`. |
| `publish_success_rate` | Share of publish attempts that complete without canonical data repair work. | Publish audit events and failure events. | Weekly | `>= 95%`. | `85% - 94%`. | `< 85%`. |
| `review_backlog_over_7_days` | Count of review items that remain unresolved for more than 7 days. | Review queue query or operational list. | Weekly | `0 - 3` items. | `4 - 7` items. | `> 7` items. |
| `weekly_active_readers_editors` | Unique active users in the trailing 7 days, reported by role group. Count a user as active when they perform at least one meaningful read, search, edit, correction, review, or publish action. | Auth events plus audit or interaction events. | Weekly | `>= 50%` of enabled reader-capable accounts and `>= 50%` of enabled editor-capable accounts are active. If a role group has fewer than 2 enabled accounts, one active user counts as green. | Either role group is `25% - 49%` active. | Either role group is `< 25%` active. |
| `published_nodes_with_evidence_linkage` | Share of source-driven published nodes that retain source version linkage, review actor, and provenance reference. | Publish audit records plus provenance query. | Weekly | `100%`. | `95% - 99%`. | `< 95%`. |

## Interpretation Notes
- `weekly_active_readers_editors` is a usefulness signal for a small team, not a growth metric.
- `publish_success_rate` counts retries as failures if the first attempt required operational repair.
- `published_nodes_with_evidence_linkage` applies only to source-driven publishes; manual nodes are governed separately by `no_source` and evidence attachment rules.
- If a KPI turns red for two consecutive weekly reviews, create a corrective action item in the operational board.
