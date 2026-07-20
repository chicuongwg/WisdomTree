# Authorization Design

## Purpose

- Turn the permissions matrix into one enforceable backend design: where checks run, how scopes are resolved, and how the matrix itself becomes the authorization test suite.

## In Scope

- Principal model and claims.
- The permission catalog and its scope qualifiers.
- Enforcement pipeline in the app, object-storage delivery, and the unauthenticated ICS exception.
- Generating authorization tests from the permissions matrix.

## Out of Scope

- Google OIDC login mechanics.
- UI visibility rules (derived from the same catalog client-side, but UI hiding is never the security boundary).
- Phase 1.5 role splits (the design leaves room; it does not implement them).

## Decisions

- Authorization is enforced in the service layer through a single `authorize(actor, permission, resource)` helper; route handlers never hand-roll checks. UI hiding is convenience only, matching the NFR "sensitive routes require backend authorization, not just UI hiding".
- Scope resolution has exactly four qualifiers: `global` (role alone), `space` (membership in the resource's space), `owned-or-assigned` (creator or explicit Admin/Op assignment), and `self` (the actor's own records). Every matrix row maps to a role set plus one qualifier.
- Space-scoped list queries are filtered by a single query-layer helper that joins `space_members`; per-endpoint ad hoc filtering is forbidden. Postgres RLS is not used in V1: app-layer scoping plus the generated test suite is verifiable and debuggable by a single operator.
- Comments inherit scope from their anchor: the comment permission check delegates to "can the actor see the anchor object".
- Out-of-scope reads return `404`, not `403`, so cross-space existence is not leaked; denied writes return `403` and are audited with `outcome=denied`.
- Original-file downloads redirect to short-lived signed object-storage URLs (minutes, single object); object keys are opaque and never guessable paths.
- The permissions matrix is the test fixture: the table in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md) is parsed at test time and every row is asserted against the real `authorize` implementation for all three roles.

## Dependencies

- Roles and matrix in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).
- Ownership definition in [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md).
- `space_members` and audit tables in [`database-schema.md`](./database-schema.md).
- Security baseline in [`../requirements/non-functional-requirements.md`](../requirements/non-functional-requirements.md).

## Acceptance Criteria

- Every row of the permissions matrix maps to a permission key, role set, and scope qualifier in the catalog below.
- The enforcement pipeline names the exact order of checks for any request.
- The matrix-driven test design is concrete enough to implement without further decisions.

## Principals and Claims

A request principal is resolved once per request from the session:

- `userId`, `role` (`user` | `editor` | `admin_op`), `disabled` check.
- `spaceIds`: the actor's memberships from `space_members` (cached per request, never per check).

`admin_op` implies global scope everywhere. `editor` implies every `user` permission. Role is stored on `users.role` and changed only by Admin/Op (audited as a permission-sensitive change).

Two principals bypass parts of the pipeline by design:

- The ICS feed authenticates by `calendar_tokens` token, not session; it resolves to the token's user and reuses the same deadline-visibility scoping.
- Worker jobs act as a system principal; they write through module service paths so lifecycle and audit rules still apply, but they are not permission-checked as a user.

## Enforcement Pipeline

Order for every request:

1. **Session middleware** — resolve principal or `401`.
2. **Route guard** — declared `permission` key per route (from the catalog); calls `authorize(actor, permission, resource)`.
3. **`authorize`** — role check, then scope-qualifier check (`space`: resource's `space_id` ∈ actor's `spaceIds`; `owned-or-assigned`: `created_by`/`submitted_by` = actor or an active assignment; `self`: record's user id = actor).
4. **Query scoping** — list endpoints call `scopedToSpaces(query, actor)`, the one helper that appends the membership filter (no-op for `admin_op`).
5. **Audit** — the mutation service writes `audit_events` in the mutation transaction; a denial at step 3 writes `outcome=denied` for permission-sensitive actions.

## Permission Catalog

Permission keys are `module.action`. "Roles" lists the minimum roles allowed; scope shows the qualifier applied on top. This table is the normative mapping of every matrix row.

| Permission key | Matrix row | Roles | Scope |
| --- | --- | --- | --- |
| `auth.signin` | Sign in via Google OIDC | all | global |
| `knowledge.node.read` | Read tree nodes | all | global |
| `knowledge.search` | Search tree | all | global |
| `storage.search` | Search source repo items | all | space (editor also owned-or-assigned outside member spaces) |
| `knowledge.graph.read` | Open dedicated graph surface | all | global |
| `storage.intake.open` | Open source intake | all | global |
| `storage.library.browse` | Browse Library of stored items | all | space |
| `storage.gap.create` | Create branch-gap request | all | global |
| `knowledge.branch.create` | Create branch | editor | global |
| `knowledge.branch.edit` | Edit branch metadata | editor | owned-or-assigned (admin_op global) |
| `knowledge.node.create` | Create manual node | editor | global |
| `knowledge.node.edit` | Edit manual node | editor | owned-or-assigned (admin_op global) |
| `audit.node.read` | View node audit summary | editor | owned-or-assigned (admin_op global) |
| `storage.upload` | Upload source file | all | space (target space membership) |
| `storage.submissions.read` | View own submissions | all | self |
| `storage.source.read_all` | View source items across all spaces | admin_op | global |
| `storage.download` | Download original source file | all | space |
| `storage.corrected.edit` | Edit corrected text when owned or assigned | editor | owned-or-assigned |
| `storage.draft.edit` | Edit Markdown draft when owned or assigned | editor | owned-or-assigned |
| `review.corrected.approve` | Approve corrected text | admin_op | global |
| `storage.trust.change` | Change source trust status | admin_op | global |
| `review.draft.approve` | Approve Markdown draft for publication | admin_op | global |
| `knowledge.publish` | Publish to tree | admin_op | global |
| `knowledge.node.merge` | Merge duplicate nodes | admin_op | global |
| `knowledge.archive` | Archive node or source | admin_op | global |
| `knowledge.taxonomy.manage` | Manage tags and taxonomy | admin_op (editor: suggest only) | global |
| `pm.board.manage` | Manage operational board | admin_op (user, editor: owned-or-assigned task updates) | global |
| `export.document` | Export node Markdown to docx or pdf | all | global |
| `catalog.browse` | Browse and search library catalog | all | space (library space) |
| `circulation.loan.request` | Request to borrow a catalog item | all | space (library space) |
| `circulation.loan.manage` | Approve or decline a loan, lend, and mark returned | admin_op | global |
| `catalog.item.manage` | Add, edit, or import catalog items | admin_op | global |
| `catalog.item.flag` | Mark catalog item lost or in repair | admin_op | global |
| `catalog.link_source` | Link a digitized source to a catalog item | admin_op | global |
| `notify.comment.create` | Comment on an object the user can see | all | anchor (delegates to anchor's read permission) |
| `storage.personal_space` | Keep private notes in a personal space | all | self |
| `notify.preferences.manage` | Set own notification preferences | all | self |
| `pm.deadline.read` | View project deadlines and subscribe the calendar feed | all | space (project space) |
| `pm.deadline.edit` | Create or edit a project deadline | all | space (project space) |
| `storage.space.manage` | Manage spaces and membership | admin_op | global |
| `export.tree.trigger` | Trigger export | admin_op | global |
| `admin.health.read` | View backup and system health | admin_op | global |

Addendum (2026-07-20, found during the knowledge-module build — capabilities implied by the flows but missing explicit keys):

| Permission key | Capability | Roles | Scope |
| --- | --- | --- | --- |
| `storage.curation.assign` | Assign curation work to an editor | admin_op | global |
| `storage.gap.triage` | Triage, convert, reject, or archive a branch-gap request | admin_op | global |
| `review.queue.read` | Open the review queue and publish-review workbench | admin_op | global |
| `storage.source.manage` | Rename your own uploaded source, or withdraw it while nothing is derived from it | user, editor, admin_op | owned-or-assigned |
| `pm.board.read` | Open the operational board — every approved member sees the team's workload (owner decision 2026-07-21) | user, editor | global |
| `pm.task.claim` | Take an unassigned task from the shared pool (guild-board model, owner decision 2026-07-21) | user, editor, admin_op | global |
| `pm.task.archive` | Archive a finished or mistaken task off the board | admin_op (user, editor: own tasks) | owned-or-assigned |
| `admin.users.manage` | Change a member's role or disable/re-enable an account, always audited with old and new values | admin_op | global |
| `admin.audit.read` | Read the audit trail in the Admin Console | admin_op | global |
| (ruling) | Log an achievement stays under `pm.board.manage` (editor owned-or-assigned, admin_op global); baseline users do not log achievements | | |

Notes:

- "Editor plus assigned items" in source search means: the space filter is a union of member spaces and sources with an active assignment to the actor.
- Publishing (`publish: true` flag on a node) rides on `knowledge.publish`; only Admin/Op sets it and only on `verified` nodes (also enforced by the schema CHECK).

## Matrix as Test Fixture

The authorization test suite does not restate the rules; it reads them:

1. A test-time parser loads the Matrix table from `permissions-matrix.md` (it is machine-readable Markdown: capability, then one cell per role).
2. Each cell value maps to an expectation: `Yes` → allow with global scope; `No` → deny; scoped phrases (`Member spaces only`, `Owned or assigned only`, `Project members`, `Within member spaces`, `Limited …`) map to a small closed vocabulary of scope fixtures — an in-scope case that must allow and an out-of-scope case that must deny.
3. Fixtures build one world: two team spaces, a personal space, a library space, three users (one per role), one source per space, one node owned by the editor and one not, a catalog item, a loan, a deadline.
4. For every (row × role) the suite calls the real `authorize` (and, for list endpoints, the real scoped query) and asserts the expectation — roughly 40 rows × 3 roles plus scope variants, ~150 generated cases.
5. An unmapped row or an unknown cell phrase fails the build, so the matrix and the implementation cannot drift apart silently — the doc stays the single source of truth.

Deny paths assert two things: the HTTP contract (`404` for out-of-scope reads, `403` for denied writes) and the `audit_events` row with `outcome=denied` for permission-sensitive actions.

## Object Storage Delivery

- `GET /api/source/:id/download` authorizes `storage.download`, then issues a signed URL valid for minutes for exactly one object key and redirects; the bucket allows no public or listing access.
- Cover photos and previews follow the same signed-URL path with the anchor object's scope.

## Auditing Authorization

- Role changes, space membership changes, and calendar-token revocations are permission-sensitive admin changes: always audited with old and new values.
- Investigation queries (NFR) can join `audit_events` by actor and target to reconstruct uploader → editor → approver chains, including denied attempts.
