# Delivery Operating Model

## Purpose
- Define how a small team should own WisdomTree planning, delivery decisions, and documentation changes before implementation begins.
- Prevent key streams from becoming ownerless or blocked by a single unavailable operator.

## In Scope
- Stream-level DRI model.
- Backup coverage for `Admin/Op`.
- Review cadence for docs and operational readiness.
- Change rules for state, role, and contract-affecting documentation.
- Exit criteria for `Phase 0 planning`.

## Out of Scope
- Named staffing assignments for a specific employer or team roster.
- Detailed sprint ceremonies.
- HR or performance management policy.

## Decisions
- Stream ownership is role-based in docs, even if one person temporarily holds multiple responsibilities in a small team.
- `Admin/Op` coverage must never depend on one person only.
- Canonical decisions live in the main `/docs` tree; the session pack is a compressed onboarding layer, not a competing source of truth.
- Accountability for source-driven knowledge must stay traceable across uploader, editor/updater, and approver/publisher stages.

## Dependencies
- Product scope in [`../product/scope-v1.md`](../product/scope-v1.md).
- Release sequencing in [`../roadmap/phases-0-1-1.5.md`](../roadmap/phases-0-1-1.5.md).
- Operations recovery rules in [`operating-playbook.md`](./operating-playbook.md).
- Verification policy in [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md).

## Acceptance Criteria
- Every delivery stream has a defined primary and backup role.
- State, role, or contract changes can be documented without guessing which files must be updated together.
- `Phase 0 planning` can be declared complete without confusing documentation readiness with implementation readiness.

## Stream Ownership Model

| Stream | Primary DRI role | Backup role | Canonical docs |
| --- | --- | --- | --- |
| Product and scope | Product lead | Technical lead | `product/`, `roadmap/`, `requirements/acceptance-criteria.md` |
| Backend and worker model | Technical lead | Admin/Op lead | `system/`, `requirements/functional-spec.md`, `requirements/non-functional-requirements.md` |
| Frontend and UX | Frontend lead | Product lead | `ui/`, `flows/user-flows.md`, `flows/editor-flows.md`, `flows/admin-op-flows.md` |
| Operations and recovery | Admin/Op lead | Admin/Op backup | `operations/operating-playbook.md`, `system/deployment-topology.md` |
| Editorial quality and verification | Admin/Op lead | Product lead | `policy/editorial-verification-policy.md`, `product/glossary.md`, `system/data-model-lifecycle.md` |
| Design system governance | Frontend lead | Product lead | `ui/design-system.md`, `ui/design-system-governance.md` |

## Team Composition and Real DRI Mapping
- The team is a humanities and social-science group; only the owner is technical. Content work is staffed by domain experts, and system operation is staffed only by the owner.
- Role-based streams map to real profiles as follows, so accountability is clear even in a small team:

| Stream | Real profile | Notes |
| --- | --- | --- |
| Editorial quality and verification | Culture and literature scholars | Language and source judgment is their expertise |
| Taxonomy and concept quality | Anthropology researcher | Owns branch and tag structure decisions |
| Metrics and funding reporting | Economics graduate | Owns figures for grant applications |
| UI and design review | Architect | Approves layout and visual clarity |
| Technical and system operation | Owner | Sole operator for deploy, worker, and restore |

## Content Admin Versus System Operator
- The V1 `Admin/Op` role is split at the UI level, not the model level: an Admin Console Content tab for non-technical content admins and a System tab restricted to the owner. See [`../ui/admin-op-screen-specs.md`](../ui/admin-op-screen-specs.md).
- Content admin work (triage, review, publish, trust, merge, catalog, circulation) must be fully doable through the UI by a non-technical scholar.
- System operation (restore, worker, deploy, backups) is owner-only; its bus-factor of one is accepted and mitigated by automated backups and a runbook written for the owner's future self, not by a second technical operator.

## Admin/Op Coverage Rule
- The active environment must have at least two trained content admins who can triage, review, and publish through the UI.
- The primary content admin owns daily queue review, routine publish decisions, and weekly ops review.
- The backup content admin must be able to publish and manage circulation when the primary is unavailable.
- System operation coverage is owner-only in V1; restore and deploy capability does not require a second content admin, but the restore runbook must stay current and drillable.

## Review Cadence
- Weekly:
  - review failed jobs, backlog age, and the V1 scorecard
  - confirm backup status and operational blockers
- Biweekly:
  - review documentation changes that affect states, roles, schemas, or contracts
  - confirm onboarding paths still point to the correct canonical docs
- Monthly:
  - review release readiness against NFR, acceptance criteria, and restore drill outcomes

## Documentation Change Rules
- State changes must update:
  - [`../flows/state-machines.md`](../flows/state-machines.md)
  - [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md)
  - relevant UI state docs
  - release acceptance criteria when operational behavior changes
- Role changes must update:
  - [`../product/roles-personas.md`](../product/roles-personas.md)
  - [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md)
  - screen visibility docs and affected flows
  - policy and acceptance docs when accountability boundaries change
- Contract or schema-shaping changes must update:
  - [`../system/integration-contracts.md`](../system/integration-contracts.md)
  - [`../system/module-boundaries.md`](../system/module-boundaries.md)
  - relevant requirements and NFR docs
- Operational target changes must update:
  - [`operating-playbook.md`](./operating-playbook.md)
  - [`../requirements/non-functional-requirements.md`](../requirements/non-functional-requirements.md)
  - [`../requirements/acceptance-criteria.md`](../requirements/acceptance-criteria.md)
- The session pack should summarize the outcome of major changes, but must not replace canonical docs.

## Phase 0 Planning Exit Criteria
- The main docs index includes `Operations`, `Policy`, `V1 scorecard`, and `Design system governance`.
- The main docs index includes the platform layer (`platform/`) and the platform modules: catalog and circulation, Google bridge, notifications and comments, and the technology stack.
- The four-pillar scope is documented without contradicting the storage-and-knowledge core, and the open technical decisions (stack, AI policy, ownership, conflict handling, intake limits) are closed.
- Onboarding docs clearly state that the repo is `Phase 0 documentation-complete` and not yet implementation-started.
- The operating playbook has been reviewed by the primary and backup `Admin/Op` users.
- The editorial verification policy has been reviewed against common publish, reject, and merge scenarios.
- The V1 scorecard can be computed from planned audit, event, or database signals without a separate analytics platform.
- The roadmap distinguishes planning-complete from implementation-started work inside `Phase 0`.
