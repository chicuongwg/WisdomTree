# Stage 1 — Current → Target Domain Refactor Map

Audit baseline: repository HEAD `c60620f`, inspected 2026-09-01. This is an architecture audit, not a schema or UI proposal.

Evidence labels used throughout:

- **OBSERVED** — directly implemented or enforced in the repository.
- **INFERRED** — architectural consequence of observed implementation plus the supplied target model.
- **PRODUCT DECISION** — supplied in the Stage 1 product brief; it is not inferred from code.
- **UNKNOWN** — repository evidence and the supplied product truth do not determine the answer.

## 1. Executive assessment

### How large is the required refactor?

| Area | Size | Assessment |
| --- | --- | --- |
| Database/schema | **HIGH** | **OBSERVED:** `Space` already scopes sources, team branches, deadlines and releases, so the database is not a rebuild. However Tasks have no `space_id`; personal branches explicitly have no `space_id`; Activity, canonical Person and public-version pointers do not exist. Evidence: `src/modules/storage/schema.ts:18-52`, `src/modules/knowledge/schema.ts:24-68`, `src/modules/pm/schema.ts:8-74`. |
| Domain model | **VERY HIGH** | **OBSERVED:** the current core is Space + Personal/Team Branch + Node + Proposal. **PRODUCT DECISION:** the target core is TMKT → Project → Notes/Materials/Activities/Tasks/People, with evidence and synthesis distinguished and public publication independent of internal editing. These are different organizing models. Evidence for current model: `docs/architecture.md:20-50`, `src/modules/knowledge/schema.ts:24-160`. |
| Service/application layer | **HIGH** | **OBSERVED:** the service layer is well separated from delivery code, but most knowledge, task, deadline, search and publication services encode the old scopes. The boundary is reusable; many policies inside it are not. Evidence: `docs/architecture.md:6-18`, `scripts/boundaries.test.ts:1-55`, `src/modules/knowledge/service-queries.ts:30-47`, `src/modules/pm/service.ts:272-297`. |
| Authorization | **HIGH** | **OBSERVED:** one authorization catalog and cached memberships are strong foundations, but permissions combine global roles, membership ranks, Personal ownership and Admin/Op break-glass behavior. Collaborator/Core/Public Reader do not map one-to-one. Evidence: `src/modules/auth/authorize.ts:12-91`, `src/modules/auth/authorize.ts:109-153`, `src/modules/auth/principal.ts:3-17`. |
| Frontend routing | **HIGH** | **OBSERVED:** routes are module-first (`/library`, `/tree`, `/board`, `/deadlines`, `/review`, `/vault/review`) and the authenticated shell loads knowledge scope globally. A Project-first application and anonymous public surface require new route composition plus compatibility paths. Evidence: `src/app/layout.tsx:51-105`, `src/app/components/shell-sidebar.tsx:10-13`, `src/app/components/shell-sidebar.tsx:123-173`. |
| Information architecture | **VERY HIGH** | **PRODUCT DECISION:** users start at TMKT → Project. **OBSERVED:** current navigation starts from technical feature families and a Team/Personal switch. This is the largest user-facing conceptual change. Evidence: `src/app/components/shell-sidebar.tsx:123-173`, `src/app/components/shell-sidebar.tsx:197-258`, `src/app/components/shell-rail.tsx:275-320`. |
| UI components | **MEDIUM** | **OBSERVED:** generic mutation/error handling, Markdown, comments, forms, tables and graph rendering are reusable implementation pieces. Page compositions and selectors expose Space/Branch/Personal/Team and must be recomposed. Evidence: `src/lib/use-mutation.ts:42-121`, `src/lib/markdown-core.ts:1-26`, `src/app/tree/node/[id]/page.tsx:92-292`. |
| Public publishing | **VERY HIGH** | **OBSERVED:** `/wiki/:id/:slug` requires a logged-in user and reads the live Node. Releases are authenticated, whole-Space immutable snapshots with no anonymous reader route. The target needs a per-note public version that remains stable while internal edits continue, plus unpublish/republish and SEO. Evidence: `src/app/wiki/[id]/[[...slug]]/page.tsx:7-25`, `src/modules/export/service.ts:161-187`, `src/app/wiki/releases/page.tsx:10-24`. |

**Executive conclusion:** this is not a reskin and not a database rewrite. It is a **high-to-very-high domain/application refactor over reusable infrastructure**. The safest boundary is to retain the modular monolith, persistence/service discipline, storage/version/audit foundations and concurrency controls, while replacing Project context, knowledge purpose, people/activity relationships and public publication semantics in layers.

## 2. Current domain model

### Implemented entity map

```text
User ──< Session
  │
  ├──< SpaceMember >── Space(team | personal)
  │                         ├──< Folder ──< Source ──< SourceVersion ──< TextChunk
  │                         │                    │              └── 0..1 ExtractionCandidate
  │                         │                    └── 0..1 SourcePhysical ──< LoanTicket
  │                         ├──< Deadline ──< DeadlineLink >── Task | Source | TreeNode
  │                         └──< WikiRelease
  │
  ├── owns Personal Branch ──< TreeNode ──< TreeNodeVersion
  │                                  │
  │                                  └── publication Proposal ──> Team Branch in Space
  │
  └── authors/handles Tasks, Drafts, Proposals, Comments, Notifications, AuditEvents

Space ──< Team Branch ──< TreeNode
                           ├──< NodeDraft
                           ├──< Node/Translation Proposal
                           ├──< Translation / TranslationVersion
                           ├──< NodeLink >── TreeNode
                           ├──< NodeTag >── Tag
                           └──< Promotion >── SourceVersion

Task is global and has no Space foreign key.
Presence is keyed by User + opaque pageKey.
```

**OBSERVED:**

- Authentication identity is `users`; membership is a join from User to Space with `viewer | contributor | manager`. Evidence: `src/modules/auth/schema.ts:5-31`, `src/modules/storage/schema.ts:18-52`.
- `Source` is always Space-scoped, versioned, extractable and optionally extended by one physical-item row. Evidence: `src/modules/storage/schema.ts:79-174`, `src/modules/storage/schema.ts:176-203`.
- Team Branches belong to exactly one Space; Personal Branches belong to one User and are prohibited from carrying a Space. Evidence: `src/modules/knowledge/schema.ts:24-60`, `drizzle/0031_knowledge_space_scope.sql:38-49`.
- Node is one undifferentiated Markdown content entity. Its state combines verification, public-export eligibility, protection and archival/canonical merge. Evidence: `src/modules/knowledge/schema.ts:62-92`.
- Node Versions are append-only snapshots; Drafts are per-author working copies for Team Nodes; Proposals cover protected changes and Personal-to-Team promotion. Evidence: `src/modules/knowledge/schema.ts:94-160`, `src/modules/knowledge/schema.ts:227-264`, `drizzle/0001_v1_schema_parity.sql:48-62`.
- Tags are global. Links are many-to-many typed Node relationships. Promotions connect SourceVersion evidence to an approved NodeVersion. Evidence: `src/modules/knowledge/schema.ts:266-320`.
- Deadlines are Space-scoped; Tasks are global. DeadlineLink is a polymorphic relation to Task, Source or TreeNode. Evidence: `src/modules/pm/schema.ts:8-74`.
- Comments can anchor only Source, TreeNode or Deadline. Notifications are per User. Presence uses an opaque page key rather than a domain foreign key. Evidence: `src/modules/notify/schema.ts:8-71`.
- WikiRelease is an immutable whole-Space artifact; AuditEvent is append-only and cross-domain. Evidence: `src/modules/export/schema.ts:6-27`, `src/modules/audit/schema.ts:4-22`.

