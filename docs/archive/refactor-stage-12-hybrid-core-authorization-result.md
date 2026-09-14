# Stage 12 — Hybrid Core & Project Authorization Foundation Result

## 1. Result

**PASS.** WisdomTree now has an explicit singleton-TMKT Core roster and one centralized, durable research-read rule. Explicit Core can discover and read official research across confirmed Projects without receiving synthetic Project memberships or operational authority.

Tasks, Activities, Project management, contributor workflows, candidate evolution, private drafts, Personal data, legacy Spaces, public publishing, Calendar, routes and UI were not widened or redesigned.

## 2. Explicit Core identity model

The tmkt_core_members table records one optional Core membership per authentication User:

    user_id      primary key → users.id
    granted_by   → users.id
    created_at

There is no TMKT/tenant row because the installation still has one implicit TMKT context. Core is not stored on canonical Person, person_user_links, project_people, space_members, or the global User role.

Both User foreign keys use ON DELETE RESTRICT. This preserves an explicitly granted roster and its granting identity rather than silently erasing research-governance state during User deletion.

## 3. Core vs global roles

Core membership is independent from user, editor, and admin_op. Tests verify that:

- admin_op is not Core automatically;
- editor is not Core automatically;
- Project manager/member status is not Core;
- Person ↔ User identity linkage is not Core;
- project_people context is not Core.

An admin_op may administer the Core roster through existing system-administration authority. This does not grant that administrator Core research access.

## 4. Core roster administration

Added:

    grantTmktCore(actor, userId)
    revokeTmktCore(actor, userId)
    listTmktCoreMembers(actor)

The boundaries use admin.tmkt_core.manage, which remains restricted to the existing admin_op system role. Grant is idempotent, revoke is immediate, and neither operation creates or removes any space_members row.

Audit actions:

    tmkt.core.grant
    tmkt.core.revoke

Audit metadata contains only userId and actorId; no user profile content is copied.

## 5. Research-read authorization primitive

requireProjectResearchRead(actor, projectId) implements:

    confirmed Project
    AND
    (
      durable Project membership
      OR
      explicit tmkt_core_members row
    )

researchReadableProjectIds(actor) supplies the same rule for aggregate reads. Both Project membership and Core status are read from the database at authorization time. Core is not cached on Principal, so revocation takes effect for the next service call even when the caller still holds the same in-memory Principal/session object.

The capability vocabulary is explicitly represented as:

    tmkt.research.read_all
    tmkt.research.curate
    tmkt.publish

Only tmkt.research.read_all has Stage 12 behavior. The other two are eligibility/foundation for later narrow services, not broad write permission.

## 6. Research surfaces receiving Core read

The centralized research-read rule now applies to target services for:

- confirmed Project metadata and Project discovery;
- official internal Project Notes;
- Project Materials, Material detail, and stored-file download tokens;
- canonical Persons through confirmed Project relationships;
- version-specific supporting SourceVersions and NoteVersions;
- supporting-research reads filtered by currently readable confirmed Projects.

Material download still requires a stored current SourceVersion and uses the existing signed download-token mechanism. Archived/withdrawn management remains under its existing separate rule. Legacy/Personal Space Material reads keep their previous authorization behavior.

Core Project Note lists return official Notes only when the Core user has no Project membership. Private drafts are not added to that result.

## 7. Operational surfaces remaining Project-membership-only

No operational permission was made Core-aware. Focused coverage confirms Core without Project membership cannot:

- create or list Project Tasks;
- create, read, list, or mutate Activities;
- attach Activity participants, Materials, or Notes;
- create Project Materials or add Material versions;
- create Project Notes;
- evolve an extraction Candidate into a Project Note;
- update Project metadata;
- edit canonical Person metadata through the contributor baseline.

Core plus real Project contributor membership continues to perform normal operational work in that Project. Revoking Core does not remove or reduce that actual membership.

## 8. Private draft/Personal privacy preservation

Core is not a draft-reader capability. Existing author checks and Project mutation participation remain authoritative for NodeDraft.

Tests verify that a Core user cannot read another author's Project draft or a Personal/project-less Note. listProjectNotes returns the caller's private drafts only when the caller also has real Project membership; Core-only access returns no drafts.

No Core rule applies to Personal Spaces, legacy Team Spaces, Kho tri thức chung, or project-less compatibility Notes.

## 9. Cross-Project research-support behavior

Stage 9 target-draft mutation remains contributor-only in the target Project. Only the supporting-side read check now uses Hybrid research read.

Verified behavior:

    Core + contributor in Project A + no membership in Project B
    → may attach immutable SourceVersion and NoteVersion evidence from B to a draft in A

Without Core, the same actor cannot discover or attach Project B evidence. After Core revocation, Project B supporting rows are filtered from reads while Project A operational membership remains effective. Ownership and immutable version identifiers do not move.

