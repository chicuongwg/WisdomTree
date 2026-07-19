# WisdomTree Documentation Index

## Purpose
- Establish `/docs` as the implementation-facing source of truth for product, requirements, system, flow, UI, operations, policy, and roadmap decisions.
- Give new engineers and sub-agents a deterministic reading order so they can start work without reopening scope, quality, or recovery questions.

## In Scope
- Documentation structure, reading paths, authoring rules, and document ownership.
- Links to the core documents required for product, backend, frontend, operations, and content-quality workstreams.

## Out of Scope
- Public-facing marketing documentation.
- End-user help center content.
- API reference generated from code.

## Decisions
- All planning and system specification documents live under `/docs` in the main code repository.
- Documentation language is English.
- Flow, state, context, and sequence diagrams use Mermaid.
- V1 role model is `User`, `Editor`, and `Admin/Op`.
- Tree content is modeled separately from source ingestion; details live in [`system/two-repository-architecture.md`](./system/two-repository-architecture.md).
- The Source Repo is the team's storage-first home, organized into membership-scoped spaces; storage availability precedes curation.
- The repository is currently in `Phase 0 documentation-complete`; tracked implementation has not started outside `/docs`.

## Dependencies
- Product goals and scope in [`product/prd.md`](./product/prd.md) and [`product/scope-v1.md`](./product/scope-v1.md).
- Operational and quality policy in [`operations/`](./operations) and [`policy/`](./policy).
- Core system decisions in [`system/`](./system).
- Screen and interaction specifications in [`ui/`](./ui).

## Acceptance Criteria
- A new sub-agent can open this file and know which documents to read first for its assigned stream.
- Backend, frontend, operations, and content-quality contributors can find a deterministic entry point into the documentation set.
- All documents listed here exist and align on terminology, roles, state names, and operational targets.

## Current Repo State
- This repository is currently a docs-first planning repo.
- The planning layer is intended to be complete enough to guide implementation without reopening core V1 decisions.
- App, worker, and infrastructure code are not yet tracked in this repository.

## Reading Order

### Start Here
1. [`session/README.md`](./session/README.md)
2. [`session/session-summary.md`](./session/session-summary.md)
3. [`platform/platform-context.md`](./platform/platform-context.md)
4. [`product/prd.md`](./product/prd.md)
5. [`product/v1-scorecard.md`](./product/v1-scorecard.md)
6. [`product/scope-v1.md`](./product/scope-v1.md)
7. [`operations/operating-playbook.md`](./operations/operating-playbook.md)
8. [`requirements/functional-spec.md`](./requirements/functional-spec.md)
9. [`system/two-repository-architecture.md`](./system/two-repository-architecture.md)
10. [`flows/state-machines.md`](./flows/state-machines.md)

### Backend and Worker Path
1. [`requirements/functional-spec.md`](./requirements/functional-spec.md)
2. [`requirements/permissions-matrix.md`](./requirements/permissions-matrix.md)
3. [`system/module-boundaries.md`](./system/module-boundaries.md)
4. [`system/data-model-lifecycle.md`](./system/data-model-lifecycle.md)
5. [`system/integration-contracts.md`](./system/integration-contracts.md)
6. [`requirements/non-functional-requirements.md`](./requirements/non-functional-requirements.md)
7. [`operations/operating-playbook.md`](./operations/operating-playbook.md)
8. [`system/deployment-topology.md`](./system/deployment-topology.md)

### Frontend and UX Path
1. [`product/roles-personas.md`](./product/roles-personas.md)
2. [`flows/user-flows.md`](./flows/user-flows.md)
3. [`flows/editor-flows.md`](./flows/editor-flows.md)
4. [`flows/admin-op-flows.md`](./flows/admin-op-flows.md)
5. [`ui/ui-principles.md`](./ui/ui-principles.md)
6. [`ui/design-system.md`](./ui/design-system.md)
7. [`ui/design-system-governance.md`](./ui/design-system-governance.md)
8. [`ui/app-layout.md`](./ui/app-layout.md)
9. [`ui/navigation-model.md`](./ui/navigation-model.md)
10. [`ui/screen-inventory.md`](./ui/screen-inventory.md)
11. [`ui/user-screen-specs.md`](./ui/user-screen-specs.md)
12. [`ui/admin-op-screen-specs.md`](./ui/admin-op-screen-specs.md)

