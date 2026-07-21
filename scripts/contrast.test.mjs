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

const css = readFileSync(process.argv[2] ?? "src/app/globals.css", "utf8");

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
process.exit(bad ? 1 : 0);