### Manipulation surfaces

**OBSERVED:** App Router pages and API handlers call services rather than tables directly. Space/member APIs call storage services; task/deadline APIs call PM; branch/draft/publication APIs call knowledge; upload/candidate APIs call storage; release APIs call export. Evidence: `src/app/api/spaces/route.ts:1-20`, `src/app/api/tasks/route.ts:1-13`, `src/app/api/deadlines/route.ts:1-22`, `src/app/api/tree/branches/route.ts:1-30`, `src/app/api/tree/drafts/route.ts:1-23`, `src/app/api/source/upload/route.ts:8-41`, `src/app/api/spaces/[spaceId]/wiki/releases/route.ts:1-25`.

## 3. Target domain model

This is conceptual only; it does not prescribe tables or routes.

```text
TMKT
└──< Project
    ├──< Project participation >── Person
    ├──< Note
    │   ├── Evidence/Research Note
    │   │   └── provenance: recorder, time, place, context, original content
    │   └── Synthesis Note
    │       └── supported by many Notes and/or Materials
    ├──< Material ──< Material revision/extraction
    ├──< Activity
    │   ├── participants/subjects >── Person
    │   ├── related Notes and Materials
    │   └── follow-up Tasks
    ├──< Task ── optional Activity
    ├──< Project milestone/deadline
    └── project context: purpose/lens, collaborators/core members, progress, outputs

Authentication User ── 0..1 link ── Person

Internal Note ──< Public Publication
                  └── points to one immutable Note version at a time

Notes and Materials may support multiple syntheses.
Notes may relate across Projects; relationship does not imply duplication.
Tempo is a Project with the same base model plus SourcePhysical/Loan operations.
```

**PRODUCT DECISION:** Project is the primary internal context. Evidence notes and synthesis notes are different in purpose; synthesis never overwrites evidence. Person is TMKT-wide and is not necessarily an authenticated User. Public readers are anonymous, and the public version must be decoupled from ongoing internal edits.

**UNKNOWN:** whether TMKT itself requires a persisted organization row or can remain an implicit single-tenant root; whether Project outputs need a separate entity; and whether Collaborator/Core are TMKT-wide, Project-specific, or both.

## 4. Current → Target mapping table

Each row has exactly one primary classification.

