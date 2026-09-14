# PC0 authorization matrix

R means Project research-read access. O means operational membership. — means denied or not disclosed. Assignment is additive: neither admin_op, Core, nor library operator automatically grants unrelated Project operational access.

| Actor | Project research | Project settings/roster | Admin/Core | Tempo Library/physical | Tasks/Calendar | Collaboration | Search/Graph | ICS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Anonymous | public Note revision only | — | — | — | — | — | public only | token bearer only |
| Unrelated active user | — | — | — | — | — | — | own authorized scope | — |
| Personal Project owner | R/O on own Project | metadata only; cannot share | — | no Personal capability path | own Tasks/Deadlines | own anchors | own graph | own token/feed |
| Shared viewer | R/O | — | — | request only where enabled | read | context read/presence | readable Projects | member feed |
| Shared contributor | R/O | — | — | no operator transition | create/update as authorized | comment/mention/presence | readable Projects | member feed |
| Shared manager | R/O | manager | operator-roster only when enabled | transition only if also operator | member task/deadline rights | member context | readable Projects | member feed |
| Core-only | confirmed shared research only | — | Core publication only | — | — without membership | — without anchor access | readable shared research | — |
| Library operator-only | assignment plus Project membership | — | — | assigned enabled Project only | membership-derived | membership-derived | membership-derived | membership-derived |
| admin_op-only | membership/Core-derived | creates Shared Project; user/Core admin | user/Core administration | no automatic Project operator grant | no automatic grant | no automatic grant | membership/Core-derived | own membership only |
| Disabled user | — | — | — | — | — | excluded | excluded | rejected |

## Reverified enforcement points

- Project privacy: requireConfirmedProject plus research/operational authorization gates. PR2 tests deny outsider and Core access to Personal Project workspace, list, search, Material, graph, and task paths.
- Legacy direct task routes: Project-backed rows receive pm.project_task.read authorization on both direct read and mutation; global board/schedule only returns legacy projectless Tasks.
- Tempo: capability enablement, Project membership, and library-operator assignment are distinct checks.
- Collaboration: each comment/presence/notification anchor resolves its Project context; the notification resolver repeats authorization at click time instead of trusting receipt time.
- Public routes emit public revisions only. They do not serialize drafts, memberships, notifications, comments, or presence.
