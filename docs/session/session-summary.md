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
- Roles for V1 are `Reader`, `Editor`, and `Admin/Op`.

## Dependencies
- Product definition in [`../product/prd.md`](../product/prd.md).
- Scope boundaries in [`../product/scope-v1.md`](../product/scope-v1.md).
- Architecture in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).

## Acceptance Criteria
- A new agent can read this document and describe the product, data split, role model, and north-star workflow correctly.
- The summary aligns with the detailed docs and does not contradict them.
- The summary is short enough to be used as a startup brief.

## What WisdomTree Is
WisdomTree is a knowledge management system that separates raw evidence processing from curated knowledge publication. It is designed for teams that gather information in many formats but need a cleaner, Markdown-first tree for linked knowledge, graph exploration, branch-based learning, and long-term maintenance.

## V1 Product Shape
- Private team web app.
- Desktop and web-first.
- Small team scale.
- English documentation, implementation-facing.
- Reader-first product experience with Editor and Admin/Op extensions.

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
- Is the surface Readers primarily interact with.

### Export Layer
- Tree content exports one-way to a private content Git repo.
- Export is for backup, validation, and versioned snapshots.
- The content repo is not the source of truth.

## V1 Role Model
- `Reader`
  - discover and consume curated knowledge
- `Editor`
  - create branches and manual nodes
  - upload source files
  - work on assigned correction and draft tasks
- `Admin/Op`
  - review source material
  - control trust and publish decisions
  - merge, archive, export, and operate the system

## North-Star Workflow
1. A source file is uploaded into the Source Repo.
2. The worker extracts raw text by parsing or OCR.
3. A human creates corrected text.
4. The system or a user creates a Markdown draft.
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

