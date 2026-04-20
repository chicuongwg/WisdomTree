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
- WisdomTree is a private, implementation-first knowledge platform for small teams.
- The product separates `Source Repo` from `Knowledge Tree`.
- `Knowledge Tree` is the curated knowledge surface. `Source Repo` is the evidence and ingestion surface.
- V1 role model is `Reader`, `Editor`, and `Admin/Op`.
- The primary V1 product loop is `Source -> Review -> Publish -> Explore -> Expand`.

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
Teams collect knowledge in many formats, but usable knowledge requires curation, structure, traceability, and review. Raw documents, OCR output, notes, and AI-generated summaries are not the same thing. Without an explicit system boundary, knowledge collections degrade into mixed-quality folders with weak trust signals and poor discoverability.

WisdomTree solves this by separating evidence ingestion from curated knowledge publication. The product lets teams upload almost any source material into a reviewable source repository, extract and correct text, promote vetted Markdown into a graph-friendly tree, and then explore that tree through links, branches, tags, and task progress.

## Product Goals
1. Turn messy, multi-format source material into a reviewable knowledge pipeline instead of a dead file archive.
2. Maintain a curated knowledge tree where every published node is easier to search, link, and evolve over time.
3. Make trust visible by separating source trust, node verification, and archival state.
4. Support both direct knowledge authoring and source-driven publication.
5. Keep the system operable for a small team without enterprise-level process overhead.

## V1 Success Definition
The qualitative outcomes below define V1 value. Quantitative thresholds, green/yellow/red status, and weekly review cadence live in [`v1-scorecard.md`](./v1-scorecard.md).

- A user can upload source material and see it enter a reviewable ingestion flow within the scorecard guardrails for processing outcome.
- An assigned operator can correct extracted text, turn it into Markdown, and publish it into the tree within the scorecard guardrails for review-to-publish latency.
- Readers and editors show recurring weekly activity above the scorecard warning floor.
- The system preserves provenance between a published node and the source evidence that produced it, with source-driven published nodes staying within the scorecard target for evidence linkage completeness.
- The team can operate the platform with clear roles, auditable actions, documented recovery procedures, and recoverable data.

## North-Star Workflows

### Workflow 1: Source to Tree Publication
1. A user uploads a source item into the source inbox.
2. The system extracts text through parsing or OCR.
3. An editor or operator corrects the extracted text.
4. An operator reviews the corrected text, trust status, and Markdown draft.
5. The Markdown node is published into the tree with source links, excerpts, and review provenance.

### Workflow 2: Reader Discovery and Expansion
1. A reader searches the knowledge tree.
2. The reader opens a node, checks its trust state, links, and related branch.
3. The reader follows backlinks, tags, or the contextual mini-graph.
4. The reader identifies a missing concept and creates a branch or requests new source intake.

### Workflow 3: Manual Knowledge Authoring
1. An editor creates a branch or manual node directly in the tree.
2. The node starts as `no_source` until evidence is attached and reviewed.
3. The node can later be linked to source material and promoted to `verified`.

## Target Audience
- Scholars who need traceable knowledge from heterogeneous sources.
- Technical users who care about structure, linking, and long-term reusability.
- Non-technical contributors who need a guided workflow rather than raw repositories or markdown folders.

## Product Principles
- Separate evidence from curated knowledge.
- Make trust and review visible everywhere.
- Prefer structured Markdown over opaque rich-text formats.
- Preserve provenance whenever knowledge is published from sources.
- Keep V1 operationally simple enough for a small team.
