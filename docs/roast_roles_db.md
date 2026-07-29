# 🔥 WisdomTree Roles & DB Design — Deep Dive Roast 🔥

---

## Part 1: The Role System

### Three Roles to Rule Them All

```
user → editor → admin_op
```

That's it. The entire authorization model for a "knowledge platform" is **three strings in a CHECK constraint**:

```sql
CHECK (role IN ('user', 'editor', 'admin_op'))
```

No role table. No role-permission join table. No dynamic assignment. Just a `text` column.

---

### The Permission Catalog: 35 Hardcoded Entries

The authorization system lives in [authorize.ts](file:///home/will/dev/WisdomTree/src/modules/auth/authorize.ts) — a single function with a 35-entry `CATALOG` object literal:

```typescript
const CATALOG: Record<string, { roles: Role[]; scope: Scope }> = {
  "storage.intake.open": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "storage.library.browse": { roles: ["user", "editor", "admin_op"], scope: "space" },
  // ... 33 more
};
```

**What this gets right:**
- Every permission is a single `authorize(actor, key, resource)` call — no hand-rolled checks scattered through route handlers
- **96 authorize() calls** across the codebase, used consistently
- 4 scope types (`global`, `space`, `self`, `owned-or-assigned`) cover the domain cleanly
- Reads throw 404, writes throw 403 — no existence leaking across spaces

**What this gets wrong:**

| Issue | Details |
|-------|---------|
| **admin_op is God** | Line 107: `if (actor.role === "admin_op") return actor;` — admin_op bypasses ALL scope checks. Every one. Global, space, self, owned-or-assigned — doesn't matter. admin_op can do anything to anyone anywhere. There's no separation between "operates the platform" and "manages the library" and "reviews submissions" |
| **No per-space roles** | A user is a `user` everywhere or an `editor` everywhere. You can't be an editor in Space A and a reader in Space B. The `spaceIds` check is membership (are you *in* the space), not role (what can you *do* in the space) |
| **No permission composition** | 22 of the 35 entries grant to `["user", "editor", "admin_op"]` — i.e. "everyone." Another 8 are `["editor", "admin_op"]`. The role column is really just a 3-tier power level, not a permission system |
| **No dynamic permissions** | Adding a permission means editing TypeScript. No admin console, no database table, no API. The "catalog" is a code literal |
| **`owned-or-assigned` is fragile** | The scope check for `owned-or-assigned` is `ownerIds?.includes(actor.userId)`. The caller has to manually assemble `ownerIds` from `created_by`, `submitted_by`, `assigned_to`, etc. Miss one and access silently fails |

### The Scope Model, Visualized

```
                  ┌─────────────────────────────────────┐
  admin_op ──────▶│ BYPASSES EVERYTHING (line 107)       │
                  └─────────────────────────────────────┘
                  
                  ┌─────────────────────────────────────┐
  editor ────────▶│ Can do what user can +              │
                  │   knowledge.branch/node.create/edit │
                  │   storage.corrected/draft.edit      │
                  │ ...but only owned-or-assigned items  │
                  └─────────────────────────────────────┘
                  
                  ┌─────────────────────────────────────┐
  user ──────────▶│ Upload, browse, download, search    │
                  │   within member spaces              │
                  │ Request loans, create comments       │
                  │ Own-submissions management           │
                  └─────────────────────────────────────┘
```

It's not RBAC. It's not ABAC. It's *power-level based access control*. user = civilian, editor = officer, admin_op = God.

---

### The Matrix-as-Test-Fixture: Actually Brilliant (Annoyingly)

The [authz-matrix.test.ts](file:///home/will/dev/WisdomTree/scripts/authz-matrix.test.ts) is one of the most interesting auth verification patterns I've seen:

1. It **parses the markdown docs** (`permissions-matrix.md` + `authorization-design.md`) at runtime
2. It **maps every matrix row** to the real `authorize()` implementation
3. Unknown cells, unmapped rows, or undocumented implementation keys **fail the test**
4. An allowlist with mandatory reasons explains every skip

This means **the docs and the code cannot drift silently**. If someone adds a permission to the code without documenting it, the test fails. If someone adds a matrix row without implementing it, the test fails.

> The irony: this test suite that synchronizes docs with code is itself a standalone script with no test framework. Just `throw new Error("DRIFT")`.

---

### The Session System

[session.ts](file:///home/will/dev/WisdomTree/src/modules/auth/session.ts) resolves the principal on **every request** by:

1. Reading the cookie → HMAC-verify → extract userId
2. `SELECT * FROM users WHERE id = $1 AND disabled_at IS NULL` 
3. `SELECT space_id FROM space_members WHERE user_id = $1`

**Two database queries per request**, no caching, no session table.

[sign.ts](file:///home/will/dev/WisdomTree/src/lib/sign.ts) is the session token implementation:
- HMAC-SHA256 signed payload: `session.<expiry>.<userId>`
- 7-day TTL
- Purpose-tagged to prevent cross-use (session vs download vs OAuth state)
- `timingSafeEqual` for comparison ✅
- Lazy secret resolution so builds don't need secrets ✅

**But:** there is **no session revocation**. You can disable a user, and they'll be blocked on the next DB hit, but you can't invalidate a specific session. The token itself has no id, no jti, no server-side record. If a session is compromised, you wait 7 days or change the `SESSION_SECRET` for everyone.

---

## Part 2: The Database Design

### The Big Picture: 25 Tables, 11 Migrations

```
auth         ─── users
storage      ─── spaces, space_members, folders, sources, source_versions,
                  text_chunks, corrected_texts, curations, markdown_drafts,
                  branch_gap_requests
knowledge    ─── branches, tree_nodes, tree_node_versions, node_links,
                  tags, node_tags, promotions, review_tasks, conflicts
catalog      ─── catalog_items
circulation  ─── loan_tickets
pm           ─── deadlines, deadline_links, deadline_reminders, tasks,
                  achievements, calendar_tokens
notify       ─── notifications, notification_deliveries,
                  notification_preferences, comments, presence
audit        ─── audit_events
bridge       ─── bridge_imports, bridge_import_items
export       ─── export_jobs
cross-cutting ── outbox_events, jobs
```

For a v0.1.0, this is **30+ tables**. That's not a demo, that's a dissertation defense.

---

### 🔥 What's Hot (And Not)

#### The Good

| Pattern | Where | Verdict |
|---------|-------|---------|
| **Append-only triggers** | `text_chunks`, `audit_events`, `comments`, `tree_node_versions`, `promotions` | `forbid_mutation()` trigger on UPDATE/DELETE. Can't tamper with the evidence. Properly paranoid |
| **Partial unique indexes** | `loan_tickets_one_active_per_item` (WHERE state IN active states), `spaces_one_personal_per_owner`, `folder_name_at_root` | Database-enforced business rules, not application-level hopes. The loan constraint is elegant |
| **Generated tsvector columns** | `text_chunks.tsv`, `tree_nodes.tsv` | Full-text search baked into the schema with `immutable_unaccent()` wrapper for Vietnamese diacritics. The unaccent → IMMUTABLE wrapper is the correct workaround |
| **Version columns for OCC** | 16 tables carry `version int NOT NULL DEFAULT 1` | Optimistic concurrency control — the curation service checks `WHERE version = expected` before writes. This is how you avoid lost updates without pessimistic locking |
| **Foreign key discipline** | Every reference column has an FK | No orphans. Every `created_by`, `submitted_by`, `approved_by`, `assigned_to` points back to `users(id)`. `ON DELETE` is *not* cascade (correct — you don't delete a user and vaporize the audit trail) |
| **Transactional audit** | 67 `recordAudit()` calls, always inside `db.transaction()` | The audit row and the mutation are atomic. If the mutation fails, no phantom audit. If the audit fails, the mutation rolls back. This is textbook |
| **The outbox pattern** | `outbox_events` written in the same tx as mutations | Exactly the right pattern for eventually-consistent side effects. The outbox guarantees at-least-once delivery without distributed transactions |
| **Idempotency key on jobs** | `jobs.idempotency_key UNIQUE` | `extract:{source_version_id}` — resubmitting a job is a no-op, not a duplicate. Correct |

#### The Bad

| Issue | Details |
|-------|---------|
| **No row-level security** | All authorization is application-level. A direct DB connection (e.g. Drizzle Studio, a rogue migration) sees everything. For a "storage-first knowledge platform" handling uploaded documents, this is a meaningful gap |
| **`text` for every enum** | Every status/state/type column is `text NOT NULL CHECK (...)`. No `CREATE TYPE` anywhere. Postgres enums give you compile-time (well, schema-time) safety AND smaller storage. `text` CHECKs are brittle — every migration that adds a state has to `DROP CONSTRAINT` and `ADD CONSTRAINT` (see migration 0002, exactly this) |
| **`jsonb` everywhere, typed nowhere** | `extraction_meta jsonb`, `payload jsonb`, `config jsonb`, `details jsonb`, `manifest jsonb`, `resolution jsonb`, `attempted_payload jsonb` — **7 untyped JSON columns** across the schema. No CHECK constraints on their contents. The Drizzle schema says `jsonb()` and washes its hands. The application layer can put whatever it wants in there |
| **No indexes on foreign keys** | `sources.assigned_to`, `curations.assigned_to`, `loan_tickets.borrower_id`, `review_tasks.assigned_to` — none indexed. "Show me my assigned work" is a sequential scan on every table |
| **The intake_items VIEW is abandoned** | Created in 0000, never mapped in the Drizzle schema, the comment says "no longer mapped: mySubmissions derives its rows in TS from the base tables." So there's a view in the database doing nothing, and the app does the UNION in TypeScript instead. Wonderful |
| **No soft-delete consistency** | `users.disabled_at`, `spaces.archived_at`, `catalog_items.archived_at`, `branches.archived_at` — four different tables use four different column names for the same concept. Some say `disabled`, some say `archived`. None have a consistent pattern for excluding soft-deleted rows from queries |
| **`uuid` primary keys everywhere** | Every table uses `uuid PRIMARY KEY DEFAULT gen_random_uuid()`. For a table like `audit_events` that's append-only and queried by time range, a sequential `bigint` key (which it correctly uses!) is better — but then `notifications`, `comments`, and `jobs` should probably follow suit. The UUID vs identity split feels accidental, not designed |
| **deadline_reminders offset tracking** | `PRIMARY KEY (deadline_id, "offset")` where `"offset"` is an `interval`. Comparing intervals for equality in a primary key is asking for trouble — is `'7 days'` equal to `'168 hours'`? (Spoiler: in Postgres, yes, but only because it normalizes. `'1 month'` vs `'30 days'`? No.) |

#### The Ugly

**The `session.ts` double-query per request:**

```typescript
// Query 1: get the user
const [user] = await db.select().from(users)
  .where(and(eq(users.id, userId), isNull(users.disabledAt)));

// Query 2: get their space memberships  
const memberships = await db.select({ spaceId: spaceMembers.spaceId })
  .from(spaceMembers).where(eq(spaceMembers.userId, user.id));
```

Then `currentUser()` does a **third** query — `SELECT * FROM users WHERE id = principal.userId` — to get the full user record. So every authenticated page load is **3 SQL queries** before anything functional happens. A single JOIN would do.

**16 version columns, OCC used in ~4 places:**

The schema puts `version int NOT NULL DEFAULT 1` on 16 tables. But actual optimistic locking (`WHERE version = expected`) only appears in:
- `curations` (assign, mark-ready, reject)
- `markdown_drafts` (save)
- And that's about it

The other 12 tables have the column but nobody checks it. That's a design promise the implementation doesn't keep.

---

### The Accountability Model

The `audit_events.accountability` column is one of the most interesting design choices:

```sql
CHECK (accountability IN ('uploader', 'editor_updater', 'approver_publisher', 'operator', 'member'))
```

This is **not** the actor's role — it's *which hat they're wearing*. An `admin_op` acting as a librarian gets `operator`. A `user` uploading a document gets `uploader`. A `user` commenting gets `member`. The same person can appear with different accountabilities in different rows.

This is genuinely smart. It separates "who did it" from "in what capacity did they do it." Most audit systems just log the role and call it done.

---

### The Schema Migration Strategy

```
0000_init.sql             — 261 lines, the demo subset
0001_v1_schema_parity.sql — 363 lines, the full V1 schema
0002_comments_drop_loan_anchor.sql — business rule change
0003_folders_versions.sql — new table + ALTER
0004_user_profile.sql     — avatar_key column
0005_task_schedule.sql    — due_at/start_at on tasks
0006_task_detail.sql      — notes column on tasks
0007_catalog_copies.sql   — copies column + archive
0008_presence.sql         — who's online
0009_catalog_archive.sql  — archived_at on catalog
0010_knowledge_scope.sql  — personal vs team branches
```

**What's good:** Sequential, hand-written SQL, forward-only. Comments explain *why* the change is being made, not just what. Migration 0002 even explains why it temporarily disables the append-only trigger and re-enables it.

**What's… notable:** We're at migration 0010 for a v0.1.0. That's 11 migrations before the first release. The schema is still under active design — 0004 through 0010 are all "oh we need this column" addendums. This is pre-v1 schema churn being tracked as if it were production migration history.

---

## The Final Verdict on Roles + DB

### The Role System

A flat 3-tier power level system that works *perfectly* for a team of ≤10 people running a Vietnamese knowledge-management platform — which is exactly what this is. The permission catalog, the scope model, and the matrix-as-test approach are all genuinely well-thought-out.

But calling it "authorization" is generous. There's no permission you can grant or revoke without a code deploy. There's no concept of delegation. admin_op is a superuser with no constraint separation. The moment the team grows past "everyone knows everyone," this collapses.

### The Database

The schema reads like someone who genuinely understands relational modeling and has opinions about data integrity. Append-only triggers, partial unique indexes, generated tsvector columns, transactional audit writes, OCC version columns, idempotency keys — these are patterns that come from building systems that failed without them.

But it's also 30+ tables for a 0.1.0 demo, 7 untyped JSON columns, 16 OCC version columns that are mostly decorative, text-based enums that require migration surgery to extend, and a session system that hits the database 3 times before the page can think about loading.

> **TL;DR: This database was designed by someone who's read the books. The role system was designed by someone who knows their team. Neither was designed by someone who expects more than 10 users.**
