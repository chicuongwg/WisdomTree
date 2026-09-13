# PC0 privacy matrix

| Data or subsystem | Permitted subject | Denied/non-disclosed subject | Evidence |
| --- | --- | --- | --- |
| Personal Project and its Notes, Materials, Activities, Tasks, People | owner | unrelated user, Core-only, admin-only | PR2 integration; Project authorization |
| Shared Project research | confirmed member; Core where research permission permits | unrelated user; Personal data remains excluded | PR2 integration |
| Material original/version/provenance | authorized Project reader with matching Project/Material/version | mismatched Project, Material, or Version; unrelated caller | PR1 governance test; download route |
| List/Kanban/Calendar/My Work | authorized Project member; own workload | foreign Personal or removed-member work | PR2 integration; PM filters |
| ICS | calendar-token holder for owner/member data | foreign Personal work; invalid token | PR2 integration |
| Search and Graph | research-readable Project scope | foreign Personal Project entities | PR2 integration |
| Note/Material/Deadline/Activity/Task collaboration | authorized anchor context | outsider, Core-only without membership, disabled account | PR3 and PC1 collaboration integration |
| Notification deep link | current authorized recipient | recipient who later loses anchor access | PC1 collaboration integration click-time probe |
| Presence | authorized anchor context, short-lived signal | membership discovery by outsider | collaboration tests/source |
| Public /p data | published public revision | internal notes, drafts, comments, presence, notifications, membership, Personal data | public DTO/routes |

Conclusion: no UI-hidden/backend-exposed Personal Project path was reproduced in the tested systems. This is bounded by current automated coverage and source review; the narrow e2e smoke is not a visual/privacy test of every screen.
