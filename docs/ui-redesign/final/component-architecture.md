# Component architecture blueprint

## Boundary principles

- Server Components/server reads call the Stage 16 application facade.
- Client islands own transient interaction state only.
- Thin mutation endpoints/server actions exist only where browser interaction requires transport.
- No direct domain/DB access from UI components and no global client store by default.
- Share visual/interaction primitives; keep Note, Material, Activity, Person, publication, and circulation semantics explicit.

## Component families

| Component | Responsibility / accepted data | Kind | Likely boundary | Major interaction state |
| --- | --- | --- | --- | --- |
| `AppShell` | Arrange header/sidebar/main from application context | Generic shell | Server wrapper + small client layout state | sidebar width, narrow drawer |
| `GlobalSidebar` | Five fixed destinations | Generic | Server markup/client collapse | active route, collapsed |
| `AppHeader` | Search, create, locale, account utilities | Generic | Mixed | menu/dialog open |
| `LocaleSwitcher` | `locale`, `supportedUiLocales` | Generic | Client mutation island | pending/error |
| `PageHeader` | Page title, description, primary actions | Generic | Server | action availability |
| `ProjectHeader` | `AppProjectDto`, research lens, status/access label | Project-specific | Server | sticky compact state |
| `ProjectNav` | Workspace `modules` | Project-specific | Server links + client overflow | active/overflow |
| `ProjectPicker` | readable Project refs/access summaries | Project-specific | Client dialog/search | query, selection, loading |
| `CreateMenu` | Project capabilities and permitted object actions | Product-specific | Client popover/modal | step, chosen Project/action |
| `QuickSearch` | authorized search results + recent authorized refs + commands | Search-specific | Client island | query, grouping, active result |
| `ContextInspector` | Named domain sections | Shared container | Client layout state; server content | open/section/drawer |
| `FocusMode` | Reduce chrome around Note reader/editor | Note interaction | Client | active, previous layout |
| `ResourceList` | Accessible titled rows | Shared primitive | Server | selection/loading/empty |
| `ResourceTable` | Labeled sortable supported columns | Shared primitive | Server/client sort if URL | sort, responsive form |
| `ResourceCard` | Project/Overview entry summary | Shared primitive | Server | link/action availability |
| `StatusBadge` | Domain state with icon/text | Shared primitive | Server | semantic tone |
| `EmptyState` | Domain message + optional authorized action | Shared primitive | Server | capability-aware action |
| `ErrorState` | Stable application error/recovery | Shared primitive | Mixed | retry/conflict/non-disclosure |
| `LoadingState` | Known structural skeleton/progress | Shared primitive | Mixed | route/action/progress |
| `ConfirmDialog` | Consequence confirmation | Shared primitive | Client | pending, error, focus restore |
| `SaveStatus` | Unsaved/saving/saved/failed/conflict | Note/edit primitive | Client | autosave state machine |
| `NoteReader` | Official Note DTO safe Markdown | Note-specific | Server | inspector/focus entry |
| `NoteEditor` | Draft DTO/editor buffer/expected version | Note-specific | Client island | content, preview, autosave/conflict |
| `EvidenceList` | Exact attached Material/Note versions | Evidence-specific | Server read + client mutations | expanded provenance/removal |
| `EvidencePicker` | Authorized evidence search/version selection | Evidence-specific | Client island | scope/tab/query/selection/preview |
| `PublicationPanel` | `PublicationStatusDto`, `canPublish` | Publication-specific | Client mutation island | confirm/pending/slug/error |
| `MaterialSummary` | Material detail/current representation | Material-specific | Server | section navigation |
| `MaterialVersionList` | immutable versions/current version | Material-specific | Server | download/upload action |
| `MaterialUpload` | File/version create boundary | Material-specific | Client island | validation/progress/retry |
| `PhysicalMaterialPanel` | physical DTO/capabilities | Material-specific | Mixed | attach/edit/pending |
| `ExtractionPanel` | extraction state/candidate result | Extraction-specific | Mixed | processing/failure/evolve |
| `ActivitySummary` | Activity DTO and related collections | Activity-specific | Server | relation dialogs/edit |
| `TaskList` | Project/My Work Task DTOs | Task-specific | Mixed | filters/inline mutation/conflict |
| `TaskBoard` | Same Task IDs grouped by state | Task-specific | Client island | drag/keyboard move/pending |
| `PersonSummary` | canonical Person + visible contexts | Person-specific | Server | edit availability |
| `LibraryLoanList` | loan DTOs and available actions | Library-specific | Mixed | filters/transition pending |
| `LibraryOperatorPanel` | operator roster and manager actions | Library-specific | Client mutation island | eligible picker/grant/revoke |

## Server/client data flow

```text
Server route/page
→ call application facade
→ render DTO and capability-safe links/content
→ hydrate only required client islands

Client mutation
→ thin endpoint/server action
→ application facade mutation
→ stable ApplicationErrorDto
→ refresh affected server data or reconcile returned DTO
```

## Likely client islands

- Quick Search
- Project picker/Create modal
- Note editor/autosave/preview
- Evidence Picker and relation controls
- inspector/focus layout state
- upload/progress
- Task inline controls/board drag-drop
- dialogs and publication/circulation transitions
- locale switcher

## Avoided abstractions

No `UniversalEntityPanel`, `UniversalDomainEditor`, or polymorphic relation manager. A shared inspector container may host explicit `NoteEvidenceSection`, `MaterialVersionsSection`, or `PersonProjectsSection`; it does not erase their domain rules.

## Data refresh rules

- Initial route reads server-render.
- Mutations return authoritative DTOs where available, then narrowly refresh affected server sections.
- Optimism is appropriate for reversible Task view movement only with rollback; not publication, circulation, upload completion, or evidence persistence claims.
- Draft autosave owns its expected version and conflict state.
- No Redux/Zustand/global normalized cache is specified; add only if Stage 17 proves a cross-route state requirement.
