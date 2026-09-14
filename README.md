# WisdomTree

**WisdomTree is a collaborative research workspace focused on research provenance.**

It helps teams organize Projects, Materials, Notes, People, Activities, Tasks, and publication while preserving one critical property:

> **For each research conclusion, WisdomTree can preserve exactly which versions of which sources and previous Notes supported it.**

Built with **Next.js + TypeScript + PostgreSQL + Drizzle ORM**.

---

## Why WisdomTree?

Most knowledge tools are good at writing, linking, and organizing information.

WisdomTree focuses on what happens **between source material and published knowledge**:

```text
Material
   ↓
immutable SourceVersion
   ↓
research Note / draft
   ↓
attach exact evidence
   ↓
Synthesis
   ↓
immutable NoteVersion
   ↓
immutable evidence snapshot
   ↓
Publication
```

If a source changes later, previous research versions still retain the evidence they originally used.

---

## What makes it different?

| Capability             | Generic Wiki / Markdown Workspace | WisdomTree                                       |
| ---------------------- | --------------------------------- | ------------------------------------------------ |
| Writing                | Pages / Markdown                  | Project-owned research Notes                     |
| Materials              | Files / attachments               | First-class versioned research sources           |
| Evidence               | Link to a file/page               | Link to an **exact immutable version**           |
| History                | Content version history           | Content **and evidence history**                 |
| Synthesis              | Manually interpreted links        | Explicit source → evidence → synthesis chain     |
| Restore                | Restore old content               | Restore old content with historical evidence     |
| Cross-project research | Generic sharing                   | Explicit research-read authorization             |
| People                 | Users / database rows             | Canonical Person independent from login User     |
| Publication            | Publish current page              | Immutable public revision from exact NoteVersion |
| Primary goal           | Organize knowledge                | **Preserve how knowledge was produced**          |

Example:

```text
Synthesis V1
├── Source Note A (V3)
└── Source Note B (V1)

Synthesis V2
├── Source Note A (V5)
└── Source Note B (V4)
```

Publishing V2 does not rewrite the provenance of V1.

---

## Product model

```text
Workspace
├── Overview
├── Projects
├── My Work
├── People
└── Search
```

Each Project contains:

```text
Project
├── Notes
├── Materials
├── Activities
├── Tasks
├── People
└── Library      # capability-enabled Projects only
```

### Notes

Markdown-based research documents with:

* author-private drafts;
* autosave and optimistic concurrency;
* optional Evidence / Synthesis purpose;
* immutable official versions;
* exact supporting evidence;
* historical restore;
* separate internal and public publication.

### Materials

Project sources and records with immutable versions:

* documents and text files;
* media recordings;
* reference data;
* extracted text;
* registered items.

### Evidence

Evidence always references exact immutable versions:

```text
NoteVersion
├── SourceVersion
└── NoteVersion
```

### Activities & Tasks

Activities represent collaborative work context such as sessions, meetings, reviews, and project milestones.

Tasks support that workflow rather than acting as a standalone project-management product.

### People

A Person is a canonical research identity and is independent from an authenticated User account.

### Graph

Graph remains a secondary research visualization, not the source of truth.

---

## What WisdomTree is not

WisdomTree is not intended to become:

* a Notion clone;
* an Obsidian clone;
* a Trello/Jira replacement;
* a generic wiki;
* a generic graph database;
* a static-site generator.

Its main concern is:

```text
source
→ evidence
→ synthesis
→ provenance
→ publication
```

---

## Architecture

WisdomTree is a modular monolith:

```text
Next.js UI
    ↓
Application facade
    ↓
Domain services
    ↓
PostgreSQL / object storage
```

Principles:

* explicit domain models;
* server-first reads;
* small client islands;
* PostgreSQL transactions;
* authorization in services, not UI;
* few dependencies;
* no generic relation framework;
* no unnecessary global state.

---

## Quickstart

```bash
npm install
npm run setup:system
npm run demo
```

> `npm run demo` uses destructive demo seeding. Do not use it to restart an installation whose data must be preserved.

Start only PostgreSQL:

```bash
npm run runtime:up
```

Run manually:

```bash
npm run db:migrate
npm run build
npm run start
```

---

## Development

```bash
npm run dev
```

Production-style local run:

```bash
npm run build
npm run start
```

---

## Testing

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:privacy
npm run test:boundaries
```

Full validation:

```bash
npm run test:all
```

Stateful tests must use an isolated test database.

---

## Repository

```text
src/app/                    Next.js delivery / UI
src/modules/application/    Project-centric application facade
src/modules/knowledge/      Notes, drafts, versions, evidence
src/modules/storage/        Materials, versions, extraction
src/modules/project/        Project domain
src/modules/pm/             Tasks and coordination
src/db/                     Database
drizzle/                    Forward-only migrations
tests/                      Test suites
docs/                       Detailed documentation
```

See `docs/` for architecture, deployment, migration, testing, and refactor documentation.

---

## In one sentence

> **WisdomTree is a research provenance workspace where knowledge may evolve, but the evidence trail behind each historical research version remains inspectable.**
