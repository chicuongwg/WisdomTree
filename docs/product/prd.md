# Product Requirements Document

## Purpose
- Define the product problem, target audience, V1 goals, and north-star workflows for WisdomTree.
- Provide the decision baseline for all functional, system, and UI documents.

## In Scope
- Product problem statement.
- Target users and expected value.
- V1 goals and success definition.
- Core workflows that the rest of the system must support.

## Out of Scope
- Implementation details such as schemas, endpoints, and deployment details.
- Design tokens and screen-level interaction details.
- Phase 1.5 and later capabilities beyond high-level positioning.

## Decisions
- WisdomTree is a private, storage-first knowledge platform for small teams.
- The product separates `Source Repo` from `Knowledge Tree`.
- `Source Repo` is the team's canonical storage home, organized into membership-scoped spaces. `Knowledge Tree` is the curated knowledge surface built on top of it.
- Storage comes first: a stored file is findable and retrievable by its space members before and independent of any curation outcome.
- The product serves non-technical team members across many professions first; UI simplicity is the second product priority after storage.
- V1 role model is `User`, `Editor`, and `Admin/Op`.
- The primary V1 product loop is `Store -> Retrieve -> Curate -> Publish -> Explore`.

## Dependencies
- Scope boundaries in [`scope-v1.md`](./scope-v1.md).
- Quantitative success tracking in [`v1-scorecard.md`](./v1-scorecard.md).
- Role definitions in [`roles-personas.md`](./roles-personas.md).
- Core architecture in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).

## Acceptance Criteria
- Product goals are concrete enough to evaluate feature decisions against them.
- V1 success can be measured by operational and user outcomes with a linked scorecard.
- Downstream documents can reference this file without reopening product intent debates.

## Product Problem
Small teams store their working knowledge in scattered Excel sheets, Docs, and ad hoc folders. Files are hard to find, impossible to trace, and unusable outside the person who saved them. The first problem WisdomTree solves is storage: one intelligent, multi-domain storage home where any team member, technical or not, can put a file and any teammate in the same space can find and retrieve it.

On top of that storage home, usable knowledge still requires curation, structure, traceability, and review. Raw documents, OCR output, notes, and AI-generated summaries are not the same thing. WisdomTree therefore separates the storage and evidence layer from curated knowledge publication: teams upload almost any source material into space-scoped storage, optionally extract and correct text, promote vetted Markdown into a graph-friendly tree, and explore that tree through links, branches, tags, and task progress.

## Product Goals
1. Give the team one reliable, multi-domain storage home that replaces scattered Excel/Docs storage: any member can store a file and any space member can find and retrieve it.
2. Turn stored, multi-format source material into a reviewable knowledge pipeline instead of a dead file archive.
3. Maintain a curated knowledge tree where every published node is easier to search, link, and evolve over time.
4. Make trust visible by separating source trust, node verification, and archival state.
5. Support both direct knowledge authoring and source-driven publication.
6. Keep the system usable by non-technical team members and operable for a small team without enterprise-level process overhead.

## V1 Success Definition
The qualitative outcomes below define V1 value. Quantitative thresholds, green/yellow/red status, and weekly review cadence live in [`v1-scorecard.md`](./v1-scorecard.md).

- A user can upload a file into a space and any member of that space can find it through `Library` or search and download it, without waiting for any review step.
- A user can upload source material and see it enter a reviewable ingestion flow within the scorecard guardrails for processing outcome.
- A user can submit a `branch-gap request` and see it enter a reviewable intake flow, alongside file-backed submissions, through `My Submissions` when no file is available.
- An assigned editor or operator can prepare extracted text, turn it into Markdown, and complete publication within the scorecard guardrails for review-to-publish latency.
- Users and editors show recurring weekly activity above the scorecard warning floor.
- The system preserves provenance between a published node and the source evidence that produced it, with source-driven published nodes staying within the scorecard target for evidence linkage completeness.
- The team can operate the platform with clear roles, auditable actions, documented recovery procedures, and recoverable data.

## North-Star Workflows

### Workflow 0: Store and Retrieve
1. A user uploads a file into a space through `Source Intake`.
2. The system stores the original file and marks the item `stored`.
3. Space members immediately see the item in `Library` and search.
4. A teammate opens the item, inspects its metadata and extraction preview, and downloads the original file.

### Workflow 1: Source to Tree Publication
1. A user uploads a source item through `Source Intake`.
2. The system extracts text through parsing or OCR.
3. An `Editor` or `Admin/Op` corrects the extracted text.
4. An `Admin/Op` reviews the corrected text, trust status, and Markdown draft.
5. The Markdown node is published into the tree with source links, excerpts, and review provenance.

### Workflow 2: User Discovery and Expansion
1. A user searches the knowledge tree.
2. The user opens a node, checks its trust state, links, and related branch.
3. The user follows backlinks, tags, or the contextual mini-graph.
4. The user identifies a missing concept and submits a `branch-gap request` through `Source Intake`.

### Workflow 3: Manual Knowledge Authoring
1. An editor creates a branch or manual node directly in the tree.
2. The node starts as `no_source` until evidence is attached and reviewed.
3. The node can later be linked to source material and promoted to `verified`.

## Target Audience
- Non-technical team members across many professions who need one convenient storage home instead of scattered Excel/Docs files.
- Scholars who need traceable knowledge from heterogeneous sources.
- Technical users who care about structure, linking, and long-term reusability.

## Product Principles
- Storage first: a file is safely stored and retrievable by its space members before any curation happens.
- Keep the default experience simple enough for non-technical users.
- Separate evidence from curated knowledge.
- Separate uploader, editor/updater, and approver accountability for source-driven knowledge.
- Make trust and review visible everywhere.
- Prefer structured Markdown over opaque rich-text formats.
- Preserve provenance whenever knowledge is published from sources.
- Keep V1 operationally simple enough for a small team.