| Current concept | Current meaning | Target concept | Classification | Why | Migration risk |
| --- | --- | --- | --- | --- | --- |
| User | Google-invited login identity and global role holder | Authentication User | **KEEP** | Auth identity already has the right purpose; it must not become the canonical research Person. `src/modules/auth/schema.ts:5-17` | Low |
| Session | Revocable server-side login session | Auth Session | **KEEP** | Independent of product IA and already scoped through Principal. `src/modules/auth/schema.ts:21-31`, `src/modules/auth/session.ts:38-72` | Low |
| Global role (`user/editor/admin_op`) | System-wide vertical permission tier | System operator plus contributor/curation capability input | **ADAPT** | `editor` is global while Core behavior may be Project-specific; `admin_op` remains operationally distinct. `src/modules/auth/authorize.ts:17-20`, `src/modules/auth/authorize.ts:61-72` | High |
| Space | Team or personal storage/membership boundary | Project technical foundation | **ADAPT** | Team Space already owns many Project objects, but lacks Project metadata and does not own Tasks or Personal Notes. `src/modules/storage/schema.ts:18-52` | High |
| Personal Space type | One private Space per User, used by seeded personal materials | Transitional private-storage container | **DEPRECATE** | It cannot be relabeled Project and duplicates Personal Branch ownership. `drizzle/0000_init.sql:41-55`, `scripts/db/seed.ts:90-118` | High |
| SpaceMember | Viewer/contributor/manager membership | Project participation and capability | **ADAPT** | Strong join foundation; role vocabulary and relationship to canonical Person/Core need change. `src/modules/storage/schema.ts:32-52` | High |
| Folder | Hierarchical filing within one Space | Project Material folder | **KEEP** | Matches a genuine material-organization need and is already Project-bound through Space. `src/modules/storage/schema.ts:54-68` | Low |
| Category | Global flat Source taxonomy | Material type/category | **ADAPT** | Reusable classification, but global governance and relationship to Project/public categories are undecided. `src/modules/storage/schema.ts:70-77` | Medium |
| Source | One Space-owned digital or physical material record | Project Material / research source | **ADAPT** | Good material base; one-Space ownership and limited evidence APIs do not yet support broad cross-project research reuse. `src/modules/storage/schema.ts:79-101` | High |
| SourceVersion | Immutable-ish file revision metadata and object-store pointer | Material revision/original artifact | **KEEP** | Directly supports original-content retention and later citation. `src/modules/storage/schema.ts:103-137` | Low |
| TextChunk | Append-only extracted page/paragraph text | Extracted evidence segment | **KEEP** | Strong provenance/search foundation; original file remains separate. `src/modules/storage/schema.ts:139-153`, `drizzle/0000_init.sql:110-135` | Low |
| ExtractionCandidate | One extracted Markdown candidate forced into the uploader's Personal Branch | Project-context research capture/import | **ADAPT** | Extraction is reusable; forced Personal destination and loss of explicit Project note context are not. `src/modules/storage/candidates.ts:12-18`, `src/modules/storage/candidates.ts:138-177` | High |
| Source trustStatus | Source-wide unknown/candidate/trusted/rejected/archived state | Material review/trust metadata | **UNKNOWN** | Target truth requires provenance, not this exact workflow; live use is insufficient to confirm retention. `src/modules/storage/schema.ts:88-100` | Medium |
| SourcePhysical | Optional 1:1 shelf extension to Source | Tempo physical-library extension | **KEEP** | Clean optional specialization lets Tempo retain normal Project Materials plus physical operations. `src/modules/storage/schema.ts:176-203` | Low |
| LoanTicket | Borrow/approve/hand-over/return lifecycle | Tempo circulation record | **KEEP** | Complete specialized state machine with audit and notifications. `src/modules/circulation/schema.ts:10-32`, `src/modules/circulation/service.ts:163-239` | Low |
| Branch | Hierarchical knowledge container and visibility/publish path | Transitional Note organization/category | **DEPRECATE** | Users should not need Branch; it currently owns hierarchy, scope, URLs and editing behavior, so compatibility is needed during migration. `src/modules/knowledge/schema.ts:24-60` | Very high |
| Branch Personal/Team scope | Personal owner privacy versus shared Space membership | Private working state versus Project-owned Note | **DEPRECATE** | It mixes ownership, authorization, hierarchy, editing and promotion into one flag. `src/modules/knowledge/service-queries.ts:30-47`, `src/modules/knowledge/service-mutations.ts:265-287` | Very high |
| TreeNode | One Markdown page with no evidence/synthesis kind | Note | **ADAPT** | Content/version/link foundations fit, but Project, note purpose and research context are incomplete. `src/modules/knowledge/schema.ts:62-92` | Very high |
| TreeNode verification | no_source/unverified/verified/archived plus publish flag | Evidence/curation status separate from archive/publication | **ADAPT** | Current state mixes evidence quality, lifecycle and public eligibility. `src/modules/knowledge/schema.ts:76-83` | High |
| TreeNodeVersion | Append-only complete Node snapshot | Note Version | **KEEP** | Matches internal history and can anchor a public version. `src/modules/knowledge/schema.ts:94-124`, `drizzle/0035_wiki_drafts.sql:34-75` | Low |
| NodeDraft | Per-author private Team working copy with optimistic base/draft versions | Internal Note draft | **KEEP** | The mechanism already supports ongoing work without changing the official internal Note. `src/modules/knowledge/drafts.ts:139-180`, `src/modules/knowledge/drafts.ts:214-270` | Medium |
| Change Proposal | Protected Team edit snapshot and independent decision | Optional curation/review request | **ADAPT** | Review remains useful, but role mapping and coupling to verification/publication must change. `src/modules/knowledge/schema.ts:126-160`, `src/modules/knowledge/service-mutations.ts:555-681` | High |
| Publication Proposal | Copy Personal Node into a new Team Node | Transitional internal contribution flow | **DEPRECATE** | It is internal promotion, not public publishing, and duplicates the Note. `src/modules/knowledge/publication.ts:119-228`, `src/modules/knowledge/publication.ts:400-487` | Very high |
| Translation | Separate English content/version/proposal lifecycle | Optional localized Note/Public content | **UNKNOWN** | Implementation is substantial, but target truth does not establish translation priority or required workflow. `src/modules/knowledge/schema.ts:162-225` | Medium |
| Tag / NodeTag | Global reusable label applied many-to-many to Nodes | Cross-project topic/tag | **KEEP** | Global tags already support discovery across visible Projects. `src/modules/knowledge/schema.ts:283-304` | Low |
| NodeLink | Typed related/supports/contrasts/part_of Node edge | Note relationship / evidence relationship input | **ADAPT** | Schema is cross-project-capable, but services forbid Team cross-Space targets and types do not fully express source evidence/citation. `src/modules/knowledge/schema.ts:266-281`, `src/modules/knowledge/service-mutations.ts:244-262` | High |
| Promotion | SourceVersion → approved NodeVersion provenance | Evidence/citation association | **ADAPT** | Durable version-level provenance is valuable, but current application normally attaches at most one extraction source and cannot connect arbitrary Notes/Materials many-to-many. `src/modules/knowledge/schema.ts:306-320`, `src/modules/knowledge/publication.ts:182-217` | High |
| Node `publish` boolean | Live-node eligibility for release; sometimes set automatically by verified review | Legacy publication eligibility | **DEPRECATE** | A boolean cannot identify the public version, and current updates conflate verification with publication. `src/modules/knowledge/schema.ts:76-81`, `src/modules/knowledge/service-mutations.ts:610-622` | Very high |
| WikiRelease | Immutable whole-Space Markdown/XML/Git snapshot | Release/integrity artifact; possible public delivery input | **ADAPT** | Useful immutable projection, but not the per-Note publication pointer or anonymous site. `src/modules/export/service.ts:161-242`, `src/modules/export/schema.ts:6-27` | High |
| Legacy full-tree export | Admin export of all non-archived Nodes | No required target product concept | **REMOVE** | It exports unpublished internal state flags and is separate from scoped releases; retain only if operations confirms an external consumer. `src/modules/export/service.ts:74-141` | Medium |
| Task | Global shared-board work item with assignee, dates and optional unvalidated target | Project Task, optionally linked to Activity | **ADAPT** | State machine is reusable; Project and Activity relationships are missing and Board assumes global visibility. `src/modules/pm/schema.ts:55-74`, `src/modules/pm/service.ts:272-297` | Very high |
| Task state | todo/doing/done/archived | Task status | **KEEP** | Independent of Board layout and adequate as a minimal workflow state machine. `src/modules/pm/schema.ts:55-59` | Low |
| Deadline | Space-scoped typed date with reminders | Project milestone/deadline | **ADAPT** | Already Project-like; semantic overlap with Activity dates and Task due dates must remain separate until product decides. `src/modules/pm/schema.ts:8-26` | Medium |
| DeadlineLink | Deadline-to-Task/Source/Node polymorphic link | Milestone relationships | **ADAPT** | Useful relationship shape, but lacks referential integrity and the current form does not write links. `src/modules/pm/schema.ts:28-40`, `src/modules/pm/service.ts:89-145`, `src/app/components/deadline-form.tsx:58-70` | High |
| CalendarToken / ICS | Bearer-token feed for visible Space deadlines | Calendar subscription fallback | **KEEP** | Secure read-only export remains useful even if Google Calendar linking is added later. `src/modules/pm/schema.ts:76-84`, `src/modules/pm/service.ts:607-658` | Low |
| Comment | Append-only discussion on Source/Node/Deadline | Discussion on Project work objects | **ADAPT** | Core mechanism is reusable; Task and Activity anchors are absent. `src/modules/notify/schema.ts:8-27`, `src/modules/notify/service.ts:37-70` | Medium |
| Notification | Per-User in-app event with read state/preferences | Internal notification | **KEEP** | Delivery, preferences and transactional fan-out are sound. New domain events are an extension. `src/modules/notify/schema.ts:29-53`, `src/modules/notify/fanout.ts:101-113` | Low |
| Presence | User + opaque pageKey heartbeat | Advisory Note/Activity presence | **KEEP** | Domain-neutral and intentionally non-historical. `src/modules/notify/schema.ts:55-71` | Low |
| AuditEvent | Append-only actor/action/target/outcome record | Audit Event | **KEEP** | Cross-cutting accountability remains necessary through migration. `src/modules/audit/schema.ts:4-22`, `src/modules/audit/service.ts:5-32` | Low |
| Search | Unified visible Nodes/Sources plus separate Tree/Graph search | Project-aware and cross-project discovery | **ADAPT** | Query foundations aggregate visible Spaces, but results use Branch/Space context and public search does not exist. `src/modules/knowledge/service-queries.ts:372-456` | Medium |
| Graph read model | Visible Team or Personal Nodes and NodeLinks | Future cross-project relationship view | **ADAPT** | It can aggregate all visible Team Nodes, but only persisted links are shown and cross-Space Team links are currently blocked. `src/modules/knowledge/graph-provider.ts:17-90` | Medium |
| Vault product concept | Historical storage boundary; current UI label for extraction review | No target user concept | **REMOVE** | Vault tables were removed; the remaining name exposes implementation history rather than a target entity. `drizzle/0028_drop_vaults.sql:1-26`, `src/app/api/vault/candidates/[candidateId]/evolve/route.ts:13-21` | Low |
| Canonical Person | Not implemented | TMKT-wide Person | **ADD** | User, Project participant, interview subject and represented author must not be conflated. Current physical author is only text. `src/modules/auth/schema.ts:5-17`, `src/modules/storage/schema.ts:180-202` | High |
| Activity | Not implemented | Living Project Activity | **ADD** | No current entity spans before/during/after research work or relates participants, notes, materials and follow-up Tasks. `src/modules/pm/schema.ts:6-84`, `src/modules/notify/schema.ts:8-27` | Very high |
| Public Publication | Not implemented | Versioned public Note publication | **ADD** | Anonymous delivery, stable public-version pointer, unpublish and SEO do not exist. `src/app/wiki/[id]/[[...slug]]/page.tsx:7-25` | Very high |
| TMKT root / Project metadata | Not implemented beyond implicit single installation and Space name | TMKT and Project context/lens/status | **ADD** | Space has only name/type/owner/audit fields. `src/modules/storage/schema.ts:18-30` | High |
| Project overview read model | Home shows recent Library, personal loans and notifications | “What is happening/next/needs attention” | **ADD** | Current home omits Project activities, Tasks, milestones and progress. `src/app/page.tsx:19-107` | Medium |
| Google Calendar event association | Not implemented | Activity ↔ external calendar event reference | **ADD** | Current ICS is outbound deadlines only; no provider/event identity exists. `src/modules/pm/service.ts:607-658` | Medium |

