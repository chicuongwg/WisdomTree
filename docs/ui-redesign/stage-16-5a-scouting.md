# Stage 16.5A — UX/UI scouting

## Scope and evidence status

This artifact is a design study, not an implementation specification. It uses the accepted Stage 1–16 contracts, the current UX audit, selected current interaction code, and public product documentation. The old WisdomTree UI is evidence for behavior and pain points only.

Evidence labels:

- **PRODUCT CONTRACT** — accepted WisdomTree domain/application decision.
- **OBSERVED** — present in repository code or the accepted UX audit.
- **PATTERN** — an external interaction pattern worth testing.
- **DESIGN HYPOTHESIS** — requires human selection and later usability validation.

## Current behavior worth preserving

| Behavior | Evidence/use | Replacement requirement |
| --- | --- | --- |
| Autosave and explicit save state | **OBSERVED** in the draft editor | Always show `Saving…`, `Saved`, or a recoverable failure; never imply success early. |
| Optimistic concurrency and conflict recovery | **OBSERVED** in mutation and draft flows | Preserve stale-version failure, comparison, and deliberate recovery. |
| Safe Markdown handling | **OBSERVED** in Markdown primitives | Reading, preview, and publication must use the same safe rendering boundary. |
| Author-private working drafts | **PRODUCT CONTRACT** and **OBSERVED** | Project context must never visually imply that a private draft is shared. |
| Version history and exact provenance | **PRODUCT CONTRACT** | History and evidence are available near the object, but progressively disclosed. |
| Upload progress and durable errors | **OBSERVED** | File operations expose progress, retry, and stable error meaning. |
| Keyboard command/search behavior | **OBSERVED** | Keep keyboard navigation, visible shortcuts, escape, focus restoration, and non-pointer operation. |
| Accessible shell behavior | **OBSERVED** | Retain skip link, semantic controls, visible focus, live status, dialog focus containment, and reduced-motion support. |
| Light/dark compatibility | **OBSERVED** | Concepts remain token-compatible; theme work is not part of this stage. |

## Structures to replace

| Current structure | Why it conflicts with target product | New direction |
| --- | --- | --- |
| Team/Personal auto-switch hierarchy | Makes privacy look like a competing ownership universe. | Project ownership plus explicit private/shared working state. |
| Branch-first browsing and creation | Exposes compatibility storage as a product decision. | Project-first creation; Branch remains internal. |
| Global Library as peer universe | Makes Tempo/library appear separate from Projects. | Conditional Library module inside a capability-enabled Project. |
| Global Board mental model | Hides Task's Project owner. | Project Tasks plus My Work aggregation of the same Task IDs. |
| Multiple overlapping searches | Users cannot predict scope or result type. | One quick search plus one full internal research search workspace. |
| WikiRelease/Proposal as universal publishing language | Does not match stable Note publication revisions. | Public status and explicit Core publish/unpublish on an official Note. |
| Database/service vocabulary | Makes technical storage concepts part of research work. | Material, file/version, physical copy, extracted text, working Note. |
| Raw implementation roles | Confuses present permissions with Core/collaborator concepts. | Capability-shaped actions and plain-language unavailable states. |

## Product pattern scouting

