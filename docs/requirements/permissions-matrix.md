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
- `Editor` extends `User` permissions but is limited to owned-or-assigned update work.
- `Admin/Op` owns all approval and publication actions in V1.
- Editors can contribute to source correction and Markdown drafting only when owned or assigned.

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
| Search source repo items | Limited to exposed snippets only | Own submissions and assigned items | Yes |
| Open dedicated graph surface | Yes | Yes | Yes |
| Open source intake | Yes | Yes | Yes |
| Create branch-gap request | Yes | Yes | Yes |
| Create branch | No | Yes | Yes |
| Edit branch metadata | No | Owned or assigned only | Yes |
| Create manual node | No | Yes | Yes |
| Edit manual node | No | Owned or assigned only | Yes |
| View node audit summary | No | Limited to owned or assigned items | Yes |
| Upload source file | Yes | Yes | Yes |
| View own submissions | Yes | Yes | Yes |
| View all source items | No | No | Yes |
| Download original source file | No | No | Yes |
| Edit corrected text when owned or assigned | No | Yes | Yes |
| Edit Markdown draft when owned or assigned | No | Yes | Yes |
| Approve corrected text | No | No | Yes |
| Change source trust status | No | No | Yes |
| Approve Markdown draft for publication | No | No | Yes |
| Publish to tree | No | No | Yes |
| Merge duplicate nodes | No | No | Yes |
| Archive node or source | No | No | Yes |
| Manage tags and taxonomy | No | Limited suggestion only | Yes |
| Manage operational board | No | Limited task updates on owned or assigned work | Yes |
| Trigger export | No | No | Yes |
| View backup and system health | No | No | Yes |

## Notes
- Users may submit new source items or `branch-gap requests` directly and track their own submission history, but they do not gain visibility into the full source repository.
- Editors inherit all `User` capabilities and may modify source-derived working content only when the item is owned by them or explicitly assigned to them.
- Admin/Op is the only role with trust, archive, merge, publish, export, and download-original authority in V1.
- Audit and incident investigation must be able to distinguish uploader, editor/updater, and approver/publisher actions from this permission model.