## 5. KEEP

These systems should remain substantially intact even if names and call sites move.

1. **Authentication sessions and OIDC account lifecycle.** **OBSERVED:** invite, login identity, revocable sessions, idle/absolute expiry and disable-session revocation are independent of the old knowledge model. Evidence: `src/modules/auth/admin.ts:21-58`, `src/modules/auth/session.ts:38-72`, `src/modules/auth/session.ts:93-115`.
2. **Delivery → service → data boundary.** **OBSERVED:** the boundary test prevents pages/routes from bypassing service authorization and database rules. This is the correct refactor seam. Evidence: `docs/architecture.md:6-18`, `scripts/boundaries.test.ts:1-55`.
3. **Object storage, SourceVersion and extraction pipeline.** **OBSERVED:** upload is store-first; original files remain available even when extraction is pending/fails; extraction creates append-only chunks/candidate content. Evidence: `src/modules/storage/service.ts:37-105`, `docs/architecture.md:153-160`.
4. **Append-only Note history and optimistic concurrency.** **OBSERVED:** personal saves append versions; Team drafts carry official and draft versions; conflicts return 409 instead of silently overwriting. Evidence: `src/modules/knowledge/service-mutations.ts:400-451`, `src/modules/knowledge/drafts.ts:214-270`.
5. **Safe Markdown parsing/rendering and validation.** **OBSERVED:** the parser is dependency-free, escapes raw content and restricts links/images. Evidence: `src/lib/markdown-core.ts:1-26`, `src/lib/markdown-core.ts:150-193`.
6. **Audit transaction pattern.** **OBSERVED:** services record actor, role-at-action, target and details inside mutation transactions. Evidence: `src/modules/audit/service.ts:5-32`.
7. **Notification storage/preferences and transactional fan-out.** **OBSERVED:** notification delivery commits with the originating mutation; new event types can extend the matrix. Evidence: `src/modules/notify/fanout.ts:8-32`, `src/modules/notify/fanout.ts:101-113`.
8. **Physical-library extension and circulation state machine.** **OBSERVED:** physical metadata is an optional extension of generic Source, and LoanTicket transitions are guarded, audited and versioned. Evidence: `src/modules/storage/schema.ts:176-203`, `src/modules/circulation/service.ts:118-160`, `src/modules/circulation/service.ts:163-239`.
9. **Tags, Node Versions, Source Versions, TextChunks and basic typed links as primitives.** **INFERRED:** their semantics remain useful even though their owning aggregate and APIs change. Evidence: `src/modules/knowledge/schema.ts:94-124`, `src/modules/knowledge/schema.ts:266-320`, `src/modules/storage/schema.ts:103-174`.

## 6. ADAPT

### A. Project mapping

**Current semantics:** Team Space is a membership and storage boundary. It directly owns Folders, Sources, Deadlines, Team Branches and WikiReleases. Admin creates Team Spaces and makes the creator a manager. Evidence: `src/modules/storage/schema.ts:18-68`, `src/modules/storage/service.ts:565-613`, `src/modules/export/schema.ts:6-27`.

**Target semantics:** Project is the primary work context with research lens, people, notes, materials, activities, tasks, deadlines, progress and outputs.

**Mismatch:**

- **OBSERVED:** Tasks have no Space relation and are globally readable. Evidence: `src/modules/pm/schema.ts:55-74`, `src/modules/auth/authorize.ts:81-90`.
- **OBSERVED:** Personal Branches cannot carry `space_id`; personal notes therefore have no Project context. Evidence: `drizzle/0031_knowledge_space_scope.sql:38-43`.
- **OBSERVED:** Space has no objective/lens/status/progress/output metadata. Evidence: `src/modules/storage/schema.ts:18-30`.
- **OBSERVED:** Personal Spaces are separate storage containers and cannot all be reinterpreted as Projects. Evidence: `scripts/db/seed.ts:90-118`.

**Likely refactor boundary:** adapt Team Space as the initial technical Project record; add Project semantics at the service/domain boundary before changing routes. Do not globally translate every `Space` to “Project” until Personal Space rows and Admin/Op behavior are separated.

**Answer:** current `Space` is the best technical foundation, but not yet the complete target Project. It may remain an internal implementation name temporarily **only if** application services expose Project semantics, Team Spaces are the mapped Project set, and Personal Spaces are excluded/deprecated. Data outside Space that should gain Project context: Tasks, Personal Branches/Nodes, extraction-to-note destination, and future Activities/People participation.

### B. Personal / Team

**Current semantics:**

- **OBSERVED:** Space `type` controls team versus owner-associated storage. Evidence: `src/modules/storage/schema.ts:18-30`.
- **OBSERVED:** Branch `scope` controls visibility and container ownership: Team uses Space membership; Personal uses one owner and no Space. Evidence: `src/modules/knowledge/service-queries.ts:30-47`.
- **OBSERVED:** Personal Nodes are created/edited live; Team work uses private per-author drafts; Personal-to-Team “publication” creates a second Node after review. Evidence: `src/modules/knowledge/service-mutations.ts:265-335`, `src/modules/knowledge/drafts.ts:183-270`, `src/modules/knowledge/publication.ts:400-487`.

**Target semantics:** Project-owned research contributions, with Collaborators capturing/contributing and Core members organizing/synthesizing/curating/publishing. Private working state may remain, but Personal/Team is not the product hierarchy.

**Mismatch:** Personal/Team currently represents **four things at once**: authorization boundary, ownership, editing lifecycle and internal promotion state. Branch hierarchy is also tied to the same flag. The target separates Project membership, Note purpose, working state and public publication.

**Likely refactor boundary:** preserve owner-private Draft behavior and independent review where genuinely required; remove Personal/Team as global navigation and stop requiring a Personal Node copy before Project contribution. Deprecate Personal Space/Branch compatibility only after assigning existing private materials/notes to a target Project or explicit private staging policy.

**Genuinely necessary behaviors:** private unfinished work, attribution, optimistic concurrency, official internal content, optional independent review, and version history. **Old-model artifacts:** a top-level Personal/Team taxonomy, Personal Branch as mandatory capture destination, and “publication” meaning copy into Team.

### C. Knowledge and provenance

