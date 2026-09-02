# WisdomTree

**WisdomTree is a collaborative research workspace built to preserve the evidence trail from source material to published knowledge.**

It brings Projects, research Materials, Notes, People, Activities, Tasks, search, and publication into one workspace while treating **research provenance as a first-class part of the system**.

The core question WisdomTree is designed to answer is:

> **For this exact version of a research conclusion, which exact versions of which sources and previous Notes supported it?**

WisdomTree is a modular monolith built with **Next.js App Router + TypeScript + Drizzle ORM + PostgreSQL**.

---

## Why WisdomTree exists

General-purpose Markdown editors, wikis, note-taking tools, and project workspaces are already very good at:

* writing documents;
* linking pages;
* organizing files;
* searching knowledge;
* assigning tasks;
* building databases;
* publishing content.

WisdomTree does not attempt to reinvent those capabilities as its primary value.

The problem it focuses on is different:

> **Research knowledge changes over time, but its evidence trail should remain historically reproducible.**

A synthesis should not merely link to “an interview” or “a source”.

It should be possible to preserve:

```text
Synthesis version 4
→ Interview transcript version 3
→ Archival scan version 2
→ Field Note version 7
```

even if those Materials and Notes later receive new versions.

That provenance must remain inspectable months or years later.

---

# Core research workflow

WisdomTree models research as a chain:

```text
Material / interview / archival source
                ↓
        immutable SourceVersion
                ↓
           research work
                ↓
       author-private Note draft
                ↓
        attach exact evidence
                ↓
             synthesis
                ↓
       immutable NoteVersion
                ↓
    immutable evidence snapshot
                ↓
       internal publication
                ↓
        curated public revision
```

The important property is not merely that the objects are linked.

The links themselves preserve **which immutable versions were used at that point in research history**.

---

# What makes WisdomTree different

WisdomTree intentionally reuses familiar ideas from wikis, Markdown applications, research tools, and project workspaces.

Its advantage is the way those capabilities are combined around **research provenance**.

| Capability                       | Generic Wiki / Markdown Workspace                       | WisdomTree                                                                              |
| -------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Writing**                      | Pages, documents, Markdown, backlinks                   | Markdown-based research Notes inside Projects                                           |
| **Source material**              | Usually files or attachments                            | Materials are first-class research objects with immutable versions                      |
| **Evidence**                     | Link to a page, file, or current object                 | Link to the **exact immutable SourceVersion or NoteVersion** used                       |
| **Historical provenance**        | Document history records content changes                | Every official NoteVersion owns its own evidence snapshot                               |
| **Changing sources**             | Links normally continue resolving to the current object | Historical research continues pointing to the original source version                   |
| **Synthesis traceability**       | Relationships are manually interpreted                  | A synthesis explicitly records which research evidence supported it                     |
| **Historical restore**           | Restore previous document content                       | Restore historical content together with its historical evidence context                |
| **Research workflow**            | Constructed from pages, tags, templates, and databases  | Material → Evidence → Note → Synthesis → Publication is a first-class workflow          |
| **Cross-Project research**       | Generic sharing or cross-workspace links                | Evidence can cross Projects while ownership and research-read authority remain explicit |
| **People**                       | Usually users, mentions, or database rows               | Canonical Person identity exists independently of application User accounts             |
| **Activities**                   | Usually calendar events or project records              | Research Activities connect People, Materials, Notes, and Tasks around real work        |
| **Internal vs public knowledge** | Publishing often exposes the current page               | Public revisions are immutable projections of exact internal Note versions              |
| **Project management**           | Often a standalone productivity system                  | Tasks and Activities primarily support the research process                             |
| **Graph**                        | Usually built from backlinks                            | Secondary research visualization rather than the source of truth                        |
| **Primary design goal**          | Organize and retrieve information                       | **Preserve how knowledge was produced and what evidence supported it**                  |

A conventional knowledge system can usually answer:

```text
Which documents are related to this page?
```

WisdomTree aims to answer:

```text
For this exact version of this research conclusion,
which exact evidence versions supported it?
```

For example:

```text
Synthesis V1
├── Interview transcript V3
├── Archival scan V2
└── Field Note V1

Synthesis V2
├── Interview transcript V5
├── Archival scan V2
└── Field Note V4
```

