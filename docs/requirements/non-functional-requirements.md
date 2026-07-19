# Non-Functional Requirements

## Purpose
- Define operational quality targets for V1 so implementation choices can be judged against reliability, auditability, integrity, security, maintainability, and operator readiness requirements.

## In Scope
- Data integrity, auditability, reliability, backup and restore, search freshness, security baseline, observability, and operator coverage targets.
- Practical V1 constraints for a small private-team deployment.

## Out of Scope
- Enterprise-grade compliance certifications.
- Public internet hardening for anonymous traffic.
- Detailed infrastructure-as-code implementation.

## Decisions
- V1 prioritizes data integrity, auditability, and operational reliability over maximum throughput.
- Private-team deployment assumptions allow practical, strong-enough controls rather than enterprise complexity.
- Backup and restore must be real operational workflows, not informal intentions.
- Operational readiness must not depend on one `Admin/Op` user only.
- Auditability must support internal leakage or misuse investigation by reconstructing uploader, editor/updater, and approver/publisher actions.

## Dependencies
- Functional scope in [`functional-spec.md`](./functional-spec.md).
- Deployment assumptions in [`../system/deployment-topology.md`](../system/deployment-topology.md).
- Recovery procedures in [`../operations/operating-playbook.md`](../operations/operating-playbook.md).
- Delivery coverage rules in [`../operations/delivery-operating-model.md`](../operations/delivery-operating-model.md).
- Acceptance criteria in [`acceptance-criteria.md`](./acceptance-criteria.md).

## Acceptance Criteria
- Every listed quality requirement can be mapped to a measurable operational control, test, or runbook drill.
- Reliability and recovery expectations are specific enough to guide implementation.
- Security and audit requirements are strong enough for private team documents.
- The system exposes enough data to compute the V1 scorecard without a separate analytics platform.

## Data Integrity
- Tree Markdown is canonical in the application database and versioned.
- Source evidence must preserve original file, raw text, corrected text, and version identity.
- Promotion must create a durable relationship between source evidence and published tree node versions.
- Archive and merge operations must be reversible in history, even when not reversible in UI.

## Auditability
- The system must record actor, action, target object, timestamp, and outcome for:
  - upload
  - correction edit
  - manual node edit
  - trust change
  - publish
  - merge
  - archive
  - export
  - restore-related administrative actions
  - permission-sensitive admin changes
- Audit records must distinguish accountability roles at action time:
  - uploader
  - editor or updater
  - approver or publisher
- Audit records must remain queryable by source, node, branch, and user.
- The system must support investigation queries that reconstruct the full accountability chain for any published node or source item.

## Reliability
- Source intake jobs must be retryable.
- OCR and parsing failures must end in a visible state, not silent loss, and must never remove the stored item from `Library` availability.
- Publish jobs must be idempotent at the application level.
- Export validation failures must not corrupt canonical tree content.
- Worker or storage outages must enter a visible degraded mode, not silent queue growth.

## Backup and Restore
- Daily backups are required for:
  - application database
  - object storage bucket(s) for source repo
  - content repository remote mirror
- Recovery point objective (`RPO`) is `24h`.
- Restore procedures must support recovering:
  - a full environment
  - one source record with versions
  - one tree node with version history
- Full-environment restore target is `1 business day`.
- Single source record or single tree node restore target is `4h`.
- A documented restore drill is required before release readiness sign-off and after major operational change.

## Operational Coverage
- The active environment must maintain at least two trained users with `Admin/Op` access.
- One trained `Admin/Op` user acts as the primary operator and one acts as backup coverage.
- Backup coverage must be able to execute publish, export, and restore procedures without waiting for undocumented knowledge transfer.

## Search Freshness
- Newly stored items must be findable in `Library` by title and metadata immediately, and by full text within 5 minutes of successful extraction.
- New publishes should appear in search within 5 minutes of successful indexing.
- Archive and merge redirects should affect default search visibility within 5 minutes.
- Source correction status changes should appear in operational search within 2 minutes.

## Google Bridge
- Every Google bridge is one-way into WisdomTree or outbound; nothing WisdomTree owns is written back to Google in V1.
- A Google API outage or throttle degrades only the affected bridge and must never block core storage, catalog, or knowledge workflows.
- Drive and Sheets imports are on-demand or scheduled; Forms polling ingests new rows within 30 minutes of a scheduled poll.
- Import jobs are idempotent and never leave partial or corrupt records; failures surface as operational follow-up.
- The Calendar ICS feed requires no per-user Google OAuth and reflects deadline changes within one feed refresh interval.

## Security Baseline
- All authenticated access must flow through Google OIDC.
- Sensitive routes require backend authorization, not just UI hiding.
- Original file downloads are limited to members of the item's space and `Admin/Op`; space scoping is enforced by backend authorization.
- Personal submission views must be scoped by uploader identity, and storage browsing must be scoped by space membership; neither may leak cross-space visibility to baseline users.
- Object storage access must use server-issued, time-limited access paths or equivalent controlled delivery.
- Private data must travel over encrypted transport.

## Performance Targets
- Tree search results should return initial results within 2 seconds for common queries under expected V1 load.
- Source detail and node detail pages should render useful initial content within 2 seconds after auth and cache warm-up.
- Review queue pages should support practical use for small-team concurrency without requiring pagination redesign in V1.

## Observability
- The system must expose at least:
  - job success and failure counts
  - OCR/parsing failure rate
  - publish success rate
  - export validation failure rate
  - queue latency
  - backlog age over 7 days
  - backup job status
  - overdue loan count
- Logs must allow correlation from a publish event back to its source version and review action.
- Observability must be sufficient to compute the V1 scorecard without a separate analytics platform.

## Maintainability
- Core state names must be shared across app, worker, docs, and exported content.
- Integration boundaries must be explicit enough to replace the OCR worker or export process later without rewriting the entire app.
- Future role split should not require rethinking the core two-repository model.
- Permission and audit semantics must remain explicit enough that a future reviewer or curator split can layer on top of the existing accountability chain.
- UI strings must be externalized for bilingual Vietnamese/English rendering with Vietnamese as the default.
