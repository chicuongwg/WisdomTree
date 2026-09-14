# Stage 10 — Canonical TMKT Person Foundation Result

Date: 2026-09-01 (Asia/Ho_Chi_Minh)

## 1. Result

**PASS**

WisdomTree now has one canonical TMKT-wide Person identity that is independent from authentication User identity. A Person may be related to multiple confirmed Projects without duplication, and Person-to-Project context never grants application access.

No existing User, display name, membership, Note or Material was converted, matched or backfilled. No Activity, Note/Material Person reference, public Person page, Hybrid Core, generic entity system, semantic deduplication, UI or route was added.

## 2. Person identity model

`persons` is a concrete canonical identity table with:

```text
id
display_name
summary?
created_by
created_at
updated_at
version
```

`display_name` is required and trimmed through the service, but deliberately not unique. Database coverage confirms two different Person IDs may have the same display name. No alias, biography ontology, demographic fields, fuzzy matching, merge or automatic entity resolution exists.

Person metadata uses optimistic versioning. There is no destructive Person deletion service.

## 3. Person vs User separation

`persons` has no authentication role, email, login identifier or Project permission fields. `person_user_links` is a separate optional bridge:

```text
Person 0..1 ↔ 0..1 User
```

`person_id` is the primary key and `user_id` is independently unique. A Person remains valid without a link. Stage 10 exposes no general User-link mutation service because Project contributor authority is not sufficient for authentication identity linkage.

The User FK uses `ON DELETE CASCADE` to remove only the link if that authentication identity is removed. The Person FK cascades only the bridge row if a Person is ever removed through a future controlled process. Neither direction cascades deletion into the other identity table.

Existing repository User retention remains restrictive through other audit/ownership references; Stage 10 does not introduce or change User deletion behavior.

## 4. ProjectPerson model

`project_people` is an explicit many-to-many relation between confirmed `projects.project_id` and canonical `persons.id`.

```text
Project A ─┐
           ├→ Person P
Project B ─┘
```

Its composite primary key prevents duplicate attachment. `project_id` and `person_id` use restrictive FKs, so deleting a relation never deletes the Project or Person. The relation contains only creation metadata; it has no rigid research-role enum.

`project_people` is contextual research data only. It is not read by session resolution or authorization and is not interchangeable with `space_members`.

## 5. Creation/attachment contracts

Added service boundaries:

```text
createProjectPerson(actor, {
  projectId,
  displayName,
  summary?
})

attachPersonToProject(actor, {
  projectId,
  personId
})
```

Creation requires a confirmed Project plus contributor-or-higher participation. It atomically creates the canonical Person, attaches the Project relation and records `person.create` plus `project.person.attach` audit events.

Attachment requires contributor-or-higher access to the target confirmed Project. The existing Person must already be discoverable through another confirmed Project readable by the actor. UUID guessing therefore cannot expose or attach an inaccessible Person. Duplicate attachment is idempotent and creates no second Person or audit entry.

No detach service was required for this foundation. A future detach removes only `project_people`; it must not delete the canonical Person.

## 6. Person visibility/read model

Added:

```text
getPerson(actor, personId)
listProjectPeople(actor, projectId)
searchAccessiblePeople(actor, query?)
```

A Person is visible only through at least one relation to a confirmed Project the actor currently accesses through `space_members`.

- `getPerson` returns canonical metadata and only Project IDs visible to the caller.
- `listProjectPeople` returns exactly the Persons attached to one readable confirmed Project.
- `searchAccessiblePeople` aggregates across readable confirmed Projects, returns one row per canonical Person and omits inaccessible Persons.

The search is an internal metadata lookup limited to 50 results. It does not perform fuzzy matching, identity resolution or deduplication.

## 7. Person update model

`updatePerson(actor, input)` updates `displayName` and/or `summary` with `expectedVersion`.

Before Hybrid Core exists, mutation requires contributor-or-higher membership in at least one confirmed Project currently linked to the Person. A viewer can read but cannot edit. An actor with no common Project receives non-disclosing Person resolution.

Because Person is canonical, one successful update is immediately visible through every Project relation. Audit details contain only Person ID and changed field names; summary text is not copied into audit.

This shared-edit baseline is deliberately provisional. Stronger TMKT-level curation ownership remains a Hybrid Core decision.

## 8. User-link policy

Stage 10 provides schema integrity only for User linkage.

No existing User was linked. Project contributors cannot create, replace or remove links through an application service. Focused tests insert isolated link fixtures directly to verify:

- one User cannot link to multiple Persons;
- one Person cannot link to multiple Users;
- linking a User creates no `space_members` row;
- a linked User gains no Person or Project visibility merely from the identity link.

