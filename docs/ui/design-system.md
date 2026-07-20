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
- Screen specs in [`user-screen-specs.md`](./user-screen-specs.md) and [`admin-op-screen-specs.md`](./admin-op-screen-specs.md).

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

## State Badges

Every state badge is a Vietnamese word plus a tone. Tones are assigned by
**meaning, not one colour per enum value**: the thirty-odd states across the
nine label maps collapse onto five tones, so a reader learns the vocabulary
once and it holds on every screen.

- `waiting`: queued, nothing has happened yet — sunken surface, muted ink.
  Deliberately the least eye-catching chip in the app.
- `active`: someone is working on it right now — Chàm indigo.
- `attention`: a human must act, or it is at risk — Hổ phách amber.
- `done`: finished, and finished well — Canopy green.
- `stopped`: ended without succeeding, or withdrawn — Son vermilion.

Two states keep their own long-standing treatment instead of a tone:

- `no_source`: visibly incomplete — dashed edge, no fill commitment.
- `archived`: subdued inactive, never alarming — shares the quiet frame with
  `waiting`. An archived item is not at risk and must never read as vermilion.

Kind, type, role, reference and count chips are not states and stay on the
neutral chip. Tinting them would spend the tone vocabulary on things that have
no lifecycle.

### Rules

- The state→tone table lives in `src/lib/vi.ts` and is the single source of
  truth; `badgeClass(map, value)` is the only way a screen picks a chip. An
  unrecognised state degrades to the neutral chip and warns in development,
  exactly like the `guarded()` label fallback.
- Tone appearance lives in `src/app/globals.css` as `--tone-*` custom
  properties. No raw hex in components.
- Colour is never the only carrier. Every chip prints its state in Vietnamese,
  and shape disambiguates the tones whose colours converge for a deuteranope
  (measured: attention/stopped separate by only 1.14:1, active/done by 1.02:1):
  - left bar (3px, full strength) = a person is on this, or must be
    → `active`, `attention`
  - 2px ring = read me before you skim → `attention`, `done`
  - `done` earns the ring because green collapses towards both grey and indigo
    under deuteranopia; the ring is a disambiguator, not a claim that "done" is
    loud. `waiting` and `stopped` share the bare frame and separate on colour
    (1.40:1 light / 1.58:1 dark simulated) and on wholly unlike words.
- Shape convention, unchanged: solid border = decided, dashed = incomplete.
- Badge text clears 4.5:1 against its own fill in both themes (measured range
  5.13:1–8.39:1 light, 4.93:1–6.86:1 dark).

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

## Editor Direction
- The default editor is a visual, WYSIWYG-feel editor of a TipTap or Milkdown class: toolbar formatting, inline images, and no visible syntax, so a non-technical writer works as they would in a familiar office document.
- Markdown remains the stored format underneath, so export, Quartz publishing, and document rendering are unaffected.
- A raw Markdown source view is available as a hidden toggle for power users; it is never the default.
- The primary path for non-technical contribution is uploading a document and converting it, not learning Markdown.
