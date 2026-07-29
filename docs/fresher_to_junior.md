# 🔥 Fresher → Junior: The Upgrade Guide 🔥

> *"You built a system that most freshers wouldn't even attempt. Now let's make it one that a junior wouldn't be embarrassed to show in a code review."*

---

## The Fresher Roast (With Love)

Here's what screams "I'm learning by building something too ambitious and I love it":

| Fresher Tell | Evidence |
|-------------|----------|
| **No linter, no formatter** | You're trusting your eyes to catch bugs that a machine catches in 0.01 seconds |
| **Zero error boundaries** | When something breaks, the user sees... nothing |
| **3 testing frameworks, none used** | You set up Vitest, a custom runner, AND standalone scripts. Then wrote 226 lines of tests total |
| **God files** | `vi.ts` (1,354 lines), `knowledge-map.tsx` (1,081), `globals.css` (2,746). These scream "I kept adding to the file because I didn't know when to stop" |
| **`console.log` as logging** | 14 console statements is your entire observability strategy |
| **No middleware** | Every route is unprotected at the framework level |
| **Custom test runner** | You wrote a 43-line file walker to run tests instead of using the tool you already installed |

**But here's what's NOT fresher:**
- Your module boundaries are clean and deliberate
- Your SQL migrations are hand-written with *reasons*
- You use transactions consistently
- Your authorization is centralized, not copy-pasted
- You have typed domain errors, not string throws
- You write comments that explain *why*, not *what*

**You're a fresher who thinks like a designer but ships like someone who hasn't been burned yet.** The upgrade path is about getting burned *safely*.

---

## Priority 1: Safety Nets (Do This First)

These are the things that catch your mistakes before users do. A junior developer's #1 skill is **not trusting themselves**.

---

### 1A. Add ESLint + Prettier

**Why this matters:** You have 82 source files with zero automated style enforcement. Every file you touch drifts. A linter catches real bugs (unused variables, missing awaits, unreachable code).

Create these files:

**`eslint.config.mjs`** (flat config, ESLint 9+):

```javascript
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: "./tsconfig.json" },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // The rules that catch REAL bugs:
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": "error",  // ← catches missing awaits
      "no-console": ["warn", { allow: ["warn", "error"] }], // ← no stray console.logs
      "eqeqeq": "error",                                     // ← no == surprises
    },
  },
];
```

**`.prettierrc`**:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Add to `package.json` scripts:**

```json
"lint": "eslint src/",
"format": "prettier --write src/",
"format:check": "prettier --check src/"
```

**Add to your `test` script chain:**

```json
"test": "npm run lint && npm run typecheck && npm run test:boundaries && ..."
```

> **Junior principle: If the machine can check it, the machine should check it.**

---

### 1B. Add Error Boundaries

**Your current state:** Zero `error.tsx` files, zero `loading.tsx` files. One `global-error.tsx` at the root. When any page component throws, the entire app crashes to the global error page.

**What a junior does:** Add a route-level error boundary for every major section.

Create **`src/app/library/error.tsx`** (and repeat for each route group):

```tsx
"use client";

import { T } from "@/lib/vi";

export default function LibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <h1>{T.errorTitle}</h1>
      <p>{T.errorDescription}</p>
      <button onClick={reset} className="btn">
        {T.retry}
      </button>
    </main>
  );
}
```

Create **`src/app/library/loading.tsx`**:

```tsx
export default function LibraryLoading() {
  return (
    <main className="page">
      <div className="skeleton" style={{ height: "2rem", width: "12rem" }} />
      <div className="skeleton" style={{ height: "20rem", marginTop: "1rem" }} />
    </main>
  );
}
```

**Minimum targets:** `library/`, `catalog/`, `source/`, `board/`, `admin/`. Five files × 2 = 10 files, ~15 minutes of work, massive UX improvement.

> **Junior principle: The user should never see a white page.**

---

### 1C. Add Next.js Middleware

**Your current state:** No `middleware.ts`. Every API route manually calls `requirePrincipal()`. Miss one and it's an unauthenticated endpoint.

Create **`src/middleware.ts`**:

```typescript
import { NextResponse, type NextRequest } from "next/server";

// Protect everything except public routes. This is a GATE, not authorization —
// it only checks "is there a session cookie at all?" The real authorize() call
// still happens in the route handler.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/",
  "/api/health",
  "/api/cron/",
  "_next/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public routes through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session cookie existence (not validity — that's session.ts's job)
  const session = request.cookies.get("session");
  if (!session && pathname.startsWith("/api/")) {
    return NextResponse.json({ code: "unauthorized", message: "Bạn cần đăng nhập." }, { status: 401 });
  }
  if (!session && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip static files and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

> **Junior principle: Defense in depth. Don't rely on every developer remembering to add an auth check.**

---

## Priority 2: Fix the Session Double-Query

**Your current state** in `session.ts`:

```typescript
// Query 1: get user
const [user] = await db.select().from(users).where(...);
// Query 2: get memberships
const memberships = await db.select({ spaceId: ... }).from(spaceMembers).where(...);
```

Then `currentUser()` runs a **third** query for the full user. That's 3 DB round-trips before the page can start.

**Fix:** One query with a JOIN:

```typescript
export async function resolvePrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifySession(token);
  if (!userId) return null;

  // ONE query, not two
  const rows = await db
    .select({
      id: users.id,
      role: users.role,
      spaceId: spaceMembers.spaceId,
    })
    .from(users)
    .leftJoin(spaceMembers, eq(spaceMembers.userId, users.id))
    .where(and(eq(users.id, userId), isNull(users.disabledAt)));

  if (rows.length === 0) return null;

  return {
    userId: rows[0].id,
    role: rows[0].role,
    spaceIds: rows.filter((r) => r.spaceId !== null).map((r) => r.spaceId!),
  };
}
```

Combine with `currentUser()` similarly — don't SELECT the user twice.

> **Junior principle: N+1 queries are the #1 performance mistake. COUNT YOUR QUERIES.**

---

## Priority 3: Write Real Tests

**Your current state:** You have Vitest installed. You configured it. Then you wrote 226 lines of test-adjacent code and a 43-line custom runner that does `await import(file)`.

**The junior approach:** Delete the custom runner. Use Vitest. Write tests that test ONE thing.

### 3A. Unit Test: authorize()

Create **`tests/vitest/authorize.test.ts`**:

```typescript
import { describe, it, expect } from "vitest";
import { authorize } from "@/modules/auth/authorize";
import type { Principal } from "@/modules/auth/dev-auth";

const user: Principal = {
  userId: "u1",
  role: "user",
  spaceIds: ["space-a"],
};

const editor: Principal = {
  userId: "u2",
  role: "editor",
  spaceIds: ["space-a"],
};

const admin: Principal = {
  userId: "u3",
  role: "admin_op",
  spaceIds: [],
};