Publishing `Synthesis V2` does not rewrite the provenance of `Synthesis V1`.

---

# Product model

WisdomTree is Project-centered.

```text
TMKT
├── Overview
├── Projects
├── My Work
├── People
└── Search
```

Each Project provides its own research workspace:

```text
Project
├── Overview
├── Notes
├── Materials
├── Activities
├── Tasks
├── People
└── Library        # capability-enabled Projects only
```

A Project owns its research context.

Cross-Project research remains possible without changing the original ownership of Materials, Notes, or People.

---

# Notes

Notes are WisdomTree's primary research-writing object.

Content is Markdown-based, but Markdown is only the **authoring format**, not the product model.

A Note may include:

```text
Note
├── Project ownership
├── Markdown content
├── author-private working draft
├── research purpose
├── immutable official versions
├── exact supporting evidence
├── publication state
└── public revisions
```

## Working drafts

Research editing happens through author-private drafts.

Drafts support:

* autosave;
* explicit save fallback;
* optimistic concurrency;
* conflict detection;
* preservation of unsaved local work;
* optional research purpose;
* evidence attachment;
* internal publication.

Private working drafts are not part of general Project research visibility.

---

## Research purpose

A Note may optionally describe its research role as:

```text
evidence
synthesis
unspecified
```

This classification is deliberately lightweight.

WisdomTree does not attempt to automatically classify, merge, or semantically infer research meaning.

---

# Materials

Materials represent research sources.

Examples include:

* uploaded documents;
* books and scans;
* photographs;
* archival records;
* interview transcripts;
* field documents;
* extracted text;
* other source files.

A Material may evolve through multiple immutable versions.

```text
Material
├── SourceVersion 1
├── SourceVersion 2
└── SourceVersion 3
```

Evidence refers to the exact `SourceVersion`, rather than merely the mutable Material identity.

This means updating a source does not silently rewrite earlier research provenance.

---

# Evidence and provenance

Evidence is explicit.

A working Note may support its research with:

```text
Draft
├── SourceVersion
├── SourceVersion
└── NoteVersion
```

When the draft becomes an official Note version, the evidence set is frozen with that version.

Canonical historical provenance therefore looks like:

```text
NoteVersion
├── supporting SourceVersion
└── supporting NoteVersion
```

Each official Note version has an independent immutable evidence snapshot.

---

## Known evidence vs unknown history

WisdomTree distinguishes:

```text
KNOWN EMPTY
```

from:

```text
UNKNOWN HISTORICAL PROVENANCE
```

An official version created under the provenance model may legitimately have zero evidence.

That is different from an older historical version for which no trustworthy evidence snapshot was ever captured.

WisdomTree does not fabricate missing historical provenance.

---

# Historical restore

Restoring an older Note version restores more than text.

For a version with complete provenance:

```text
Version V1
├── content V1
└── evidence snapshot V1
```

restoring V1 produces a working state derived from both.

WisdomTree does not silently attach the current evidence set to historical content.

---

# Cross-Project research

Research often crosses organizational boundaries.

A Note in Project A may be supported by an exact Material or Note version from Project B when the researcher has the appropriate research-read access.

```text
Project A
└── Synthesis V4
      └── evidence → Project B / Interview V2
```

The evidence relationship does not:

* move the source;
* duplicate the source;
* change Project ownership;
* grant operational Project membership.

Operational authority and research-reading authority remain separate.

---

# People

WisdomTree distinguishes a research **Person** from an authenticated **User**.

```text
Person
≠
User account
```

A Person represents a canonical individual in the research domain.

The same Person may participate in multiple Projects without being duplicated.

A Person may optionally be linked to a User account, but that relationship does not define Project authorization.

This supports research involving:

* interview participants;
* collaborators;
* architects;
* researchers;
* community members;
* historical individuals;
* other people represented in the research corpus.

---

# Activities

Activities provide context around research work.

Examples:

* interview;
* field visit;
* research meeting;
* archival visit;
* workshop;
* documentation session.

An Activity can connect:

```text
Activity
├── People
├── Materials
├── Notes
└── Tasks
```

