# Stage 2 — Project Foundation & Migration Contract

Baseline: accepted Stage 1 report at repository HEAD `c60620f`, inspected 2026-09-01. This document defines a target domain/application contract and migration boundaries. It does not prescribe routes or UI and does not change runtime behavior.

Evidence labels:

- **OBSERVED** — directly implemented or enforced in the repository.
- **INFERRED** — a consequence of repository evidence plus accepted product decisions.
- **PRODUCT DECISION** — supplied in the Stage 2 brief or accepted product-context document.
- **UNKNOWN** — not determinable from those sources without operational/product input.

## 1. Executive conclusion

**Team Space can safely become the technical identity foundation for Project, but `type = 'team'` cannot itself mean “is a Project.”**

The recommended architecture is a one-to-one **Project extension over a confirmed Team Space**, with the same UUID:

```text
Project.id == Team Space.id

Space                         Project extension
├── id ─────────────────────── project_id (PK + FK)
├── name                      research lens
├── membership                lifecycle status
├── existing ownership FKs    optional description
└── audit timestamps          Project feature assignments
```

**OBSERVED:** Space already provides stable identity, membership and ownership for Folder, Source, Deadline, Team Branch and WikiRelease. `src/modules/storage/schema.ts:18-68`, `src/modules/pm/schema.ts:8-26`, `src/modules/export/schema.ts:6-27`.

**OBSERVED:** a previous migration created a Team Space named `Kho tri thức chung` and assigned all legacy Team Branches to it specifically to avoid guessing their real project. Therefore Team Space is a necessary technical candidate, not sufficient product evidence. `drizzle/0031_knowledge_space_scope.sql:1-35`.

**INFERRED:** replacing Space or issuing new Project UUIDs would rewrite correct foreign keys and historical references without adding product value. Extending every Space row would instead mix required Project metadata into deprecated Personal Space rows. A same-ID extension table is the smallest boundary that preserves identity while making the set of Projects explicit.

The high-risk data remains deliberately outside automatic migration:

- Personal Space data stays private until an explicit Project assignment is approved.
- Personal Nodes remain `legacy private / unassigned` when their Project is unknown.
- Existing Tasks remain `legacy unassigned` unless a human confirms the Project; current links are not authoritative enough for automatic ownership.
- New target-product Notes and Tasks must require a Project at their application-service boundary.

## 2. Product decisions carried forward

Future stages must not reopen these accepted decisions:

1. **PRODUCT DECISION:** WisdomTree is single-organization software for TMKT. Multi-tenancy is not in scope.
2. **PRODUCT DECISION:** every operational research initiative under TMKT is a Project; Tempo is a normal Project with an additional library/circulation capability.
3. **PRODUCT DECISION:** Project is the primary internal context: `TMKT → Project → work`.
4. **PRODUCT DECISION:** every new internal Note has exactly one home Project. Cross-Project reuse uses relationships/citations/discovery, not multiple ownership.
5. **PRODUCT DECISION:** every new Task has exactly one Project and may later have one optional Activity.
6. **PRODUCT DECISION:** Personal is not a parallel product universe. Privacy and working state are separate from Project ownership.
7. **PRODUCT DECISION:** legacy private/unassigned data is a temporary compatibility state only. It must not be used for normal new target-product records.
8. **PRODUCT DECISION:** Collaborator participation is Project-scoped. TMKT Core curation/publishing capability is distinct from current `editor`, `manager` and `admin_op` roles.
9. **PRODUCT DECISION:** system administration is separate from research curation.
10. **PRODUCT DECISION:** an authorized Core member may eventually publish/unpublish without structurally requiring the current Proposal workflow; review may remain optional.
11. **PRODUCT DECISION:** public knowledge is TMKT-centric; Project is public metadata/filter context rather than a mandatory hierarchy.
12. **PRODUCT DECISION:** ownership of a Note or Material is distinct from authorized cross-Project research reuse.

These decisions match the accepted product context: Project-first work and Project-context Note creation are explicit in `docs/WisdomTree — Product Context & User Needs.md:137-162` and `docs/WisdomTree — Product Context & User Needs.md:198-220`; Collaborator/Core responsibilities are described at `docs/WisdomTree — Product Context & User Needs.md:313-356`; Task context is described at `docs/WisdomTree — Product Context & User Needs.md:690-738`.

## 3. Target Project contract

### Conceptual aggregate

```text
implicit TMKT singleton
└── Project
    ├── identity and lifecycle metadata
    ├── Project participation/capabilities
    ├── one owning context for Notes
    ├── one owning context for Materials
    ├── one owning context for Tasks
    ├── Project milestones/deadlines
    ├── Activities later
    ├── People participation later
    └── optional feature assignments
        └── library/circulation for Tempo
```

Project ownership answers **where a record belongs**. Membership/capabilities answer **who may act**. Draft/privacy state answers **who may currently see a working version**. These dimensions must not be collapsed into one `Personal | Team` field.

### Field and read-model contract

