# Roles and Personas

## Purpose
- Define the V1 role model, user motivations, and the core permission envelope for each role.
- Align product, permission, and UI decisions around a stable set of personas.

## In Scope
- Role definitions for `Reader`, `Editor`, and `Admin/Op`.
- Jobs-to-be-done, success conditions, and permission summary.
- Future role split notes where relevant.

## Out of Scope
- Low-level route guard implementation.
- Team hierarchy, organization billing, or enterprise admin models.
- Phase 1.5 detailed role decomposition beyond directional notes.

## Decisions
- V1 ships with three practical roles: `Reader`, `Editor`, `Admin/Op`.
- `Admin/Op` absorbs review, taxonomy, publish approval, and operations work in V1.
- Editors can contribute and prepare content but do not finalize trust or publication decisions.
- Future role splitting is documented but not implemented in V1.

## Dependencies
- Product goals in [`prd.md`](./prd.md).
- Permissions in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).
- UI visibility in [`../ui/screen-inventory.md`](../ui/screen-inventory.md).

## Acceptance Criteria
- Every major user-facing workflow can be assigned to exactly one primary role owner.
- Permission matrix can be derived from this file without ambiguity.
- UI documentation can map visibility and actions back to these roles.

## Role Overview

| Role | Primary goal | Primary surfaces |
| --- | --- | --- |
| Reader | Discover, read, and expand curated knowledge | Search, Tree, Branches, Graph |
| Editor | Author and refine knowledge before final approval | Tree authoring, Branch editor, Assigned source correction |
| Admin/Op | Operate intake, review, trust, publish, taxonomy, and platform workflows | Source Repo, Review Inbox, Publish, Admin, Board |

## Reader Persona

### Jobs To Be Done
- Find trustworthy knowledge quickly.
- Understand how concepts relate to each other.
- Follow branches to learn a topic progressively.
- Identify gaps and request new knowledge or source intake.

### What Success Looks Like
- Search returns useful, trust-visible results.
- Node pages make provenance and related concepts easy to inspect.
- Branch structure helps readers move from overview to detail.

### Permission Summary
- Read tree content.
- Search across tree and source snippets exposed through tree pages.
- Open graph and branch views.
- Create lightweight requests for new source intake or branch expansion where allowed by product flow.
- No access to full source repository.

## Editor Persona

### Jobs To Be Done
- Create and improve branches and manual knowledge nodes.
- Upload new source items to feed the knowledge pipeline.
- Correct extracted text or refine Markdown drafts when assigned.
- Expand underdeveloped branches and connect related nodes.

### What Success Looks Like
- Editor can move work forward without being blocked on system administration.
- Editor knows what content still needs operator review.
- Manual nodes can mature from `no_source` to verified content later.

### Permission Summary
- Create and edit tree nodes and branches.
- Upload new source items.
- View own source submissions and assigned correction tasks.
- Edit corrected text or Markdown draft when assigned.
- No final authority for trust approval or publication.

## Admin/Op Persona

### Jobs To Be Done
- Operate the source repository and review pipeline.
- Decide trust status and publication readiness.
- Publish Markdown into the tree.
- Merge duplicates, archive superseded content, manage taxonomy, and handle ops tasks.
- Maintain auditability and platform health.

### What Success Looks Like
- Source inbox and publish queue remain controlled.
- Trust and lifecycle states are consistent.
- Operators can trace every published node back to evidence and review history.

### Permission Summary
- Full access to source repository and review workflows.
- Final approval for corrected text, Markdown drafts, and publication.
- Manage tags, trust states, archive/merge, notifications, and operational settings.
- Access backup, export, and system health surfaces.

## Future Role Split
- `Reviewer`: focused on evidence review and verification.
- `Curator`: focused on taxonomy, concept quality, and merge decisions.
- `Operator`: focused on automation, deployment, and incident handling.

V1 documents should mention these only as future decomposition of `Admin/Op`, not as current roles.