Activities are therefore contextual research workspaces rather than merely calendar events.

---

# Tasks and My Work

Tasks remain Project-owned.

`My Work` provides an aggregate view across Projects where the current user has operational participation.

Task management exists to coordinate research activity rather than turn WisdomTree into a general-purpose project-management suite.

---

# Search

WisdomTree provides research-aware search across authorized Projects.

Internal research search can discover:

* Projects;
* official Notes;
* Materials;
* canonical People.

Private drafts are excluded from general research search.

Authorization is resolved before search results are returned.

Public search and internal research search are separate boundaries.

---

# Publication

Internal research and public publishing are deliberately independent.

```text
private working draft
        ↓
official NoteVersion
        ↓
curated public revision
```

A public revision is derived from an exact immutable internal Note version.

Once created, the public revision does not change merely because internal research continues.

This allows:

* internal Notes to continue evolving;
* public content to remain stable;
* publication to be reverted or replaced deliberately;
* public readers to see only the curated published projection.

Private drafts, internal evidence metadata, memberships, and operational Project data are not automatically exposed publicly.

---

# Tempo Library & Community Space

Tempo is represented as an ordinary Project with an additional capability:

```text
library_circulation
```

It is not identified through:

* a special Project type;
* a hard-coded UUID;
* its name;
* a global library role.

Projects with the capability may support circulation workflows through Project-scoped library operators.

This keeps Tempo inside the same Project architecture without making library behavior a global product assumption.

---

# Graph

Graph visualization remains part of WisdomTree, but it is intentionally **secondary**.

The graph is useful for exploring related research and knowledge structure.

It is not:

* primary navigation;
* the source of truth;
* a replacement for explicit provenance;
* a generic relation database.

Canonical research relationships remain represented by their actual domain objects and versioned evidence relations.

---

# Markdown and multilingual research

WisdomTree uses one universal Markdown research editor.

Research content may contain arbitrary valid Unicode, including:

* Vietnamese;
* English;
* Hán / Hán-Nôm;
* Chinese;
* Japanese;
* Korean;
* French;
* Arabic;
* supplementary-plane Unicode characters.

Application chrome currently supports:

```text
vi
en
```

Interface language and research-content language are independent.

Research content uses direction-aware rendering where appropriate.

---

# What WisdomTree is not

WisdomTree is not intended to compete primarily on commodity functionality.

It is not trying to be:

* the most advanced Markdown editor;
* a generic Notion replacement;
* a full Jira/Trello replacement;
* a generic wiki engine;
* a dedicated bibliography manager;
* a static-site generator;
* a generic graph database;
* an all-purpose library-management system.

Those capabilities are implemented only where they support the core research workflow.

The central product concern is:

> **Preserve the path from source → evidence → synthesis → publication.**

A useful shorthand is:

> **WisdomTree is a research provenance workspace.**

Or more broadly:

> **A collaborative research knowledge system where the evidence behind knowledge remains inspectable and historically reproducible.**

---

# Architecture

WisdomTree is a modular monolith.

```text
Next.js UI / delivery
        ↓
application facade
        ↓
domain services
        ↓
PostgreSQL + object storage
```

One application.

One primary database.

One deployable.

The goal is to keep the architecture understandable by a small team without sacrificing authorization, transaction safety, auditability, or provenance.

---

## Technology

Core stack:

* Next.js App Router
* TypeScript
* PostgreSQL 16
* Drizzle ORM
* Docker
* local filesystem object storage in development
* Pandoc / Poppler / Tesseract for supported extraction workflows

Authentication uses Google OIDC for deployed environments.

---

# Layer boundaries

The codebase uses three primary layers:

| Layer                | Path                                   | May do                                                    | May not do                          |
| -------------------- | -------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| Delivery             | `src/app/**`                           | Render UI, parse request input, call application/services | Query PostgreSQL directly           |
| Application / domain | `src/modules/**`                       | Authorize, query, transact, audit, enforce invariants     | Leak storage implementation into UI |
| Data                 | `src/db/**`, `src/modules/*/schema.ts` | Connection, tables, migration integration                 | Own product workflow decisions      |

Boundary rules are executable:

```sh
npm run test:boundaries
```

