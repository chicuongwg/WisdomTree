# Session Summary

## Purpose
- Summarize the end state of the planning session in one compact document.
- Give a new agent enough context to start useful work without rereading the full conversation.

## In Scope
- Product shape.
- V1 role model.
- Core architecture.
- Main workflows.
- UI direction.
- Delivery framing.

## Out of Scope
- Exhaustive requirements or API details.
- Detailed screen specs.
- Phase 1.5 and future work beyond summary mentions.

## Decisions
- WisdomTree V1 is a private web application for a small team.
- V1 uses two logical repositories: `Source Repo` and `Knowledge Tree`.
- The Source Repo holds original files and extraction artifacts. The Knowledge Tree holds curated Markdown knowledge.
- Tree canonical content is stored in PostgreSQL. Source evidence is stored in object storage-backed source storage.
- Roles for V1 are `User`, `Editor`, and `Admin/Op`.

## Dependencies
- Product definition in [`../product/prd.md`](../product/prd.md).
- Scorecard in [`../product/v1-scorecard.md`](../product/v1-scorecard.md).
- Scope boundaries in [`../product/scope-v1.md`](../product/scope-v1.md).
- Architecture in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).

## Acceptance Criteria
- A new agent can read this document and describe the product, data split, role model, and north-star workflow correctly.
- The summary aligns with the detailed docs and does not contradict them.
- The summary is short enough to be used as a startup brief.

## Current Repository Stage
- The repository is currently in `Phase 0 documentation-complete`.
- Tracked implementation has not yet started outside `/docs`.
- The docs define the canonical planning baseline for implementation work that follows.

## What WisdomTree Is
WisdomTree is a knowledge management system that separates raw evidence processing from curated knowledge publication. It is designed for teams that gather information in many formats but need a cleaner, Markdown-first tree for linked knowledge, graph exploration, branch-based learning, and long-term maintenance.

## V1 Product Shape
- Private team web app.
- Desktop and web-first.
- Small team scale.
- English documentation, implementation-facing.
- User-first product experience with Editor and Admin/Op extensions.
- Explicit operating and verification policies exist before tracked implementation begins.

## Core Architectural Shape

### Source Repo
- Accepts many file types.
- Stores original files.
- Runs parser-first extraction and OCR fallback.
- Keeps raw text immutable.
- Keeps corrected text editable and reviewable.
- Produces Markdown drafts for publication.

### Knowledge Tree
- Accepts Markdown only.
- Stores curated knowledge nodes and branches.
- Supports tags, links, graph relations, board context, and verification state.
- Is the surface Users primarily interact with.

### Export Layer
- Tree content exports one-way to a private content Git repo.
- Export is for backup, validation, and versioned snapshots.
- The content repo is not the source of truth.

## V1 Role Model
- `User`
  - upload source material
  - track own submissions
  - discover and consume curated knowledge
- `Editor`
  - inherits `User` capabilities
  - create branches and manual nodes
  - update owned or assigned tree and source-derived work
- `Admin/Op`
  - review source material
  - control trust and publish decisions
  - merge, archive, export, and operate the system

## Accountability Chain
- `User` is the default authenticated uploader role.
- `Editor` is the content preparation role for owned or assigned updates.
- `Admin/Op` is the approving and publishing role.
- The system is expected to preserve all three actor stages in audit and investigation workflows.

## North-Star Workflow
1. A source file is uploaded into the Source Repo.
2. The worker extracts raw text by parsing or OCR.
3. An Editor or Admin/Op creates corrected text.
4. An Editor or the system creates a Markdown draft.
5. Admin/Op reviews trust, structure, and provenance.
6. Approved Markdown is published into the Knowledge Tree.
7. Search, graph, board, and export projections update.

## Secondary Workflow
- Editors can create Markdown nodes directly in the tree.
- Manual nodes start as `no_source`.
- They can later become evidence-backed and `verified`.

## Key UI Direction
- Visual direction is `Knowledge atlas`.
- Layout is a `Workspace 3-zone layout`.
- Information density target is `Medium`.
- Graph exists both as a dedicated view and as contextual mini-graph support.
- Trust visibility is mandatory at result, page, and review levels.

## What Not To Re-Decide
- Do not collapse Source Repo and Knowledge Tree into one mixed content store.
- Do not treat OCR plain text as publishable tree content by itself.
- Do not make Git export the canonical authoring surface in V1.
- Do not expand V1 into public sharing, mobile, or full enterprise role modeling.
