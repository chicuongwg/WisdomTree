# Product quality adjustments — 2026-09-14

## Product model

Project-first research workspace with capability-based access. Personal Projects are owner-only; shared Projects separate research access from operational membership. Authenticated Users and canonical research Person records are different objects.

Materials retain original sources and immutable versions. Notes are working drafts with separate official versions and public revisions. Extraction candidates feed working notes; evidence is attached version-specific support, not a new generic content object. Activities connect research context; Tasks define assigned actions and dates. Independent deadlines are intentional domain entities. The Research Map visualizes research relationships, not every operational task.

## Findings and resolutions

- P0: removing or demoting the final shared-Project manager could strand normal administration. Membership mutations now lock the parent space and reject the last-manager change; the UI explains and disables these actions. This does not implement automatic succession or change account-disable policy.
- P1: inconsistent page spacing came from duplicate container padding and legacy form layout leaking into shared toolbars. Shared gutters and headers now apply across global and project workspaces; forms in inline toolbars explicitly use a horizontal layout with controls aligned at their bottom edge.
- P1: the desktop sidebar consumed a fixed expanded column and offered no user control. It can now collapse to the existing icon-rail width, retains accessible link names and focus behavior, and persists the preference without a post-load layout flash. Existing tablet icon-rail and mobile drawer behavior remain unchanged.
- P1: every application route rebuilt Project capability DTOs with several authorization queries per Project. The shell Project list now loads memberships, Library capabilities, Library operators and publication capability in four batched access queries after the authorized Project query. Exact Project routes still perform their individual authorization check; the optimization does not broaden access or cache permissions across requests.
- P1: Create looked like five competing submit buttons and arbitrarily emphasized Notes. It now presents equal-weight navigation/action rows with concise object purposes, selected Project context and a separate Change Project action. Only the actual note submission is a primary commit action. Other rows honestly open their existing creation workspaces.
- P1: account preferences used incompatible stacked/inline layouts and disconnected sign-out placement. Both preference rows now align; identity and sign-out have explicit boundaries. Escape dismisses and restores trigger focus; outside pointer interaction dismisses the nonmodal popup.
- P1: browser zoom exposed compressed administration fields and hidden-looking Task views. Administration creation forms now use the reading-width pattern. Task navigation retains List/Kanban and adds a scoped Calendar destination; intermediate CSS viewport widths model zoom-induced layout changes without claiming a physical-browser zoom certification.
- P1: English content could retain Vietnamese document language because a pre-hydration script was overwritten by hydration. The hydrated header now synchronizes document language with the actual application locale.
- P1: admin enable/disable labels described state rather than the action about to happen. They now say Enable account / Disable account. Role controls identify the account; pending operations disable conflicting roster actions. Form elements are captured before asynchronous work, avoiding a null event.currentTarget reset after successful creation.
- P1: People could imply invitations. Navigation, creation, search and graph labels now say Person records / Hồ sơ người and distinguish research identities from account membership.
- P1: My Work linked to a task collection rather than the selected task and lacked its main heading. It now opens the exact task detail, with an explicit route into the actionable task workspace.
- P1: a selected-task query could expose editing controls to a read-only task viewer. Selection now checks the Task edit capability, the detail link only selects editable tasks, and Calendar opens exact task details rather than an editor query. Selection is consumed once so closing a dialog is not undone by subsequent refreshes. The backend edit policy is retained and tested independently.
- P1: task creation could leave the rendered list stale even after successful persistence. The mutation invalidates the Project task list, My Work and Calendar. The list immediately includes the confirmed API result while refresh completes and deduplicates by ID against server records; this is not speculative creation. Browser regression requires the task to appear without a manual reload.
- P1: Calendar Today discarded the selected view and Project. It now retains both. Crowded dates show a bounded preview and a keyboard-operable disclosure rather than unbounded cell content.
- P1: a broad membership-row span rule overrode button-label colors and shrinking actions wrapped destructive labels. The selector now targets metadata only and the action group retains its width.
- P1: sparse graphs could appear broken and auto-fit magnified a single node. Onboarding explains missing relationships without removing the graph; single-node fitting uses a bounded zoom.
- P2: Quick Search offered no useful blank-query navigation and used an external-link glyph for internal routes. It now offers eight destinations; full Search retains research filtering and retrieval.
- P2: Quick Search repeated workspace text on every command and reserved blank status space. Commands are compact destination rows, status announcements remain live without empty layout space, and the full-search action has a separated footer.
- P2: button variants lacked consistent pressed feedback and danger-hover treatment. Shared buttons now expose default, hover, visible keyboard focus, pressed, disabled and loading feedback; busy buttons prevent repeated submission and use a progress cursor. These are interaction states, not additional visual variants. Reference: [Figma button states](https://www.figma.com/resource-library/button-states/).
- P2: Notifications nested a bordered row inside another bordered surface and rendered generated mention text in Vietnamese in English mode. The extra wrapper is removed and mention copy follows the locale. Unavailable notifications explicitly explain that no safe destination is available.
- P2: generic Search was inaccurately labeled Continue research. It now says Explore research rather than inventing recent-work behavior.
- P2: theme controls obscured current state. A Light/Dark select shows the persisted state; unsupported System mode was not invented.
- P2: research-focus labels and capability copy exposed unclear semantics. Descriptions now explain the field and list available actions from actual capability DTOs. Project Settings remains gated by both backend policy and UI capability.
- P2: locale drift included task/person terminology, member roles, graph controls and the product-generated personal-workspace placeholder. Known generated text is localized; arbitrary user content is preserved. Default date formatting uses the application's configured timezone.

## Shared styling rules

- Application PageContainer uses the full available canvas with 32px desktop gutters and 16px mobile gutters. Research prose and focused forms retain local reading-width constraints; application headers and operational workspaces no longer inherit a centered page-width ceiling.
- Note editing defaults to simultaneous Markdown and live rendered preview. Desktop panes share the canvas; at 900px and below they stack. Write-only and preview-only modes remain optional, with explicit pressed state. Preview uses local editing state and the existing Markdown renderer, independent of autosave success.
- Note toolbar separates draft identity/save state from actions; the commit action sits at the trailing edge rather than competing with a cluster of badges.
- PageHeader owns title, description and page-level action placement. Global titles are H1; project-local module titles are H2 beneath project identity. Long titles wrap rather than overflow.
- Inline owns toolbar direction and wrapping. Toolbar forms align labeled controls at the bottom; fields cannot exceed available width.
- Header utility controls retain their intrinsic width rather than intruding into Search. Project metadata uses a bounded reading-width form, not a four-column filter-bar layout.
- Existing spacing, neutral borders, green primary actions and visible focus tokens remain the source of truth. No new visual language or card-heavy dashboard was introduced.
- Choice lists describe destinations; primary buttons commit actions. Popup identity/context, preferences and session actions are visibly grouped.

## Lessons applied to the review

- Minimalism means clear relationships and deliberate hierarchy, not merely fewer borders or colors.
- Diagnose inherited layout and selectors before adding page-specific padding fixes.
- Equal options should have equal emphasis; navigation must not look like a committed mutation.
- Check long labels and real data, not only attractive short placeholders.
- A viewport-fit assertion does not establish good placement, density or visual hierarchy. Inspect screenshots after exercising the interface, with a stable scroll position.
- Validate submission through persistence and the refreshed UI, not only a closed dialog. Validate overflow by opening the disclosure, not by requiring every hidden event to be visible initially.

## Materially changed areas

### Administration readability and density follow-up

Administration no longer stretches task-oriented surfaces across arbitrarily wide screens. Its workspace is start-aligned and bounded to 90rem, with two columns from 80rem and a single column below; Project and account forms remain locally bounded. Roster regions are capped at 32rem with named, keyboard-focusable scrolling so large fixtures do not bury operational information beneath hundreds of rows. Status surfaces align to content rather than matching the audit panel height.

Common audit event codes now have plain-language VI/EN descriptions, actor and application-timezone date/time. Original event codes remain in an expandable technical detail; unmapped actions get an honest generic description, not a guessed meaning. Operational labels and the known `not_configured` backup state are localized. No audit storage, capability or account mutation policy changed.

Verification: `npm test` passed for the initial admin changes; final roster/time adjustments passed lint/typecheck and diff checks. Isolated Chromium reviewed VI/EN at 2560/1440/1024/768/390px with bounded content, no document overflow, visible timestamps and expandable original event codes. Screenshots were inspected, including the short status panel beside the longer audit panel. Administration mutations were not exercised again, and no new production build/full E2E run is claimed for this layout/copy follow-up.

### Popup selection separation follow-up

Create now separates the selected Project context from the content-type heading. Every content-type and Project choice has a visible resting boundary, concise title/description hierarchy and hover/pressed feedback; keyboard focus remains governed by the shared focus primitive. Quick Search uses row separators rather than bordered cards. The Account destination has a distinct hit area and hover feedback. Mention suggestions have row separation and pointer hover in addition to keyboard-selected feedback. Material, Activity, Task, Calendar and conflict form action groups now receive a shared separator; both Note-creation entry points use an explicit shared action footer.

Source inspection also covered Evidence selection/version choices, publication confirmation, Person creation, the shared Dialog/Drawer and graph context menu. Existing Evidence option borders/selected state and graph menu hover/focus treatment were retained rather than restyled unnecessarily. This is a scan of the target application's popup family, not certification of every legacy wiki interaction.

Verification: the existing `npm test` suite passed after shared choice/menu/form-group changes. Create, Quick Search and Account were exercised in isolated Chromium in VI/EN at 1440/390px, including the Note-choice transition, Escape/focus return, and no document overflow. Create desktop/mobile screenshots were visually inspected. The final Note-footer class adjustment was checked with lint/typecheck and formatting/diff checks; no full production E2E or assistive-technology rerun is claimed for this popup follow-up. Mention suggestions and all form-specific submit flows were inspected in source, not all individually exercised in this follow-up.

### Person directory follow-up

The directory now explains the intended research workflow: record a person, link them as an Activity participant with a role, and return through the person detail to related authorized Projects and Activities. Creation is a deliberate header/empty-state action rather than a permanently open form. The shared dialog provides labeled name/description fields, submission loading/error feedback and Escape/focus-return behavior. Successful creation updates the confirmed list and exposes record/Activity next steps. Populated directories use flat rows, local name/description filtering and explicit context links instead of generic Project cards. Both VI and EN copy distinguish these records from invitations.

Verification for this follow-up: `npm test` passes, including lint, typecheck, all 20 existing unit files and the boundary/signing/time/contrast checks. Isolated Chromium interactions passed creation, immediate display, reload persistence, filtering, exact detail navigation and Escape focus return. VI/EN layouts at 1440/1024/768/390px had no document overflow or page errors; desktop and mobile screenshots were inspected. No production build or full E2E rerun is claimed for this directory-only follow-up.

Remaining directory limitation: reuse/attachment of an existing accessible Person into another Project is supported by the domain service but is not exposed by this page's current creation API. It is not safe to reuse a Person merely by matching names: different people can share a name, and hidden-scope records must not be exposed. This follow-up does not add identity matching or claim to solve duplicate identity management. Relation counts are not fabricated from the directory's name/summary DTO; authorized relationships remain available on the existing detail page.

Shared layout primitives, styles.css, shell.css, governance.css and calendar.css; AppSidebar, CreateDialog, AccountMenu, AppearanceToggle and QuickSearch; Calendar and My Work; project Materials, Activities, Tasks, People and Settings headers; Project Overview and task details; KnowledgeMap and GraphSettingsPanel; VI/EN catalogs and date formatting; batched Project-access resolution and storage membership service; focused unit, integration and browser regressions.

## Verification and limits

Existing lint, type checking, unit, architecture-boundary, signing, timezone and contrast checks pass. Isolated production build passes. The latest stateful validation passed all 29 integration files against a freshly migrated and seeded PostgreSQL fixture; earlier validation also passed 3 use-case files and 2 privacy files.

Browser coverage includes administrator/contributor access, VI/EN, 1440/1280/1024/768/390px plus 960/720/640px zoom-equivalent widths, populated and empty Projects, persisted desktop sidebar collapse, creation and retrieval, List/Kanban/scoped Calendar navigation, calendar overflow, graph, dialog keyboard operation, theme persistence, button states and capability boundaries. The final uninterrupted Chromium run passed 26/26 tests in 1.5 minutes.

An isolated production-build interaction benchmark navigated Notes, Materials, Activities and Tasks seven times with a 101ms median click-to-visible time and a 427ms maximum. Each visited module issued one route response per visit; additional observed Project-detail responses were Next.js link prefetches. These figures validate the local production path, not the user's development server or network. Development-mode first visits still include route compilation, and no claim is made that all repeated dev-log requests share one cause.

Screenshot review was kept separate from automated layout assertions. Ten production-build screenshots covering Settings, People, Calendar, sparse Graph, Create, Account at desktop/mobile, Administration at 720px, Quick Search and Notifications passed manual review with zero page errors or failed static assets.

Latest follow-up: `npm test` passes after the shared full-canvas and note-toolbar adjustments. Live split preview was manually exercised in an isolated dev server at 1440/1024/768/390px: headings rendered while typing, both desktop panes were 648px wide, and no document overflow occurred. The 26-test production regression and successful build above cover the initial split-preview implementation, before the final full-canvas CSS follow-up; they are not presented as a production-build rerun of that last CSS adjustment.

Remaining limits: this is not a human screen-reader certification or first-time-user study, nor proof of every legacy wiki route or third-party extraction/publishing integration. Automatic manager succession and account-disable policy require a product/security decision; changing them would alter authorization semantics. The generic dashboard has no fabricated recent-work history. No deployment, push or production database change is implied.

Unresolved existing mention: read-only normal-database inspection found a comment.created notification anchored to a legacy tree_node outside any confirmed Project. The current target resolver intentionally exposes only current authorized Project destinations. No fallback, invented association or automatic migration was added: confirming the legacy object's Project ownership and access is required before it can safely gain a target-app link. Authorized Project notification navigation remains covered by the existing browser deep-link regression.

Cleanup note: the disposable databases `wisdomtree_test_quality_20260913`, `wisdomtree_test_ux_20260913` and `wisdomtree_test_perf_20260914` remain because automated approval rejected database deletion as irreversible. They are explicitly test-named and were not used as production data. The normal database was inspected read-only for the unresolved legacy mention and was not seeded or modified.
