# Platform Context

## Purpose
- Define WisdomTree as a small-team platform, not a single-purpose app, and map its four product pillars to concrete build-versus-integrate decisions.
- Give every downstream module a shared understanding of what the platform builds itself and what it borrows from the team's existing ecosystem.

## In Scope
- The four platform pillars and how each is delivered in V1 and beyond.
- The standing constraints that shape every architectural decision.
- The boundary between what WisdomTree owns and what stays in Google, Zalo/Messenger, or the content repo.

## Out of Scope
- Module-internal responsibilities (see [`module-map.md`](./module-map.md)).
- Storage and knowledge specifics (see [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md)).
- Implementation stack (see [`../system/tech-stack.md`](../system/tech-stack.md)).

## Decisions
- WisdomTree is the storage-first core of a four-pillar team platform: communication, storage and knowledge, publishing, and project management.
- The strategy is build core, integrate ecosystem: build the parts that are unique to this team and cannot be borrowed; reuse tools the team already lives in for everything else.
- The platform must never force a new account: identity is Google OIDC, which the team already has through Drive.
- The platform serves a humanities and social-science team of fewer than ten non-technical people; only the owner is technical, and only the owner performs system operations.
- AI is local-only and additive: it may help but must never block or gate core storage workflows, and it must not introduce a paid API dependency.

## Dependencies
- Product intent in [`../product/prd.md`](../product/prd.md).
- Module ownership in [`module-map.md`](./module-map.md) and [`../system/module-boundaries.md`](../system/module-boundaries.md).
- Runtime assumptions in [`../system/deployment-topology.md`](../system/deployment-topology.md).

## Acceptance Criteria
- A new contributor can read this file and correctly state which pillars WisdomTree builds, which it borrows, and why.
- Every module decision can be checked against the four pillars and the standing constraints without reopening strategy.
- No downstream document proposes building a pillar this file marks as borrowed.

## The Four Pillars

### Pillar 1: Communication
- Real-time chat stays on the tools the team already uses: Facebook Messenger and Zalo. WisdomTree does not build a chat product and does not self-host a chat server, because both would force new accounts and lose adoption.
- What WisdomTree does build is object-anchored discussion: threaded comments attached to a stored source, a knowledge node, or a deadline, so that context becomes part of the durable record instead of scrolling away in a chat app.
- The platform pushes outbound notifications to where the team already is: a Zalo Official Account and email. See [`../system/notifications.md`](../system/notifications.md).
- Private notes are a `personal` space in the storage model, not a separate feature.

### Pillar 2: Storage and Knowledge
- This is the core application and the largest module set. The Source Repo is the team's canonical storage home, organized into membership-scoped spaces, with store-first availability; the Knowledge Tree is the curated layer on top.
- This pillar also owns the physical library: an electronic catalog and borrow-return circulation for the community library's roughly one thousand books. See [`../system/catalog-circulation.md`](../system/catalog-circulation.md).
- Canonical specification lives in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).

### Pillar 3: Publishing
- Selective, read-only publishing of curated knowledge as web pages rides the existing one-way tree export to the content repo, built with a Quartz-class static site generator inside the content repo's CI. No new runtime module is required.
- Only reviewed nodes flagged for publication are exported publicly; the app database stays canonical. See [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md).

### Pillar 4: Project Management
- The team runs many parallel projects with conference-style deadlines and funding cycles, and aggregates metrics to apply for grants. The platform builds a deadline registry plus the basic board, not a Jira replacement.
- Deadlines are first-class objects linked to projects, checklists, and documents; they surface through the calendar bridge and drive reminders. See the deadline registry in [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md) and [`../requirements/functional-spec.md`](../requirements/functional-spec.md).

## Build Versus Borrow Summary

| Capability | Decision | Where it lives |
| --- | --- | --- |
| Identity and sign-in | Borrow | Google OIDC |
| Real-time chat | Borrow | Messenger, Zalo |
| Outbound alerts | Build thin adapter | Zalo OA + email via `notify` module |
| Object-anchored discussion | Build | `notify` and knowledge modules |
| Digital storage and knowledge tree | Build | storage and knowledge modules |
| Physical library catalog and loans | Build | catalog and circulation modules |
| Public web publishing | Borrow engine, build export | Quartz on the content repo |
| Project and deadline tracking | Build minimal | `pm` module |
| External data capture | Borrow, bridge in | Google Forms, Sheets via `bridge-google` |
| Legacy file storage | Borrow, import in | Google Drive via `bridge-google` |
| OCR, indexing, semantic finding | Build on local models | Ollama on the worker host |

## Standing Constraints
- No new accounts: adoption dies if the team must create or install another login. Identity is Google; notifications reach Messenger and Zalo; chat stays where it is.
- One developer plus AI agents: architecture is a modular monolith in one monorepo, deployable as the existing VPS-plus-worker topology. No microservices, no multi-repo.
- Fewer than ten non-technical users: everything user-facing must work without technical vocabulary; see [`../ui/vocabulary-vi.md`](../ui/vocabulary-vi.md). Every confusing screen becomes a support message to the only technical person, so UI simplicity is a cost-control decision, not only an aesthetic one.
- Bilingual Vietnamese and English UI with Vietnamese as the default; documentation stays English.
- Local-only AI: all AI runs on Ollama at the worker host with no paid API dependency, and the system must be fully functional with every external AI service switched off.
- Bridge, do not replace: the team cannot reach full digital conversion, so Google Forms, Sheets, Calendar, and Drive stay in use and are bridged, not displaced.

## Adoption Principle
- An empty system converts no one. Seed real data before inviting the team: import legacy files from Drive and load the roughly one-thousand-book catalog from a spreadsheet, then run one guided in-person session. See [`../operations/adoption-onboarding.md`](../operations/adoption-onboarding.md).
