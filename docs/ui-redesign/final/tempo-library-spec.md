# Tempo Library specification

## Placement

Library is a conditional tab inside any Project whose Stage 16 workspace reports `libraryCirculation: true`. Tempo uses the ordinary Project shell. No name check, special Project type, or global Library entry.

Materials remains the research repository. Library is the operational circulation workspace over physical representations.

## Library workspace

Tabs/views:

1. Physical holdings — circulation-oriented view linking back to Material detail.
2. Requests — pending loan requests for authorized operators.
3. Active loans — approved/handed-over states.
4. Returns/history as supported by current loan-state query.
5. Operators — manager-only roster administration.

Do not duplicate full Material metadata, extracted text, or research search inside Library.

## Loan list

Supported fields from Stage 16:

```text
Material title | item code | borrower name | state | requested | due | returned
```

Operational loan data is not visible through Core research-read alone.

## Capability-driven actions

| Actor capability | UI behavior |
| --- | --- |
| Project research viewer/Core outsider | Material research in Materials; no Library operational data/actions. |
| Project manager, not operator | May manage operator roster; cannot approve/handover/return. |
| Library operator with current membership | May perform supported approve/decline/handover/return transitions. |
| Manager + operator | Both roster and circulation actions. |
| Core + no operator | No circulation authority. |

The UI consumes named capabilities and transition availability from server state; it never derives these from labels.

## Transition interactions

- Request: borrower-facing action on eligible physical Material when exposed by future UI composition.
- Approve/decline: confirm borrower/material identity and resulting state.
- Handover: due date required by current boundary; validate inline.
- Return: confirm exact item/loan; completion updates row state.
- Invalid transition uses `invalid_state` and refreshes current loan state.

Actions are row/detail menus with text labels, not icon-only controls. Pending state affects only the loan being changed.

## Operator administration

- `Manage operators` appears only with `canManageLibraryOperators`.
- Eligible user/member selection must come from a server-safe Project membership source; Stage 16 exposes operator list/grant/revoke but not a target member picker DTO, so Stage 17 must add a narrow adapter before implementing grant UI.
- Revocation is confirmed because it removes operational authority immediately.
- Grant/revoke never changes Project membership.

## Physical holdings

Adding a physical representation belongs on Material detail. Library holdings links to that Material rather than creating a parallel catalog object. If the actor lacks material-management authority, show read-only holdings.

## Empty and permission states

- Capability disabled: Library tab absent.
- Capability enabled but no operational access: Library operational tab absent; do not show a forbidden teaser to Core outsiders.
- No loans: operator sees `No loan requests/active loans` and relevant navigation, not a Material creation action unless separately authorized.
- Transition conflict: refresh exact loan and explain its new state.