A later account-administration stage must define who may assert or correct real-world identity linkage.

## 9. Authorization separation

Two narrow compatibility capabilities were added:

```text
project.person.read   → viewer-or-higher Project membership
project.person.manage → contributor-or-higher Project membership
```

Services first resolve a confirmed Project extension, so Personal Spaces, legacy Team Spaces and arbitrary Space UUIDs are rejected. Creation checks read visibility before mutation authority: outsiders receive non-disclosing `not_found`, while an actual Project viewer receives `forbidden` for mutation.

Neither global `editor`/`admin_op`, Person linkage nor `project_people` is interpreted as future TMKT Core. Operational access and authentication remain User/`space_members` based.

## 10. Migration/schema

Migration: `drizzle/0042_person_foundation.sql`.

It creates:

```text
persons
person_user_links
project_people
```

It includes non-empty name and positive-version checks, strict Person/User uniqueness, composite Project/Person uniqueness, foreign keys and lookup indexes. It contains no `INSERT`, `UPDATE`, backfill, name comparison or inferred identity logic.

The complete migration chain through 0042 was validated from zero before applying it to normal `wisdomtree`.

## 11. Existing demo-data preservation

Normal local database `wisdomtree` received only migration 0042.

| Structure         | Before | After |
| ----------------- | -----: | ----: |
| Users             |      6 |     6 |
| Space memberships |     16 |    16 |
| Projects          |      1 |     1 |
| TreeNodes         |     34 |    34 |
| Sources           |     36 |    36 |
| Tasks             |      2 |     2 |
| Persons           | absent |     0 |
| ProjectPeople     | absent |     0 |
| PersonUserLinks   | absent |     0 |

Stable fingerprints:

```text
users          4e2225293a8f2cfd911788e1c44ddfd4
space_members  bd33899bd4ebd2a1448b2c97083782cd
```

Migration head advanced from `0041_research_note_support.sql` to `0042_person_foundation.sql`.

## 12. Tests executed

Stateful validation used isolated PostgreSQL databases `wisdomtree_test_stage10_20260901` and fresh canonical baseline `wisdomtree_test_stage10_full_20260901`. Both were disposed after testing.

| Command                                                  | Result                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Focused `person-foundation.test.ts`                      | PASS                                                                      |
| Fresh migration chain through 0042                       | PASS                                                                      |
| Project, Task, Note, Material and research-support tests | PASS through integration suite                                            |
| `npm run test:integration`                               | PASS — 14 files                                                           |
| `npm run test:usecase`                                   | PASS — 3 files                                                            |
| `npm run test:privacy`                                   | PASS — 2 files                                                            |
| `npm test`                                               | PASS — lint, typecheck, 8 unit files, boundaries, signing, time, contrast |
| `npm run test:boundaries`                                | PASS through `npm test` — 205 delivery files, no direct DB access         |
| `npm run build`                                          | PASS — 35 pages generated                                                 |
| `git diff --check`                                       | PASS                                                                      |

The production build retains the repository's existing warning that the Next.js ESLint plugin is not detected. Compilation, type validation and page generation passed.

## 13. Files changed

Stage 10 changed only:

```text
src/modules/person/schema.ts
src/modules/person/service.ts
src/modules/auth/authorize.ts
src/db/schema.ts
drizzle/0042_person_foundation.sql
tests/integration/person-foundation.test.ts
docs/refactor-stage-10-person-foundation-result.md
```

Accepted pre-existing Stage 1–9 changes remain untouched.

## 14. Compatibility gaps

- No route or UI exposes People yet.
- User↔Person link mutation has no application service or finalized authority policy.
- There is no detach, delete, merge, alias or duplicate-resolution workflow.
- Person metadata editing uses the current contributor-in-any-linked-Project baseline; Hybrid Core curation remains unresolved.
- Search is simple accessible-name filtering, not semantic/fuzzy identity matching.
- No Note, Material, SourceVersion or public publication references Person yet.
- ProjectPeople has no contextual role/annotation; Activity should supply contextual participant roles later.
- Project lifecycle does not currently change Person visibility beyond existing readable Project behavior.

## 15. Recommended Stage 11

Recommended Stage 11: **Project Activity foundation**.

Narrow target:

```text
Project
→ Activity
   ├ participants → canonical Person
   ├ optional Task relations
   ├ Material relations
   └ resulting Note relations
```

Stage 11 should determine a minimal Activity lifecycle and flexible type/context model without implementing Calendar integration, UI, public publishing, Hybrid Core or generic Graph semantics.