Delivery code is intentionally prevented from becoming a second business-logic layer.

Server Components may call application services directly.

An artificial HTTP hop is not required between server-rendered UI and server-side domain code.

---

# Design principles

WisdomTree intentionally favors:

```text
explicit domain models
small service boundaries
server-first reads
small client islands
local state
few dependencies
PostgreSQL transactions
auditable authorization
immutable research history
```

over:

```text
generic entity frameworks
plugin systems
event-bus architecture
global client stores
universal relation engines
speculative abstractions
microservices without operational need
```

The system is designed for a small team and should remain understandable without navigating an abstraction maze.

---

# Quickstart

Install dependencies:

```sh
npm install
```

Install required host tooling once:

```sh
npm run setup:system
```

Start the complete demo environment:

```sh
npm run demo
```

This starts PostgreSQL, applies migrations, seeds the demo database, builds the application, and starts it.

---

## Important demo warning

`npm run demo` and the destructive seed command reset the local database.

Do not use them to restart an installation whose data you want to preserve.

For a normal deployment restart:

```sh
npm run start:prod
```

---

# Start PostgreSQL only

```sh
npm run runtime:up
```

Then run the application lifecycle manually:

```sh
npm run db:migrate
ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed
npm run build
npm run start
```

The default application address is:

```text
http://localhost:3000
```

---

# Fresh installation without demo data

For a real installation, migrate an empty PostgreSQL database and bootstrap the initial operator configuration.

```sh
npm run db:migrate

npm run db:bootstrap -- \
  --admin-email admin@example.org \
  --admin-name "Initial Administrator" \
  --shared-vault-name "Team Knowledge"
```

Do not run the destructive demo seed against a real installation.

Bootstrap is intended to establish the initial administrative identity and required system records without deleting existing data.

---

# Authentication

Production authentication uses Google OIDC.

Required configuration includes:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
APP_URL
```

See:

```text
.env.example
```

Access is invite-only.

An authorized administrator invites an email address, and the first matching Google login claims the account.

Development/demo environments may expose the repository's development login facilities where enabled by the existing environment rules.

Production builds do not rely on development login behavior.

---

# Sessions and traffic limits

Sessions use database-backed state with both inactivity and absolute lifetime constraints.

Default inactivity timeout:

```text
30 minutes
```

Default absolute session lifetime:

```text
7 days
```

Signed-in accounts are also protected by a configurable request-rate limit.

See `.env.example` for current configuration variables.

---

# Required production configuration

Production requires at least:

```text
DATABASE_URL
SESSION_SECRET
```

The application refuses to rely on the published local development database configuration in production.

Generate a deployment secret with, for example:

```sh
openssl rand -base64 32
```

Do not commit production secrets.

---

# Development

For code editing:

```sh
npm run dev
```

The development command uses the repository's configured Next.js development toolchain.

For realistic performance and behavior checks, prefer the production build:

```sh
npm run build
npm run start
```

Do not run a production build concurrently with a development server using the same `.next` directory.

The repository includes a pre-build guard for this class of mistake.

---

# Database migrations

Database migrations are:

* forward-only;
* tracked under `drizzle/`;
* applied in order;
* recorded by the migration system.

Run:

```sh
npm run db:migrate
```

Schema migrations must not depend on destructive demo seeding.

---

# Testing

Fast project checks:

```sh
npm test
```

The repository also exposes focused gates for specific concerns.

Boundary validation:

```sh
npm run test:boundaries
```

Unit tests:

```sh
npm run test:unit
```

Integration tests:

```sh
npm run test:integration
```

Use-case tests:

```sh
npm run test:usecase
```

Privacy and authorization tests:

```sh
npm run test:privacy
```

Full environment validation:

```sh
npm run test:all
```

Stateful integration and browser tests must use an explicitly isolated test database.

Do not run destructive test fixtures against the normal development database.

---

# Build

Create the production build:

```sh
npm run build
```

Start it:

```sh
npm run start
```

The build process also executes repository safety checks configured through the package scripts.

---

# Deployment

WisdomTree is deployed as one application image with PostgreSQL and persistent application data.

Example:

```sh
export SESSION_SECRET=$(openssl rand -base64 32)
export CRON_SECRET=$(openssl rand -base64 32)
export TRUST_PROXY=1

