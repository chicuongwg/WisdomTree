# Rationale and Evolution

## Purpose
- Preserve the reasoning path from early ideas to the final V1 decisions.
- Help future agents understand why certain alternatives were rejected and which tradeoffs were considered worthwhile.

## In Scope
- Major decision shifts during the planning session.
- Why the final architecture and role model look the way they do.
- Which alternatives were explicitly considered and why they were not chosen for V1.

## Out of Scope
- Full transcript of the session.
- Minor wording changes or editorial tweaks.
- Post-session implementation discoveries.

## Decisions
- This document exists to prevent repeated strategic debate, not to invite fresh ambiguity.
- Only major product-shaping or architecture-shaping evolutions are recorded here.
- Rationale here complements canonical specs but does not replace them.

## Dependencies
- Final summary in [`session-summary.md`](./session-summary.md).
- Settled decisions in [`decision-log.md`](./decision-log.md).
- Canonical system spec in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).

## Acceptance Criteria
- A new agent can understand how the project converged on its current V1 shape.
- Rejected alternatives are documented well enough to avoid repeating the same arguments.
- The rationale remains aligned with the canonical docs.

## Evolution 1: From General Knowledge Manager to Two-Repository System
- Early direction:
  - a broad Obsidian-brain-style knowledge system with automated branch creation and curation
- Problem:
  - raw documents, OCR text, and curated knowledge risked becoming mixed into one unclear store
- Final decision:
  - split the system into `Source Repo` for evidence and `Knowledge Tree` for curated Markdown
- Why:
  - preserves evidence traceability
  - prevents low-quality OCR output from polluting the graph
  - gives Users a cleaner surface

## Evolution 2: From File/Vault-Centric Thinking to Database-Canonical Tree
- Early direction:
  - strong Obsidian-style page and vault thinking
- Problem:
  - a fully file-canonical tree would complicate app-driven workflows, permissions, audit, and review state
- Final decision:
  - keep the tree conceptually Markdown-first, but store canonical tree content in PostgreSQL
  - export Markdown to a private Git content repo as a downstream artifact
- Why:
  - easier workflow enforcement
  - clearer audit trail
  - cleaner permission model
  - still preserves Markdown as the knowledge format

## Evolution 3: From Reader-Centric Naming to Accountability-Split Roles
- Early direction:
  - richer role concepts like viewer, editor, reviewer, admin
  - a `Reader`-style default role focused mainly on consumption
- Problem:
  - more granular roles would slow V1 shipping and complicate UI and workflow design
  - the `Reader` label did not match the product requirement that any authenticated account can upload source material
  - leakage investigation and mistake tracing needed clearer stage ownership
- Final decision:
  - use `User`, `Editor`, and `Admin/Op` in V1
  - let `User` own source submission and personal submission tracking
  - let `Editor` own only owned-or-assigned content updates
  - keep reviewer/curator/operator split as future work
- Why:
  - enough separation to keep trust and publish authority clear
  - clearer accountability from uploader to editor/updater to approver
  - better naming fit for the actual default authenticated experience
  - fast enough to ship
  - future split can layer on top later

## Evolution 4: From “OCR Everything” to Parser-First With OCR Fallback
- Early direction:
  - normalize all non-Markdown material through OCR
- Problem:
  - OCR-everything would damage structure for text-native documents and create avoidable technical debt
- Final decision:
  - parser first for text-native material, OCR for image-based or weakly extractable material
- Why:
  - better fidelity
  - lower processing cost
  - less cleanup work before Markdown publication

## Evolution 5: From Single Mixed UI to User-First With Admin/Op Depth
- Early direction:
  - combine all surfaces under a general knowledge manager feel
- Problem:
  - user discovery and admin review have very different density, action, and trust requirements
- Final decision:
  - keep a unified app shell, but design it as User-first with a complete Admin/Op workflow inside the same product
- Why:
  - Users get a cleaner primary experience
  - operators still have the tooling depth needed to run the system
  - the app remains coherent rather than fragmenting into separate products

## Evolution 6: From Pure Planning Docs to Agent Onboarding Docs
- Early direction:
  - create the full documentation set under `/docs`
- Problem:
  - a new agent still has to scan many files before understanding what the session already settled
- Final decision:
  - add `docs/session/` as an onboarding compression layer
- Why:
  - speeds up sub-agent startup
  - reduces repeated clarification questions
  - creates a stable handoff pack between planning and implementation agents
