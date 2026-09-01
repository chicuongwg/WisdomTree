# Capability-to-UI matrix

## Rule

The server computes named capability booleans. Stage 17 renders them; it must not reconstruct viewer/contributor/manager/Core/operator logic in the browser. Raw roles below exist only for design/test traceability.

Legend: **Read**, **Act**, **Manage**, **Hidden**, **N/A**.

## Major surfaces

| Surface/action | Viewer member | Contributor | Manager | Core outsider | Core + contributor | Library operator | Manager + operator |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Project metadata/Overview | Read | Read | Read/Manage metadata | Read | Read | Read | Read/Manage |
| Official Notes | Read | Read | Read | Read | Read | Read if member/Core | Read |
| Other author's private drafts | Hidden | Hidden | Hidden | Hidden | Hidden | Hidden | Hidden |
| Own private draft | Only if legitimately created | Read/Act | Read/Act | N/A without membership | Read/Act | Per membership | Read/Act |
| Create/edit Project Note | Hidden | Act | Act | Hidden | Act via contributor membership | Per membership | Act |
| Publish eligible official Note | Hidden unless separately Core | Hidden unless Core | Hidden unless Core | Act | Act | Only if separately Core | Only if separately Core |
| Materials research read | Read | Read | Read | Read | Read | Read | Read |
| Create/version Material | Hidden | Act | Act | Hidden | Act via membership | Per membership | Act |
| Activities read | Read | Read | Read | Hidden | Read via membership | Per membership | Read |
| Create/update Activity | Hidden | Act | Act | Hidden | Act via membership | Per membership | Act |
| Project Tasks read | Read | Read | Read | Hidden | Read via membership | Per membership | Read |
| Create/manage Task | Per current Task rules; create hidden | Act | Act | Hidden | Act via membership | Per membership | Act |
| Project People research list | Read | Read | Read | Read | Read | Read | Read |
| Create/attach/update Person | Hidden | Act | Act | Hidden | Act via membership | Per membership | Act |
| Cross-Project evidence read | Own readable Projects | Own readable Projects | Own readable Projects | Read across confirmed Projects | Read across confirmed Projects | Per member/Core state | Per member/Core state |
| Mutate target draft evidence | Hidden | Act in member Project | Act | Hidden without target membership | Act in member Project | Per membership | Act |
| Library tab | If capable Project and operational read is exposed | Same | Same | Hidden operationally | Only via membership | Read/Act | Read/Act/Manage |
| Loan list/transitions | Hidden unless operator | Hidden unless operator | Hidden unless operator | Hidden | Hidden unless operator | Act | Act |
| Manage library operators | Hidden | Hidden | Manage | Hidden | Manage only if manager | Hidden unless manager | Manage |
| Project switch to research-only Project | Read surfaces only | Read surfaces through membership | Read surfaces | Read surfaces only | Read surfaces; operations only where member | Per state | Per state |

## Product-language presentation

- Use `Research access` for readable Project without operational membership.
- Use `Work access` for actual Project participation.
- Do not show `viewer`, `contributor`, `manager`, `Core`, or `library operator` as explanations on ordinary research screens unless the user is in an explicit administration context.
- A missing action is preferred to a disabled action when no useful explanation exists.
- When context helps, Project Overview may say: `You can read this Project's research. Activities, Tasks, and creation require Project participation.`

## Important combinations

### Core outsider

Visible: Project Overview, official Notes, Materials, People, Search, publication action on eligible official Note.

Absent: private drafts, Notes/Materials creation, Activities, Tasks, Activity relations, My Work from that Project, loans, operator management.

### Core + contributor

Global research read comes from Core; operational creation and Activity/Task access come only from actual membership. The UI is one shell and does not duplicate modes.

### Library operator

Operator authority is effective only with current same-Project membership and enabled capability. It does not grant Core research access or Project management.

## Capability gaps Stage 17 must resolve narrowly

- Global Project creation capability is not present in `ApplicationContext`; omit global create-Project UI or add a server-computed capability.
- Person detail lacks an explicit edit capability DTO; omit edit or add a narrow server-computed value.
- Operator grant needs an eligible Project-member picker DTO; do not reuse raw membership APIs in the client.
- Collection-level Note publication state is not returned; do not show badges there until composed server-side.
