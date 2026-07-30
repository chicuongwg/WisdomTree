# Permissions Matrix

## Purpose
- Provide the authoritative V1 permission model across major product surfaces.
- Keep routing, API authorization, and UI visibility consistent.

## In Scope
- Role-based permissions for `User`, `Editor`, and `Admin/Op`.
- Product modules: Tree, Source Repo, Review, Search, Board, Export, and Admin.

## Out of Scope
- Field-level permission policies.
- Organization-level policy builders.
- Phase 1.5 role split permissions.

## Decisions
- Permissions are expressed at capability level, not implementation detail level.
- `User` is the baseline authenticated account capability set.
- `Editor` curates existing submissions but cannot originate shared canonical content.
- Approval is an explicit capability and never bypasses maker-checker checks.
- Editors can contribute to source correction and Markdown drafting only when owned or assigned.
- Storage browse, search, and download rights are scoped by space membership for every role.

## Dependencies
- Role definitions in [`../product/roles-personas.md`](../product/roles-personas.md).
- Functional capabilities in [`functional-spec.md`](./functional-spec.md).
- Screen visibility in [`../ui/screen-inventory.md`](../ui/screen-inventory.md).

## Acceptance Criteria
- Each action is clearly allowed or denied per role.
- UI screen specs can derive action visibility directly from this file.
- Backend authorization can be implemented without unanswered permission questions.

## Matrix

| Capability | User | Editor | Admin/Op |
| --- | --- | --- | --- |
| Sign in via Google OIDC | Yes | Yes | Yes |
| Read tree nodes | Yes | Yes | Yes |
| Search tree | Yes | Yes | Yes |
| Search source repo items | Within member spaces | Within member spaces plus assigned items | Within member spaces |
| Open dedicated graph surface | Yes | Yes | Yes |
| Open source intake | Yes | No | No |
| Browse Library of stored items | Member spaces only | Member spaces only | Member spaces only |
| Create branch-gap request | Yes | Yes | Yes |
| Create branch | No | No | No |
| Edit branch metadata | No | Owned or assigned only | No |
| Create manual node | No | No | No |
| Edit manual node | No | Owned or assigned only | No |
| View node audit summary | No | Limited to owned or assigned items | Yes |
| Upload source file | Member spaces only | No | No |
| View own submissions | Yes | Yes | Yes |
| View source items across all spaces | No | No | Yes |
| Download original source file | Member spaces only | Member spaces only | Member spaces only |
| Edit corrected text when owned or assigned | No | Yes | No |
| Edit Markdown draft when owned or assigned | No | Yes | No |
| Approve corrected text | No | No | Yes |
| Change source trust status | No | No | Yes |
| Approve Markdown draft for publication | No | No | Yes |
| Publish to tree | No | No | Yes |
| Merge duplicate nodes | No | Yes | No |
| Archive node or source | No | Yes | No |
| Manage tags and taxonomy | No | Limited suggestion only | Yes |
| Manage operational board | Limited task updates on owned or assigned work | Limited task updates on owned or assigned work | Yes |
| Export node Markdown to docx or pdf | Yes | Yes | Yes |
| Browse and search library catalog | Member spaces only | Member spaces only | Member spaces only |
| Request to borrow a catalog item | Member spaces only | Member spaces only | Member spaces only |
| Approve or decline a loan, lend, and mark returned | No | No | Yes |
| Add, edit, or import catalog items | No | No | Yes |
| Mark catalog item lost or in repair | No | No | Yes |
| Link a digitized source to a catalog item | No | No | Yes |
| Comment on an object the user can see | Yes | Yes | Yes |
| Keep private notes in a personal space | Yes | Yes | Yes |
| Set own notification preferences | Yes | Yes | Yes |
| View project deadlines and subscribe the calendar feed | Project members | Project members | Project members |
| Create or edit a project deadline | Project members | Project members | Project members |
| Manage spaces and membership | No | No | Yes |
| Trigger export | No | No | Yes |
| View backup and system health | No | No | Yes |

## Notes
- Users may submit new source items or `branch-gap requests` and track their own submission history. Storage visibility is space-scoped: users browse, search, and download stored items only within spaces they belong to, never across all spaces.
- Editors curate source-derived working content only when assigned and submit immutable revisions for independent review.
- Admin/Op has no implicit cross-space or content bypass; operational actions require explicit capabilities.
- Library circulation approval and catalog management are held by `Admin/Op` acting as the library space's librarian; library-space members may browse the catalog and request loans.
- Audit and incident investigation must be able to distinguish uploader, editor/updater, and approver/publisher actions from this permission model.