**Current semantics:** TreeNode is one Markdown page type. NodeLink supports four Node-to-Node relations; Promotion supports SourceVersion-to-NodeVersion provenance; extracted content evolves into a Personal Node. Evidence: `src/modules/knowledge/schema.ts:62-92`, `src/modules/knowledge/schema.ts:266-320`, `src/modules/storage/candidates.ts:138-225`.

**Target semantics:** Project Notes have an explicit purpose distinction: evidence/research capture versus synthesis. Evidence records retain recorder/time/place/context/original content. Synthesis is a separate Note supported by many Notes and Materials.

**Mismatch:**

- **OBSERVED:** Node has no note kind, location, research context, occurred/recorded time or original-content field distinct from the editable body. Evidence: `src/modules/knowledge/schema.ts:62-92`.
- **OBSERVED:** Node `createdBy` and Version `createdBy` preserve author/editor identity and time, but not interview subject, place or capture context. Evidence: `src/modules/knowledge/schema.ts:84-89`, `src/modules/knowledge/schema.ts:94-123`.
- **OBSERVED:** Promotion schema permits multiple rows to a NodeVersion, but the active Personal publication flow derives at most one `sourceVersionId` from the extraction candidate and inserts one Promotion. Evidence: `src/modules/knowledge/publication.ts:182-217`, `src/modules/knowledge/publication.ts:447-453`.
- **OBSERVED:** NodeLink is many-to-many and can express `supports`, so one Note can support multiple Notes at database level. However Team link candidates are restricted to the same Space. Evidence: `src/modules/knowledge/schema.ts:266-281`, `src/modules/knowledge/service-mutations.ts:244-262`.
- **OBSERVED:** Sources can participate in multiple Promotion rows because there is no uniqueness constraint on `promotions.source_version_id`; current APIs do not expose general attachment/citation editing. Evidence: `src/modules/knowledge/schema.ts:306-320`.

**Likely refactor boundary:** adapt Node into Note rather than create parallel content storage; introduce purpose/provenance capability and general many-to-many evidence relationships at service/domain level; retain Version and Markdown. Whether note purpose is a field, subtype or related record is a Stage 2+ schema decision.

**Answers:** current Node can store the text of both evidence and synthesis but cannot faithfully model their different semantics. A new storage entity is not proven necessary; a new explicit note-purpose capability is. One source/note can structurally support multiple syntheses, but services and UI do not provide the general workflow. Cross-Project Note links are blocked by `linkTargetCandidates`, not by the `node_links` table.

### D. Publishing

Current and target behavior are compared fully in section 9.

**Likely refactor boundary:** separate three concepts currently conflated by naming and flags: (1) save/update internal official Note, (2) evidence verification/curation review, and (3) publish a specific immutable Note Version to anonymous readers.

### E. People

**Current semantics:**

- **OBSERVED:** User represents login, display identity, global role and the foreign key used for creators, assignees, borrowers, reviewers and commenters. Evidence: `src/modules/auth/schema.ts:5-17` and references throughout `src/modules/pm/schema.ts:55-74`, `src/modules/circulation/schema.ts:10-32`.
- **OBSERVED:** Member is not a separate person; `space_members` joins User to Space. Evidence: `src/modules/storage/schema.ts:32-52`.
- **OBSERVED:** physical-book author is free text. There is no interview subject, participant or canonical author schema. Evidence: `src/modules/storage/schema.ts:180-202`.

**Target semantics:** one TMKT-wide Person may be a member, Project collaborator, interviewee, author or other represented person; login is optional.

**Mismatch:** authentication identity currently acts as every internal actor identity, while non-login people are either text or absent.

**Likely refactor boundary:** add Person separately and allow an optional User↔Person association. Project participation and research roles should reference Person where appropriate, while security/audit actions continue referencing User. Do not backfill free-text authors automatically without review.

### F. Activities

**Current semantics:** there is no Activity entity. Deadline is a dated Project record; Task is work; Source/Node are content; Comment is anchored discussion. None aggregates before/during/after research context. Evidence: `src/modules/pm/schema.ts:6-84`, `src/modules/notify/schema.ts:8-27`.

**Target semantics:** a living Project Activity relates objective, time/place, participants/subject, preparation, Notes, Materials, debrief and follow-up Tasks.

**Mismatch:** Deadline cannot own participants or research material; Task is too narrow; Comment is not an aggregate; Source/Node should remain related records rather than being overloaded.

**Likely refactor boundary:** introduce Activity as a new domain entity/aggregate. Reuse User/Person references, Source/Note links, Task status/assignee, Comments, audit, notifications and optimistic concurrency. Required relationships conceptually: Project; Activity type/status/time/location; participant/subject Persons; related Notes; related Materials; follow-up Tasks; optional external calendar-event reference. Full schema is intentionally not designed here.

### G. Tasks

**Current semantics:** Tasks are a global guild board visible to every authenticated role. They support one assignee, start/due dates, notes, optional unconstrained `targetType/targetId`, and todo/doing/done/archived. Evidence: `src/modules/auth/authorize.ts:81-90`, `src/modules/pm/schema.ts:55-74`, `src/modules/pm/service.ts:276-297`.

**Target semantics:** one Task belongs to a Project and may belong to an Activity; it may appear in Project, Activity, My Work and TMKT overview without duplication.

**Mismatch:**

- **OBSERVED:** no Project/Space or Activity FK exists. Evidence: `src/modules/pm/schema.ts:55-74`.
- **OBSERVED:** `targetType/targetId` has no enum/FK; create stores it, update does not manage it, and the current create form does not submit it. Evidence: `src/modules/pm/service.ts:299-309`, `src/modules/pm/service.ts:461-484`, `src/modules/pm/service.ts:512-528`, `src/app/components/board-actions.tsx:89-117`.
- **OBSERVED:** Board and schedule reads are global. The schedule deadline query is also not membership-scoped. Evidence: `src/app/board/page.tsx:25-27`, `src/modules/pm/service.ts:417-458`.
- **OBSERVED:** reassignment is deliberately omitted from Task detail UI even though the service accepts `assigneeId`. Evidence: `src/app/components/board-actions.tsx:172-183`, `src/modules/pm/service.ts:516-523`.

**Likely refactor boundary:** add Project ownership first, then optional Activity relation; update authorization/list queries before composing new views. Keep Task row identity and status machine so the same Task can appear in multiple read models. Kanban state is reusable independently of `/board`.

### H. Deadlines

**Current semantics:** Deadline is a Space-scoped record with type, due time, reminder offsets and polymorphic links. Task already has its own due date. Evidence: `src/modules/pm/schema.ts:8-40`, `src/modules/pm/schema.ts:55-74`.

**Target interpretation supported by evidence:** adapt Deadline primarily as a **Project milestone/deadline**. Keep Task due date on Task. An Activity's date/time belongs naturally to Activity, possibly with reminders/calendar linkage, rather than turning every Activity into a Deadline.

**UNKNOWN:** whether every Activity date should optionally create/link a Deadline, whether Project milestones need types beyond the current four, and whether “Deadline” remains a user-facing standalone concept. The repository cannot decide these product semantics.

**Observed implementation gap:** backend accepts DeadlineLinks, but the current Deadline form sends no links. Evidence: `src/modules/pm/service.ts:79-99`, `src/app/components/deadline-form.tsx:58-70`.

### I. Tempo

