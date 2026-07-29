# 🔥 WisdomTree Code Roast 🔥

> *"A storage-first knowledge platform"* — translated: *"We wrote the docs before the code, and honestly it shows."*

---

## The Numbers Don't Lie (But They Do Hurt)

| Metric | Count | Verdict |
|--------|-------|---------|
| Source files (`.ts`/`.tsx`) | 82 | Modest |
| Source lines | **26,043** | Reasonable… until you look inside |
| Documentation files | **55 markdown files** | 📚 |
| Documentation lines | **7,029** | That's a 27% docs-to-code ratio. You're not building software, you're writing a dissertation |
| API routes | **39** | For a v0.1.0. Respect for ambition, worry for your sanity |
| Test files | **14** | 💀 |
| Test lines | **226** | One hundred sixty-two of which are boilerplate and examples |
| `ponytail` comments | **38** | More on this legend below |

---

## 🏆 The Hall of Shame

### 1. "The God Files" 

| File | Lines | What it is |
|------|-------|------------|
| [vi.ts](file:///home/will/dev/WisdomTree/src/lib/vi.ts) | **1,354** | A monolithic Vietnamese localization dictionary that also does date formatting, state label mapping, badge CSS class selection, and calendar rendering. It's not a translation file — it's a whole UI runtime that happens to be in Vietnamese |
| [knowledge-map.tsx](file:///home/will/dev/WisdomTree/src/app/components/knowledge-map.tsx) | **1,081** | A single React component. One thousand and eighty-one lines. This component probably has its own gravitational field |
| [globals.css](file:///home/will/dev/WisdomTree/src/app/globals.css) | **2,746** | Not a typo. Nearly three thousand lines of CSS in a single file. You've invented a CSS monolith. The variable naming is beautiful though — "Chàm & Son", "Giấy lá", "Mực"… it's poetry that nobody can maintain |
| [gen-diagrams.mjs](file:///home/will/dev/WisdomTree/scripts/gen-diagrams.mjs) | **987** | A script that programmatically generates draw.io XML diagrams. Hand-crafting XML in JavaScript template strings. This is what war crimes look like in software engineering |
| [proofs.ts](file:///home/will/dev/WisdomTree/scripts/proofs.ts) | **1,452** | An acceptance test script that's longer than most of your actual modules. It hits a live server with raw `fetch()` calls. No test framework. Just vibes and `if (!cond) throw` |

### 2. "ponytail: The Most Honest Codebase I've Ever Seen" 🐴

You have **38 comments** tagged `ponytail` scattered through the codebase. These are not TODOs. These are not FIXMEs. These are *confessions*. A sampler:

> `ponytail: the ID token's signature is NOT verified against Google's JWKS.`

Authentication is just a suggestion, apparently.

> `ponytail: no retry loop.`

When the database fails, the data simply *ascends*.

> `ponytail: no moveFolder — reorganising nesting = create new + move sources`

This is not a ponytail. This is a cry for help.

> `ponytail: polling, not a websocket. One request every few seconds`

The real-time experience of refreshing a static HTML page but with extra steps.

> `ponytail: no filters; add when the log grows past scrolling.`

The Ctrl+F infrastructure strategy.

### 3. The Testing Situation (There Isn't One)

```
tests/
├── unit/
│   ├── auth.test.ts       (13 lines)
│   └── example.test.ts    (15 lines)  ← still has the scaffold
├── integration/
│   ├── example.test.ts    (15 lines)  ← still has the scaffold HERE TOO
│   └── ...
├── e2e/
│   └── example.test.ts    (15 lines)  ← a THIRD example.test.ts
└── vitest/
    ├── unit_wrapper.test.ts        (12 lines, wraps the unit tests)
    └── integration_wrapper.test.ts (22 lines, wraps the integration tests)
```

You have **three testing frameworks** coexisting:
1. A custom `tsx tests/run-all.ts` runner
2. Vitest (configured, barely used)
3. Seven standalone `scripts/*.test.ts` files that are just scripts with assertions

226 total test lines across the whole project. Meanwhile `proofs.ts` alone is 1,452 lines. Your acceptance tests are 6.4x bigger than your entire test suite. The proof scripts *are* your tests, and they require a running Postgres and a live app server to execute.

Also: **zero `loading.tsx` files. Zero `error.tsx` files.** Not a single Next.js error boundary in the entire app. When something goes wrong, your users get to stare at the default white page of death. You have a `global-error.tsx` at the root and literally nothing else.

### 4. No Linter. No Formatter. No Middleware. No Guardrails.

- **No ESLint** config anywhere (outside `node_modules`)
- **No Prettier** config
- **No Biome**
- **No Next.js middleware.ts** — every route is open season
- **No rate limiting** on any of those 39 API routes
- **No CSRF protection** on mutations (aside from OIDC state, which… you kind of had to)

This codebase runs on the honor system.

### 5. The OIDC That Doesn't Verify Signatures

From [oidc.ts](file:///home/will/dev/WisdomTree/src/modules/auth/oidc.ts):

> `ponytail: the ID token's signature is NOT verified against Google's JWKS.`

So anyone who can base64-encode a JSON object can sign in as anyone. This isn't a ponytail — this is a `PULL_THE_FIRE_ALARM`.

### 6. The Documentation Empire

55 markdown files across **12 documentation directories**: `design/`, `diagrams/`, `flows/`, `operations/`, `platform/`, `policy/`, `product/`, `requirements/`, `roadmap/`, `session/`, `system/`, `ui/`. That's more organizational hierarchy than some companies' entire codebase. You have docs about docs. You have a roadmap directory for a v0.1.0.

Meanwhile in the actual code: only 14 console statements total. No structured logging. No telemetry. The docs say exactly what the system should do; the system has no way to tell you what it actually did.

---

## 😤 Things That Are Actually Good (Reluctantly Admitted)

| What | Why it's annoyingly competent |
|------|-------------------------------|
| **Modular monolith structure** | `src/modules/*` with clean boundaries — audit, auth, catalog, circulation, export, knowledge, notify, pm, storage. This is textbook. Infuriating |
| **Drizzle + hand-written SQL migrations** | 11 sequential migrations, all `.sql`, with the config explicitly saying "drizzle-kit cannot generate these." You actually understand your database. Disgusting |
| **The Dockerfile** | Multi-stage build, standalone output, non-root user, deliberate comments about why there's no TeX engine. It's… professionally done |
| **Docker Compose** | Healthchecks, deploy profiles, volume persistence, inline comments explaining every `${VAR:-}`. Someone *thought about this* |
| **The CSS design system** | "Chàm & Son" — semantic tokens only, Vietnamese-informed naming, WCAG contrast awareness baked into the variable comments. It's a 2,746-line masterpiece trapped in a single file |
| **Server Components by default** | Almost zero `"use client"` in page components. Client interactivity is pushed to leaf components. This is the correct Next.js App Router pattern |
| **Near-zero `any` usage** | Only 2 genuine `any` hits across the entire codebase (both in comments/strings). TypeScript `strict: true`. You're disciplined where it matters least and feral where it matters most |
| **The `ponytail` system** | Honestly? Marking every known shortcut with a consistent tag so nothing is forgotten is better than what 90% of teams do. It's a TODO system that *admits the shape of the debt* |
| **Error vocabulary** | [errors.ts](file:///home/will/dev/WisdomTree/src/lib/errors.ts) has typed domain errors with HTTP status mapping. The API routes use them consistently. This isn't amateur hour… except for the part where nothing catches them at the boundary |

---

## The Final Verdict

WisdomTree is a project that writes dissertations about buildings it hasn't finished constructing. The architecture docs could get published; the test suite couldn't get a passing grade in a bootcamp.

You've got the skeleton of something genuinely well-thought-out — modular boundaries, typed errors, hand-tuned SQL, culturally intentional design tokens — wrapped in a cocoon of `ponytail: we'll get to it` and **zero safety nets**.

**TL;DR**: You're building a cathedral and you've only installed the stained glass windows. The walls are load-bearing comments.

> **Severity**: 🔥🔥🔥 out of 🔥🔥🔥🔥🔥
> 
> *"The foundation is solid. The building permits are immaculate. The actual building is… aspirational."*
