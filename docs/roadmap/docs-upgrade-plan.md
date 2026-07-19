# Docs Upgrade Plan: From Storage App to Platform

## Purpose
- Define the exact, batch-by-batch plan for upgrading `/docs` from the current storage-module scope to the full WisdomTree platform scope.
- Serve as the working checklist for the owner and AI agents executing the upgrade across sessions.

## In Scope
- Documentation changes only: new docs, modified docs, decision records, and commit sequencing.
- Platform scope: storage core, physical catalog and circulation, Google bridge, notifications and comments, Quartz publishing, deadline registry, user-oriented layer, and open technical decisions.

## Out of Scope
- Implementation code, infrastructure, or CI changes.
- The implementation scaffold plan (written after Batch 9 completes).

## Decisions
- The upgrade runs as 10 batches (0–9); each batch ends in one self-contained commit.
- The existing discipline-based `/docs` layout is kept; platform-level material goes into a new `docs/platform/` directory, and modules are threaded through existing discipline files per the authoring rules in [`../README.md`](../README.md).
- Default decisions D1–D4 below apply unless the owner objects before the affected batch runs.

## Dependencies
- Current baseline: the storage-first repositioning already applied across 32 files (uncommitted at plan time).
- Platform constraints recorded in the session pack and owner Q&A: build core + integrate ecosystem, 1 developer + AI agents, <=10 non-technical users (humanities team, only the owner is technical), no new accounts (Google OIDC identity; Zalo/Messenger habits), bilingual UI with Vietnamese default, local-only AI (Ollama, no paid API dependency).

## Acceptance Criteria
- Every batch lists its new files, modified files, and definition of done specifically enough for an agent to execute without reopening strategy.
- After Batch 9, the docs describe the full platform scope with no cross-document contradictions, and Phase 0 exit criteria can be re-evaluated.

## Decision Gates (defaults apply unless the owner objects)
- `D1 Role model`: keep the single `Admin/Op` role in V1; split the Admin Console UI into a Content tab (staffed by non-technical content admins) and a System tab (owner-only via permission flag). Formal Reviewer/Curator/Operator split stays Phase 1.5.
- `D2 Naming`: internal terms `Library` (digital browse surface) and `Catalog` (physical library); UI copy maps them to "Kho tư liệu" and "Thư viện" respectively.
- `D3 AI and search`: settled by the owner — local-only AI. V1 ships PostgreSQL full-text search with no AI dependency; Phase 1.5 adds semantic finding via Ollama embeddings + pgvector; Phase 1.5/2 adds the "AI Librarian" (answers that cite stored documents through the existing provenance/excerpt model).
- `D4 Publishing`: amend the "no public sharing" decision to "no public interactive access; selective read-only publishing via Quartz builds from the content repo, Phase 1.5". This is an explicit, recorded product change.

## Batch 0: Commit the Storage-First Baseline (0.5 session)
- The storage-first repositioning is already committed on `main` as five commits (`cffc8a7` through `499a23b`): product pivot, system architecture, flows, requirements, and UI. The four consistency fixes (three-layer source lifecycle, node verification direct entries, gap-request archive path, export writer) landed within those commits.
- Because that work is on `main`, the platform upgrade continues on `main` rather than a branch, to avoid splitting storage-first and platform docs.
- Commit this plan as `docs(roadmap): add docs upgrade plan toward platform scope`.
- Done when: `git status` is clean apart from in-progress batch work.

## Batch 1: Platform Layer (1 session)
- New `../platform/platform-context.md`: the four pillars mapped to solutions — communication stays on Zalo/Messenger plus object-anchored comments and outbound notifications; storage/knowledge is the core app; publishing rides the content-repo export via Quartz; PM is a deadline registry plus the basic board. Records the standing constraints (no new accounts, 1 dev + AI agents, <=10 users, local-only AI).
- New `../platform/module-map.md`: modular-monolith module list — `storage`, `catalog`, `circulation`, `knowledge`, `pm`, `bridge-google`, `notify`, `search`, `export` — with dependency rules, extending [`../system/module-boundaries.md`](../system/module-boundaries.md).
- Modify [`../README.md`](../README.md) (index + reading order), [`../session/session-summary.md`](../session/session-summary.md), [`../session/decision-log.md`](../session/decision-log.md), [`../session/rationale-and-evolution.md`](../session/rationale-and-evolution.md) (Evolution 8: from single app to platform).
- Commit: `docs(platform): add platform context and module map`.

