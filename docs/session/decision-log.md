# Decision Log

## Purpose
- Capture the major decisions that were finalized during this planning session.
- Help new agents avoid re-litigating choices that already have clear V1 answers.

## In Scope
- Final V1 decisions that affect architecture, workflows, UI, and operations.
- Decision statements with short rationale.

## Out of Scope
- Full debate history.
- Every intermediate option considered.
- Detailed implementation notes already covered elsewhere.

## Decisions
- The items in this log are treated as settled V1 decisions unless a later product change explicitly reopens them.
- Rationales here are intentionally short and point back to deeper canonical docs where needed.
- Future-role and future-feature ideas are recorded as deferred, not active V1 ambiguity.

## Dependencies
- Session summary in [`session-summary.md`](./session-summary.md).
- Canonical specs in [`../README.md`](../README.md).
- Deferred items in [`../roadmap/backlog-future.md`](../roadmap/backlog-future.md).

## Acceptance Criteria
- New agents can use this file as a “do not reopen casually” checklist.
- Each decision maps to a canonical doc where the implementation detail lives.
- The list is short enough to scan quickly but specific enough to avoid ambiguity.

## Settled Decisions

### Platform Strategy
- WisdomTree is the storage-first core of a four-pillar team platform: communication, storage and knowledge, publishing, and project management.
- The strategy is build core, integrate ecosystem: build what is unique to this team, borrow the rest from tools the team already uses.
- Chat is not built and not self-hosted; real-time messaging stays on Messenger and Zalo, and the platform pushes outbound alerts to Zalo OA and email.
- Publishing rides the existing content-repo export via a Quartz-class generator; no new runtime module.
- Project management is a deadline registry plus the basic board, not a Jira replacement.
- The platform is one deployable modular monolith in one monorepo; see [`../platform/module-map.md`](../platform/module-map.md).
- Standing constraints: no new accounts (Google OIDC), one developer plus AI agents, fewer than ten non-technical users, bilingual Vietnamese-default UI, local-only AI with no paid API dependency.

### Product and Scope
- V1 is a private small-team product, not a public knowledge portal.
- WisdomTree is storage-first: the Source Repo is the team's canonical storage home replacing scattered Excel/Docs storage; curation is layered on top.
- The product serves non-technical, multi-domain team members first; UI simplicity is the second priority after storage.
- V1 ships with a practical role model: `User`, `Editor`, `Admin/Op`.
- `User` is the default authenticated role and owns source submission plus personal submission tracking.
- `Editor` extends `User` but is limited to owned-or-assigned content updates.
- V1 includes the core knowledge loop plus a basic board, not a full project management product.
- Docs are written in English and live under `/docs` in the main repo.

### Content and Data Model
- The system is split into `Source Repo` and `Knowledge Tree`.
- The Source Repo can receive broad file formats.
- Sources are organized into membership-scoped `Spaces`; space membership governs browse, search, and download rights.
- Storage is store-first: `stored` items are findable and downloadable by space members before and independent of extraction or curation.
- Node Markdown can be exported to `docx`/`pdf` as derived documents through a Pandoc-class converter.
- The Knowledge Tree accepts Markdown only.
- Original files are kept for evidence and comparison in the Source Repo.
- Raw extracted text is immutable.
- Corrected text is the editable evidence-layer text before Markdown publication.
- Tree canonical content lives in PostgreSQL.
- Exported Markdown in Git is derived, not canonical.

### Processing and Review
- Parsing comes first for text-based formats; OCR is fallback or required for image-based material.
- OCR or weak extraction output must not go directly into the tree.
- Source trust and node verification are separate state systems.
- Accountability is tracked across uploader, editor/updater, and approver/publisher actions.
- Manual nodes start as `no_source`.
- Manual nodes may later become `verified`.
- Duplicate concepts are resolved by archive plus redirect, not hard delete.

### Search and Discovery
- Search is unified across Tree and Source surfaces, with filters.
- Archived content is hidden by default.
- Trust badges are mandatory in search and node contexts.
- Graph is both a dedicated exploration surface and a contextual support surface.

### UI and Experience
- Visual direction is `Knowledge atlas`.
- Layout is `Workspace 3-zone`.
- User flow comes first in information architecture.
- Admin/Op flow is secondary in navigation but complete in capabilities.
- Tree editing is `Markdown source + preview`, not WYSIWYG-heavy; non-technical contribution happens primarily through file upload plus conversion, not through learning Markdown.
- Discussion attaches to objects as comments; outbound alerts go to Zalo OA and email; real-time chat stays on Messenger and Zalo and is not built.
- The UI is bilingual Vietnamese/English with Vietnamese as the default; documentation stays English.

### Technology and AI
- Accepted stack (owner sign-off 2026-07-19): TypeScript full-stack app, Python worker, PostgreSQL, Redis, S3-compatible storage, Google OIDC; see [`../system/tech-stack.md`](../system/tech-stack.md).
- Framework pin for the demo and onward (2026-07-20): Next.js (App Router) + Drizzle ORM as the TypeScript full-stack implementation; demo scope and dev-mode substitutions in [`../roadmap/demo-brief.md`](../roadmap/demo-brief.md). Delivery is agent-built under a coordinator gate between scaffold and build.
- Search is PostgreSQL full-text in V1; semantic finding via pgvector plus local embeddings is Phase 1.5.
- AI is local-only through Ollama with no paid API dependency, and is additive; the system stays fully functional with all external AI disabled.
- Extracted text is stored as position-referenced chunks to support future embeddings and cited answers without re-extraction.
- Ownership defaults to the creator and transfers only by `Admin/Op` assignment.
- Concurrent edits use optimistic locking (version check on save); stale saves are rejected, not overwritten.
- Intake is bounded by a size limit and a safety scan before an item becomes `stored`; see [`../requirements/intake-constraints.md`](../requirements/intake-constraints.md).

### Runtime and Operations
- Web/API, PostgreSQL, and Redis run on the primary VPS.
- OCR/AI worker runs on a separate machine.
- Ollama is local-only.
- Source storage uses S3-compatible object storage.
- GitHub Actions validates exported content.
- Daily backup plus manual restore is part of V1, not optional hardening.

## Amended Decisions
- 2026-07-19: the earlier "no public sharing" stance is amended. V1 still has no public interactive access, but selective, read-only publishing of `Admin/Op`-approved nodes flagged `publish: true`, built into a Quartz-class static site from the content repo, is a Phase 1.5 candidate. Rationale: the platform's publishing pillar needs a low-risk path to share vetted knowledge without opening the app.

## Reopen Only With Explicit Product Change
- Public interactive access to the app (distinct from the selective read-only Quartz publishing amended above).
- Storage-first ordering and space-based storage access scoping.
- Build core, integrate ecosystem strategy and the no-new-accounts constraint.
- Local-only AI with no paid API dependency.
- Modular monolith in one monorepo.
- Role model expansion beyond User, Editor, Admin/Op.
- Canonical storage moving away from PostgreSQL for tree content.
- Removing the two-repository split.
- Making Git export bidirectional.
