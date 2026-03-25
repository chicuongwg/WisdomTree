# Non-Functional Requirements

## Purpose
- Define operational quality targets for V1 so implementation choices can be judged against reliability, auditability, integrity, security, and maintainability requirements.

## In Scope
- Data integrity, auditability, reliability, backup and restore, search freshness, security baseline, and observability targets.
- Practical V1 constraints for a small private-team deployment.

## Out of Scope
- Enterprise-grade compliance certifications.
- Public internet hardening for anonymous traffic.
- Detailed infrastructure-as-code implementation.

## Decisions
- V1 prioritizes data integrity, auditability, and operational reliability over maximum throughput.
- Private-team deployment assumptions allow practical, strong-enough controls rather than enterprise complexity.
- Backup and restore must be real operational workflows, not informal intentions.

## Dependencies
- Functional scope in [`functional-spec.md`](./functional-spec.md).
- Deployment assumptions in [`../system/deployment-topology.md`](../system/deployment-topology.md).
- Acceptance criteria in [`acceptance-criteria.md`](./acceptance-criteria.md).

## Acceptance Criteria
- Every listed quality requirement can be mapped to a measurable operational control or test.
- Reliability and recovery expectations are specific enough to guide implementation.
- Security and audit requirements are strong enough for private team documents.

## Data Integrity
- Tree Markdown is canonical in the application database and versioned.
- Source evidence must preserve original file, raw text, corrected text, and version identity.
- Promotion must create a durable relationship between source evidence and published tree node versions.
- Archive and merge operations must be reversible in history, even when not reversible in UI.

## Auditability
- The system must record actor, action, target object, timestamp, and outcome for:
  - upload
  - correction edit
  - trust change
  - publish
  - merge
  - archive
  - export
  - permission-sensitive admin changes
- Audit records must remain queryable by source, node, branch, and user.

## Reliability
- Source intake jobs must be retryable.
- OCR and parsing failures must end in a visible state, not silent loss.
- Publish jobs must be idempotent at the application level.
- Export validation failures must not corrupt canonical tree content.

## Backup and Restore
- Daily backups are required for:
  - application database
  - object storage bucket(s) for source repo
  - content repository remote mirror
- Restore procedures must support recovering:
  - a full environment
  - one source record with versions
  - one tree node with version history

## Search Freshness
- New publishes should appear in search within 5 minutes of successful indexing.
- Archive and merge redirects should affect default search visibility within 5 minutes.
- Source correction status changes should appear in operational search within 2 minutes.

## Security Baseline
- All authenticated access must flow through Google OIDC.
- Sensitive routes require backend authorization, not just UI hiding.
- Original file downloads are limited to Admin/Op.
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
  - backup job status
- Logs must allow correlation from a publish event back to its source version and review action.

## Maintainability
- Core state names must be shared across app, worker, docs, and exported content.
- Integration boundaries must be explicit enough to replace the OCR worker or export process later without rewriting the entire app.
- Future role split should not require rethinking the core two-repository model.