| Concept | Classification | Contract |
| --- | --- | --- |
| Project ID | **REQUIRED DOMAIN FIELD** | Stable UUID. Initially equal to the confirmed Team Space ID. |
| Name | **REQUIRED DOMAIN FIELD** | Human Project name. During compatibility, `spaces.name` remains the single source of truth; do not duplicate it in the extension. |
| Research lens / concern | **REQUIRED DOMAIN FIELD** | Concise statement of the Project's research perspective. Legacy Project creation/backfill must obtain it explicitly rather than infer it from content. |
| Description | **OPTIONAL DOMAIN FIELD** | Longer context, purpose or scope. It must not substitute for the concise lens. |
| Lifecycle status | **REQUIRED DOMAIN FIELD** | Minimal domain values: `active`, `paused`, `completed`, `archived`. `active` is the default for a deliberately created new Project; legacy status requires confirmation. |
| Participation relation | **REQUIRED DOMAIN FIELD** | User-based Project access in the current foundation; canonical Person participation is a later stage. |
| Project feature assignments | **OPTIONAL DOMAIN FIELD** | Explicit enabled capabilities such as `library_circulation`; absence means the feature is unavailable for that Project. |
| Created by | **REQUIRED DOMAIN FIELD** | Authentication User who created/registered the Project. |
| Created at / updated at | **REQUIRED DOMAIN FIELD** | Audit metadata for Project metadata, independent of content activity. |
| Optimistic version | **REQUIRED DOMAIN FIELD** | Protect Project metadata updates from lost writes, matching existing versioned records. |
| Single Project owner User | **DO NOT PERSIST** | TMKT Projects are collaborative; access comes from participation/capabilities, not one personal owner. |
| Persisted TMKT/tenant ID | **DO NOT PERSIST** | Not justified while the application serves one implicit TMKT organization. |
| Progress percentage | **DO NOT PERSIST** | Derive “what is happening/next/needs attention” from Tasks, milestones and later Activities; no repository/product evidence defines a canonical percentage. |
| Upcoming work / needs attention | **DERIVED READ MODEL** | Derived from Project records, deadlines, tasks and later activities. |
| Participant/task/note/material counts | **DERIVED READ MODEL** | Aggregates, not Project state. |
| Tempo detection by name | **DO NOT PERSIST** | Project name must not activate domain behavior. Use a feature assignment. |
| Public Project URL/slug | **UNKNOWN** | Public URLs are explicitly outside Stage 2. Stable ID does not require choosing a slug now. |
| Start/end dates | **OPTIONAL DOMAIN FIELD** | Useful when TMKT knows them, but not required to establish ownership or authorization. |

**OBSERVED:** current Space has only ID, name, type, owner, creator, archive timestamp, timestamps and version; research lens and lifecycle are absent. `src/modules/storage/schema.ts:18-30`.

**INFERRED:** Project status should not be represented only by current `archivedAt`, because completed and paused work remain legitimate internal Projects. The existing timestamp can remain a compatibility/implementation detail while Project status becomes authoritative.

### Lifecycle contract

```text
active ↔ paused
active | paused → completed
active | paused | completed → archived
archived → active | paused | completed only through an explicit restore action
```

- `completed` means the initiative has concluded but remains normal institutional memory.
- `archived` means removed from normal active selection, not deleted.
- Status transitions must be audited and optimistic-lock protected.
- Lifecycle does not delete or rewrite owned records.

## 4. Space → Project architecture options

| Option | Migration safety | Compatibility | Future clarity | Assessment |
| --- | --- | --- | --- | --- |
| Extend `spaces` with Project fields | Medium | High | Low–Medium | Keeps all FKs, but Project-only required fields become nullable/meaningless on Personal Space and `type='team'` still cannot distinguish true Projects from legacy shared containers. |
| **One-to-one `projects` extension keyed by Team Space ID** | **High** | **High** | **High** | Preserves every Space FK and makes Project qualification explicit. Project services can compose Space name/membership with Project metadata. Chosen option. |
| Replace `spaces` with `projects` | Low | Low | Medium | Requires destructive FK/API/URL/test migration and still needs a separate home for legacy Personal storage. Reject. |
| Separate Project ID plus Space↔Project mapping | Medium–Low | Medium | Medium | Avoids shared identity but creates two IDs for one current boundary and forces every owning query/API to translate. No demonstrated need justifies it. Reject. |

### Recommendation

Use a one-to-one Project extension whose primary key is also a foreign key to `spaces.id`.

A current row qualifies only when both are true:

1. `spaces.type = 'team'`; and
2. TMKT confirms that the row represents an operational research initiative.

`type='team'` is necessary but not sufficient. The extension row is the authoritative declaration that the Team Space is a Project.

**OBSERVED:** `createSpace` currently creates only Team Space and grants its creator `manager`, but accepts only a name and does not establish research semantics. `src/modules/storage/service.ts:565-601`.

**OBSERVED:** release code explicitly accepts only non-archived Team Space, while other Space-scoped services generally authorize by membership without checking Space type. `src/modules/export/service.ts:155-158`, `src/modules/storage/service.ts:37-48`, `src/modules/pm/service.ts:176-191`.

**Migration implication:** new target application code calls a Project service that transactionally creates both the underlying Team Space and Project metadata. Legacy `createSpace` remains a compatibility path until its callers are migrated; it must not silently create incomplete Projects.

## 5. Project identity strategy

### Chosen identity

```text
Project ID == existing confirmed Team Space ID
```

| Dependency | Consequence of same ID |
| --- | --- |
| Sources and Folders | Existing `space_id` remains the owning Project ID; no row rewrite. `src/modules/storage/schema.ts:54-68`, `src/modules/storage/schema.ts:79-101` |
| Deadlines | Existing `space_id` remains the Project ID. `src/modules/pm/schema.ts:8-26` |
| Team Branches/Nodes | Project derives through Branch `space_id`; Branch and Node IDs remain unchanged. `src/modules/knowledge/schema.ts:24-68` |
| Wiki Releases | Historical `space_id`, release numbering and snapshots remain stable. `src/modules/export/schema.ts:6-27` |
| Membership | Existing `(space_id,user_id)` rows remain the initial Project access relation. `src/modules/storage/schema.ts:32-52` |
| Audit | Historical targets/details using `space` and Space UUID remain valid; new presentation may resolve that UUID as Project without rewriting append-only history. `src/modules/audit/schema.ts:4-22` |
| URLs/APIs | `/api/spaces/:id/*`, Branch IDs and Node IDs can continue resolving while Project APIs are introduced additively. |
| Tests | Existing fixtures and privacy checks can retain IDs and behavior while new Project-contract tests are added. `tests/privacy/isolation.test.ts:44-106` |

