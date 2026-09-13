# Stage 17.PR2 — Personal Projects, Kanban, Internal Calendar & Personal Graph

## 1. Verdict

**PASS.** PR2 restores one private Personal Project per active User, Task List/Kanban/Calendar projections over the canonical Task domain, standalone Deadline visibility, membership-bounded ICS, and Project-scoped Graph selection. No Personal Space, Board Task, Calendar Task, or separate Personal Graph model was introduced.

## 2. Worker usage

- Main worker: Codex Terra Extra High.
- Luna read-only scouts used: 3.
  - Personal Project/schema and lifecycle feasibility.
  - Legacy Board/Task/Deadline/ICS behavior.
  - Graph, Search, and privacy boundaries.

## 3. Initial architecture audit

- `projects` originally accepted only Team Spaces. Existing Personal Spaces already had an owner uniqueness invariant, but did not have durable Project identity.
- The migration extends each Personal Space into the normal Project model; it does not create an additional Team Space or rewrite legacy projectless Notes.
- Legacy Board was a real alternate Task projection. The canonical `tasks.state` values (`todo`, `doing`, `done`, `archived`) are sufficient for target Kanban.
- Legacy standalone `deadlines` remains a viable independent domain. Its schema has no completion/archive state, so PR2 restores the supported create/edit/view behavior only.
- The former calendar schedule and ICS visibility rules were not safe target defaults: target Calendar and ICS now use confirmed Project membership rather than global Board visibility.

## 4. Personal Project model

- `projects.personal_owner_id` identifies a Personal Project; `NULL` continues to mean Shared Project.
- A partial unique index permits at most one Personal Project per User.
- database triggers now enforce the compatible backing Space kind:
  - Shared Project → Team Space.
  - Personal Project → its owner’s Personal Space.
- Existing Personal Spaces become Personal Projects in place. Existing Project rows remain Shared. No research content was moved or fabricated.

## 5. Provisioning/lifecycle

- `ensurePersonalProject(userId)` is idempotent and uses a transaction-scoped advisory lock to converge concurrent lifecycle calls.
- It provisions only active Users and creates the owner’s manager membership with the normal Project/Space identity.
- Migration `0052_personal_projects.sql` backfills existing Personal Spaces and provisions active Users missing one Personal Project.
- Canonical invite/re-enable, OIDC callback, and development-login lifecycle paths call the same idempotent operation. Ordinary page GETs do not provision Projects.
- The destructive demo seed now recreates Personal Project extensions after it truncates data, preserving the migrated invariant in isolated suites.

## 6. Privacy/authorization

- Membership remains sufficient for Personal Project access; TMKT Core access is explicitly limited to Shared Projects (plus the actor’s own Personal Project if applicable).
- Unrelated User, Core-only User, and `admin_op` without membership receive non-disclosing `not_found` access results for another User’s Personal Project.
- Project Notes, Materials, Tasks, Activities, extraction-candidate handoff, Search, Graph, Calendar, and target physical-material route guards now honor the Project research-read boundary.
- Personal Project membership mutation and Library capability activation are blocked. Project People remains separate from User membership.

## 7. Projects UI

- `/app/projects` separates **My Project** from **Shared Projects**.
- Project header and switcher render the localized My Project label for a Personal Project.
- Personal Project settings retain metadata but hide member administration and Library operator/capability controls.
- Administration lists only Shared Projects for Project/capability operations.

## 8. Task List/Kanban

- `/app/projects/:projectId/tasks` keeps the existing List and adds `?view=kanban`.
- Kanban lanes derive directly from canonical Task status: To do, In progress, Done.
- Cards show title, assignee, due date, optional Activity, status, canonical task link, and safe explicit status controls.
- No drag/drop dependency or duplicate client task state was added.
- A task link from the Calendar opens canonical Project Task context (`/app/projects/:projectId/tasks?task=:taskId`).

## 9. Task claim parity

- Target `POST /api/app/projects/:projectId/tasks/:taskId/claim` uses the existing Task domain.
- `claimProjectTask` is confirmed-Project and membership scoped, atomically claims only an unassigned non-archived Task, and retains the existing audit behavior.
- Browser smoke exercised claim and canonical status transition controls against isolated data.

## 10. Internal Calendar

