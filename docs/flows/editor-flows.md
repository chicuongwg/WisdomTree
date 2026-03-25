# Editor Flows

## Purpose
- Describe the editor-facing creation and refinement workflows for branches, manual nodes, source submission, and assigned correction work.

## In Scope
- Create branch.
- Create manual node.
- Upload source.
- Edit corrected text or Markdown draft when assigned.
- Relevant happy path, error path, and permission path.

## Out of Scope
- Final review, trust approval, and publication authority.
- Full system administration.
- Operational monitoring.

## Decisions
- Editors can move content forward but cannot finalize publication decisions.
- Editors can contribute to source-derived content only when assigned.
- Manual tree authoring remains part of V1 and is not blocked on source availability.

## Dependencies
- Role definitions in [`../product/roles-personas.md`](../product/roles-personas.md).
- Functional requirements in [`../requirements/functional-spec.md`](../requirements/functional-spec.md).
- UI behavior in [`../ui/reader-screen-specs.md`](../ui/reader-screen-specs.md) and [`../ui/admin-op-screen-specs.md`](../ui/admin-op-screen-specs.md).

## Acceptance Criteria
- Editors can create knowledge structure and contribute to source preparation without needing Admin/Op permissions.
- Permission boundaries remain clear at each handoff point.
- Error states are explicit enough for UI and backend handling.

## Flow 1: Create or Edit Branch
1. Editor opens branch creation or branch edit flow.
2. Editor sets branch type, title, summary, and structural metadata.
3. Editor adds initial nodes or placeholders.
4. System saves the branch and updates tree navigation and board context.

## Flow 2: Create Manual Node
1. Editor opens a branch or related context.
2. Editor creates a new Markdown node from the structured template.
3. System marks the node as `no_source`.
4. Editor links related nodes and adds tags.
5. Admin/Op may later attach evidence and verify the node.

## Flow 3: Upload Source
1. Editor submits a source file through intake.
2. System stores the source and starts processing.
3. Editor can view submission status in personal submissions.
4. Admin/Op receives the source into the operational review queue.

## Flow 4: Assigned Correction Work
1. Admin/Op assigns a source version to an Editor.
2. Editor opens raw text and corrected text side by side.
3. Editor updates corrected text or refines the Markdown draft.
4. Editor marks the item ready for Admin/Op review.

## Error Path
- Upload processing fails:
  - show failure state
  - allow Admin/Op escalation or resubmission path
- Editor tries to modify an unassigned correction task:
  - block action
  - show assignment-required state
- Markdown draft fails validation:
  - show validation issues
  - prevent review handoff until fixed

## Permission Path
- Editors can author tree nodes and branches directly.
- Editors can upload source files.
- Editors can see their own submissions and assigned source tasks.
- Editors cannot approve trust, publish to tree, merge nodes, archive nodes, or download original files.