### Why no new Project UUID

**OBSERVED:** existing ownership is already normalized through Space, and WikiRelease numbering is unique per Space. `src/modules/storage/schema.ts:54-101`, `src/modules/export/schema.ts:6-27`.

**INFERRED:** a distinct UUID would require a translation join for every Project-owned object and create ambiguous audit/API identity. It is justified only if one Space must contain multiple Projects or one Project must span multiple Spaces; neither is a supplied product requirement.

Project identity must not be inferred from a name. Space names are not unique in the schema, and a migration-generated shared Space may not be a Project. `src/modules/storage/schema.ts:18-30`, `drizzle/0031_knowledge_space_scope.sql:21-34`.

## 6. Project capability / participation matrix

### Target capability sources

“Project access required” below is a separate guard: a global curation capability must not reveal a Project to a User who lacks authorized access unless a later explicit Core access policy says otherwise.

| Capability | Primary source | Additional guard / rationale |
| --- | --- | --- |
| View Project metadata | **Project membership** | System administration may have an explicit operational break-glass path, not implicit research membership. |
| View internal research | **Project membership** | Minimum view capability; no ownership-only discovery. |
| Create evidence Note | **Project membership** | Contribution capability within that Project. |
| Edit own contribution/draft | **Resource ownership** | Also requires current Project access. |
| Edit official/synthesis knowledge | **TMKT/global capability** | Also requires current Project access; ordinary contribution alone is insufficient. |
| Manage Project metadata | **Project membership** | A management capability within the Project. |
| Manage participants | **Project membership** | A Project management capability; does not grant system-user administration. |
| Create/manage Tasks | **Project membership** | Create requires contribution; manage may combine Project management and own/assigned resource ownership. |
| Create/manage Activities later | **Project membership** | Exact Activity permissions are deferred, but ownership is Project-scoped. |
| Curate/review knowledge | **TMKT/global capability** | Also requires Project access. Review is optional workflow, separate from public publishing. |
| Publish/unpublish publicly later | **TMKT/global capability** | Also requires Project access; no mandatory second-person approval in baseline. |
| Operate Tempo library | **Specialized Project capability** | Project must have library/circulation feature enabled and User must hold operator capability for that Project. |
| System administration | **TMKT/global capability** | Separate from Core, Project management and Tempo operation. |

### Current role mapping — compatibility only

| Current mechanism | What it safely proves today | Future interpretation | Must not be assumed |
| --- | --- | --- | --- |
| Space `viewer` | May browse/read that Space | Initial Project read participation | Collaborator, Core or publisher identity |
| Space `contributor` | May upload, draft and edit Deadlines in that Space | Initial Project contribution capability | Official curation or public publishing |
| Space `manager` | May manage members/branches and trigger release | Initial Project management capability | TMKT Core membership |
| Global `user` | Authenticated ordinary member | No automatic global Project capability | Membership in every Project |
| Global `editor` | Eligible for current knowledge edit/review permissions | Candidate input to a future curation-capability backfill, requiring confirmation | Core membership |
| Global `admin_op` | System operations plus current knowledge/export break glass | System administrator; retain separately | Core, Project manager or Tempo operator |
| Resource creator/assignee | Owns or is assigned a specific record for guarded mutations | Own-contribution/assigned-work rule | Project membership or Project ownership |

**OBSERVED:** current authorization combines global roles, ranked Space membership and owner/assignee checks. `src/modules/auth/authorize.ts:12-90`, `src/modules/auth/authorize.ts:120-143`.

**OBSERVED:** Admin/Op currently bypasses Space membership only for knowledge/export paths, while physical and circulation management are global Admin permissions. `src/modules/auth/authorize.ts:35-38`, `src/modules/auth/authorize.ts:123-135`.

**Migration contract:** Stage 2 defines capability sources, not their future storage. No current role is mechanically reclassified as Core. Initial Project access may continue through Space membership until a later authorization stage introduces explicit capability assignments.

## 7. Ownership matrix