- Added `/app/calendar` as an authorized workload/deadline projection.
- Month is provided; a compact Week view is also restored without Board architecture.
- Calendar shows Task count, title, status, Project/Activity context, overdue treatment, and standalone Deadline entries.
- Scope is All operational Projects or one individual operational Project, including My Project. Core research-read alone cannot see another User’s operational workload.
- Deadline create/edit is available where the actor has the existing contributor permission. No unsupported deadline completion/archive state was invented.

## 11. Standalone Deadline result

**PASS with existing-domain scope.** Target Calendar restores standalone Deadline create, edit, and view. `deadlines` has no complete/archive state or corresponding service operation, so completion/archive is **not applicable with evidence**, not silently omitted.

## 12. ICS/Google Calendar relationship

- Existing bearer-token ICS subscription remains in place.
- Feed output now includes due canonical Tasks and standalone Deadlines for the subscribing User’s Project memberships.
- Personal Project workload remains private even for an `admin_op` or Core User.
- No Google OAuth, two-way sync, external event mutation, or calendar framework was introduced.

## 13. Personal Graph

- Personal Graph is the existing target Graph scoped to the actor’s Personal Project.
- `/app/graph?projectId=:projectId` provides My Project, Shared Project, and existing all-readable scopes.
- Scope validation uses the same research-readable Project IDs as Search. It cannot reveal another User’s Personal Project.
- Graph data remains persisted Project/Note/Material/Person/Activity relationships only.

## 14. Search/My Work integration

- Search includes the actor’s Personal Project research and excludes it for unrelated/Core-only actors.
- My Work already aggregates canonical assigned Tasks over current Project memberships, so Personal Project Tasks require no second dashboard.
- Project People remains research identity data; Personal Project ownership does not fabricate a Person record.

## 15. Schema/migrations

- Migrations: **1** — `drizzle/0052_personal_projects.sql`.
- Dependencies: **0**.
- The migration is necessary for durable one-Personal-Project-per-User, backing-Space compatibility, privacy distinction, and safe Project listing/Graph scoping.

## 16. Browser smoke

Temporary Nix Chromium + Playwright passed against an isolated production build and isolated PostgreSQL fixture at:

- 1440×900: Projects grouping, Kanban, claim/status action, Calendar workload and task deep link, Personal Graph.
- 768×1024: Kanban and Calendar checked for page-level horizontal overflow.
- 390×844: Kanban and Calendar checked for page-level horizontal overflow.

The initial tablet Kanban smoke exposed an intrinsic-width overflow under the collapsed shell sidebar. Adding the shared work-surface `min-inline-size: 0` kept the intended lane scroller contained in its surface; final browser smoke passed. Temporary screenshots remain under `/tmp/wisdomtree-ui-audit/` and were not committed.

## 17. Validation

Stateful suites used fresh migrated/seeded `wisdomtree_test_pr2_20260912`, never the normal `wisdomtree` database.

| Check | Result |
| --- | --- |
| `npm run test:unit` | PASS — 19 files |
| `npm run test:integration` | PASS — 26 files |
| `npm run test:usecase` | PASS — 3 files |
| `npm run test:privacy` | PASS — 2 files |
| `npm test` | PASS |
| `npm run build` | PASS — isolated production copy |
| `git diff --check` | PASS |
| `npm run test:boundaries` | PASS — 243 delivery files, no direct DB access |
| Temporary Nix Chromium browser smoke | PASS |

## 18. Files changed

PR2 changes are concentrated in:

- `drizzle/0052_personal_projects.sql`, Project schema/service, Core research-read checks, target application project/task/graph facades, and demo seed lifecycle.
- Target Calendar page/components/APIs, task Kanban view/claim API, Graph scope UI, Projects grouping, localization, and responsive task/calendar CSS.
- Existing Project-scoped Note/Material/Activity/candidate guards and physical route facade checks required to preserve Personal Project privacy.
- Focused PR2 integration coverage plus updated existing expectations that Personal Spaces are now normal Personal Projects.

## 19. Remaining parity gaps

- No remaining PR2 blocking gap.
- PR2 deliberately does not restore saved Personal Graph groups, generic event management, Google Calendar two-way sync, or a second Board model.
- Collaboration, Tree/Wiki, Review/export, and broad UX polish remain outside PR2 and were not started.
