# PC4 — UX & Real Browser Completion

Date: 2026-09-13

## Result

**REAL BROWSER UX COMPLETE.** PC4 changed presentation only: no domain,
authorization, schema, migration, or product-semantics change was made.

## Real-browser audit and repairs

- Before patching, Chromium rendered every requested authenticated target route
  at 1440×900, 768×1024, and 390×844. The audit recorded no document-level
  horizontal overflow on those 51 route/viewport checks.
- Task cards now expose assignee, due date, and Activity as separately labeled
  metadata rather than one ambiguous dot-separated string.
- Activity discussion now aligns with its Activity workspace instead of being
  centered independently of its context cards.
- Note Inspector metadata uses a bounded two-column grid, with wrap-safe values
  and clearer metadata-label typography. Its existing modal Drawer behavior at
  narrow widths was verified with keyboard opening, Escape close, and focus
  restoration.
- Long Library values now wrap within their selected holding/detail surfaces.
- Graph canvas suppresses passive labels on phone-width viewports; an active
  node keeps its label. This removes the observed overlapping-label field while
  preserving the legend and node interaction.
- Public search and public Note now use compact search/result/content surfaces
  that wrap long values and reflow the form to one column on small screens.

## Interaction and accessibility evidence

- Chromium E2E: **7/7 PASS**.
- Mobile comment composer: `@mention` picker, keyboard selection, reply
  rendering, presence request path, and long multilingual fixture: PASS.
- Notification: recipient notification deep-link opened the authorized Activity
  at click time: PASS.
- Notes Inspector: keyboard Enter opened the Drawer; Escape closed it and focus
  returned to the trigger: PASS.
- Kanban: narrow viewport retains horizontal lane scrolling rather than forcing
  lane/card compression: PASS.
- Graph, public search, and public Note: mobile document overflow check: PASS.
- Existing contrast gates pass in light and dark palettes. The target shell
  retains semantic `main`, navigation, labeled controls, dialog semantics,
  visible focus rules, and reduced-motion handling already present before PC4.

## Stress fixture

The final browser fixture exercises long Project/Note/Material and User names
with Vietnamese, English, CJK/Hán-Nôm representative text, and RTL Arabic
text; long filename; tags; threaded Activity comments; a public Note; and
recipient notification state. Empty, loading, disabled, read-only and
permission-isolation states remain covered by existing UI/unit/integration and
privacy suites.

## Remaining visual/accessibility issues

No confirmed release-blocking issue remains. PC4 did not run a screen-reader
session or platform assistive-technology compatibility audit; that is a useful
future accessibility enhancement, not evidence of a current defect.

## Technical validation

- Migration zero through `0053`, then seed: PASS.
- `npm test`: PASS (lint, typecheck, 20 unit files, boundaries, signing, time,
  contrast, UI-next contrast).
- Integration: 29 files PASS; usecase: 3 files PASS; privacy: 2 files PASS.
- Production build: PASS.
- Prettier check and `git diff --check`: PASS.

## Workspace hygiene

- Temp DBs created: `wisdomtree_test_pc4_20260913` (one logical PC4 DB,
  recreated under the same name for clean full regression and final long-name
  browser verification; no additional DB name was created).
- Temp DBs removed: `wisdomtree_test_pc4_20260913`.
- DB absence verified: PASS, queried `pg_database` after final drop.
- Temp files/dirs created: `tests/e2e/.auth`, `test-results`, and a temporary
  pre-patch route-audit spec.
- Temp files/dirs removed: all; absence verified.
- Temp processes started: temporary Next standalone server, Playwright, and
  nixpkgs Chromium.
- Temp processes stopped: all exited; port 3000 and work-specific browser/server
  processes verified absent.
- Remaining temp resources: none.
- Intentionally retained artifacts: normal `.next` production build output,
  which is repository-standard rather than PC4-only evidence.

## Exit gate

```text
Desktop                 PASS
Tablet                  PASS
Mobile                  PASS
200% zoom/reflow        PASS (720 CSS-pixel reflow equivalent plus 390px mobile)
Keyboard/accessibility  PASS
Long-content resilience PASS
No page overflow        PASS
Known UX defects        CLOSED
Technical regression    PASS
Workspace hygiene       PASS
```
