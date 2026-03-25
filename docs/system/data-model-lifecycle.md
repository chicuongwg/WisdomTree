# Data Model and Lifecycle

## Purpose
- Define the lifecycle and state rules for the core V1 entities.
- Keep state machines, UI states, and backend transitions aligned.

## In Scope
- Lifecycle of source items, source versions, drafts, nodes, reviews, tasks, achievements, and conflicts.
- Merge, archive, redirect, and trust rules.

## Out of Scope
- Detailed SQL schemas.
- Search index implementation.
- Notification delivery mechanics.

## Decisions
- Source and node states are separate and must remain separate.
- Raw extracted text is immutable.
- Archive is soft retirement, never silent deletion.
- Duplicate concept resolution uses archive plus redirect.

## Dependencies
- Glossary in [`../product/glossary.md`](../product/glossary.md).
- State diagrams in [`../flows/state-machines.md`](../flows/state-machines.md).
- Architecture in [`two-repository-architecture.md`](./two-repository-architecture.md).

## Acceptance Criteria
- State transitions are specific enough to implement backend rules and UI status handling.
- Merge, archive, and publish rules can be tested without guessing business meaning.
- The lifecycle model supports both source-driven and manual tree content.

## Core Entities

### Source
- A logical evidence item submitted to the system.
- May contain many source versions over time.
- Carries trust status independent from published tree node status.

### Source Version
- Immutable representation of one uploaded file and its generated artifacts.
- Owns original file reference, raw text reference, corrected text version chain, and preview references.

### Markdown Draft
- Transitional publication artifact built from corrected text.
- May be revised before approval.

### Tree Node
- Curated Markdown knowledge unit stored in PostgreSQL.
- Belongs to one primary branch.
- May carry backlinks and typed cross-links.

### Tree Node Version
- Immutable snapshot of node content after publish or significant edit.

### Review Task
- Actionable item for correction, trust review, publish approval, merge, archive, or operational resolution.

### Conflict
- A state where concurrent or contradictory edits require manual resolution by Admin/Op.

## Trust and Verification States

### Source Trust
- `unknown`
- `candidate`
- `trusted`
- `rejected`
- `archived`

### Node Verification
- `no_source`
- `unverified`
- `verified`
- `archived`

## Lifecycle Rules

### Source Lifecycle
- Source version enters as `uploaded`.
- It becomes `processed` when raw text or explicit extraction failure is available.
- It becomes `under_correction` when a user is actively working on corrected text.
- It becomes `ready_for_review` when corrected text and a Markdown draft are available.
- It becomes `promoted` when at least one tree publication is approved from it.
- It becomes `rejected` when the source should not produce tree content.
- It may become `unprocessable` when processing is unsupported or fails irrecoverably.

### Node Lifecycle
- Manual nodes begin as `no_source`.
- Source-driven nodes begin as `unverified` unless verified at publish time by Admin/Op.
- Nodes may move to `verified` after evidence and review are complete.
- Nodes may move to `archived` when superseded, merged, or retired.

### Merge and Redirect
- Duplicate concepts are resolved by choosing one canonical node.
- The non-canonical node becomes `archived`.
- Existing references redirect to the canonical node.
- Audit must preserve the merge decision and operator identity.

### Conflict Handling
- Conflicts do not auto-merge in V1.
- Conflicts must preserve both competing versions until Admin/Op resolves them.
- Resolution must record outcome and chosen canonical version.

## Lifecycle Overview Diagram

```mermaid
flowchart TD
    Upload[Upload Source]
    Extract[Parse/OCR]
    Correct[Corrected Text]
    Draft[Markdown Draft]
    Review[Admin/Op Review]
    Publish[Publish to Tree]
    Node[Tree Node]
    Merge[Merge / Archive]

    Upload --> Extract
    Extract --> Correct
    Correct --> Draft
    Draft --> Review
    Review --> Publish
    Publish --> Node
    Node --> Merge
```

## Task and Achievement Rules
- Tasks track knowledge workflow work, not general company project management.
- Achievements can be derived from branch milestones or logged manually.
- Neither tasks nor achievements override trust or verification states.

