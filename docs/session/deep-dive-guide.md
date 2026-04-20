# Deep Dive Guide

## Purpose
- Tell a new agent exactly how to dig deeper once the session summary is understood.
- Provide stream-specific reading orders and “what to extract” from each document.

## In Scope
- Backend and worker deep-dive path.
- Frontend and UX deep-dive path.
- Product and planning deep-dive path.
- Operations and deployment deep-dive path.

## Out of Scope
- Actual task decomposition or sprint planning.
- Code implementation guides.
- Rewriting the main docs.

## Decisions
- Deep dives are organized by stream rather than by directory alone.
- Each stream has a recommended order and explicit extraction goals.
- A new agent should finish the session pack before entering a stream-specific path.

## Dependencies
- Session onboarding index in [`README.md`](./README.md).
- Main docs index in [`../README.md`](../README.md).
- Roadmap in [`../roadmap/phases-0-1-1.5.md`](../roadmap/phases-0-1-1.5.md).

## Acceptance Criteria
- A new agent can pick a stream and know exactly which files to read next.
- The guide makes it clear what kind of decisions are already closed and what kind of detail lives deeper in the docs.
- Stream reading orders align with the actual doc structure.

## General Rule
Read the session pack first. Then pick one stream. Do not jump directly into UI, contracts, lifecycle details, or recovery procedures without first understanding the two-repository split, the V1 role model, and the current documentation-only repo stage.

## Deep Dive: Backend and Worker

### Read In This Order
1. [`session-summary.md`](./session-summary.md)
2. [`decision-log.md`](./decision-log.md)
3. [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md)
4. [`../system/module-boundaries.md`](../system/module-boundaries.md)
5. [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md)
6. [`../system/integration-contracts.md`](../system/integration-contracts.md)
7. [`../requirements/functional-spec.md`](../requirements/functional-spec.md)
8. [`../requirements/non-functional-requirements.md`](../requirements/non-functional-requirements.md)
9. [`../operations/operating-playbook.md`](../operations/operating-playbook.md)

### Extract These Answers
- What data belongs to Source Repo vs Knowledge Tree?
- Which module may mutate which state?
- Which lifecycle transitions require `Admin/Op` approval?
- Which events or jobs are asynchronous?
- What guarantees must be preserved for provenance, audit, export, and degraded operation?

## Deep Dive: Frontend and UX

### Read In This Order
1. [`session-summary.md`](./session-summary.md)
2. [`decision-log.md`](./decision-log.md)
3. [`../flows/user-flows.md`](../flows/user-flows.md)
4. [`../flows/editor-flows.md`](../flows/editor-flows.md)
5. [`../flows/admin-op-flows.md`](../flows/admin-op-flows.md)
6. [`../ui/ui-principles.md`](../ui/ui-principles.md)
7. [`../ui/design-system.md`](../ui/design-system.md)
8. [`../ui/design-system-governance.md`](../ui/design-system-governance.md)
9. [`../ui/app-layout.md`](../ui/app-layout.md)
10. [`../ui/navigation-model.md`](../ui/navigation-model.md)
11. [`../ui/screen-inventory.md`](../ui/screen-inventory.md)
12. [`../ui/user-screen-specs.md`](../ui/user-screen-specs.md)
13. [`../ui/admin-op-screen-specs.md`](../ui/admin-op-screen-specs.md)
14. [`../ui/shared-states.md`](../ui/shared-states.md)

### Extract These Answers
- What is the primary user journey?
- Which screens are User-first vs `Admin/Op`-only?
- How is accountability split between uploader, editor/updater, and approver?
- Where must trust, provenance, and graph context appear?
- Which screens are table-heavy, which are reading surfaces, and which are comparison surfaces?
- Which governance rules decide whether a component is local, shared, stable, or deprecated?

## Deep Dive: Product and Planning

### Read In This Order
1. [`session-summary.md`](./session-summary.md)
2. [`decision-log.md`](./decision-log.md)
3. [`../product/prd.md`](../product/prd.md)
4. [`../product/v1-scorecard.md`](../product/v1-scorecard.md)
5. [`../product/scope-v1.md`](../product/scope-v1.md)
6. [`../product/roles-personas.md`](../product/roles-personas.md)
7. [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md)
8. [`../requirements/acceptance-criteria.md`](../requirements/acceptance-criteria.md)
9. [`../operations/delivery-operating-model.md`](../operations/delivery-operating-model.md)
10. [`../roadmap/phases-0-1-1.5.md`](../roadmap/phases-0-1-1.5.md)
11. [`../roadmap/backlog-future.md`](../roadmap/backlog-future.md)

### Extract These Answers
- What is V1 actually shipping?
- Which user jobs matter most in V1?
- What counts as healthy weekly use and operationally acceptable latency?
- Which content quality decisions are policy-driven rather than person-driven?
- What is intentionally deferred?

## Deep Dive: Operations and Deployment

### Read In This Order
1. [`session-summary.md`](./session-summary.md)
2. [`decision-log.md`](./decision-log.md)
3. [`../system/system-context.md`](../system/system-context.md)
4. [`../system/deployment-topology.md`](../system/deployment-topology.md)
5. [`../requirements/non-functional-requirements.md`](../requirements/non-functional-requirements.md)
6. [`../operations/operating-playbook.md`](../operations/operating-playbook.md)
7. [`../product/v1-scorecard.md`](../product/v1-scorecard.md)
8. [`../flows/app-user-data-flows.md`](../flows/app-user-data-flows.md)
9. [`../requirements/acceptance-criteria.md`](../requirements/acceptance-criteria.md)

### Extract These Answers
- Which services run where?
- What must be backed up?
- Which failure modes are acceptable in V1 and which are not?
- What degraded modes are allowed before the system is considered unavailable?
- What operational surfaces and scorecard signals must exist for `Admin/Op`?

## Deep Dive: If You Need Rationale
Use [`rationale-and-evolution.md`](./rationale-and-evolution.md) when you need to understand why a tempting alternative was rejected, especially around:
- one-repository vs two-repository design
- Git-first vs app/database-canonical tree authoring
- full role split vs practical V1 role model
- OCR everywhere vs parser-first extraction
