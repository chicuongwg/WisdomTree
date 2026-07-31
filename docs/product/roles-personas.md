# Roles and Personas

## Purpose
- Define the V1 role model, user motivations, and the core permission envelope for each role.
- Align product, permission, and UI decisions around a stable set of personas.

## In Scope
- Role definitions for `User`, `Editor`, and `Admin/Op`.
- Jobs-to-be-done, success conditions, and permission summary.
- Future role split notes where relevant.

## Out of Scope
- Low-level route guard implementation.
- Team hierarchy, organization billing, or enterprise admin models.
- Phase 1.5 detailed role decomposition beyond directional notes.

## Decisions
- V1 ships with three practical roles: `User`, `Editor`, `Admin/Op`.
- `User` is the default authenticated account role in V1.
- `User` storage access is scoped by space membership: browse, search, and download within member spaces.
- `Editor` inherits `User` capabilities and adds owned-or-assigned content update authority.
- `Admin/Op` retains the personal `User` flow; review, taxonomy, publish approval,
  and operations work require the corresponding capability and scope grant.
- The `Admin/Op` role stays single in the model, but the Admin Console UI is split into a Content tab (non-technical content admins: review, publish, catalog, taxonomy) and a System tab (owner-only: backup, restore, jobs). The formal Reviewer/Curator/Operator split remains future work.
- Accountability is intentionally split across uploader, editor/updater, and approver/publisher actions.
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
| User | Store and retrieve team files, contribute source evidence, and consume curated knowledge | Home, Search, Library, Tree, Graph, Source Intake, My Submissions |
| Editor | Refine owned or assigned knowledge work before final approval | Tree authoring, Branch editor, Assigned source correction |
| Admin/Op | Operate intake, review, trust, publish, taxonomy, and platform workflows | Source Inbox, Source Detail, Review Queue, Publish Review, Admin, Board |

## User Persona

### Jobs To Be Done
- Store working files in the team storage home instead of scattered Excel/Docs folders.
- Browse, search, and download files stored in my spaces.
- Upload source material into the system as new evidence input.
- Track the processing status and outcome of my own submissions.
- Find trustworthy knowledge quickly.
- Understand how concepts relate to each other.
- Follow branches to learn a topic progressively.
- Identify gaps and submit `branch-gap requests` for missing knowledge.

### What Success Looks Like
- A newly uploaded source item becomes visible in personal submissions with a clear processing state.
- A file stored by a teammate in a shared space can be found and downloaded within a minute.
- Search returns useful, trust-visible results.
- Node pages make provenance and related concepts easy to inspect.
- Branch structure helps users move from overview to detail.

### Permission Summary
- Read tree content.
- Search across tree and source snippets exposed through tree pages.
- Open graph and branch views.
- Upload new source items into member spaces through authenticated intake.
- Browse `Library`, search stored items, and download original files within member spaces.
- View own submissions, processing states, and follow-up prompts.
- Create `branch-gap requests` through `Source Intake` when no file is available yet.
- No access to source items outside member spaces and no access to operational review internals.
- No permission to edit corrected text, Markdown drafts, trust states, or publication outcomes.

## Editor Persona

### Jobs To Be Done
- Create and improve owned or assigned branches and manual knowledge nodes.
- Update outdated or incorrect tree content when the work is owned or assigned.
- Correct extracted text or refine Markdown drafts when the item is owned or assigned.
- Expand underdeveloped branches and connect related nodes without taking final review authority.

### What Success Looks Like
- Editor can move work forward without being blocked on system administration.
- Ownership and assignment are visible enough that edit authority is not ambiguous.
- Editor knows what content still needs operator review.
- Manual nodes can mature from `no_source` to verified content later.

### Permission Summary
- Inherits all `User` permissions.
- Create and edit owned or assigned tree nodes and branches.
- View own submissions and assigned correction tasks.
- Edit corrected text or Markdown draft only for owned or assigned work.
- Suggest taxonomy changes through content edits, not by changing global trust or verification policy.
- No final authority for trust approval or publication.

## Admin/Op Persona

### Jobs To Be Done
- Operate the source repository and review pipeline.
- Decide trust status and publication readiness.
- Publish Markdown into the tree.
- Merge duplicates, archive superseded content, manage taxonomy, manage spaces and membership, and handle ops tasks.
- Maintain auditability and platform health.

### What Success Looks Like
- Source Inbox, Review Queue, and Publish Review remain controlled.
- Trust and lifecycle states are consistent.
- Operators can trace every published node back to evidence and review history.

### Permission Summary
- Full access to source repository and review workflows.
- Final approval for corrected text, Markdown drafts, and publication.
- Manage tags, trust states, spaces and membership, archive/merge, notifications, and operational settings.
- Access backup, export, and system health surfaces.
- Investigate accountability chains across uploader, editor/updater, and approver/publisher events.

## Future Role Split
- `Reviewer`: focused on evidence review and verification.
- `Curator`: focused on taxonomy, concept quality, and merge decisions.
- `Operator`: focused on automation, deployment, and incident handling.

V1 documents should mention these only as future decomposition of `Admin/Op`, not as current roles.