**Current semantics:** every physical item is also a generic Source in a Space; SourcePhysical adds shelf facts; LoanTicket adds circulation. Physical management and the loan desk are global Admin/Op capabilities. Evidence: `src/modules/storage/physical.ts:53-106`, `src/modules/circulation/schema.ts:5-32`, `src/modules/auth/authorize.ts:35-38`.

**Target semantics:** Tempo is a normal Project with extra library operations.

**Likely refactor boundary:**

- Generic for all Projects: Space/Project, Folder, Source, SourceVersion, TextChunk, extraction, Category.
- Tempo-specialized: SourcePhysical, cover/copies/shelf status, LoanTicket and loan-desk workflow.
- **ADAPT:** capability assignment should be Project/Tempo-aware instead of assuming all physical operations belong to every `admin_op`; the current physical row's Source already carries the Project/Space identifier.

**Answer:** the optional 1:1 SourcePhysical design makes the target feasible without splitting Tempo into another application. Tempo should receive base Project capabilities plus an enabled library capability.

### J. Cross-project knowledge

**OBSERVED:**

- Global Tags can label Notes across Spaces. `src/modules/knowledge/schema.ts:283-304`.
- Unified search and Graph can aggregate all Team Nodes/Sources visible to the user across Spaces. `src/modules/knowledge/service-queries.ts:372-456`, `src/modules/knowledge/graph-provider.ts:17-90`.
- NodeLink schema has no Space column and can technically point between any Nodes. `src/modules/knowledge/schema.ts:266-281`.
- Service policy restricts a Team Node's link targets to its own Space; privacy tests enforce rejection of hidden targets. `src/modules/knowledge/service-mutations.ts:244-262`, `tests/privacy/isolation.test.ts:108-128`.
- Source is owned by exactly one Space. Provenance reads hide Sources outside the viewer's memberships, and Space releases include provenance only where Source belongs to the release Space. `src/modules/knowledge/service-queries.ts:513-539`, `src/modules/export/service.ts:207-212`.

**INFERRED:** current schema primitives can support future cross-Project discovery without replacing Node/Tag/Link, but authorization and provenance rules must become relationship-aware. “Related” should remain a typed relationship, not trigger merge; current merge is separately constrained to the same scope/owner/Space. Evidence: `src/modules/knowledge/service-mutations.ts:862-906`.

## 7. DEPRECATE / REMOVE

### Product concepts to remove from the user mental model

1. **Space** as visible vocabulary — adapt the Team Space foundation to Project semantics first.
2. **Branch** as the primary place a non-technical user must select before creating a Note.
3. **Personal/Team** as the global work hierarchy. Preserve private working state and Project ownership as separate concepts.
4. **Vault** as a destination. Extraction review is a workflow state, not a domain container.
5. **Proposal** as routine end-user vocabulary. Where review is necessary, expose the user goal (“request review”, “review changes”), not the persistence object.
6. **Version** as routine navigation. Retain history, conflict recovery and public-version semantics; expose versions only where users need them.

### Code/data to deprecate before removal

- Personal Space rows and owner-only storage behavior. They may contain real Sources and cannot be deleted until assigned to Projects or an approved private staging model. Evidence: `scripts/db/seed.ts:105-118`, `scripts/db/seed.ts:135-153`.
- Personal Branch scope and Personal-to-Team Publication Proposal. Existing private Nodes, proposal history and provenance must remain readable during migration. Evidence: `src/modules/knowledge/schema.ts:24-60`, `src/modules/knowledge/schema.ts:126-160`.
- Node `publish` boolean after a versioned public-publication pointer exists. Do not drop it while WikiRelease selection depends on it. Evidence: `src/modules/export/service.ts:176-187`.
- Branch-derived public/export paths after stable public Note URLs exist. Evidence: `src/modules/export/service.ts:105-121`.

### Code/data with no demonstrated target role

- The legacy full-tree export path is a removal candidate after external-consumer confirmation. Evidence: `src/modules/export/service.ts:74-141`.
- Remaining `/vault/*` route/copy naming should be removed after candidate workflow routes are relocated; the underlying extraction capability stays. Evidence: `src/app/api/vault/candidates/[candidateId]/evolve/route.ts:6-24`.

**UNKNOWN:** whether exact-duplicate Node merge remains needed. The product truth says related is not duplicate; it does not say true duplicates never occur. Therefore merge is not classified for removal in this stage.

## 8. ADD

### Canonical Person

- **Why needed:** one person may be a TMKT member, Project collaborator, interview subject and represented author without having a login.
- **Likely relationships:** optional User identity; Project participation/roles; Activity participant/subject; Note recorder/subject/mentioned person; Material author/creator.
- **Existing reusable foundations:** User identity, membership UI/service patterns, IDs, audit and search.
- **Major risks:** duplicate names, privacy/consent, merging free-text authors, and accidental exposure on public pages.

### Activity

- **Why needed:** no current object can hold the before/during/after research workspace.
- **Likely relationships:** Project, Persons, Notes, Materials, Tasks, Comments, attachments and optional calendar event.
- **Existing reusable foundations:** Source storage, Note Markdown, Task state, Comments, notifications, audit and optimistic concurrency.
- **Major risks:** overloading Activity into a rigid workflow, ambiguous event/milestone boundaries, participant privacy and attachment provenance.

### Explicit Note purpose and research provenance

- **Why needed:** current Node cannot distinguish evidence from synthesis or retain structured recorder/time/place/context/original-content semantics.
- **Likely relationships:** Note→Project; evidence metadata; Synthesis→many supporting Notes/Materials; recorder/subjects→Person; Note→Activity.
- **Existing reusable foundations:** Node/Version, Source/Version/TextChunk, NodeLink, Promotion, User attribution and Markdown.
- **Major risks:** backfilling historical Notes without inventing facts; preserving original evidence while allowing annotations/corrections.

### Versioned public publication

- **Why needed:** target public content must stay on v1 while internal work continues, then move explicitly to v2; unpublish and anonymous access are required.
- **Likely relationships:** internal Note; immutable NoteVersion; public slug/URL; publication status/timestamps/actor; citations; optional Project metadata.
- **Existing reusable foundations:** NodeVersion, WikiRelease snapshot hashing, Markdown renderer/export, tags, translations and provenance.
- **Major risks:** leaking private Project data, URL stability, search indexing, citation completeness and reconciling existing release snapshots.

### Project metadata and Project-level read models

- **Why needed:** Space name alone cannot express research lens/status/progress, and current Home cannot answer TMKT coordination questions.
- **Likely relationships:** Project participation, Notes, Materials, Activities, Tasks, milestones and outputs.
- **Existing reusable foundations:** Space, memberships, recent queries, Tasks, Deadlines and Notifications.
- **Major risks:** inventing KPI-style progress, duplicating source-of-truth fields and aggregating data before Project backfills are complete.

### Cross-project evidence/citation associations

- **Why needed:** one Material/Note may support several syntheses in different Projects.
- **Likely relationships:** supporting NoteVersion/SourceVersion → Synthesis NoteVersion, with citation/excerpt/context metadata.
- **Existing reusable foundations:** Promotion, TextChunk excerpts and typed NodeLink.
- **Major risks:** cross-Project authorization, public citation redaction and version drift.

### External calendar-event association

