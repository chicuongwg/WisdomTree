# Navigation and interaction specification

## Desktop shell

Recommended constraints, not pixel-perfect CSS:

- **App header:** 48–56 px high; application identity, global `+ New`, Quick Search trigger, locale/account utilities.
- **Expanded global sidebar:** approximately 224–256 px; text labels always visible.
- **Collapsed sidebar:** approximately 56–64 px; icons plus accessible labels/tooltips; expansion control remains visible.
- **Main route:** fills remaining width with a page-level heading and one primary content region.
- **Inspector:** closed by default; approximately 320–400 px when open, with a minimum main reading width. It overlays instead of squeezing content below that threshold.

The sidebar collapse preference may persist locally per user/device. It is presentation state, not URL state.

## Global sidebar

Order is fixed:

1. Overview
2. Projects
3. My Work
4. People
5. Search

Active destination uses a shape/background plus `aria-current="page"`; color alone is insufficient. User/account and locale controls are anchored at the bottom. Administration, if authorized and later implemented, belongs in the account/utility area—not primary research navigation.

## App header

- Left: narrow-screen menu or current global context.
- Center/flexible: Quick Search button with visible `Ctrl/Cmd+K` hint on desktop.
- Right: `+ New`, locale switcher, account menu.
- Project pages do not duplicate the full Project title in the App header; ProjectHeader owns local context.

## Project header and horizontal navigation

```text
[Project picker ▾]  Project name
                    research lens (one line; expand on Overview)

Overview  Notes  Materials  Activities  Tasks  People  Library?
```

- ProjectHeader remains visible at the top of the route; local tabs may become sticky beneath the App header after the title scrolls, retaining a compact Project name.
- Wide: all available tabs shown.
- Medium: keep the active tab and highest-priority tabs visible; remaining tabs move into a text-labeled `More` menu. Horizontal scrolling is acceptable if it has visible overflow cues.
- Narrow: Project picker plus a current-module selector. Do not squeeze all tabs.
- Library appears only when the workspace DTO says `modules.library`.
- Activities and Tasks are not shown for Core-only outsiders because Stage 16 marks them unavailable.

## Project switching

The Project title opens a searchable Project picker containing only confirmed readable Projects. Each result indicates:

- name and status;
- a short research lens;
- `Work access` or `Research access` in plain language;
- Library availability when relevant.

Switch behavior:

1. Try to preserve the current module (`Notes` → destination `Notes`) when available.
2. Never preserve a selected object across Projects.
3. If the module is unavailable, navigate to destination Project Overview and announce: “This Project is available for research reading; operational work requires Project participation.”
4. Search/filter state scoped to the old Project is cleared.
5. Cancel returns focus to the Project picker trigger.

## Global `+ New`

### Inside a Project

Open a popover/menu titled `New in {Project}` with only server-authorized actions: Note, Material, Activity, Task, Person. Tempo physical/library actions appear only in their relevant workflows, not as generic creation choices.

### Outside a Project

Use a two-step modal:

1. Choose a confirmed Project. Show recent authorized Projects first as assistance, followed by search; recency never changes authorization.
2. Choose an object type allowed by that Project's capability DTO.

Keyboard contract: initial focus on search/first option, arrows move options, Enter selects, Escape cancels, Tab remains within modal, closing restores trigger focus. Loading retains the current step. A Project becoming unavailable yields an inline non-disclosing error and returns to Project choice.

## Quick Search / Command

`Ctrl/Cmd+K` opens one dialog, not a second search engine.

Empty query groups:

- Recent authorized objects
- Readable Projects
- Safe commands (`New…`, `Go to My Work`, locale switch)

Query state uses Stage 16 internal research search and returns Project, Note, Material, and Person results. Commands remain a separate final group. Operational Tasks/Activities/loans and private drafts never enter research results.

Keyboard: Up/Down or `Ctrl+N/P` may move selection; Enter activates; Escape closes; focus returns to the opener. Each item announces kind, title, and Project context. `View all results` transfers query to `/app/search`.

## Breadcrumbs

Use only on deep object routes where they prevent context loss:

```text
Project / Materials / Material title
Project / Activities / Activity title
```

The Note editor may use `Project / Notes` plus title because space is needed for save state. Do not repeat breadcrumbs on Overview/collection pages.

## State preservation

| State | Persistence |
| --- | --- |
| Search query/type/Project facet | URL query parameters |
| Project collection search/filter/sort | URL when shareable; otherwise session history |
| Task list/board choice | URL or per-user local preference |
| Inspector open/closed and selected section | Local/session state per surface; optional shallow URL only for direct support/history links |
| Sidebar collapsed | Local per-device preference |
| Collection scroll/selected preview | Browser history/session state when practical |
| Create modal step | Do not persist |
| Unsaved editor content/version | Draft service state plus local in-flight buffer; never URL/local preference |

## Keyboard baseline

- `Ctrl/Cmd+K`: Quick Search.
- `Escape`: closes the topmost dialog/drawer/inspector context, then restores focus.
- Focus mode: visible button first; an optional documented shortcut may be added after conflict testing with browser/editor shortcuts.
- New item: no hidden shortcut required for first release.
- All shortcuts have visible equivalents and never fire while incompatible editor/dialog focus is active.