| Object | Target Project ownership | Current source of ownership | New records | Legacy records | Migration action |
| --- | --- | --- | --- | --- | --- |
| Team Space | 1:1 Project foundation when confirmed | Own `id`; `type='team'` | Created with a Project extension | Team does not prove Project | Create extension only after product confirmation; preserve ID |
| Personal Space | No target Project ownership | Owner User + membership | Must not be created by target Project services | Legacy private container | Keep private; classify contents; retire only after empty/handled |
| Folder | Exactly one Project | `folders.space_id` | Require confirmed Project | May be in Team or Personal Space | Team Project rows map mechanically; Personal rows stay legacy/private until explicit move |
| Source / Material | Exactly one Project | `sources.space_id` | Require confirmed Project | Team or Personal Space | Team Project rows map mechanically; Personal rows require explicit assignment |
| SourceVersion | Inherits Source Project | `source_versions.source_id → sources.space_id` | Never accepts independent Project | Inherits legacy Source state | No direct Project field/backfill |
| ExtractionCandidate | Inherits source Material Project | Candidate → SourceVersion → Source → Space | Project must be derived from Source, not uploader input | Team-source candidate is deterministically associated; Personal-source candidate remains private/unassigned | Preserve candidate ID; change future evolution contract, not candidate ownership |
| Team Branch | Exactly one Project in compatibility | `branches.space_id` | Legacy implementation detail under a Project | May reference Team Space not confirmed as Project | Derive only when extension exists; preserve Branch ID |
| Personal Branch | No target aggregate ownership by itself | Owner User; DB prohibits Space | Must not be the normal target Note container | Legacy private container, possibly mixed subjects | Keep owner-only; never auto-map whole branch by content |
| Team Node | Exactly one Project | Node → Team Branch → Space | Created through Project Note service | Derivable only if Branch Space is confirmed Project | Use derived Project during compatibility; preserve Node ID |
| Personal Node | Exactly one Project after explicit assignment; nullable only as legacy compatibility | Personal Branch owner, no Space | Must never be created Project-less by target service | `legacy private / unassigned` | Keep private and stable; explicitly attach Project to same Node when decided; do not copy automatically |
| NodeDraft | Inherits its Note/Branch Project; remains author-private working state | Draft → Team Branch Space | Created inside Project context | Existing Team drafts derive; drafts over legacy data follow its compatibility state | No independent Project ownership |
| Task | Exactly one Project | None; global row | Project required | `legacy unassigned` unless manually confirmed | Add nullable migration relation; backfill only confirmed records; target service rejects missing Project |
| Deadline | Exactly one Project milestone/deadline | `deadlines.space_id` | Require confirmed Project | Team/Personal/non-Project Team Space possible | Team Project rows map mechanically; others remain legacy pending classification |
| WikiRelease | Historical artifact of exactly one mapped Project where applicable | `wiki_releases.space_id` | Current release behavior remains legacy | Existing immutable rows | Preserve unchanged; Project facade may resolve same ID |
| LoanTicket | Inherits Project through physical Source | Loan → SourcePhysical → Source → Space | Only within library-enabled Project later | Existing chain remains authoritative | No direct Project field; preserve ticket and Source IDs |
| Future Activity | Exactly one Project | Not implemented | Project required | No automatic backfill | Later schema; out of Stage 3 |
| Future Person participation | Participation is Project-scoped; Person itself is TMKT-wide | Current membership is User↔Space | Later explicit relation | Current membership remains access foundation | Person schema deferred; do not conflate with User now |

The current relationship evidence is in `src/modules/storage/schema.ts:54-203`, `src/modules/knowledge/schema.ts:24-68`, `src/modules/knowledge/schema.ts:227-264`, `src/modules/pm/schema.ts:8-84`, `src/modules/circulation/schema.ts:10-32` and `src/modules/export/schema.ts:6-27`.

## 8. Personal Space migration contract

### What Personal Space currently means

**OBSERVED:** Space type permits `team | personal`; Personal Space has an owner and may also have a membership row. The seed creates one Personal Space per User and stores at least one Personal Source there. `src/modules/storage/schema.ts:18-52`, `scripts/db/seed.ts:105-118`, `scripts/db/seed.ts:135-153`.

**OBSERVED:** Project-like FKs generally reference `spaces` without a database constraint on Space type. Therefore Folder, Source, Deadline, CalendarToken, Team Branch and WikiRelease schemas can technically point at a Personal Space even where a particular service later rejects it. `src/modules/storage/schema.ts:54-101`, `src/modules/pm/schema.ts:8-84`, `src/modules/knowledge/schema.ts:24-60`, `src/modules/export/schema.ts:6-27`.

Repository demo data is not sufficient to assert which of these classes exist in a live Personal Space. Migration must inventory them all.

### Classification

| Personal-space data class | Safe future state | Automatic mapping? | Contract |
| --- | --- | --- | --- |
| Personal Source/Material | Assign to one Project or retain legacy private staging | No | Owner or authorized custodian selects Project; never infer from title/content |
| SourceVersion/TextChunk | Follow Source | Yes, only after Source assignment | Preserve rows and object keys; no independent move |
| Pending extraction candidate | Follow Source Project when Source is already in confirmed Project; otherwise legacy private | Conditional | Preserve candidate; no uploader-selected Project override |
| Evolved extraction result | Legacy Personal Node until explicit assignment | No | Source Project may be a suggestion, not permission to expose the Node |
| Personal Folder | Move as a coherent subtree only after every contained item is classified | No | Preserve hierarchy/IDs where possible; do not strand mixed-project children |
| Personal Deadline | Explicitly assign as Project milestone or retain legacy | No | Do not infer from linked Task/Node title |
| Physical extension / Loan | Follow Source, with operational review before move | Conditional | Moving a circulated item changes which Project owns library operations; preserve loan history |
| Any Team Branch/WikiRelease found in Personal Space | Data-quality exception | No | Quarantine for review; do not reinterpret as Project merely because it is shared-shaped |
| Personal membership row | Legacy access mechanism | Not applicable | Does not become Project participation |

### Safety rules

1. Personal data remains visible only under existing owner/membership rules until explicit migration commits.
2. Assignment is a move of ownership where technically safe, not an automatic copy.
3. A move must validate Folder, Source, candidate, physical-item and active-loan dependencies in one reviewed plan.
4. The system records actor, old Space, new Project and reason; existing audit rows remain untouched.
5. Empty Personal Spaces are retained until a separate deprecation gate confirms no routes, tokens, references or audit-resolution needs remain.

## 9. Personal Note migration contract

### Transitional state

```text
legacy private / unassigned
├── owner User remains the only reader
├── original Branch ID remains
├── original Node ID remains
├── NodeVersion history remains
└── proposals/origin history remains traceable
```

This state is permitted only for pre-migration records. It is not a valid input to target `createProjectNote`.

**OBSERVED:** Personal Branches have an owner, no Space, and are owner-visible; the database enforces that Team Branches have Space while Personal Branches cannot. `src/modules/knowledge/service-queries.ts:30-47`, `drizzle/0031_knowledge_space_scope.sql:38-43`.