- **Why needed:** future Activity↔Google Calendar linkage requires external provider/event identity and sync metadata; ICS alone cannot support it.
- **Likely relationships:** Activity, Project, external provider/calendar/event and last-sync state.
- **Existing reusable foundations:** CalendarToken, timestamps, notification/reminder services.
- **Major risks:** OAuth ownership, deleted/moved events, recurring-event identity and conflict policy. Integration is explicitly out of scope now.

## 9. Publishing gap analysis

### Required sequence versus current behavior

| Required stage | Current behavior | Gap |
| --- | --- | --- |
| Internal working version | Personal Nodes live-edit; Team Nodes use private Drafts over an official Node. | **OBSERVED:** strong reusable editing foundation. `docs/architecture.md:93-119`, `src/modules/knowledge/drafts.ts:139-180` |
| Publish a specific public version | Personal “publication” creates a Team Node; verified Team Nodes may have `publish=true`; a WikiRelease snapshots all eligible Nodes in a Space. | **OBSERVED:** “publish” names internal promotion, verification outcome and release eligibility, not one public Note version. `src/modules/knowledge/publication.ts:31-32`, `src/modules/knowledge/service-mutations.ts:610-622`, `src/modules/export/service.ts:176-187` |
| Public sees v1 without login | `/wiki/:id/:slug` calls `requireUser()` and reads the current live Node; RootLayout only renders an unauthenticated plain shell. | **OBSERVED:** no anonymous public reader service or route exists. `src/app/wiki/[id]/[[...slug]]/page.tsx:7-25`, `src/app/layout.tsx:51-79` |
| Internal edits continue while public remains v1 | Team Drafts can change without changing official internal Node. Once a Draft is published/review-approved, live Node changes. Old WikiRelease snapshots remain immutable. | **INFERRED:** release storage could preserve v1, but no per-Note “current public version” selects it and no public surface serves it. `src/modules/knowledge/drafts.ts:335-415`, `drizzle/0034_wiki_releases.sql:19-31` |
| Publish changes so public sees v2 | Creating another whole-Space release creates a new immutable snapshot. | **OBSERVED:** this is Space-level operational release, not an explicit per-Note republish action. `src/modules/export/service.ts:244-298` |
| Unpublish | Archiving clears `publish`; legacy update supports a publish patch, but Team direct update is rejected and current Node Admin UI offers archive/merge only. | **OBSERVED:** there is no explicit reversible unpublish/republish workflow for a public Note. `src/modules/knowledge/service-mutations.ts:344-381`, `src/modules/knowledge/service-mutations.ts:685-708`, `src/app/components/node-admin-actions.tsx:9-67` |
| Crawlable/shareable TMKT public knowledge with citations | Release files contain tags/source IDs, but release APIs and pages require internal authorization; public Project metadata/citation presentation is absent. | **OBSERVED:** public delivery/SEO is not implemented. `src/modules/export/service.ts:224-241`, `src/app/wiki/releases/page.tsx:10-24` |

### Meaning of “published” today

**OBSERVED:** it has three meanings:

1. `publishDraft` means merge a private Team Draft into the official internal Node and usually sets `publish=false`. Evidence: `src/modules/knowledge/drafts.ts:335-415`.
2. Publication Proposal means copy a Personal Node into a new Team Node after review. Evidence: `src/modules/knowledge/publication.ts:119-228`, `src/modules/knowledge/publication.ts:400-487`.
3. `tree_nodes.publish=true` means an eligible verified Node is selected into a whole-Space WikiRelease. Evidence: `src/modules/export/service.ts:176-187`.

### Required change

**INFERRED:** retain internal Draft/Version mechanics, but add a separate public-publication aggregate or pointer whose source is a complete immutable NoteVersion. Public reads must use that pointer/snapshot, never the mutable live Node. Unpublish changes public availability without deleting internal history. Republish advances the pointer to a newer approved version. WikiRelease may remain an integrity/deployment artifact behind this flow, but it is not by itself the target publication model.

## 10. Authorization impact

| Current mechanism | Target mapping | Assessment |
| --- | --- | --- |
| Global `user` | Authenticated TMKT user; possible Collaborator capability | **ADAPT:** currently every user can see the global Board and own Personal content. Collaborator behavior should depend primarily on Project participation. `src/modules/auth/authorize.ts:21-91` |
| Global `editor` | Possible curation/review capability | **ADAPT:** editor is global but target Core behavior may be Project-specific. Do not equate Editor with Core without a product decision. `src/modules/auth/authorize.ts:17-20`, `src/modules/auth/authorize.ts:56-65` |
| Global `admin_op` | System administrator/operator | **KEEP as a distinct operational role, ADAPT its break-glass scope:** it should not automatically mean Project Core or public publisher. Current knowledge/export bypass is explicit. `src/modules/auth/authorize.ts:123-135` |
| Space viewer/contributor/manager | Project member/collaborator/core-like capability | **ADAPT:** the rank ladder is a good Project authorization foundation, but names and exact powers require decisions. `src/modules/auth/authorize.ts:12-15`, `src/modules/storage/schema.ts:32-52` |
| Personal Branch owner | Private working-content owner | **DEPRECATE as primary authorization model:** preserve private drafts/notes during migration, but Project context and privacy must be separate dimensions. `src/modules/knowledge/service-queries.ts:30-47` |
| Reviewer permissions | Independent curation/review | **ADAPT:** maker-checker is valuable; reviewer eligibility currently requires global Editor/Admin plus Space contribution. `src/modules/auth/maker-checker.ts:3-25`, `src/modules/auth/authorize.ts:61-65` |
| Public access | None | **ADD:** anonymous public reader must bypass internal session requirements only through a dedicated public-publication read model, never through internal `getNode`. `src/app/wiki/[id]/[[...slug]]/page.tsx:7-25` |

**PRODUCT DECISION needed:** whether Core membership is TMKT-wide, Project-specific, or both; whether Collaborators can create all evidence Notes or only within assigned Projects; who may publish publicly; and whether publication needs independent review.

## 11. Data migration risk

### Schema changes and backfills

1. **Project foundation — high risk.** Team Spaces need a deterministic Project mapping and new metadata. Personal Spaces must be classified separately. Existing Source/Deadline/Team Branch/WikiRelease FKs are valuable and should not be rewritten until the mapping is proven.
2. **Tasks — very high risk.** Every current Task needs a Project assignment or an explicit TMKT-level exception. There is no reliable field from which to infer it; `targetType/targetId` is optional and unvalidated. Evidence: `src/modules/pm/schema.ts:55-74`.
3. **Personal Notes — very high risk.** Personal Branches have no Space, so assigning them to Projects requires owner/product input or a deliberate unassigned staging state. Evidence: `drizzle/0031_knowledge_space_scope.sql:38-43`.
4. **Note purpose/provenance — high risk.** Historical Nodes cannot be safely labeled evidence versus synthesis or given location/context by automated inference. Existing `createdBy/createdAt` can be preserved but do not fill the missing facts.
5. **Person — high risk.** Users can seed candidate Person records, but free-text physical authors and future interview subjects cannot be merged automatically. Auth User IDs must remain valid for audit/security history.
6. **Public publication — very high risk.** Existing `publish=true` and WikiRelease history do not identify an intended current public Note version. Backfill needs an explicit policy and citation/privacy review.
7. **Activity — low legacy backfill certainty.** There is no source entity to migrate. Do not infer Activities from Deadlines, Tasks or Notes without user validation.