### Product and Planning Path
1. [`product/prd.md`](./product/prd.md)
2. [`product/v1-scorecard.md`](./product/v1-scorecard.md)
3. [`product/scope-v1.md`](./product/scope-v1.md)
4. [`policy/editorial-verification-policy.md`](./policy/editorial-verification-policy.md)
5. [`requirements/acceptance-criteria.md`](./requirements/acceptance-criteria.md)
6. [`operations/delivery-operating-model.md`](./operations/delivery-operating-model.md)
7. [`roadmap/phases-0-1-1.5.md`](./roadmap/phases-0-1-1.5.md)
8. [`roadmap/backlog-future.md`](./roadmap/backlog-future.md)

### Operations and Recovery Path
1. [`session/session-summary.md`](./session/session-summary.md)
2. [`system/system-context.md`](./system/system-context.md)
3. [`system/deployment-topology.md`](./system/deployment-topology.md)
4. [`requirements/non-functional-requirements.md`](./requirements/non-functional-requirements.md)
5. [`operations/operating-playbook.md`](./operations/operating-playbook.md)
6. [`requirements/acceptance-criteria.md`](./requirements/acceptance-criteria.md)
7. [`flows/admin-op-flows.md`](./flows/admin-op-flows.md)

## Documentation Map

### Platform
- [`platform/platform-context.md`](./platform/platform-context.md): the four-pillar platform vision, build-versus-borrow strategy, and standing constraints.
- [`platform/module-map.md`](./platform/module-map.md): modular-monolith module list, canonical data ownership, and dependency rules at platform scope.

### Product
- [`product/prd.md`](./product/prd.md): product problem, goals, success definition, audience, and guiding workflows.
- [`product/v1-scorecard.md`](./product/v1-scorecard.md): V1 KPI definitions, thresholds, and review cadence.
- [`product/scope-v1.md`](./product/scope-v1.md): what ships in V1, what waits, and what moves to phase 1.5.
- [`product/roles-personas.md`](./product/roles-personas.md): role model, JTBD, and permission summary.
- [`product/glossary.md`](./product/glossary.md): controlled vocabulary used across docs.

### Session Onboarding
- [`session/README.md`](./session/README.md): compressed startup guide for a new agent.
- [`session/session-summary.md`](./session/session-summary.md): shortest summary of the current product, architecture, and repo stage.
- [`session/decision-log.md`](./session/decision-log.md): major decisions that should not be casually reopened.
- [`session/deep-dive-guide.md`](./session/deep-dive-guide.md): reading paths by stream.
- [`session/rationale-and-evolution.md`](./session/rationale-and-evolution.md): why the final V1 shape won over earlier alternatives.

### Requirements
- [`requirements/functional-spec.md`](./requirements/functional-spec.md): module-level capabilities expressed as user stories with business rules and acceptance criteria.
- [`requirements/non-functional-requirements.md`](./requirements/non-functional-requirements.md): reliability, integrity, audit, security, performance, backup, observability, and operator coverage targets.
- [`requirements/permissions-matrix.md`](./requirements/permissions-matrix.md): role permissions across key product surfaces.
- [`requirements/acceptance-criteria.md`](./requirements/acceptance-criteria.md): system-level and module-level release acceptance criteria.