**OBSERVED:** privacy tests require Personal Notes to remain absent from other Users' detail, history, list, search, wiki and graph surfaces. `tests/privacy/isolation.test.ts:108-145`.

### Assignment strategy comparison

| Strategy | Identity/history | Privacy risk | Assessment |
| --- | --- | --- | --- |
| Move Node immediately to Team Branch | Node ID can remain, but Branch/visibility changes at once | High | Reject as the default migration action |
| Map the entire Personal Branch to a Project | Preserves Node IDs | High; branch may contain multiple Projects | Reject unless every child is explicitly classified together |
| Copy into a Team Node | Creates current Personal + Team duplicate and split history | Medium–High | Reject as target ownership migration; preserve existing copies/history only |
| **Attach explicit Project ownership to the existing Node while retaining legacy-private visibility** | **Preserves Node/Version/Branch IDs** | **Low if privacy remains an independent guard** | **Recommended least-destructive transition** |

The target Note eventually needs an authoritative Project relation independent of Branch scope. During compatibility:

- Team Node Project may be derived through Branch.
- Personal legacy Node may have no Project.
- When a User explicitly assigns it, Project ownership is attached to the existing Node; legacy-private visibility continues until a separate explicit action changes working/official state.
- Existing Personal publication Proposal remains historical trace and must not be rewritten. It currently creates a second Team Node and stores the private origin only for the author. `src/modules/knowledge/publication.ts:119-228`, `src/modules/knowledge/publication.ts:400-487`, `tests/usecase/knowledge-journey.test.ts:125-142`.

**INFERRED:** whether the future ownership relation is a `project_id` column or one-to-one compatibility table should be decided in the later Note-domain stage. Stage 3 does not need it to establish Project identity.

## 10. Team Note compatibility contract

### Current derivation

```text
TreeNode
→ branches.id = TreeNode.branch_id
→ branches.scope = team
→ branches.space_id
→ projects.project_id = branches.space_id
```

This derivation is authoritative during compatibility only when a Project extension row exists.

**OBSERVED:** Team Branch must carry Space and Personal Branch must not; Node always carries Branch. `src/modules/knowledge/schema.ts:24-68`, `drizzle/0031_knowledge_space_scope.sql:38-49`.

### Query/service implications

1. Project-scoped Note reads join Node→Branch→Project and continue applying current Branch visibility until authorization is migrated.
2. A Team Node whose Team Space has no Project extension is legacy shared knowledge, not silently Project-owned.
3. New Project Note creation validates Project first and selects/creates only a compatible Team Branch underneath.
4. Existing Branch IDs, slugs and URLs remain valid.
5. Project filters must not use `branches.scope='team'` alone.

### Direct future `project_id` on Note

| Consideration | Derived through Branch | Direct Note Project relation |
| --- | --- | --- |
| Normalization now | Strong; no duplicate ownership source | Duplicates Branch Space and needs consistency enforcement |
| Query simplicity | Requires join already common in current services | Simpler Project filters |
| Migration cost | None for confirmed Team Nodes | Backfill and dual-write needed |
| Branch retirement | Note loses Project when Branch is removed | Project remains independent of organization/privacy |
| Legacy Personal assignment | Cannot represent it without changing Branch | Supports Project-owned but still private legacy Note |

**Recommendation:** do not add direct Project ownership to Team Nodes in Stage 3. Derive it through Branch while Branch remains mandatory. Introduce an authoritative Note→Project relation only in the Note-domain migration that also separates Branch organization from privacy/working state; at that point backfill Team Nodes from the proven derivation and explicitly assigned Personal Nodes only.

### Future Note creation application contract

Conceptual replacement/wrapper:

```text
createProjectNote(actor, {
  projectId,          // required, from current Project context
  title,
  contentMd,
  summary?, tags?, links?,
  workingVisibility? // default author-private draft; not Project ownership
})
```

Required behavior:

1. Resolve `projectId` through the Project service; a Team Space without Project extension is invalid.
2. Require Project contribution capability.
3. Attribute author to authenticated User; later Person linkage is independent.
4. Create an author-private draft in the Project by default, using current Team `NodeDraft` mechanics where possible.
5. On first internal publication/save, create one Project-owned Node plus the first complete NodeVersion; never create a Personal Node first.
6. Preserve optimistic concurrency, Markdown validation and append-only versions.
7. During compatibility, the service may select a hidden/default Team Branch internally, but Branch is not caller input and not a user mental-model requirement.

**OBSERVED:** current Team Draft supports a new draft with nullable `nodeId`, required Team `branchId`, author ownership and version state; publishing it creates a Team Node and complete first version. `src/modules/knowledge/schema.ts:227-264`, `src/modules/knowledge/drafts.ts:65-82`, `src/modules/knowledge/drafts.ts:335-375`.

## 11. Task migration contract

### Target and compatibility states

```text
new Task      → exactly one Project (required)
legacy Task   → one confirmed Project
             or legacy_unassigned (temporary only)
future Task   → optional Activity in the same Project
```

The migration representation should allow nullable Project ownership only long enough to preserve existing rows. `legacy_unassigned` can be derived from `project_id IS NULL`; it does not need a second status field.

### Evidence classification

