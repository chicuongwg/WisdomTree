# User Flows

## Purpose
- Describe the user-facing discovery, source intake, and personal submission workflows that define the default authenticated experience.

## In Scope
- Search, open node, inspect relations, expand branch, upload source, and track personal submissions.
- Happy path, error path, and permission path for User usage.

## Out of Scope
- Source repository operations.
- Admin publish and review workflows.
- Low-level navigation component specs.

## Decisions
- `User` is the default authenticated role and combines discovery with lightweight evidence contribution.
- Users see trust state and selected provenance context, but not full source internals.
- Users can upload source items and view only their own submissions.
- Graph exploration exists as both a dedicated surface and contextual relation view.

## Dependencies
- Role definitions in [`../product/roles-personas.md`](../product/roles-personas.md).
- Search behavior in [`../requirements/functional-spec.md`](../requirements/functional-spec.md).
- Screen details in [`../ui/user-screen-specs.md`](../ui/user-screen-specs.md).

## Acceptance Criteria
- User workflows support search, branch exploration, trust-aware reading, source intake, and own-submission tracking.
- Error and permission outcomes are explicit enough to drive UI states.
- No user flow assumes hidden access to the source repository.

## Happy Path 1: Discover Knowledge
1. User opens the app and lands in a tree-oriented home surface.
2. User searches by keyword, tag, branch, or concept.
3. User opens a node result and sees:
   - title
   - verification badge
   - excerpt or summary
   - primary branch
   - contextual relations
4. User follows links or mini-graph relations to adjacent nodes.
5. User opens the branch hub to understand topic structure and remaining gaps.
6. User decides either to continue exploration or contribute a new source item if the topic is missing.

## Happy Path 2: Submit Source and Track It
1. User opens `Source Intake` from the app shell or a contribution CTA.
2. User either submits a source file or records a lightweight branch-gap request when no file is available yet.
3. System acknowledges the intake and creates a personal submission record.
4. User opens `My Submissions` and sees:
   - source title
   - processing state
   - last updated timestamp
   - whether follow-up from the team is pending
5. User returns later to see that the submission has moved through processing or review.

## Happy Path Diagram

```mermaid
flowchart TD
    A[Open app] --> B[Search tree]
    B --> C[Open node]
    C --> D[Inspect trust and sources]
    D --> E[Follow relation or backlink]
    E --> F[Open branch hub]
    F --> G[Open Source Intake]
    G --> H[Upload source or gap request]
    H --> I[Track item in My Submissions]
```

## Error Path
- Search returns no results:
  - show empty state
  - suggest related branches or tags
  - offer source intake or branch-gap request flow for missing knowledge
- Node is archived:
  - show archive badge
  - redirect toward canonical or active replacement if one exists
- Source excerpt cannot be shown:
  - preserve node access
  - display provenance unavailable message rather than hiding trust context entirely
- Upload processing fails:
  - preserve the submission record
  - show failure state and next expected action
  - do not expose internal queue or full source repository details

## Permission Path
- User can see trust and source excerpt metadata on node pages.
- User can upload source items and open only their own submission list.
- User cannot open full Source Repo item pages or browse submissions from other users.
- User cannot approve, publish, merge, archive, or download original files.
- User cannot edit corrected text or Markdown drafts.