## Batch 2: Physical Catalog and Circulation (2 sessions)
- New `../system/catalog-circulation.md`: entities `Catalog Item` (auto-issued unique ID printable as QR, cover title, author, optional cover photo, shelf location, status `available/borrowed/lost/repair`; content is not digitized) and `Loan Ticket` (`requested -> approved -> borrowed -> returned | overdue`); optional link Catalog Item -> `Source` for gradual digitization; initial inventory import of ~1,000 books from Sheets/Excel (mechanism in Batch 3).
- Modify: [`../product/glossary.md`](../product/glossary.md) (+2 terms), [`../flows/state-machines.md`](../flows/state-machines.md) (+2 lifecycles), [`../requirements/functional-spec.md`](../requirements/functional-spec.md) (+Capability 11 with librarian and borrower stories), [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md) (+request/approve/manage rows), [`../system/integration-contracts.md`](../system/integration-contracts.md) (+`/api/catalog` endpoints, loan actions, `loan.*` and `catalog.item.created` events), [`../ui/navigation-model.md`](../ui/navigation-model.md) and [`../ui/screen-inventory.md`](../ui/screen-inventory.md) (+Catalog `/catalog`, Catalog Item Detail `/catalog/:id`, Librarian Desk `/catalog/admin`), both screen-spec docs, [`../requirements/acceptance-criteria.md`](../requirements/acceptance-criteria.md), NFR observability (overdue count).
- Commit: `docs(catalog): specify physical catalog and circulation module`.

## Batch 3: Google Bridge (1–2 sessions; may run before Batch 2)
- New `../system/google-bridge.md`: (1) Drive import — one-way, read-only, folder-to-space mapping; (2) Sheets import — book inventory and metrics tables; (3) Forms — ingestion by polling the form-linked Sheet, no webhooks; (4) Calendar — outbound ICS feed (`GET /calendar/:token.ics`), not the Calendar API. Credential model (single Op-owned OAuth app or service account), quota/backoff, and failure modes.
- Modify: integration-contracts (+`ImportDriveJob`, `ImportSheetJob`, `PollFormsSheetJob`, ICS route), NFR (+sync freshness; bridge outage never blocks core workflows), [`../operations/operating-playbook.md`](../operations/operating-playbook.md) (+degraded mode: Google API unavailable), [`../product/scope-v1.md`](../product/scope-v1.md), [`phases-0-1-1.5.md`](./phases-0-1-1.5.md) (minimal versions of all four bridges in Phase 1).
- Commit: `docs(bridge): specify Google bridge (Drive, Sheets, Forms, ICS calendar)`.

## Batch 4: Notifications and Comments (1–2 sessions)
- New `../system/notifications.md`: channels in-app, email, Zalo OA; event-to-notification matrix (loan due, deadline approaching, submission reviewed, publish completed); per-user channel preferences; records the standing decision — no chat build, no self-hosted chat OSS (would force new accounts).
- Modify: [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md) (+`Comment` entity anchored to Source/Node/Loan Ticket/Deadline; +`personal` space type for private notes), functional-spec (+Capability 12: contextual discussion), permissions-matrix, integration-contracts (+comment endpoints), UI specs (+comment panel in the inspector zone, +notification center), decision-log.
- Commit: `docs(notify): specify notifications (Zalo OA/email) and object-anchored comments`.