| Existing evidence | Classification | Reason |
| --- | --- | --- |
| Database-guaranteed Project relation | **Mechanically assignable: none** | Task has no Space FK. `src/modules/pm/schema.ts:55-74` |
| `targetType/targetId` resolving to Source or Team Node | **Potentially inferable but unsafe** | Fields have no enum/FK; service stores arbitrary values; update does not maintain them. `src/modules/pm/schema.ts:66-67`, `src/modules/pm/service.ts:299-309`, `src/modules/pm/service.ts:461-484` |
| DeadlineLink from one/more Project Deadline | **Potentially inferable but unsafe** | Polymorphic target has no Task FK; the same Task can be linked from Deadlines in different Spaces, and validation only enforces Source links. `src/modules/pm/schema.ts:28-40`, `src/modules/pm/service.ts:109-135` |
| Creator or assignee memberships | **Potentially inferable but unsafe** | A User may participate in multiple Projects; ownership/assignment is not Project evidence. |
| Title, notes or dates | **Requires manual assignment** | Semantic inference is explicitly disallowed and not authoritative. |
| Explicitly confirmed cross-TMKT coordination Task | **TMKT-level legacy exception** | Preserve temporarily as unassigned; target still requires eventual placement or an explicit future coordination Project decision. |

### Migration procedure

1. Add a nullable Project relation for compatibility, preserving Task IDs and versions.
2. Produce an inventory containing Task ID/title, creator, assignee, valid resolved target candidates and Deadline links, but label all candidates non-authoritative.
3. Have an authorized human choose one Project or mark temporary TMKT-level legacy exception.
4. Record assignment as a new audited migration event; never rewrite old audit details.
5. Project-scoped authorization must not depend on Project until the row is assigned.
6. Legacy-unassigned Tasks remain visible only through a compatibility read with current access behavior; they do not appear as belonging to any Project.
7. New target service requires `projectId`, validates Project participation and rejects null.
8. Existing global Board reads remain compatibility paths until every caller and Task is migrated; do not silently filter unassigned Tasks out and create a dead end.

**OBSERVED:** current Board and Task detail are global to every authenticated role, and claim/update use global or owner/assignee permissions. `src/modules/auth/authorize.ts:81-90`, `src/modules/pm/service.ts:276-353`, `src/modules/pm/service.ts:355-415`.

**OBSERVED:** task create records title/state/assignee but not Project; update supports optimistic locking and preserves the Task row. `src/modules/pm/service.ts:461-555`.

### Future Task service contract

```text
createProjectTask(actor, {
  projectId,          // required
  title,
  assigneeId?,
  dueAt?, startAt?, notes?,
  activityId?         // later; must belong to same Project
})
```

Project authorization is checked before insert. Assignee eligibility must not be inferred merely from global User existence; the later contract should require valid Project participation or an explicit approved exception.

## 12. Deadline contract

For Stage 2, Deadline maps provisionally to a **Project milestone/deadline**.

```text
Project Deadline ≠ Task due date ≠ Activity date/time
```

**OBSERVED:** Deadline already has required Space, type, due time, reminder offsets and version. Task has its own due/start fields. `src/modules/pm/schema.ts:8-26`, `src/modules/pm/schema.ts:55-74`.

Contract:

- If `deadline.space_id` has a Project extension, its Project ownership is mechanical and uses the same ID.
- If it points to Personal Space or an unconfirmed Team Space, it remains a legacy Deadline pending classification.
- New target Deadline creation requires a confirmed Project and Project contribution/management capability.
- Deadline IDs, reminders and links remain unchanged.
- DeadlineLink does not assign a linked Task's Project and cannot override ownership.
- Existing list and calendar-token behavior may continue through Space compatibility. CalendarToken can already narrow to Space, which becomes the same Project ID for mapped rows. `src/modules/pm/schema.ts:76-84`, `src/modules/pm/service.ts:607-658`.

## 13. Extraction/import contract

### Authoritative Project

```text
ExtractionCandidate
→ SourceVersion
→ Source
→ owning Team Space
→ confirmed Project
```

Source ownership is authoritative. Uploader identity and candidate owner are not.

**OBSERVED:** upload requires `spaceId`, authorizes against it and stores it on Source before extraction is queued. `src/modules/storage/service.ts:37-104`.

**OBSERVED:** candidate creation retains `sourceVersionId`, so the Source Project remains derivable. However `evolveCandidate` asks for an owner Personal Branch and creates the Node there, discarding Project from the Note ownership path. `src/modules/storage/candidates.ts:12-18`, `src/modules/storage/candidates.ts:138-225`.

### Future service contract

```text
evolveCandidateIntoProjectNote(actor, {
  candidateId,
  title?
})
```

Behavior:

1. Resolve Project exclusively from Candidate→SourceVersion→Source.
2. Reject if Source belongs to Personal Space or Team Space without a confirmed Project; require Source assignment first.
3. Require contribution capability in that Project.
4. Create a Project-owned Note/draft using the Project Note service.
5. Preserve candidate, source-version and evolved-node trace.
6. Do not accept caller `projectId` or `branchId`; this prevents moving extracted evidence away from its authoritative Material context accidentally.

Uploader choice must not override Source Project. If the Source was uploaded into the wrong Project, an explicit Material ownership move occurs first with authorization/audit; extraction then follows the corrected owner.

### Existing candidates

- Pending candidate whose Source is in a confirmed Team Project: Project association is mechanically derivable, but runtime evolution remains legacy until the service changes.
- Pending candidate whose Source is Personal/unconfirmed: retain private/unassigned.
- Already evolved Personal Node: retain private/unassigned. Even when the source Project is known, do not widen visibility automatically; offer that Project only as an evidence-backed assignment suggestion.
- Rejected candidate: preserve history; no Note assignment.

## 14. Material ownership contract

Every Material has exactly one authoritative owning Project.

```text
ownership                           research reuse
Source.space_id → one Project       another authorized Project may later
                                    cite/reference Source or SourceVersion
```

Rules:

