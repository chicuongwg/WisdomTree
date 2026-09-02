# Stage 17.2 App Shell implementation

## 1. Route namespace

The replacement internal shell lives under `/app`:

- `/app`
- `/app/projects`
- `/app/projects/[projectId]` as a minimal future-workspace entry seam
- `/app/my-work`
- `/app/people`
- `/app/search`

The namespace is additive. Existing routes remain unchanged and no redirect points old routes at `/app`.

## 2. Shell structure

`src/app/app/layout.tsx` is the shared server layout. It resolves the authenticated request context once per request and renders one `AppShell` containing a sidebar, quiet utility header, and main landmark. Route pages currently use one small placeholder component and real localized application context; they do not invent domain metrics or workflows.

The repository's root layout still owns the old shell. A route-presence selector in `shell.css` hides that chrome only when `.ui-next-app-root` exists, and a tiny client cleanup removes the old scroll container from the tab order. Old shell markup remains intact for every legacy route. The legacy command palette ignores shortcuts while the new shell is active, preventing two `Ctrl/Cmd+K` dialogs.

## 3. Server/client split

Server:

- authentication and principal resolution;
- `getApplicationContext` and `listAppProjects` through Stage 16;
- shell frame, Project DTO projection, page headings, and placeholder content;
- minimal Project entry resolution through `getProjectWorkspace`.

Client islands:

- route-aware active navigation;
- mobile drawer;
- Quick Search;
- Project-first New dialog;
- account, locale, appearance, and logout controls;
- legacy-shell tab-order cleanup.

Route-level loading and error files reuse Stage 17.1 feedback states. No global client provider or store was introduced.

## 4. Navigation

The explicit route list is Overview, Projects, My Work, People, and Search. Links use normal browser navigation, localized labels, `aria-current="page"`, an active background/border, and an accent inset so state does not depend on color alone. No Project tree, recents, favorites, Graph, Board, Library, or legacy ownership concepts appear in primary navigation.

## 5. Responsive behavior

- Wide: 15rem sidebar, utility header, and one main column.
- Medium at 64rem: 4rem compact sidebar with named inline SVG icons. Labels remain in the accessibility tree and appear visually on hover/focus.
- Narrow at 44rem: sidebar is replaced by a labeled native-dialog Drawer; route selection closes it. The main route becomes one column.

No device-brand dimensions or multi-pane workspace assumptions were added.

## 6. Quick Search

The visible trigger and `Ctrl/Cmd+K` open one Stage 17.1 Dialog. Empty query shows explicit navigation commands only; there is no Recents subsystem. Non-empty queries call the thin authenticated `/api/app/search` adapter, which delegates to Stage 16 `searchAppResearch`, limits results to eight, and removes raw relevance scores. Supported results remain Project, Note, Material, and Person.

Arrow Up/Down changes the active option, Enter navigates, Escape closes through native dialog behavior, and focus returns through the foundation Dialog. “View all results” transfers the query to `/app/search`.

## 7. + New

The global New entry follows the approved outside-Project sequence:

1. choose an authorization-filtered confirmed Project supplied by `listAppProjects`;
2. inspect server-computed creation capabilities;
3. show only permitted object categories.

Actual create routes do not exist in this slice, so permitted category buttons are explicitly disabled and labeled Upcoming. The UI does not call old Space/Team creation, guess a Project, or claim a mutation occurred.

## 8. Account and locale utilities

The account utility shows minimal display identity, VI/EN selection, current light/dark behavior, a link to the existing account screen, and logout. `/api/app/locale` is a thin authenticated adapter over Stage 16 `setApplicationLocale`; server preference remains authoritative and `router.refresh()` updates localized chrome. Theme reuse retains the current `data-theme` and `wt-theme` behavior rather than adding a new engine. Logout retains hard-navigation semantics so cached signed-in layouts are discarded.

## 9. Accessibility

- New skip link targets the sole new main landmark.
- The legacy wrapper is removed from the tab order only while `/app` is mounted.
- Navigation has a localized landmark name and active state.
- Icon-only menu control has a required accessible label.
- Mobile navigation and search use native modal focus containment, Escape, and trigger-focus restoration.
- Search uses combobox/listbox state with `aria-activedescendant`.
- Mutation failures use visible alert text.
- Existing reduced-motion and focus tokens continue to apply.

## 10. E2E isolation findings

OBSERVED: `tests/e2e/global-setup.ts` previously fell back to the normal `wisdomtree` URL and inserted a session row. `scripts/start-e2e.mjs` independently defaulted the web server to the same normal database. Therefore direct `npm run test:e2e` could mutate the developer database.

Both paths now fail closed:

- `TEST_DATABASE_URL` is mandatory;
- the database name must match the existing test-name guard;
- `DATABASE_URL` is set from the validated test URL;
- global setup validates before connecting or inserting a session;
- server startup validates before touching the build/runtime.

Focused unit tests prove rejection when the variable is missing and when it names `wisdomtree`. Playwright was not run because no isolated test URL or Chromium executable was configured.

## 11. Simplicity and maintainability

Eight shell components have one obvious responsibility. Navigation is a five-item literal array rather than a registry. Search commands are explicit local values. Interactive state remains local, and URL navigation owns route state. Two thin HTTP adapters exist only because browser islands need transport. No dependency, provider stack, command registry, generic navigation framework, icon package, or facade wrapper was added.

## 12. Stage 17.3 consumption

Stage 17.3 can replace the Overview and Projects placeholders with `getTmktOverview` and `listAppProjects` content while retaining this shell. Project workspace tabs and deep routes remain Stage 17.4 work. Old routes stay available until the later explicit cutover gate.