### System
- [`system/system-context.md`](./system/system-context.md): system boundary, actors, and context diagram.
- [`system/module-boundaries.md`](./system/module-boundaries.md): module ownership and responsibility map.
- [`system/two-repository-architecture.md`](./system/two-repository-architecture.md): core architecture for `Source Repo` and `Knowledge Tree`.
- [`system/data-model-lifecycle.md`](./system/data-model-lifecycle.md): entity lifecycle and state rules.
- [`system/catalog-circulation.md`](./system/catalog-circulation.md): physical library catalog and borrow-return circulation.
- [`system/integration-contracts.md`](./system/integration-contracts.md): key endpoints, events, and service contracts.
- [`system/google-bridge.md`](./system/google-bridge.md): one-way and outbound integration with Google Drive, Sheets, Forms, and Calendar.
- [`system/notifications.md`](./system/notifications.md): notification channels (in-app, email, Zalo OA) and object-anchored comments.
- [`system/deployment-topology.md`](./system/deployment-topology.md): runtime topology and deployment plan.

### Flows
- [`flows/state-machines.md`](./flows/state-machines.md): source, node, review, and conflict lifecycle diagrams.
- [`flows/user-flows.md`](./flows/user-flows.md): user discovery, source intake, and personal submission paths.
- [`flows/editor-flows.md`](./flows/editor-flows.md): editor creation, upload, and assigned correction flows.
- [`flows/admin-op-flows.md`](./flows/admin-op-flows.md): operations, review, publish, merge, and admin flows.
- [`flows/app-user-data-flows.md`](./flows/app-user-data-flows.md): user, app, worker, and data movement flows.

### UI
- [`ui/ui-principles.md`](./ui/ui-principles.md): visual direction and interaction principles.
- [`ui/app-layout.md`](./ui/app-layout.md): workspace structure.
- [`ui/navigation-model.md`](./ui/navigation-model.md): information architecture and routing model.
- [`ui/screen-inventory.md`](./ui/screen-inventory.md): route inventory with ownership and visibility.
- [`ui/design-system.md`](./ui/design-system.md): visual direction, tokens, and component behavior intent.
- [`ui/design-system-governance.md`](./ui/design-system-governance.md): token governance, component maturity, accessibility baseline, and change approval.
- [`ui/user-screen-specs.md`](./ui/user-screen-specs.md): user-facing screens, source intake, and personal submission tracking.
- [`ui/admin-op-screen-specs.md`](./ui/admin-op-screen-specs.md): source, review, publish, board, and admin screens.
- [`ui/shared-states.md`](./ui/shared-states.md): cross-product state behavior.
- [`ui/vocabulary-vi.md`](./ui/vocabulary-vi.md): internal-term to Vietnamese UI copy map and copy governance.

### Operations
- [`operations/operating-playbook.md`](./operations/operating-playbook.md): incident classes, degraded modes, and recovery procedures.
- [`operations/delivery-operating-model.md`](./operations/delivery-operating-model.md): stream ownership, doc review cadence, and `Phase 0 planning` exit criteria.
- [`operations/adoption-onboarding.md`](./operations/adoption-onboarding.md): seed-before-invite plan, guided onboarding, and adoption measurement.

### Policy
- [`policy/editorial-verification-policy.md`](./policy/editorial-verification-policy.md): publish, verification, reject, merge, and archive decision rules.

### Roadmap
- [`roadmap/phases-0-1-1.5.md`](./roadmap/phases-0-1-1.5.md): phased release plan.
- [`roadmap/backlog-future.md`](./roadmap/backlog-future.md): deferred items and future expansions.

## Authoring Rules
- Prefer concrete language over placeholders.
- If a decision is not in V1, place it in `backlog-future.md` instead of leaving it unresolved in the main docs.
- Reuse glossary terms exactly as defined in [`product/glossary.md`](./product/glossary.md).
- When a state is introduced in one document, it must match the state names in [`flows/state-machines.md`](./flows/state-machines.md).
- If a change affects recovery procedures or restore targets, update [`operations/operating-playbook.md`](./operations/operating-playbook.md).
- If a change affects publish, verification, reject, merge, or archive quality rules, update [`policy/editorial-verification-policy.md`](./policy/editorial-verification-policy.md).
- If a change affects scorecard definitions or thresholds, update [`product/v1-scorecard.md`](./product/v1-scorecard.md).