1. New Project Material requires Project context; underlying Source keeps the same `space_id` identity contract.
2. SourceVersion and TextChunk inherit ownership and never receive separate Project IDs.
3. Folder cannot change ownership independently of its Space; moves validate parent and Source ownership.
4. A cross-Project citation does not change Source ownership and does not duplicate the original bytes.
5. Cross-Project permissions are deferred; no current isolation rule is relaxed in Stage 3.

**OBSERVED:** Source has one non-null Space; versions and chunks form a single ownership chain. Folder checks prevent selecting a Folder from another Space. `src/modules/storage/schema.ts:54-153`, `src/modules/storage/service.ts:452-458`.

**OBSERVED:** current privacy tests hide out-of-Space Source detail, download, lists and search with 404 behavior. `tests/privacy/isolation.test.ts:44-105`.

## 15. Tempo specialization contract

Tempo is represented as:

```text
Project(Tempo)
+ ProjectFeature(library_circulation)
+ User capability to operate that feature in Tempo
```

### Options

| Option | Assessment |
| --- | --- |
| Hard-code Project name `Tempo` | Reject: rename-sensitive and puts domain behavior in display text |
| Project type enum (`normal | tempo`) | Reject: Tempo is not a different ownership kind; future features would create combinatorial types |
| Boolean `libraryEnabled` | Viable for one feature, but becomes scattered flags as specialized capabilities grow |
| **Feature assignment relation/code** | **Recommended:** Project remains normal; feature availability is explicit and extensible |
| Permission alone | Insufficient: permission says who may act, not whether a Project owns/operates a library |

The Project feature controls availability. A separate Project-scoped operator capability controls who may manage it. An ordinary Project participant may still request a loan if product policy allows; operating inventory/circulation is not permanently tied to `admin_op`.

**OBSERVED:** physical metadata is an optional one-to-one Source extension, and LoanTicket reaches Project through SourcePhysical→Source→Space. `src/modules/storage/schema.ts:176-203`, `src/modules/circulation/schema.ts:10-32`, `src/modules/circulation/service.ts:36-46`.

**OBSERVED:** current physical-item and loan management permissions are global Admin/Op capabilities. `src/modules/auth/authorize.ts:35-38`.

**Stage boundary:** define `library_circulation` as the first Project feature in the contract. Do not move current Tempo permissions or create feature-gated routes in Stage 3 unless separately authorized.

## 16. TMKT root decision

| Classification | Decision |
| --- | --- |
| Required now | **No** |
| Useful later | Only if TMKT root itself needs editable/versioned metadata, organization-wide membership records not expressible as capabilities, or the product intentionally supports more than one organization |
| Not justified | A tenant/organization table solely to parent every Project in the current single-TMKT installation |
| Unknown | Whether future product requirements will need persisted TMKT profile/governance metadata |

**Recommendation:** keep TMKT as an implicit singleton domain context for Stage 3. Do not store `organization_id` on Project or introduce multi-tenant query scoping.

**OBSERVED:** current Principal and authorization carry global role plus Space memberships, with no tenant identity. `src/modules/auth/principal.ts:3-17`.

**INFERRED:** adding a root row now would create a second scoping axis with no current isolation requirement, migration source or runtime consumer.

## 17. Compatibility strategy

Use this order:

```text
add compatibility
→ migrate behavior
→ migrate data
→ recompose UI
→ remove legacy later
```

| Legacy surface | Compatibility contract | Retirement gate |
| --- | --- | --- |
| Space APIs/services | Keep existing paths and behavior; add Project facade/services rather than global rename | All callers use Project contract; Personal storage has a separate supported path |
| Space IDs | Reuse as Project IDs for confirmed rows | Never needs retirement; remains physical identity |
| Branch IDs | Preserve and continue resolving | Note ownership/organization no longer depends on Branch and links/releases are migrated |
| Personal/Team scope | Keep as internal visibility/compatibility input; never present as target ownership | Every active Note has Project + explicit working/privacy state; legacy unassigned inventory is zero or formally retained |
| Existing URLs | Keep `/tree`, `/wiki`, `/api/spaces` links resolving; no route redesign in Stage 3 | Explicit redirect/version policy and usage audit complete |
| Audit history | Preserve old action/target literals and IDs; presentation may resolve Space UUID to Project name | Never destructively rewritten |
| WikiRelease | Keep immutable rows and Space ID; Project facade may label mapped owner | Future publishing determines whether release remains operational artifact |
| Personal publication proposals | Preserve source/target IDs and decision history; do not use for new Project Note creation | All pending proposals resolved/migrated and historical reads remain available |
| Existing tests | Preserve old behavior tests; add Project contract tests alongside them | Old tests removed only with the exact compatibility behavior they guard |

**OBSERVED:** released WikiRelease rows cannot be updated or deleted. `drizzle/0034_wiki_releases.sql:19-31`.

**OBSERVED:** Personal-to-Team publication creates a new Node and records proposal/origin relationships; rewriting or deleting either side would break traceability. `src/modules/knowledge/publication.ts:400-487`, `tests/usecase/knowledge-journey.test.ts:125-142`.

### Compatibility read states

Project-aware services must distinguish:

1. `project`: confirmed Team Space with Project extension;
2. `legacy_shared`: Team Space/Team Branch without Project extension;
3. `legacy_private`: Personal Space or Personal Branch content;
4. `legacy_unassigned`: Task or future explicit ownership overlay with no Project.

These states prevent `team`, `shared` or existing visibility from being mistaken for Project ownership.

## 18. Migration invariants

Future implementation must treat these as acceptance constraints:

