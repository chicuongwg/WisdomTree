# Glossary

## Purpose
- Standardize vocabulary across product, requirements, system, flow, and UI documents.
- Reduce ambiguity for engineers and sub-agents joining implementation work.

## In Scope
- Definitions for core domain objects, roles, states, and product surfaces.
- Preferred terminology that downstream docs should reuse exactly.

## Out of Scope
- Exhaustive database field naming.
- User-facing copy or localization rules.
- API schema definitions.

## Decisions
- `Source Repo` and `Knowledge Tree` are the canonical high-level product terms.
- `Node`, `Branch`, `Source`, `Version`, `Review`, and `Promotion` are the core domain nouns.
- Trust and verification states are distinct concepts and must not be merged in wording.

## Dependencies
- Role naming in [`roles-personas.md`](./roles-personas.md).
- Lifecycle state names in [`../flows/state-machines.md`](../flows/state-machines.md).
- Architecture terms in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).

## Acceptance Criteria
- All later documents can use these terms without redefining them.
- Terms that carry state or business meaning are stable and consistent.
- No downstream document invents conflicting synonyms for the same object.

## Terms

| Term | Definition |
| --- | --- |
| Source Repo | The repository-like ingestion space that stores original source files, raw extracted text, corrected text, provenance, preview artifacts, and review state. |
| Knowledge Tree | The curated knowledge surface where Markdown nodes become searchable, linkable, and graphable. |
| Node | A curated Markdown knowledge unit in the tree, such as a concept note, source summary, branch hub, task page, or achievement page. |
| Branch | A structured topic or work context that groups related nodes under one primary knowledge path. |
| Source | A logical source item submitted into the system, potentially with multiple versions over time. |
| Source Version | One immutable version of an uploaded or re-uploaded source file and its extracted artifacts. |
| Raw Text | Immutable parser or OCR output generated from a source version before human correction. |
| Corrected Text | Human-corrected plain text derived from raw text and used as the basis for Markdown drafting. |
| Markdown Draft | The reviewable Markdown version prepared for publication into the tree. |
| Promotion | The action that publishes an approved Markdown draft into the tree as a node or node version. |
| Verification Status | Trust-facing state of a tree node, such as `no_source`, `unverified`, `verified`, or `archived`. |
| Source Trust Status | Evidence-facing state of a source, such as `unknown`, `candidate`, `trusted`, `rejected`, or `archived`. |
| Primary Branch | The main branch that owns the organizational placement of a node. |
| Cross-Link | A non-owning reference from one node or branch to another node. |
| Archive | Soft-retire a node or source from active discovery while preserving history and references. |
| Redirect | A rule that points traffic from an archived or merged node to the canonical node that replaces it. |
| Review Inbox | The operational queue where Admin/Op processes source, correction, Markdown draft, and publication decisions. |
| Content Repo | The private Git repository that receives exported tree Markdown snapshots for backup and validation. |