docker compose --profile deploy up -d --build
```

Migrations run before the application starts.

Deployment does not automatically run the destructive demo seed.

---

# Reverse proxy

The application port is intended to remain behind the deployment's trusted reverse proxy configuration.

When `TRUST_PROXY=1` is enabled, the proxy must sanitize incoming forwarding headers and write trusted values itself.

Do not trust arbitrary client-supplied forwarding headers.

---

# Health check

The application exposes:

```text
GET /api/health
```

for container/runtime health checking.

---

# Storage and extraction

Development uses local filesystem-backed object storage.

Research ingestion may use:

* Pandoc;
* Poppler;
* Tesseract;
* Vietnamese OCR data;

depending on the source format and configured extraction path.

Uploaded source material is stored independently from extraction success.

An extraction failure must not delete the original research source.

---

# Backup

A complete WisdomTree backup must include both structured and unstructured research state.

Back up together:

```text
PostgreSQL database
+
uploaded object storage
+
any retained repository/projection data required by the deployment
```

The repository provides:

```sh
./scripts/backup.sh /srv/backups
```

A database dump whose referenced source files are missing is not a complete research backup.

---

# Security model

WisdomTree keeps authorization in service/domain boundaries rather than relying on UI visibility.

Examples include:

* Project operational membership;
* cross-Project research-read access;
* private-draft ownership;
* Core research access;
* Project-scoped library operators;
* public anonymous publication boundaries.

Hiding a button is not considered an authorization control.

Direct requests must satisfy the same domain authorization rules.

---

# Research privacy

Important boundaries include:

```text
private draft
→ author only

official Project research
→ authorized Project / research readers

public revision
→ anonymous public reader
```

Cross-Project research authority does not automatically provide:

* Task authority;
* Activity authority;
* Project management authority;
* private draft visibility;
* library circulation authority.

---

# Auditability

Important mutations are designed to occur inside controlled service transactions alongside their relevant audit behavior.

Research history should remain explainable through:

* immutable versions;
* explicit evidence relationships;
* authorization boundaries;
* transaction-backed mutations;
* audit records.

---

# Repository layout

| Path                       | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `src/app/`                 | Next.js delivery layer, UI, route handlers                             |
| `src/modules/application/` | Project-centric application facade and target DTOs                     |
| `src/modules/project/`     | Project identity and Project services                                  |
| `src/modules/knowledge/`   | Notes, drafts, versions, research support, publication                 |
| `src/modules/storage/`     | Materials, source versions, object storage, extraction                 |
| `src/modules/pm/`          | Task/project coordination primitives                                   |
| `src/db/`                  | Database client and aggregated schema                                  |
| `drizzle/`                 | Forward-only SQL migrations                                            |
| `tests/`                   | Unit, integration, authorization, privacy, boundary, and browser tests |
| `docs/`                    | Architecture, product, refactor, and implementation documentation      |
| `scripts/`                 | Migration, database, backup, and operational tooling                   |

---

# Documentation

Start with:

```text
docs/README.md
```

Architecture documentation:

```text
docs/architecture.md
```

Testing documentation:

```text
tests/README.md
```

The repository also contains detailed refactor and implementation reports documenting the evolution from the earlier Space/Branch/wiki-oriented architecture toward the Project-centric research model.

---

# Product philosophy

WisdomTree should not become:

```text
Notion clone
+
Obsidian clone
+
Trello clone
+
Zotero clone
+
library software
```

Its supporting tools should remain deliberately restrained.

The product should invest most heavily in the workflow that generic tools do not naturally model:

```text
capture source
    ↓
preserve exact version
    ↓
create research
    ↓
attach evidence
    ↓
synthesize
    ↓
freeze provenance
    ↓
curate
    ↓
publish
```

Everything else exists to make that workflow usable.

---

# Summary

WisdomTree is not primarily a Markdown application.

It is not primarily a wiki.

It is not primarily a project-management system.

It is a **research provenance workspace** built around one central guarantee:

> **Knowledge may evolve, but the evidence trail behind each historical research version should remain inspectable.**
