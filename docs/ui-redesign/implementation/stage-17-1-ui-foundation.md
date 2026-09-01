# Stage 17.1 UI foundation

## 1. Token architecture

The new foundation defines compact semantic tokens in `src/app/components/ui-next/styles.css`. Color tokens describe UI roles rather than domains: background, surface, border, text, accent, focus, success, warning, danger, and information. The same root also owns the interface/research/monospace font stacks, the `1/2/3/4/6/8/12` spacing scale, two radii, one restrained elevation, semantic content widths, and future sidebar dimensions.

Light values are the baseline. `:root[data-theme="dark"] .ui-next` supplies explicit dark values. When no persisted theme attribute exists, `prefers-color-scheme: dark` supplies the system default. The repository has no user-selectable accent-color contract; the new accent is therefore local to these tokens and is never used as domain meaning.

## 2. CSS and scoping strategy

All new rules live in one isolated stylesheet imported only by `/new-ui-preview`. Tokens, resets, and focus rules are scoped to `.ui-next`; component rules use the collision-resistant `ui-next-*` class namespace. No bare `button`, `input`, `table`, or legacy-shell selector is introduced. Dialogs use the same namespace while inheriting tokens from the wrapper. Legacy `globals.css`, shell components, navigation, and routes are unchanged.

## 3. Primitive inventory

- Controls: `Button`, required-label `IconButton`, `TextField`, `TextArea`, and `Select`.
- Structure: `Surface`, `Divider`, `PageContainer`, `PageHeader`, `Stack`, and `Inline`.
- Meaning and feedback: `StatusBadge`, `SaveStatus`, `Progress`, `Skeleton`, `EmptyState`, and `ErrorState`.
- Accessibility: `VisuallyHidden` and `SkipLink`.
- Transient surfaces: native-HTML `Dialog` and `Drawer` client islands.
- Content: server-compatible `ResearchContent`.

This is deliberately smaller than a component framework. Tabs, menus, popovers, tooltips, and domain-specific components remain deferred until a consuming slice proves their exact semantics.

## 4. Localization architecture

`localization/locales/vi.ts` is the fallback catalog and `en.ts` is checked against the same typed key set. `translate(locale, key, values)` normalizes unsupported locale values to Vietnamese, preserves interpolation values byte-for-byte at the JavaScript string level, and never translates research data. Missing catalog values are visibly marked in development and degrade to a stable key in production rather than rendering `undefined`.

The locale type comes from the accepted Stage 16 `UiLocale` contract. The small runtime helper stays browser-safe and does not import the server-side profile service. `Intl.DateTimeFormat` and `Intl.NumberFormat` helpers use `vi-VN` and `en-US`; they are intended only for structured application metadata.

Terminology follows the Stage 16.5B catalog. Human-review wording such as People/`Con người` and Materials/`Tư liệu` remains catalog data, so later wording review does not require component changes.

## 5. Typography strategy

Application chrome uses a stable system-first sans-serif stack. `ResearchContent` uses a broader Noto/system fallback stack, defaults to `dir="auto"`, applies `unicode-bidi: plaintext`, and uses a `72ch` maximum reading measure with fluid type and a 1.72 line height. It includes scoped Markdown presentation for headings, paragraphs, lists, blockquotes, tables, code, links, images, and rules; it does not introduce or alter a Markdown parser.

Code uses an independent monospace stack and explicit LTR bidi isolation. Research CSS applies no uppercase transformation, transliteration, normalization, or script-specific letter spacing.

## 6. Unicode and RTL behavior

The components pass React string values through without normalization. The showcase includes Vietnamese, English, Han text, Chinese, Japanese, Korean, French, Arabic, and the supplementary-plane probe `𠀀`. `dir="auto"` changes research-block direction without changing the LTR application wrapper.

This architecture preserves content when a glyph is unavailable; it does not claim universal font or Hán-Nôm glyph coverage. Product-corpus checks on supported OS/browser/font environments remain required.

## 7. Responsive foundation

Semantic widths are `reading`, `standard`, `wide`, and `full`. Layout primitives wrap and collapse without device-specific assumptions. Current behavioral thresholds are 64rem for the medium layout and 44rem for the narrow single-column layout. Narrow dialogs use available viewport width and drawers become full-width. These values are implementation starting points to be stress-tested by later real screens.

## 8. Accessibility foundation

- Visible focus rings are tested against both themes.
- Form labels, description/error relationships, required state, and invalid state are wired with native semantics.
- Status/save feedback includes text and polite live-region behavior.
- Determinate and indeterminate progress use native `progress`.
- Skeleton detail is hidden from assistive technology and announced once.
- Native modal dialogs provide focus containment; Escape closes them and focus returns to the prior trigger.
- The drawer reuses the same dialog semantics.
- Motion is minimal and reduced-motion disables meaningful animation duration.
- Icon-only buttons require an accessible label at the TypeScript boundary.

## 9. Old/new UI isolation

`/new-ui-preview` is the only current consumer. It is an isolated review route inside the existing root layout; it is not linked into old navigation and does not call domain/application services. The existing UI remains the active application. The preview's theme buttons exercise the current `data-theme` contract without persisting a setting and restore the previous attribute on unmount.

## 10. Consumption by Stage 17.2+

Stage 17.2 can build the parallel `AppShell`, global navigation, quick-search entry, create entry, and account/locale utilities from these tokens and primitives. Domain screens should receive Stage 16 DTOs through their own boundaries; foundation components must remain unaware of Project workflow internals and legacy container concepts.