| Pattern | Product/source | Problem solved | WisdomTree relevance | What not to copy |
| --- | --- | --- | --- | --- |
| Project as a bounded study/workspace | [Dovetail Projects](https://docs.dovetail.com/help/projects) | Keeps research artifacts and analysis in a recognizable initiative. | Matches TMKT → Project → work. | Do not isolate canonical People or cross-Project discovery inside separate databases. |
| Quick search plus broader exploration | [Dovetail Search](https://docs.dovetail.com/help/search) | Separates fast retrieval/navigation from deeper browsing. | Supports `Ctrl/Cmd+K` plus a full Search workspace. | Do not create separate search products for each module. |
| Reference picker inside a document | [Dovetail Project Docs](https://docs.dovetail.com/help/projects/docs) | Attaches research without repeatedly leaving the writing surface. | Strong basis for Evidence Picker/drawer. | Do not flatten exact SourceVersion/NoteVersion provenance into mutable links. |
| Stable Project overview with optional details | [Linear Project overview](https://linear.app/docs/project-overview) | Keeps primary Project context visible while details can collapse. | Supports a quiet Project header, local navigation, and optional inspector. | Do not make milestones/progress percentages the dominant research model. |
| Same object in list/board views | [Linear board layout](https://linear.app/docs/board-layout), [display options](https://linear.app/docs/display-options) | Changes work representation without copying objects. | Useful for Project Tasks and My Work. | Do not make every research entity issue-like or status-driven. |
| Global search and in-view find | [Linear Search](https://linear.app/docs/search) | Distinguishes navigation/discovery from local narrowing. | Quick Search retrieves; local search filters the current Project/module. | Do not require shortcut knowledge for basic discoverability. |
| Context-preserving peek | [Linear Peek](https://linear.app/docs/peek) | Lets a user inspect an item without losing their collection. | Useful for Notes, Materials, People, and search results. | Do not make all editing occur in a narrow overlay. |
| Collection/list/detail panes | [Zotero organizing a library](https://www.zotero.org/support/collections_and_tags) | Enables high-throughput browsing with metadata beside the selected item. | Strong basis for Material and evidence workflows. | Do not copy bibliography-only field density or desktop-only assumptions. |
| One item can appear in organizational collections | [Zotero collections and tags](https://www.zotero.org/support/collections_and_tags) | Separates object identity from ways of viewing it. | Reinforces one Task/Material/Person identity across useful views. | Do not confuse Folder/collection membership with Project ownership. |
| Stable typed research objects | [Capacities content types](https://docs.capacities.io/reference/content-types) | Makes Notes, People, and Materials recognizable objects with contextual properties. | Supports object-specific inspectors while keeping stable identity. | Do not replace Project-first IA with object-type-first personal PKM. |
| Collections versus cross-type tags | [Capacities tags versus collections](https://docs.capacities.io/tutorials/tags-vs-collections) | Gives controlled subsets without pretending tags are ownership. | Useful mental model for saved views later. | Do not introduce free-form organization that bypasses authoritative Project ownership. |
| Same data, multiple configured views | [Notion database views](https://www.notion.com/help/views-filters-and-sorts) | Adapts a collection to list, table, board, or gallery tasks. | Supports list/board Tasks and list/table Materials without duplicates. | Do not copy blank-canvas ambiguity, unlimited properties, or nested sidebar sprawl. |
| Side peek versus full-page detail | [Notion view settings](https://www.notion.com/en-gb/help/views-filters-and-sorts) | Balances quick inspection and focused work. | Supports inspector/peek for metadata, then full focus mode for writing. | Do not make interaction mode unpredictable per arbitrary user configuration. |
| Cards on optional visual whiteboards | [Heptabase product overview](https://heptabase.com/), [official help](https://support.heptabase.com/en/articles/14715462-how-to-use-heptabase-cli) | Lets researchers spatially arrange stable notes and sources. | A later synthesis view may help sense-making. | Do not put Graph/whiteboard in primary navigation or make spatial arrangement required. |

## Repository-informed IA findings

1. **One shell, two levels.** Global destinations answer TMKT-wide questions; local Project modules answer work-in-context questions.
2. **Project context must be unmistakable.** A persistent Project title/lens or compact context marker prevents accidental cross-Project capture.
3. **Creation is context-sensitive.** One visible `+ New` entry is preferable, but it must require or inherit a confirmed Project and show only capability-authorized actions.
4. **Quick Search and full Search are complementary.** Quick Search is a command/navigation layer. Full Search is a filterable research result workspace.
5. **Inspector is optional.** It provides metadata, evidence, versions, and publication status without permanently shrinking the reading canvas.
6. **Focus mode is a first-class state.** It hides global chrome and the inspector while keeping a compact route back to Project context and evidence.
7. **Operational and research aggregation stay separate.** My Work aggregates a user's authorized Tasks; Core's cross-Project research read does not aggregate other Projects' Tasks or Activities.

## Typography and internationalization evidence

- Unicode encodes characters, not fonts or guaranteed glyphs; the Unicode Standard explicitly separates encoding from glyph presentation ([Unicode core specification](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-2/)).
- Rare ideographs occupy supplementary planes; Extension B alone is in the Supplementary Ideographic Plane ([Unicode SIP roadmap](https://www.unicode.org/roadmaps/sip/)). A BMP-only or ordinary system font test is insufficient for Hán-Nôm assurance.
- Noto Sans CJK is a useful Pan-CJK family, but no Stage 16.5A artifact claims that it covers every historical or supplementary Hán-Nôm character ([Google's Noto CJK overview](https://developers.googleblog.com/noto-a-cjk-font-that-is-complete-beautiful-and-right-for-your-language-and-region/)).
- User-authored mixed-direction content needs explicit base-direction handling; W3C internationalization guidance recommends directional metadata where the bidi algorithm needs context ([W3C internationalization best practices](https://www.w3.org/TR/xml-i18n-bp/)).

The resulting concrete typography contract is in `multilingual-ui-content.md`.

## Design conclusion from scouting

No single reference product fits WisdomTree. Project orientation should be stable and approachable like the strongest workspace products; evidence and Material context should borrow from professional research tools; dense three-pane work should be available only where it materially helps. Spatial/Graph interaction is a secondary research view, not an application skeleton.