### Compatibility and destructive-change risks

- Existing internal links use Node IDs and `/wiki/:id/:slug`; the route is currently authenticated. Public URLs must not accidentally expose live/internal Nodes. Evidence: `src/app/wiki/[id]/[[...slug]]/page.tsx:21-25`.
- Branch IDs and names drive navigation, slugs and export paths. Removing Branch early would break links/releases. Evidence: `src/modules/export/service.ts:105-121`.
- Released WikiRelease rows cannot be updated/deleted by database trigger. Preserve them as historical artifacts. Evidence: `drizzle/0034_wiki_releases.sql:19-31`.
- Node Versions, TextChunks, Promotions, Comments and AuditEvents have append-only expectations. Migrations must add mappings rather than rewriting history. Evidence: `drizzle/0001_v1_schema_parity.sql:48-62`, `drizzle/0000_init.sql:125-135`, `docs/architecture.md:49-50`.
- Audit `action`, `targetType` and role literals record old terminology. Historical rows should remain readable through compatibility labels rather than destructive rewrites. Evidence: `src/modules/audit/schema.ts:8-22`.
- Relaxing cross-Project relationships before authorization is redesigned could leak hidden Project titles/content through links, graph, comments or public citations. Existing privacy tests explicitly protect Space and Personal isolation. Evidence: `tests/privacy/isolation.test.ts:25-35`, `tests/privacy/isolation.test.ts:76-106`.
- Tempo operations currently use global Admin/Op permission; changing this without a Project-specific operator replacement could lock out the library desk. Evidence: `src/modules/auth/authorize.ts:35-38`.

## 12. Dependency order

Safest evidence-based sequence:

```text
0. Resolve product policy unknowns that affect identity and authorization
   (Core scope, Project membership roles, public publisher/reviewer policy)
→ 1. Inventory and classify existing Team Spaces, Personal Spaces, Tasks and Personal Nodes
→ 2. Establish Project domain/service contract on top of mapped Team Spaces
   and add compatibility reads for legacy Space naming
→ 3. Make all Project-owned objects explicit
   (Tasks first; Personal Notes/candidates through a controlled migration policy)
→ 4. Add canonical Person and Project participation capability
→ 5. Add Note purpose and general evidence/provenance relationships
   while retaining Node/Version storage
→ 6. Add Activity and its relationships to Project, Person, Note, Material and Task
→ 7. Adapt authorization and notification/comment anchors to the new aggregates
→ 8. Add versioned public-publication read model and anonymous public delivery
→ 9. Adapt search/graph/citations for authorized cross-Project relationships
→ 10. Add Project-first routes and read models behind compatibility routes
→ 11. Recompose navigation/UI; retire Personal/Team, Branch, Vault and old route vocabulary
→ 12. Remove deprecated schema/code only after data and URL compatibility gates close
```

Why this order:

- Project is the parent context required by Notes, Activities, Tasks, People participation and authorization.
- Person must exist before Activity participants/subjects are modeled.
- Note purpose/provenance must be stable before public citations and publication are built.
- Public publishing must read a deliberate immutable version and cannot safely be added as anonymous access to the current live Node service.
- Routes/UI come after service semantics so the redesign does not encode temporary migration states.

## 13. Unknowns / blockers

1. **UNKNOWN:** Is TMKT a persisted organization/tenant or an implicit singleton installation?
2. **UNKNOWN:** Is Core membership TMKT-wide, Project-specific, or both? Is “Core member” an identity, a Project role, or a permission bundle?
3. **UNKNOWN:** Can a Collaborator see all Project research, or are evidence Notes/materials selectively restricted?
4. **UNKNOWN:** Are private Notes still required outside any Project, or must every Note have a Project immediately?
5. **UNKNOWN:** Which existing Team Spaces correspond to actual TMKT Projects, and what should happen to the legacy/common knowledge Space?
6. **UNKNOWN:** How should existing Personal Space Sources and Personal Branch Nodes be assigned to Projects without guessing?
7. **UNKNOWN:** Is one Note allowed to belong to multiple Projects, or should it have one home Project plus cross-Project relationships?
8. **UNKNOWN:** Which structured fields are mandatory for each evidence-note subtype, and which may be captured as flexible metadata?
9. **UNKNOWN:** Must public publication require review by a second Core member, or may an authorized Core member publish directly?
10. **UNKNOWN:** What is the stable public URL policy, and should old authenticated `/wiki/:id/:slug` links redirect or remain internal?
11. **UNKNOWN:** Are public Notes versioned independently per locale? Is current English translation functionality a real requirement?
12. **UNKNOWN:** Does unpublish preserve an accessible historical URL for authorized staff only, return 404 publicly, or show a tombstone?
13. **UNKNOWN:** Are Project Materials shareable as the same canonical Material across Projects, or copied/linked with one owning Project?
14. **UNKNOWN:** Which Person attributes are public, internal or sensitive, especially interview subjects and community participants?
15. **UNKNOWN:** Which Activity types/fields are common enough to standardize without creating a rigid wizard?
16. **UNKNOWN:** Does a Project milestone need its own status/owner, or is the current Deadline shape sufficient after Project mapping?
17. **UNKNOWN:** Is the legacy full-tree export consumed by any external process?
18. **UNKNOWN:** What data exists in the live database versus only demo seed; repository inspection cannot quantify migration rows or classify their intent.

### Inspection completeness

**OBSERVED:** this audit inspected all requested domain modules and their manipulation paths:

- auth users/sessions/admin/authorization/maker-checker;
- storage spaces/members/folders/sources/versions/chunks/candidates/physical items;
- knowledge branches/scopes/nodes/versions/drafts/proposals/publication/translations/tags/links/promotions/graph/search;
- PM tasks/deadlines/deadline links/reminders/calendar feed;
- notify comments/notifications/preferences/presence/fan-out;
- circulation physical loan lifecycle;
- export WikiRelease and legacy export;
- audit events;
- representative API routes, pages, architecture docs, migrations, privacy tests and end-to-end use-case tests.

Primary behavioral test evidence: `tests/usecase/knowledge-journey.test.ts:29-33`, `tests/usecase/knowledge-journey.test.ts:40-190`, `tests/usecase/library-journey.test.ts:18-79`, `tests/usecase/admin-journey.test.ts:16-67`, `tests/privacy/isolation.test.ts:25-35`, `tests/integration/wiki-release.test.ts:19-59`.

## 14. Recommendation for Stage 2

Recommended Stage 2:
Define the Project foundation and migration contract: map Team Space to Project, classify Personal Space/Personal Branch data, specify Project membership capability semantics, and define how existing Tasks and Notes acquire Project ownership without changing production schema yet.

Why:
Project is the dependency root for Activities, People participation, Notes, Materials, Tasks, authorization, navigation and TMKT overview. The repository already provides a partial Space foundation, but automatic relabeling would misclassify Personal data and leave global Tasks/Personal Notes orphaned.

Must NOT start yet:
Activity or Person schema implementation, public publishing, cross-Project link relaxation, route renaming, navigation redesign, UI redesign, or deletion of Personal/Team/Branch/Vault compatibility paths; all still depend on the Project migration contract and unresolved authorization/product decisions.
