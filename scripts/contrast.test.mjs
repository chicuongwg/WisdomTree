// The contrast floor, measured rather than asserted in a comment.
//
// Four of these pairs shipped below the floor for months — a focus ring at
// 1.07:1 on the status strip, a field border at 1.68:1 — because nothing here
// could fail. Colour is the one part of this design system a person cannot
// check by looking: a ring that is invisible on a dark strip looks fine in a
// screenshot of a page where nothing has focus.
//
// Tokens are read out of the stylesheet, never restated here, so the check
// cannot drift away from what the app actually paints.
import { readFileSync } from "node:fs";

const css = readFileSync(process.argv[2] ?? "src/app/foundation.css", "utf8");

function tokens(scope) {
  const block = scope === "dark"
    ? css.slice(css.indexOf(':root[data-theme="dark"]'))
    : css.slice(css.indexOf(":root"));
  const end = block.indexOf("}");
  const body = block.slice(0, end);
  const out = {};
  for (const [, k, v] of body.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{3,8})/gi)) out[k] = v;
  return out;
}

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function lum(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const light = tokens("light");
const dark = { ...light, ...tokens("dark") };

const CHECKS = [
  ["field border on panel", "--color-control-edge", "--color-surface", 3],
  ["field border on paper", "--color-control-edge", "--color-paper", 3],
  ["focus ring on status strip", "--color-focus-on-dark", "--shell-status-bg", 3],
  ["focus ring on rail", "--color-focus-on-dark", "--shell-rail-bg", 3],
  ["palette focus rule on surface", "--color-cham", "--color-surface", 3],
];

let bad = 0;
for (const [name, fg, bg, need] of [["light", light], ["dark", dark]].flatMap(
  ([theme, t]) => CHECKS.map(([n, f, b, need]) => [`${theme}: ${n}`, t[f], t[b], need]),
)) {
  // --color-focus is a var() alias, so resolve the one indirection we use.
  const r = ratio(fg, bg);
  const ok = r >= need;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(38)} ${r.toFixed(2)}:1 (need ${need}:1)`);
}

// ---------------------------------------------------------------------------
// Every absolutely positioned box says where it goes.
//
// `.sr-only` did not, and an absolutely positioned element with no offsets
// sits at its STATIC position — measured against the nearest POSITIONED
// ancestor, which `overflow: auto` does not make one. So the empty live region
// that every <Say> renders escaped the scrolling content column, landed
// against the initial containing block at whatever depth it had in flow, and
// stretched the ROOT's scrollable overflow to reach it: 1625px against a
// 1000px window on /account. The document scrolled, .shell stayed exactly
// 100dvh pinned to the top, and the status strip floated mid-window over a
// band of blank canvas. It looked like a footer bug and was a positioning bug.
//
// This is the cheap half of catching that class. The expensive half — does the
// document scroll when it should not — needs a real browser, which this repo
// has no harness for; measured by hand at 1400x1000 across five screens.
// Comments are stripped first, or the scan reads its own documentation: the
// .panel rule DISCUSSES "position: absolute" (the note about the zero-height
// live region that once changed a heading's gap), and the first run of this
// check duly failed .panel for a declaration it does not have.
const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
const absoluteRules = [...bare.matchAll(/([^{}]+)\{([^}]*position:\s*absolute[^}]*)\}/g)];
for (const [, selector, body] of absoluteRules) {
  const anchored = /(^|[;\s])(top|right|bottom|left|inset)\s*:/.test(body);
  if (!anchored) bad++;
  console.log(
    `${anchored ? "ok  " : "FAIL"} absolute rule is anchored${anchored ? "" : " — add top/left"}: ${selector.trim().replace(/\s+/g, " ").slice(0, 52)}`,
  );
}

process.exit(bad ? 1 : 0);
