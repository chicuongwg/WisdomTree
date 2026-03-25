# Permissions Matrix

## Purpose
- Provide the authoritative V1 permission model across major product surfaces.
- Keep routing, API authorization, and UI visibility consistent.

## In Scope
- Role-based permissions for `Reader`, `Editor`, and `Admin/Op`.
- Product modules: Tree, Source Repo, Review, Search, Board, Export, and Admin.

## Out of Scope
- Field-level permission policies.
- Organization-level policy builders.
- Phase 1.5 role split permissions.

## Decisions
- Permissions are expressed at capability level, not implementation detail level.
- `Admin/Op` owns all approval and publication actions in V1.
- Editors can contribute to source correction and Markdown drafting only when assigned.

## Dependencies
- Role definitions in [`../product/roles-personas.md`](../product/roles-personas.md).
- Functional capabilities in [`functional-spec.md`](./functional-spec.md).
- Screen visibility in [`../ui/screen-inventory.md`](../ui/screen-inventory.md).

## Acceptance Criteria
- Each action is clearly allowed or denied per role.
- UI screen specs can derive action visibility directly from this file.
- Backend authorization can be implemented without unanswered permission questions.

## Matrix

| Capability | Reader | Editor | Admin/Op |
| --- | --- | --- | --- |
| Sign in via Google OIDC | Yes | Yes | Yes |
| Read tree nodes | Yes | Yes | Yes |
| Search tree | Yes | Yes | Yes |
| Search source repo items | Limited to exposed snippets only | Own submissions and assigned items | Yes |
| Open dedicated graph surface | Yes | Yes | Yes |
| Create branch | No | Yes | Yes |
| Edit branch metadata | No | Yes | Yes |
| Create manual node | No | Yes | Yes |
| Edit manual node | No | Yes | Yes |
| View node audit summary | No | Limited | Yes |
| Upload source file | Yes | Yes | Yes |
| View own source submissions | No | Yes | Yes |
| View all source items | No | No | Yes |
| Download original source file | No | No | Yes |
| Edit corrected text when assigned | No | Yes | Yes |
| Edit Markdown draft when assigned | No | Yes | Yes |
| Approve corrected text | No | No | Yes |
| Change source trust status | No | No | Yes |
| Approve Markdown draft for publication | No | No | Yes |
| Publish to tree | No | No | Yes |
| Merge duplicate nodes | No | No | Yes |
| Archive node or source | No | No | Yes |
| Manage tags and taxonomy | No | Limited suggestion only | Yes |
| Manage operational board | No | Limited task updates | Yes |
| Trigger export | No | No | Yes |
| View backup and system health | No | No | Yes |

## Notes
- Readers may submit new source items or topic requests through lightweight intake, but they do not gain visibility into the full source repository.
- Editors can contribute to source-derived content only when explicitly assigned to an item or task.
- Admin/Op is the only role with trust, archive, merge, publish, export, and download-original authority in V1.

