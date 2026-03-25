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

### Product and Scope
- V1 is a private small-team product, not a public knowledge portal.
- V1 ships with a practical role model: `Reader`, `Editor`, `Admin/Op`.
- V1 includes the core knowledge loop plus a basic board, not a full project management product.
- Docs are written in English and live under `/docs` in the main repo.

### Content and Data Model
- The system is split into `Source Repo` and `Knowledge Tree`.
- The Source Repo can receive broad file formats.
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
- Reader flow comes first in information architecture.
- Admin/Op flow is secondary in navigation but complete in capabilities.
- Tree editing is `Markdown source + preview`, not WYSIWYG-heavy.

### Runtime and Operations
- Web/API, PostgreSQL, and Redis run on the primary VPS.
- OCR/AI worker runs on a separate machine.
- Ollama is local-only.
- Source storage uses S3-compatible object storage.
- GitHub Actions validates exported content.
- Daily backup plus manual restore is part of V1, not optional hardening.

## Reopen Only With Explicit Product Change
- Public access model.
- Role model expansion beyond Reader, Editor, Admin/Op.
- Canonical storage moving away from PostgreSQL for tree content.
- Removing the two-repository split.
- Making Git export bidirectional.

