# Stage 17.1 — UI Foundation / Design Tokens / Localization result

## 1. Result

PASS. The repository now has an isolated, buildable new-UI foundation and direct review route. No existing shell, navigation, domain service, schema, migration, seed, or old route was changed.

## 2. Tooling/sub-worker usage

Three Luna Max scouting workers were invoked for styling/theme, locale/vocabulary, and accessibility/component-pattern inspection. All three stopped at the tool usage limit before returning findings and made no repository changes. Sol completed the evidence inspection, architecture, implementation, and validation directly.

## 3. New UI isolation strategy

The implementation lives under `src/app/components/ui-next/`. Its stylesheet is imported only by the nested `/new-ui-preview` layout; tokens/resets are rooted at `.ui-next` and component selectors use the `ui-next-*` namespace. The preview is not linked from old navigation. Existing `globals.css` and shell behavior are untouched.

## 4. Token architecture

Semantic light/dark tokens cover background/surfaces, borders, primary/secondary/muted text, accent/focus, five status tones, typography, spacing, radii, elevation, semantic content widths, and future sidebar dimensions. System appearance works when no explicit `data-theme` value exists. A dedicated contrast test reads the shipped token values rather than duplicating them.

## 5. Typography architecture

Application controls use the stable system stack. `ResearchContent` uses a broader research fallback stack, `72ch` measure, 1.72 line height, `dir="auto"`, and scoped Markdown element styles. Code has a separate monospace stack and bidi isolation. No parser or sanitization boundary changed.

## 6. VI/EN localization architecture

Typed VI and EN catalogs contain identical keys. Vietnamese is the predictable unsupported-locale fallback. Interpolation preserves supplied Unicode strings. `Intl` date/number helpers cover structured UI metadata. Research content is never translated. Current human-review vocabulary remains replaceable catalog copy.

## 7. Multilingual/Unicode behavior

The preview exercises Vietnamese, English, Chinese/Han text, Japanese, Korean, French, Arabic, and `𠀀`. No display normalization or destructive text transform is used. Rendering relies on system/browser fallback, so complete Hán-Nôm glyph coverage is not claimed.

## 8. UI primitives implemented

Implemented: Button/IconButton, TextField/TextArea/Select, Surface, Divider, StatusBadge, SaveStatus, Progress, Skeleton, EmptyState, ErrorState, PageContainer, PageHeader, Stack, Inline, VisuallyHidden, SkipLink, ResearchContent, Dialog, and Drawer.

Tabs, menus, popovers, tooltips, and domain components were deliberately deferred until consuming interactions define their semantics.

## 9. Accessibility foundation

The foundation includes focus-visible styling, a skip-link pattern, required-label icon buttons, associated form help/errors, native modal focus containment and Escape handling, trigger-focus restoration, textual status markers, polite save announcements, labeled loading/progress, reduced-motion handling, and narrow-screen dialog/drawer behavior.

## 10. Responsive foundation

Semantic content widths and small flex/grid primitives support reading, standard, wide, and full layouts. Medium (64rem) and narrow (44rem) behavioral rules collapse headers/actions and make transient surfaces fit or fill narrow viewports. No device-brand dimensions or complete shell behavior were introduced.

## 11. Foundation showcase

`/new-ui-preview` is a synthetic-only visual QA route. It demonstrates local VI/EN switching, current light/dark theme mechanics, controls, forms, semantic statuses, save/loading/progress states, empty/error states, dialog/drawer behavior, long-form typography, RTL, CJK, and supplementary-plane text. It performs no database or domain mutation.

## 12. Legacy UI preservation

Old navigation, root shell, pages, APIs, and `globals.css` remain unchanged. The new route coexists inside the existing root layout and has no old-navigation entry. No application or database module is imported by a foundation component; only the `UiLocale` TypeScript type is reused from the accepted locale contract.

## 13. Tests executed

- `npm test` — PASS: lint, typecheck, 9 unit files, boundary check (226 delivery files with no direct database access), signing, time, legacy contrast, and new-UI contrast.
- `npm run test:unit` — PASS, 9 unit files including `ui-next-foundation.test.tsx`.
- `npm run test:ui-next-contrast` — PASS, light/dark text, controls, focus, accent, danger-button text, and semantic statuses meet configured WCAG contrast floors.
- `npm run build` — PASS; `/new-ui-preview` compiled. Existing Next ESLint-plugin detection warning remains informational.
- `git diff --check` — PASS.

## 14. Files changed

Stage 17.1 adds the isolated `ui-next` component tree, `/new-ui-preview`, two focused test files/scripts, one package test-script update, this result report, and the implementation note. No pre-existing Stage 1–16.5 change was modified except `package.json`, which only adds the new contrast check to the canonical test chain.

## 15. Risks/gaps

- Visual browser, keyboard, screen-reader, 200% zoom, and installed-font corpus checks still require a supported interactive browser environment and product-owner Hán-Nôm corpus.
- The preview locale control is intentionally local; Stage 17.2 must connect a shell locale switcher to Stage 16 application locale mutation.
- Current Appearance supports persisted light/dark and system default when no explicit value exists; Stage 17.1 does not add an explicit persisted `system` control.
- No user-selectable accent setting exists in current code, so only a semantic accent token contract was established.
- Route navigation tabs, menus, and popovers remain consumer-driven work rather than speculative primitives.

## 16. Recommended Stage 17.2

Implement the parallel new App Shell and global navigation for TMKT Overview, Projects, My Work, People, and Search, plus New, Quick Search entry, account/locale utilities, and responsive navigation. Consume Stage 17.1 tokens/primitives and Stage 16 application context; keep the old UI available and do not cut over.
