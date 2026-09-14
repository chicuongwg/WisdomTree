# Responsive and accessibility specification

## Behavioral width modes

Exact CSS breakpoints are implementation-tuned from content stress tests.

### Wide

- Expanded/collapsible global sidebar.
- Full horizontal Project navigation.
- Main workspace plus optional inspector.
- Collection-preserving preview where useful.
- Optional editor split preview; never mandatory.

### Medium

- Global sidebar collapsed or user-toggle drawer.
- Project tabs with visible overflow/`More`.
- Inspector overlays or opens as drawer rather than reducing main content below readable width.
- Collection/detail remains two-pane only when both retain useful minimum widths.

### Narrow

- App header menu/drawer replaces sidebar.
- Project picker and module selector replace full tabs.
- Single main content column.
- Inspector/Evidence Picker becomes full-height labeled sheet.
- Collections and detail use master/detail navigation with Back restoring query/scroll.
- Tables become labeled structured lists; three panes are never squeezed.

## Representative responsive contracts

| Surface | Wide | Narrow |
| --- | --- | --- |
| Project workspace | Sidebar + tabs + main | Header drawer + module selector + main |
| Note editor | Main + optional inspector | Full editor; inspector/evidence sheet |
| Material detail | Sections + optional details | Stacked sections/accordions |
| Search | Facets + list + optional preview | Filter sheet + list → detail |
| Task board | Columns or list | List default; accessible horizontal board optional |
| Tempo loans | Table | Labeled loan cards with actions menu |

## Accessibility acceptance requirements

### Structure

- Skip link targets the main route content.
- Landmarks: banner/header, navigation with distinct labels, main, complementary inspector where applicable.
- One page-level `h1`; logical section heading order.
- Project tabs use an appropriate navigation pattern; if implemented as links, use normal link semantics and `aria-current`, not ARIA tabs unnecessarily.

### Keyboard and focus

- Every action reachable without pointer.
- Visible focus meets contrast requirements in both themes.
- Dialogs/sheets trap focus, Escape closes topmost transient surface, and focus returns to trigger.
- Opening preview/inspector moves focus only when user intent requires it; closing restores prior control.
- Drag/drop Task actions have move menus/keyboard equivalents.
- Quick Search has deterministic active-descendant/listbox behavior and announced grouping.

### Status and errors

- Autosave/upload/extraction updates use polite live regions without announcing every progress tick.
- Errors connect to fields and provide an error summary for multi-field forms.
- Status uses text/icon, never color alone.
- Skeletons are hidden from assistive technology or described once; no infinite unlabeled spinner.

### Inspector/drawer

- Desktop inspector is a labeled complementary region with close control.
- Narrow sheet is a labeled dialog with focus containment.
- Section navigation has accessible names and does not become an unlabeled icon rail.
- Main content remains usable at 200% zoom/reflow; inspector overlays when needed.

### Motion and target size

- Honor `prefers-reduced-motion`; no essential state communicated through animation.
- Touch/click targets are sufficiently large and spaced; dense tables retain focus/hover distinction.
- Animation never delays focus or authoritative state changes.

### Multilingual direction

- Research blocks test `dir="auto"`, manual override, mixed inline content, screen-reader reading order, and copy/paste.
- RTL research does not reverse application navigation.

## Stage 17 test expectations

- Automated semantic/contrast checks plus keyboard walkthroughs.
- Screen-reader smoke test of shell, Project navigation, Note editor/save states, Inspector, Picker, and one table/list.
- 200% zoom/reflow at representative widths.
- VI and EN label expansion.
- reduced-motion and light/dark smoke checks.
- Hán-Nôm/RTL corpus test on agreed supported environments.
