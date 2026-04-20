# Session Onboarding Pack

## Purpose
- Give a new agent or engineer a compressed entry point into the decisions already made during planning.
- Provide a fast path for understanding what was finalized, where to dig deeper, and what stage the repository is actually in.

## In Scope
- Session-specific onboarding.
- Reading order for fast startup.
- Links to decision summary, rationale, deep-dive guides, and the most important new canonical docs.

## Out of Scope
- Replacing the full product, system, or UI specs.
- Acting as the only source of truth for implementation details.
- Reopening already-closed V1 decisions.

## Decisions
- This session pack is the first stop for any new agent joining the repo.
- The session pack is a compression layer over the main docs, not a separate competing spec.
- This pack reflects the current `Phase 0 documentation-complete` planning state of the repo.

## Dependencies
- Main documentation index in [`../README.md`](../README.md).
- Product direction in [`../product/prd.md`](../product/prd.md).
- Core architecture in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).

## Acceptance Criteria
- A new agent can read this file and know where to start in under five minutes.
- The reading paths here map cleanly to backend, frontend, operations, and content-quality work.
- The pack points to the final decisions instead of restating every implementation detail.

## Current Repository Stage
- The repository is currently in `Phase 0 documentation-complete`.
- Tracked implementation has not yet started outside `/docs`.
- New work should treat the docs as canonical input, not as proof that runtime modules already exist.

## Read This First
1. [`session-summary.md`](./session-summary.md)
2. [`decision-log.md`](./decision-log.md)
3. [`deep-dive-guide.md`](./deep-dive-guide.md)
4. [`rationale-and-evolution.md`](./rationale-and-evolution.md)

## When To Use This Pack
- When a new sub-agent joins the project.
- When an engineer needs the shortest path to the final decisions.
- When someone wants to understand why the current V1 shape looks the way it does.

## Fast Paths

### Fast Path: Understand the Product in 10 Minutes
1. [`session-summary.md`](./session-summary.md)
2. [`../product/prd.md`](../product/prd.md)
3. [`../product/v1-scorecard.md`](../product/v1-scorecard.md)
4. [`../product/scope-v1.md`](../product/scope-v1.md)

### Fast Path: Start Backend or Worker Work
1. [`session-summary.md`](./session-summary.md)
2. [`deep-dive-guide.md`](./deep-dive-guide.md)
3. [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md)
4. [`../system/integration-contracts.md`](../system/integration-contracts.md)
5. [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md)
6. [`../operations/operating-playbook.md`](../operations/operating-playbook.md)

### Fast Path: Start Frontend or UX Work
1. [`session-summary.md`](./session-summary.md)
2. [`deep-dive-guide.md`](./deep-dive-guide.md)
3. [`../flows/reader-flows.md`](../flows/reader-flows.md)
4. [`../flows/admin-op-flows.md`](../flows/admin-op-flows.md)
5. [`../ui/app-layout.md`](../ui/app-layout.md)
6. [`../ui/design-system.md`](../ui/design-system.md)
7. [`../ui/design-system-governance.md`](../ui/design-system-governance.md)
8. [`../ui/reader-screen-specs.md`](../ui/reader-screen-specs.md)
9. [`../ui/admin-op-screen-specs.md`](../ui/admin-op-screen-specs.md)

### Fast Path: Start Operations or Recovery Work
1. [`session-summary.md`](./session-summary.md)
2. [`deep-dive-guide.md`](./deep-dive-guide.md)
3. [`../system/deployment-topology.md`](../system/deployment-topology.md)
4. [`../requirements/non-functional-requirements.md`](../requirements/non-functional-requirements.md)
5. [`../operations/operating-playbook.md`](../operations/operating-playbook.md)
6. [`../requirements/acceptance-criteria.md`](../requirements/acceptance-criteria.md)

### Fast Path: Make Content Quality Decisions
1. [`decision-log.md`](./decision-log.md)
2. [`../product/glossary.md`](../product/glossary.md)
3. [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md)
4. [`../flows/admin-op-flows.md`](../flows/admin-op-flows.md)

### Fast Path: Understand Why Certain Tradeoffs Were Chosen
1. [`decision-log.md`](./decision-log.md)
2. [`rationale-and-evolution.md`](./rationale-and-evolution.md)

## What This Pack Contains
- [`session-summary.md`](./session-summary.md): shortest practical summary of the current product, architecture, and repo stage.
- [`decision-log.md`](./decision-log.md): final decisions that should not be reopened casually.
- [`deep-dive-guide.md`](./deep-dive-guide.md): how to dig deeper by stream and in what order.
- [`rationale-and-evolution.md`](./rationale-and-evolution.md): how the thinking evolved during the session and why earlier options were rejected.
