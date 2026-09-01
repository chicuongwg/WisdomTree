# Workflow evaluation

## Method

Scores are qualitative design judgments, not usability-test measurements:

- **5** — direct, obvious, low context switching
- **4** — strong, with one modest trade-off
- **3** — workable but requires learning or pane/state management
- **2** — material friction or mismatch
- **1** — concept does not support the workflow acceptably

All concepts assume the same Stage 16 capability-safe application contract. A high UX score never overrides authorization.

## The 21 core workflows

| # | Workflow | A Workspace | B Studio | C Desk | Reasoning |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Enter TMKT and understand attention | 5 | 4 | 3 | A gives a simple action-oriented Overview; B adds useful research context; C's desk density competes with orientation. |
| 2 | Choose/open a Project | 5 | 4 | 4 | A's stable Projects destination is clearest; B/C add preview but another pane/state. |
| 3 | Capture a quick working Note | 5 | 4 | 4 | A's contextual `+ New` is obvious; B/C are fast after users learn the object/desk model. |
| 4 | Add digital Material | 5 | 4 | 4 | A provides a direct Project action; B/C make metadata clearer but feel heavier for quick intake. |
| 5 | Register physical Material | 4 | 5 | 4 | B's representation inspector best communicates one Material with optional physical form. |
| 6 | Scan/add a Material version | 4 | 5 | 5 | B/C keep representation/version context continuously visible; A requires a detail section. |
| 7 | Review extraction and create Project Note | 4 | 5 | 5 | B/C retain source text beside creation; A uses a review screen/drawer with more transitions. |
| 8 | Create an evidence Note | 4 | 5 | 5 | Purpose and source context are most visible in B/C. |
| 9 | Create a synthesis Note | 4 | 5 | 5 | B/C are optimized for sustained synthesis. |
| 10 | Attach several supporting versions | 4 | 5 | 5 | B's Evidence Inspector and C's source queue minimize navigation. |
| 11 | Trace synthesis to evidence | 4 | 5 | 5 | Exact version context remains adjacent in B/C; A's inspector is one action away. |
| 12 | Create an Activity | 5 | 4 | 3 | A's Project workspace and create model best fit occasional operational use. |
| 13 | Add People to Activity | 5 | 4 | 4 | A is straightforward; B/C provide richer object context but more panes. |
| 14 | Coordinate Activity Tasks | 5 | 3 | 3 | A's coordination model is strongest; B/C center research objects. |
| 15 | Find research in current Project | 5 | 5 | 5 | All support local narrowing; B/C offer stronger preview at greater density. |
| 16 | Search across Projects | 5 | 5 | 5 | All use one full Search workspace with authorization-first scope. |
| 17 | Core inspects another Project, no operations | 5 | 4 | 4 | A most clearly separates research-only entry from operational modules/actions. |
| 18 | Publish an internal Note | 5 | 4 | 4 | A's inspector status/action is clearest; all require Core capability. |
| 19 | See whether public content is current | 5 | 5 | 5 | All use textual publication badges plus exact version status. |
| 20 | Operate Tempo circulation | 5 | 4 | 4 | A's conditional local Library workspace is explicit and operationally legible. |
| 21 | See My Work across Projects | 5 | 3 | 3 | A treats My Work as a first-class aggregate; B/C prioritize research collections. |

No aggregate numeric winner is reported. The pattern is more useful than a total: A leads orientation/coordination; B leads balanced research-object work; C leads dense evidence work.

## Quality-dimension assessment

For implementation complexity, **5 means lower implementation risk/simpler**, not “more complex.”

| Dimension | A | B | C | Reasoning |
| --- | ---: | ---: | ---: | --- |
| Discoverability | 5 | 4 | 3 | A exposes destinations and actions; B/C require pane literacy. |
| Navigation clarity | 5 | 4 | 4 | A has two clear levels; B/C keep context well but add local collection states. |
| Research capture speed | 5 | 4 | 4 | A's one create entry is quickest for mixed users. |
| Synthesis/evidence workflow | 4 | 5 | 5 | B/C keep source context continuously present. |
| Material workflow | 4 | 5 | 5 | Research-tool panes make versions/physical/extraction easier to compare. |
| Project coordination | 5 | 3 | 3 | A handles Activities/Tasks/My Work most naturally. |
| Low context switching | 4 | 5 | 5 | B/C retain collection, object, and evidence simultaneously. |
| Power-user efficiency | 4 | 4 | 5 | C offers the highest density and keyboard throughput. |
| Low new-user learning cost | 5 | 3 | 2 | A uses familiar workspace patterns; C is professional-tool dense. |
| Scalability with many Projects/items | 4 | 4 | 5 | C's filters/collections are strongest at scale; A needs careful saved-view design later. |
| Accessibility | 5 | 4 | 3 | A has the simplest focus model; multi-pane semantics and resizing add risk. |
| Responsive behavior | 5 | 3 | 2 | A collapses cleanly; C loses its defining advantage on narrow screens. |
| Implementation feasibility | 4 | 3 | 2 | A maps most directly to Stage 16 DTOs; B/C require more sophisticated pane/state orchestration. |

## Authorization stress test

All three concepts pass only if these visible states are enforced by capability-shaped DTOs:

- Core outside a Project sees official Notes, Materials, People, and Project metadata, but no Project Tasks, Activities, private drafts, circulation data, or create/manage actions.
- Project contributor sees operational modules/actions according to actual membership capabilities.
- A private draft appears only to its author through the working-note surface.
- Tempo Library appears only when `library_circulation` is enabled; operational controls require library-operator authority.
- Public status does not expose internal support, People, Materials, or drafts.

## Evaluation conclusion

Concept A is the safest complete shell. Concept B contributes the strongest domain-specific research interactions. Concept C is valuable as an optional high-density mode for Notes/Materials/Search after the default experience is proven; it is too costly and dense as the sole application architecture.