## 10. Core capability foundation for curation/publication

Explicit Core membership now establishes future eligibility for tmkt.research.curate and tmkt.publish, but Stage 12 deliberately consumes neither capability for mutations.

Global Person editing remains contributor-in-a-linked-Project only. Existing Proposal, WikiRelease, review, public routes and publication state are unchanged. Stage 13 must introduce a separate stable public Note projection and consume tmkt.publish directly; it must not infer publication authority from editor, admin_op, or Project manager.

## 11. Schema/migration

Migration: drizzle/0044_tmkt_core_foundation.sql.

It creates only tmkt_core_members with restrictive User foreign keys. It contains no INSERT, role conversion, Project membership synthesis, Person/User inference, or demo-data backfill.

## 12. Existing demo-data preservation

Normal local database wisdomtree received only migration 0044.

| Structure         | Before | After |
| ----------------- | -----: | ----: |
| Users             |      6 |     6 |
| Space memberships |     16 |    16 |
| Projects          |      1 |     1 |
| ProjectPeople     |      0 |     0 |
| Persons           |      0 |     0 |
| Activities        |      0 |     0 |
| Tasks             |      2 |     2 |
| TreeNodes         |     34 |    34 |
| NodeDrafts        |      0 |     0 |
| Sources           |     36 |    36 |
| TMKT Core members | absent |     0 |

Stable fingerprints before/after:

    users              a3e1210ff4396ea2162d6da0a60a4fed
    space_members      d017cf9f7cfb519f511429953a44ef5a
    Notes + Materials  0052bd2ef2d30d83819c206fbeca9fe8

Migration head advanced from 0043_activity_foundation.sql to 0044_tmkt_core_foundation.sql. No existing User was granted Core.

## 13. Tests executed

All stateful validation used explicitly isolated PostgreSQL databases protected by TEST_DATABASE_URL. Both Stage 12 test databases were disposed afterward.

| Command                                      | Result                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| Fresh migration chain through 0044           | PASS                                                                         |
| Focused zz-hybrid-core-authorization.test.ts | PASS                                                                         |
| npm run test:integration                     | PASS — 16 files                                                              |
| npm run test:usecase                         | PASS — 3 files                                                               |
| npm run test:privacy                         | PASS — 2 files                                                               |
| npm test                                     | PASS — lint, typecheck, 8 unit files, boundaries, signing, time and contrast |
| npm run build                                | PASS — Next.js 15.5.22 production build, 35 static pages                     |
| Prettier check / git diff --check            | PASS                                                                         |

During validation, the existing Project foundation test exposed a stale-Principal membership assumption. The centralized research primitive was corrected to read durable Project membership on each call rather than relying on the Principal's cached membership list. A full clean migration/seed/suite then passed. A separate full-suite Person fixture collision was resolved by giving the Hybrid test its own invited User rather than reusing a User already linked by Stage 10 tests; no production behavior changed for that test-fixture correction.

## 14. Files changed

Stage 12 files:

    src/modules/auth/schema.ts
    src/modules/auth/authorize.ts
    src/modules/auth/core.ts
    src/modules/project/service.ts
    src/modules/knowledge/drafts.ts
    src/modules/knowledge/support.ts
    src/modules/storage/service.ts
    src/modules/person/service.ts
    drizzle/0044_tmkt_core_foundation.sql
    tests/integration/zz-hybrid-core-authorization.test.ts
    docs/refactor-stage-12-hybrid-core-authorization-result.md

Accepted Stage 1–11 worktree changes remain present and were not cleaned or rewritten.

## 15. Compatibility gaps

- tmkt.research.curate has no global mutation consumer yet.
- tmkt.publish is reserved for Stage 13; no public Note publishing exists.
- No Core roster route, UI, badge, or navigation exists.
- Generic legacy Library, Tree, search, Graph and WikiRelease surfaces were not globally converted to Core-aware semantics; Stage 12 applies to the target Project research boundaries listed above.
- Person global curation/edit remains unresolved and membership-based.
- No sensitivity classification beyond current Project viewer-equivalent research read exists.
- Core grants currently require an enabled existing User; invited-but-enabled Users are valid.

## 16. Recommended Stage 13

Implement **stable public Note publishing** as one narrow vertical slice:

    internal authoritative Note version
    → explicit Core publish
    → immutable public revision

    internal edits continue
    → previous public revision remains visible

    explicit publish changes
    → new public revision becomes current

Use the same Note identity with a stable public projection/revision, support unpublish, and authorize with explicit tmkt.publish. Do not reuse whole-Space WikiRelease as the new Note publishing model, require second-person approval, or include UI redesign, public Person pages, Calendar, Graph, or seed rewrite.
