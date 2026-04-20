# Design System

## Purpose
- Define the V1 visual and interaction direction that screen specifications should reuse consistently.

## In Scope
- Typography, color roles, trust badges, states, spacing, panels, tables, graph primitives, and Markdown presentation rules.

## Out of Scope
- Production-ready component code.
- Final branding assets.
- Complete token JSON or CSS variable exports.
- Token lifecycle, component maturity, accessibility governance, and shared-change approval rules.

## Decisions
- The design system supports a `Knowledge atlas` feel with moderate density.
- Trust and lifecycle states have explicit visual roles.
- Markdown is structured but editable; the UI should support source editing with preview rather than hide structure behind WYSIWYG complexity.
- Governance for shared tokens and components lives in a separate companion doc.

## Dependencies
- UI principles in [`ui-principles.md`](./ui-principles.md).
- Shared state behavior in [`shared-states.md`](./shared-states.md).
- Governance rules in [`design-system-governance.md`](./design-system-governance.md).
- Screen specs in [`reader-screen-specs.md`](./reader-screen-specs.md) and [`admin-op-screen-specs.md`](./admin-op-screen-specs.md).

## Acceptance Criteria
- Frontend engineers can derive a coherent component library direction from this file.
- Trust, status, and workspace context remain visually consistent across screens.
- Markdown reading and editing rules are explicit enough for implementation.
- This file stays focused on design direction rather than shared-component governance.

## Governance Boundary
- Use this file for visual direction, semantic roles, and interaction intent.
- Use [`design-system-governance.md`](./design-system-governance.md) for token change rules, component maturity, accessibility baseline, naming, versioning, and broad adoption criteria.

## Typography
- Primary text style:
  - readable serif or serif-adjacent for long-form knowledge content
- Interface text style:
  - clean sans-serif for navigation, badges, and controls
- Hierarchy:
  - page title
  - section title
  - card title
  - metadata label
  - inline helper text

## Color Roles
- Canvas background
- Navigation background
- Content surface
- Inspector surface
- Accent for active knowledge path
- Muted metadata
- Semantic colors for trust and workflow state

## Trust Badges
- `verified`: strong positive but restrained emphasis
- `unverified`: cautionary neutral or warning emphasis
- `no_source`: visibly incomplete state
- `archived`: subdued inactive state
- `trusted` source: evidence-positive
- `candidate` source: needs review
- `rejected` source: blocked or not publishable

## State Styles
- loading
- empty
- error
- conflict
- archived
- unprocessable
- access denied

Each state should have:
- icon or glyph role
- title
- short explanatory copy
- primary action
- optional secondary action

## Spacing and Layout Rules
- Use a consistent panel rhythm across navigation, canvas, and inspector.
- Preserve enough width for readable long-form Markdown and side-by-side review.
- Keep action bars close to the decision area, not detached from context.

## Panels
- Navigation panel:
  - stable, role-aware
- Content panel:
  - reading or editing dominant
- Inspector panel:
  - metadata, trust, relations, provenance
- Comparison panel:
  - specialized variant for raw vs corrected or corrected vs Markdown draft

## Tables
- Use for source inbox, review queue, and operational lists.
- Table rows must surface state badges, assignee, recency, and next action.

## Graph Primitives
- Node size reflects structural importance, not vanity metrics.
- Edge styling distinguishes controlled edge types.
- Hover and selection should reveal trust and branch context.

## Markdown Presentation Rules
- Support GFM, wikilinks, math, code blocks, and tables.
- Render source references and trust badges near the page header.
- Preserve readable heading hierarchy.
- Editing mode should offer live preview and template guidance without removing direct Markdown control.