1. **Privacy:** no Personal Space, Personal Branch, Personal Node, private Draft or candidate becomes visible to another User merely because Project migration runs.
2. **New ownership:** every new target-product Note, Material, Task, Deadline and later Activity has exactly one confirmed Project context.
3. **Legacy honesty:** unknown ownership is represented as legacy/unassigned; it is never guessed from title, content, tags, creator, assignee or filenames.
4. **History:** TreeNodeVersion, SourceVersion, TextChunk, Promotion, AuditEvent, WikiRelease and Proposal history is not rewritten or deleted to make the new model look cleaner.
5. **Identity:** confirmed Project reuses Team Space ID; existing Source, Branch, Node, Task, Deadline, release and loan IDs remain stable wherever possible.
6. **No implicit access widening:** Project registration, ownership assignment or role mapping never grants additional readers as a side effect.
7. **Authoritative scope first:** Project-scoped authorization is enabled for an object only after its Project assignment is authoritative.
8. **Project isolation:** reads and writes continue returning non-disclosing failures for unauthorized Projects; current Space privacy guarantees remain the minimum baseline.
9. **Separate dimensions:** Project ownership, privacy/working state, resource ownership and public publication are not represented by one flag or role.
10. **One ownership source:** Project ID is not duplicated across inheritance chains without an enforced consistency rule.
11. **Source authority for extraction:** candidate/import Project always follows its Source; uploader-selected destination cannot silently override it.
12. **Task evidence ceiling:** current Task targets, Deadline links and memberships are migration hints only, never automatic ownership proof.
13. **Tempo neutrality:** library availability is assigned as a Project feature, never inferred from name; operator permission is separate from system administration.
14. **Compatibility:** old IDs and links continue resolving until explicit usage, data and authorization gates close.
15. **Atomic mutations:** Project creation/assignment and dependent ownership changes commit with audit in one transaction or not at all.
16. **Optimistic concurrency:** existing version guards remain in force for mutable records and apply to new Project metadata.
17. **No destructive archive:** completing or archiving a Project never deletes its research records or immutable history.
18. **Cross-Project reuse is not ownership:** future citation/relationship access must not mutate the owning Project or bypass authorization.

Repository support for these invariants includes owner-only Branch visibility in `src/modules/knowledge/service-queries.ts:30-47`, privacy coverage in `tests/privacy/isolation.test.ts:25-35`, append-only Node versions in `drizzle/0001_v1_schema_parity.sql:48-62`, transactional audit in `src/modules/audit/schema.ts:4-22`, and optimistic Task updates in `src/modules/pm/service.ts:498-555`.

## 19. Unresolved questions

Only the following remain genuinely unresolved after applying Stage 2 product truth:

1. **UNKNOWN:** Which current Team Space rows are real TMKT Projects? In particular, does migration-created `Kho tri thức chung` become a Project, merge into a confirmed Project, or remain `legacy_shared`?
2. **UNKNOWN:** What research lens and initial lifecycle status should be recorded for each confirmed existing Project? Repository names/content must not be used to invent them.
3. **UNKNOWN:** What is the live-data inventory of Personal Space Folders/Sources/Deadlines/Branches/Releases/Tokens and Personal Nodes? Seed data demonstrates possibilities but cannot classify production rows.
4. **UNKNOWN:** Which Project owns each existing global Task, and which are temporary TMKT-level legacy exceptions?
5. **UNKNOWN:** Which Project, if any, owns each Personal Node? A Personal Branch may contain Notes from multiple Projects.
6. **UNKNOWN:** Does TMKT Core capability itself grant internal access to every Project, or must Core members also be explicit Project participants? The safe default is no implicit access widening.
7. **UNKNOWN:** Which current Users should receive future TMKT curation/publishing capability? Current `editor`, `manager` and `admin_op` are evidence inputs, not authoritative mapping.
8. **UNKNOWN:** Which Users may operate Tempo, independently of global system administration?
9. **UNKNOWN:** Are duplicate Project names valid? Space currently does not enforce name uniqueness; identity remains UUID-based regardless.
None of these questions requires Activity, Person, public publishing, semantic search, Graph/GIS, navigation or UI design.

## 20. Recommended Stage 3

Recommended Stage 3:
Implement the Project identity foundation as a one-to-one Project extension over product-confirmed Team Spaces, with `Project.id == Space.id`, and introduce a Project domain/service facade while preserving all current Space behavior.

Changes allowed:
One Project metadata table and migration keyed to `spaces.id`; Project schema/domain types; transactional create/read/update/list Project services; an explicit backfill manifest for confirmed Team Spaces; audit records for new Project metadata mutations; focused schema/service/migration/privacy tests. Keep `spaces.name` and `space_members` as the compatibility source for name and participation. No route or UI changes are required.

Migration required:
Yes. Create the extension table without rewriting existing IDs or foreign keys. Backfill only Team Spaces explicitly confirmed as Projects, with supplied research lens and lifecycle status. Leave Personal Spaces and unconfirmed Team Spaces untouched and classified as legacy.

Must NOT include:
Task `project_id`, Note ownership migration, Personal data movement, role/Core authorization changes, Tempo permission changes, Activity, Person, public publication, cross-Project access, route renaming, navigation or UI work. Those depend on the authoritative Project set established here.

Acceptance gates:
Every Project row references an existing Team Space and shares its UUID; archived Projects remain representable without deleting the extension; no Personal Space receives a Project row; confirmed Project metadata is explicit rather than content-inferred; Project create/update is optimistic and audited; existing Space APIs, memberships, IDs, privacy behavior, Branch/Node URLs and WikiRelease history remain unchanged; unconfirmed Team Spaces remain accessible only through legacy compatibility; migration rollback removes only the new extension data/schema; all existing checks plus focused Project tests pass; `git diff` contains no out-of-scope application changes.
