# Design System Governance

## Purpose
- Define how design tokens and shared UI components mature into reusable system assets for WisdomTree.
- Keep the design system practical, reviewable, and accessible for a small team.

## In Scope
- Token governance.
- Component maturity model.
- Accessibility baseline.
- Naming and versioning rules.
- Change approval for shared UI primitives.

## Out of Scope
- Final visual direction or brand exploration.
- Production code structure for a specific frontend framework.
- A full accessibility compliance program.

## Decisions
- Visual direction lives in [`design-system.md`](./design-system.md); governance lives here.
- Shared components should mature gradually instead of being declared “global” on first use.
- Accessibility baseline is required before a component is considered stable.

## Dependencies
- Visual direction in [`design-system.md`](./design-system.md).
- Shared states in [`shared-states.md`](./shared-states.md).
- Screen behavior in [`user-screen-specs.md`](./user-screen-specs.md) and [`admin-op-screen-specs.md`](./admin-op-screen-specs.md).

## Acceptance Criteria
- Engineers and designers can tell whether a token or component is experimental, reusable, stable, or deprecated.
- Shared components have explicit accessibility expectations before wide adoption.
- Change approval rules are clear enough to prevent ad hoc UI drift.

## Token Governance
- Token families for shared use:
  - color
  - typography
  - spacing
  - radius
  - elevation
  - motion
  - semantic state
- Prefer semantic token names such as `surface-inspector` or `state-verified` over literal names tied to one screen.
- Repeated values in shared surfaces should become tokens before they spread across multiple components.
- Shared token changes require review by one UI/design owner and one implementer.

## Component Maturity Model

| Maturity | Meaning | Allowed usage |
| --- | --- | --- |
| `draft` | Early pattern proving a local screen need. | One screen or one workflow only. |
| `candidate` | Reused pattern with stable intent but still open implementation details. | Limited reuse across closely related screens. |
| `stable` | Reviewed shared component with explicit states, accessibility, and naming. | Wide app reuse is allowed. |
| `deprecated` | Still supported for compatibility but should not be used for new work. | Existing screens only until replaced. |

## Broad Adoption Rule
A component may be used widely across the app only when all of the following are true:
- It is classified as `stable`.
- Its empty, loading, error, and permission-sensitive states are defined where relevant.
- Keyboard behavior, focus behavior, and semantic labeling are reviewed.
- Its name reflects function, not one screen-specific layout.

## Accessibility Baseline
- Interactive elements must be keyboard reachable.
- Focus visibility must remain obvious on shared interactive patterns.
- Critical information must not rely on color alone.
- Text and state badges should meet practical contrast expectations for normal reading surfaces.
- Shared icons and controls should expose accessible labels or equivalent semantic meaning.

## Naming and Versioning Rules
- Tokens use semantic role names.
- Components use functional names such as `TrustBadge` or `ReviewComparisonPanel`, not page-specific names.
- Breaking changes to a stable shared component require a short release note in this doc or a linked design system change record.
- Deprecated components should name the preferred replacement when possible.

## Change Approval
- Shared token changes require one UI/design approver and one implementer review.
- Shared component changes that affect trust, lifecycle, or permission states must be cross-checked against [`shared-states.md`](./shared-states.md).
- Components should not move from `draft` to `stable` in one step unless the team explicitly reviews reuse, states, and accessibility together.