## Batch 5: Publishing via Quartz (1 session)
- Modify: [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md) and functional-spec Capability 9 (front-matter `publish: true`, selective export, Quartz build step in the content repo's GitHub Actions — no new runtime module), [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md) (public-publish rules: only reviewed nodes; a content admin approves the public flag), scope-v1 + decision-log (apply `D4` with date and rationale), roadmap/backlog.
- Commit: `docs(publishing): enable selective read-only Quartz publishing from content repo`.

## Batch 6: Deadline Registry (1 session)
- Modify: data-model (+`Deadline` entity: type conference/funding/report, date, space/project link, checklist link, reminder rules), functional-spec Capability 8 (+deadline stories), integration-contracts (+`/api/deadlines`, `deadline.approaching` event), UI (deadline list + board update), notification matrix and ICS feed tie-ins.
- Commit: `docs(pm): add deadline registry for multi-project conference and funding tracking`.

## Batch 7: User-Oriented Layer (1–2 sessions)
- New `../ui/vocabulary-vi.md`: internal-term to Vietnamese-UI-copy map (`Library` -> "Kho tư liệu", `Catalog` -> "Thư viện", `Node` -> "Trang tri thức", `verified` -> "Đã thẩm định", ...); governance rule: the humanities team reviews all user-facing copy.
- New `../operations/adoption-onboarding.md`: seed real data (Drive import + book inventory) before inviting the team; one guided in-person session; adoption tracked through the existing scorecard.
- Modify: [`../ui/design-system.md`](../ui/design-system.md) (editor decision: WYSIWYG-feel editor persisting Markdown — TipTap/Milkdown class; source view is a hidden toggle), [`../ui/ui-principles.md`](../ui/ui-principles.md) (+no-technical-jargon principle with the support-cost rationale), [`../operations/delivery-operating-model.md`](../operations/delivery-operating-model.md) (DRI mapping to real team profiles; reinterpret the two-Admin/Op rule as two content admins plus accepted bus-factor-1 system operation with automated backups), roles-personas + admin screen specs (apply `D1`: Content/System tabs), screen-inventory + user-screen-specs (+Tree Browse `/tree` and Branch List `/tree/branches` — closes the IA gap where top-level entries had no screens).
- Commit: `docs(ui): add Vietnamese vocabulary, editor decision, adoption plan, and real-team DRI mapping`.

## Batch 8: Close Open Technical Decisions (1–2 sessions)
- New `../system/tech-stack.md`: proposal for owner sign-off — TypeScript full-stack app, Python worker (OCR, pandoc rendering, future embeddings), PostgreSQL FTS now with pgvector reserved for Phase 1.5, Ollama local-only.
- New `../requirements/intake-constraints.md`: maximum file size, accepted format list, upload safety-scanning stance.
- Modify: decision-log + NFR (apply `D3`: AI is local-only and additive — the system must be fully functional with no external AI service; no paid AI API dependency), data-model (+chunk-level extracted-text storage with position references so embeddings and citations never require re-extraction; +ownership definition: owned = creator, transferable via Admin assignment; +conflict handling = optimistic locking via version check on save), [`backlog-future.md`](./backlog-future.md) (+named "AI Librarian" item: semantic finding at 1.5, cited RAG answers at 1.5/2), scope-v1 (search wording: FTS in V1, semantic deferred).
- Commit: `docs(decisions): close tech stack, AI policy, ownership, intake limits, conflict model`.

## Batch 9: Consistency Pass and Phase 0 Exit (1 session)
- Cross-checks: state names against state-machines; glossary term usage; permissions vs screens vs flows vs endpoints; event list vs notification matrix vs scorecard data sources; vocabulary-vi coverage of all user-facing terms.
- Update system-level acceptance criteria for the new modules; re-verify the scorecard remains computable without an analytics platform.
- Re-evaluate the Phase 0 exit criteria in [`../operations/delivery-operating-model.md`](../operations/delivery-operating-model.md); update roadmap phases to the platform scope.
- Commit: `docs: platform-scope consistency pass and Phase 0 exit review`.
- Done when: platform docs are declared documentation-complete and the implementation scaffold plan can start.

## Effort and Sequencing
- Total estimate: 10–13 working sessions (owner + AI agents).
- Order: 0 -> 1 first; 2 and 3 may swap; 4–6 in any order after 1; 7–8 after the modules they touch exist; 9 last.
- One commit per batch; no batch leaves the docs in a self-contradictory state.
