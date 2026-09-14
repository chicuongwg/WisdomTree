# Stage 17.PR1 — Governance & Essential Parity Result

## 1. Verdict

PASS. PR1 restores the approved target workflows without a schema migration, dependency, legacy-shell restoration, or permission-policy expansion. The target delivery boundary is consistently route/UI → application facade → existing service/domain → database.

## 2. Worker usage

- Main worker: Codex Terra Extra High — implementation, authorization tracing, validation, and browser smoke.
- Luna scouts: 3 read-only workers — governance/backend, target UI/test coverage, and Materials/physical holdings.

## 3. Admin/governance

`/app/admin` is an `admin_op`-gated target surface, with a shell navigation entry only when the server-computed administration capability is true. It provides bounded sections for:

- creating canonical TMKT Projects;
- listing/inviting users, changing global role, and disabling/re-enabling users;
- listing, granting, and revoking TMKT Core;
- enabling/disabling the sole supported Project capability, `library_circulation`;
- existing operational status and recent audit facts.

The existing last-admin and self-disable safeguards remain in the reused administration service. No legacy Admin screen was reused.

## 4. Project lifecycle

- `POST /api/app/projects` calls `createAppProject()` and therefore canonical `createProject()`.
- Project creation remains `admin_op` only through the existing `storage.space.manage` authorization rule.
- Creation still atomically creates the underlying team Space, Project extension, and creator `manager` membership.
- Project Settings is available at `/app/projects/:projectId/settings` only to actors with `canEditProject`.
- Settings updates only existing supported Project fields: research lens, description, and status. Project title is not presented as editable because no existing canonical Project/Space rename service exists.

## 5. Project membership

Settings contains a dedicated **Project Members** section, explicitly separated from research People. A Project manager can list candidates, add/remove authenticated users, and assign `viewer`, `contributor`, or `manager` membership roles.

The target facade validates the Project before delegating to existing membership services. A narrowly scoped candidate-list service was added because managers need a usable authenticated-user picker; it authorizes the same Project-manager capability and does not grant global user administration.

## 6. Core/Library administration

- `admin_op` manages the implemented TMKT Core roster as one unit; no reader/publisher subroles were introduced.
- `admin_op` toggles only the existing `library_circulation` capability.
- On a Library-enabled Project, a Project manager manages the Library-operator roster in Project Settings.
- Operator status remains independent from membership role. It is not automatically granted to a manager.

## 7. Material download

The target Material detail now exposes **Download original** only for a stored, selected SourceVersion. The new Project-scoped application facade confirms Project, Material, and SourceVersion ownership before signing the selected immutable original. It never returns an object key to the browser.

The first browser smoke exposed that an absolute redirect could contain the standalone runtime's internal `0.0.0.0` host. The target route now follows the existing delivery pattern and returns a relative signed-blob redirect. Browser verification then received `200` with `Content-Disposition: attachment; filename*=UTF-8''second.txt`.

Fileless physical Materials have no SourceVersion and therefore no download action.

## 8. Physical holdings

Physical-holding controls are on target Material detail and reuse the Tempo/Material domain:

- register physical facts for an existing Project Material;
- update copies, author, and location;
- archive the physical holding.

The existing Project Library operator authorization, capability requirement, loan-count checks, optimistic versioning, and archive-with-active-loan refusal remain authoritative. Project manager status alone does not mutate holdings.

## 9. Authorization

Verified policy outcomes:

| Actor | Result |
| --- | --- |
| `admin_op` | Creates Projects; administers users/Core/Project Library capability. |
| Editor/contributor without `admin_op` | Cannot create a Project or administer global users. |
| Project manager | Updates supported Project metadata, manages membership, and manages Library operators when enabled. |
| Project contributor | Cannot mutate Project settings or membership. |
| Core-only | Does not obtain Project administration or Library operator rights. |
| Library operator | Maintains circulation/physical holdings under existing rules, without membership administration unless also a manager. |

## 10. Routes/UI

New target delivery routes include:

- `/app/admin`
- `/app/projects/:projectId/settings`
- `/api/app/projects` and `/api/app/projects/:projectId`
- `/api/app/projects/:projectId/members/*`
- `/api/app/projects/:projectId/capabilities/library`
- `/api/app/projects/:projectId/library/operators/*`
- `/api/app/projects/:projectId/materials/:materialId/versions/:versionId/download`
- `/api/app/projects/:projectId/materials/:materialId/physical/*`
- `/api/app/admin/users/*`, `/core/*`, `/audit`, and `/health`

Admin is conditionally present in global navigation. Settings is conditionally present in Project navigation. Both mutate through target application facades; delivery code contains no direct database access.

## 11. Browser smoke

Temporary Nix Chromium 149.0.7827.200 was used with the repository's isolated E2E authentication helper and a local isolated test server.

- Authenticated `/app/admin`: rendered the target administration heading and bounded sections.
- Authenticated Project Settings: rendered Project metadata, Project Members, and Library operator roster.
- Target Material detail: one exact-version download action rendered; its selected original returned `200` as an attachment after redirect correction.
- Mobile Project Settings at 390 × 844: `scrollWidth <= innerWidth`.

Temporary screenshots remain only in `/tmp/wisdomtree-ui-audit/` and are not repository artifacts.

## 12. Validation

Stateful validation used freshly created, migrated, seeded `wisdomtree_test_stage17pr1_20260912`, never the normal `wisdomtree` database.
The disposable named test database was removed after validation.

- `npm run test:unit` — PASS, 19 files.
- `npm run test:integration` — PASS, 25 files, including `zzzzzzzzzz-stage17-pr1-governance.test.ts`.
- `npm run test:usecase` — PASS, 3 files.
- `npm run test:privacy` — PASS, 2 files from a fresh seeded database.
- `npm test` — PASS.
- `npm run build` — PASS; production build completed and generated `.next/standalone`.
- `git diff --check` — PASS.
- `npm run test:boundaries` — PASS, 238 delivery files with no direct database access.

The build emits the repository's existing non-blocking notice that the Next.js ESLint plugin is not detected in ESLint configuration.

## 13. Files changed

Application/domain delivery:

- `src/modules/application/admin.ts`
- `src/modules/application/{context,index,materials,projects,tempo,dto}.ts`
- `src/modules/storage/service.ts`

Target routes and screens:

- `src/app/app/admin/**`
- `src/app/app/projects/[projectId]/settings/**`
- `src/app/api/app/admin/**`
- `src/app/api/app/projects/**` for lifecycle, membership, capability, operator, physical, and exact-download delivery
- `src/app/app/projects/[projectId]/materials/**`
- `src/app/components/ui-next/{governance.css,materials.css}`
- target shell/project navigation and localized English/Vietnamese messages

Coverage:

- `tests/integration/zzzzzzzzzz-stage17-pr1-governance.test.ts`

No migration files or package/dependency files changed.

## 14. Remaining Stage 17.P decisions

Still intentionally outside PR1:

- Tree/Wiki/translations, maker-checker Review, WikiRelease/export;
- Board/Calendar/standalone Deadlines;
- notifications, comments/presence, personal Graph groups, and personal submission queue;
- any Project-title rename policy/service, which was not present in the current canonical Project service.