describe("authorize", () => {
  it("allows a user to browse their own space", () => {
    expect(() =>
      authorize(user, "storage.library.browse", { spaceId: "space-a", kind: "read" })
    ).not.toThrow();
  });

  it("denies a user browsing another space (404 for reads)", () => {
    expect(() =>
      authorize(user, "storage.library.browse", { spaceId: "space-b", kind: "read" })
    ).toThrow(expect.objectContaining({ status: 404 }));
  });

  it("denies a user publishing (403 for writes)", () => {
    expect(() =>
      authorize(user, "knowledge.publish", { kind: "write" })
    ).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("admin_op bypasses space scope", () => {
    expect(() =>
      authorize(admin, "storage.library.browse", { spaceId: "any-space", kind: "read" })
    ).not.toThrow();
  });

  it("rejects null actors with 401", () => {
    expect(() =>
      authorize(null, "storage.library.browse", { spaceId: "space-a", kind: "read" })
    ).toThrow(expect.objectContaining({ status: 401 }));
  });

  it("editor can edit owned items", () => {
    expect(() =>
      authorize(editor, "knowledge.node.edit", {
        kind: "write",
        ownerIds: [editor.userId],
      })
    ).not.toThrow();
  });

  it("editor cannot edit unrelated items", () => {
    expect(() =>
      authorize(editor, "knowledge.node.edit", {
        kind: "write",
        ownerIds: ["someone-else"],
      })
    ).toThrow(expect.objectContaining({ status: 403 }));
  });
});
```

### 3B. Unit Test: sign.ts

Create **`tests/vitest/sign.test.ts`**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { signSession, verifySession, signDownload, verifyDownload } from "@/lib/sign";

describe("session tokens", () => {
  it("round-trips a user id", () => {
    const token = signSession("user-123");
    expect(verifySession(token)).toBe("user-123");
  });

  it("rejects a tampered token", () => {
    const token = signSession("user-123");
    const tampered = token.slice(0, -1) + "X";
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    const token = signSession("user-123");
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days > 7 day TTL
    expect(verifySession(token)).toBeNull();
    vi.useRealTimers();
  });

  it("download token cannot be used as session", () => {
    const token = signDownload("obj/key", "file.pdf");
    expect(verifySession(token)).toBeNull();
  });
});

describe("download tokens", () => {
  it("round-trips object key and filename", () => {
    const token = signDownload("obj/key", "file.pdf");
    const result = verifyDownload(token);
    expect(result).toEqual({ objectKey: "obj/key", filename: "file.pdf" });
  });
});
```

### 3C. The Rule

Update **`vitest.config.ts`** to include these:

```typescript
test: {
  include: ['tests/vitest/**/*.test.ts'],
  // ...
},
```

Then **replace** `"test:vitest"` with the real test command in `package.json` and add it to the main `test` script.

**What to test first (priority order):**
1. `authorize()` — pure function, no DB, high-value
2. `sign.ts` — pure crypto, easy to test, security-critical
3. `errors.ts` `handleApi()` — error mapping logic
4. `time.ts` — date formatting functions
5. `vi.ts` label functions — pure string mapping

> **Junior principle: Test pure functions first. They're the easiest and the most valuable.**

---

## Priority 4: Break Up the God Files

### 4A. Split `vi.ts` (1,354 lines)

Your translation file does 5 different jobs. Split it:

```
src/lib/vi/
├── index.ts          ← re-exports everything (zero breaking changes)
├── labels.ts         ← T object: static UI strings
├── state-labels.ts   ← loanLabel(), curationLabel(), etc.
├── badges.ts         ← badgeClass(), state-to-CSS mappings
├── dates.ts          ← when(), dayLabel(), calendar formatting
└── roles.ts          ← userRoleLabel(), role descriptions
```

**The `index.ts` trick:**

```typescript
// src/lib/vi/index.ts
export * from "./labels";
export * from "./state-labels";
export * from "./badges";
export * from "./dates";
export * from "./roles";
```

Every existing import `from "@/lib/vi"` keeps working. Zero breaking changes.

### 4B. Split `globals.css` (2,746 lines)

Use CSS `@import` (supported by Next.js):

```
src/app/styles/
├── globals.css       ← just @import lines
├── tokens.css        ← :root variables, the palette
├── reset.css         ← *, box-sizing, base typography
├── layout.css        ← .shell, .main-area, .topbar, .statusbar
├── components.css    ← .btn, .panel, .badge, .field, form elements
├── pages.css         ← page-specific overrides
└── dark.css          ← [data-theme="dark"] block
```

**`globals.css` becomes:**

```css
@import "./styles/tokens.css";
@import "./styles/reset.css";
@import "./styles/layout.css";
@import "./styles/components.css";
@import "./styles/pages.css";
@import "./styles/dark.css";
```

### 4C. Split `knowledge-map.tsx` (1,081 lines)

This is a canvas-based force-directed graph renderer. It should be:

```
src/app/components/knowledge-map/
├── index.tsx            ← the main component, <200 lines
├── use-graph-sim.ts     ← the force simulation hook
├── canvas-renderer.ts   ← the canvas drawing logic
├── types.ts             ← GraphNode, GraphEdge, SimulationConfig
├── interaction.ts       ← zoom, pan, click, drag handlers
└── minimap.tsx           ← the minimap component
```

> **Junior principle: If you can't describe what a file does in ONE sentence, it does too many things.**

---

## Priority 5: Type Your JSON Columns

**Your current state:** 7 `jsonb` columns where the database accepts anything and the app crosses its fingers.

**Fix with [Zod](https://zod.dev):**

```typescript
// src/modules/storage/extraction-meta.ts
import { z } from "zod";

export const ExtractionMetaSchema = z.object({
  pageCount: z.number().int().nonneg().optional(),
  language: z.string().optional(),
  extractorVersion: z.string(),
  completedAt: z.string().datetime(),
});

export type ExtractionMeta = z.infer<typeof ExtractionMetaSchema>;

// When writing:
const meta: ExtractionMeta = { extractorVersion: "1.0", completedAt: new Date().toISOString() };
await tx.update(sourceVersions).set({ extractionMeta: meta }).where(...);

// When reading:
const parsed = ExtractionMetaSchema.safeParse(row.extractionMeta);
if (!parsed.success) {
  console.error("Corrupt extraction_meta:", parsed.error);
  return null;
}
```

Do this for:
- `extraction_meta` → `ExtractionMetaSchema`
- `audit_events.details` → per-action detail schemas
- `notifications.payload` → per-event-type payload schemas
- `jobs.payload` → per-job-type payload schemas

> **Junior principle: If the type is `any` or `unknown` or `jsonb`, someone will put the wrong thing in it. Validate at the boundary.**

---

## Priority 6: Replace `console.log` With a Logger

**Your current state:** 14 `console.*` statements. No timestamps, no levels, no request IDs, no structured output.

**Simple structured logger (no dependency):**

```typescript
// src/lib/logger.ts
type Level = "info" | "warn" | "error";

function log(level: Level, module: string, message: string, data?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    module,
    message,
    ...data,
  };
  // JSON to stdout — every log aggregator (Docker, Cloud Run, etc.) parses this
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (module: string, msg: string, data?: Record<string, unknown>) => log("info", module, msg, data),
  warn: (module: string, msg: string, data?: Record<string, unknown>) => log("warn", module, msg, data),
  error: (module: string, msg: string, data?: Record<string, unknown>) => log("error", module, msg, data),
};
```

**Before:**
```typescript
console.error(`[render] ${jobId}:`, err);
```

**After:**
```typescript
logger.error("render", "Job failed", { jobId, error: String(err) });
// Output: {"ts":"2026-07-30T00:20:00Z","level":"error","module":"render","message":"Job failed","jobId":"abc","error":"..."}
```

> **Junior principle: If you can't search your logs, you can't debug production.**

---

## Priority 7: The Stretch Goals (When You're Ready)

These are the items that separate "solid junior" from "hey, this person thinks ahead":

### 7A. Add Missing FK Indexes

```sql
-- 0011_missing_indexes.sql
CREATE INDEX sources_assigned_to_idx ON sources (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX curations_assigned_to_idx ON curations (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX review_tasks_assigned_to_idx ON review_tasks (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX loan_tickets_borrower_idx ON loan_tickets (borrower_id);
CREATE INDEX tasks_assigned_to_idx ON tasks (assigned_to) WHERE assigned_to IS NOT NULL;
```

These are the columns powering "show me my work" queries. Without indexes, every one is a sequential scan.

### 7B. Use the OCC Columns You Paid For

You have 16 tables with `version int NOT NULL DEFAULT 1` but only ~4 actually check it. For every `UPDATE` in a service function, the pattern should be:

```typescript
// BEFORE (your current code in many places):
await tx.update(sources)
  .set({ title: newTitle, updatedAt: new Date() })
  .where(eq(sources.id, sourceId));

// AFTER (what the version column is FOR):
const [updated] = await tx.update(sources)
  .set({ title: newTitle, updatedAt: new Date(), version: sql`version + 1` })
  .where(and(eq(sources.id, sourceId), eq(sources.version, expectedVersion)))
  .returning({ id: sources.id });

if (!updated) throw versionConflict();
```

### 7C. Rate Limiting (Simple)

```typescript
// src/lib/rate-limit.ts
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}
```

Use in your `handleApi` or middleware. Not production-grade (in-memory, single-process), but infinitely better than nothing.

---

## The Scoreboard

| Area | Fresher State | Junior Target | Effort |
|------|--------------|---------------|--------|
| Linter/Formatter | None | ESLint + Prettier in CI | 30 min |
| Error Boundaries | 1 global-error.tsx | 5 route-level error + loading | 1 hour |
| Middleware | None | Auth gate on all routes | 30 min |
| Session Queries | 3 queries/request | 1 JOIN query | 30 min |
| Test Coverage | 226 lines, 3 frameworks | 50+ Vitest tests on pure functions | 1 day |
| God Files | 3 files > 1,000 lines | Split into modules, re-export | 2 hours |
| JSON Typing | 7 untyped jsonb columns | Zod schemas on read/write | 2 hours |
| Logging | `console.log` | Structured JSON logger | 30 min |
| Missing Indexes | FK columns un-indexed | 5-line migration | 10 min |
| OCC Enforcement | 4 of 16 tables | All mutable tables | 2 hours |

**Total estimated effort: ~2 working days** to go from "impressive fresher" to "solid junior."

---

## The Mindset Shift

| Fresher Thinks | Junior Thinks |
|---------------|--------------|
| "It works" | "It works, and I can **prove** it works" |
| "I'll add tests later" | "If I didn't test it, it doesn't work" |
| "I'll remember" | "The machine will remember for me" |
| "One big file is easier to find things" | "One big file is easier to break things" |
| "I'll handle errors later" | "The user is seeing errors **now**" |
| "I know what the JSON looks like" | "I know because the schema SAYS so" |
| "console.log is fine" | "console.log is invisible at 3 AM" |

> **You built something genuinely ambitious with a genuinely thoughtful architecture. That's rare for any level. Now make it **trustworthy** — that's the whole difference.**
