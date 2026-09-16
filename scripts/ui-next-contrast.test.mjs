import { readFileSync } from "node:fs";

const css = readFileSync("src/app/components/ui-next/styles.css", "utf8");

function tokenBlock(selector) {
  const clean = selector.replace(/\s*\{$/, "");
  const index = css.indexOf(selector);
  const start = index >= 0 ? index : css.indexOf(clean);
  if (start < 0) throw new Error(`Missing token selector: ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/(--ui-[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

const linear = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
function luminance(hex) {
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255);
  return 0.2126 * linear(channels[0]) + 0.7152 * linear(channels[1]) + 0.0722 * linear(channels[2]);
}
function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const light = tokenBlock(".ui-next");
const dark = {
  ...light,
  ...tokenBlock(':root[data-theme="dark"] .ui-next'),
};
const checks = [
  ["primary text/background", "--ui-color-text", "--ui-color-background", 4.5],
  ["secondary text/surface", "--ui-color-text-secondary", "--ui-color-surface", 4.5],
  ["muted text/surface", "--ui-color-text-muted", "--ui-color-surface", 4.5],
  ["primary link/surface", "--ui-color-primary", "--ui-color-surface", 4.5],
  ["primary button text", "--ui-color-on-primary", "--ui-color-primary", 4.5],
  ["control edge/surface", "--ui-color-border-strong", "--ui-color-surface", 3],
  ["focus/surface", "--ui-color-focus", "--ui-color-surface", 3],
  ["success status", "--ui-color-success", "--ui-color-success-bg", 4.5],
  ["warning status", "--ui-color-warning", "--ui-color-warning-bg", 4.5],
  ["danger status", "--ui-color-danger", "--ui-color-danger-bg", 4.5],
  ["danger button text", "--ui-color-on-danger", "--ui-color-danger", 4.5],
  ["information status", "--ui-color-information", "--ui-color-information-bg", 4.5],
];

let failures = 0;
for (const [theme, tokens] of [
  ["light", light],
  ["dark", dark],
]) {
  for (const [name, foreground, background, minimum] of checks) {
    const ratio = contrast(tokens[foreground], tokens[background]);
    const passes = ratio >= minimum;
    if (!passes) failures += 1;
    console.log(
      `${passes ? "ok  " : "FAIL"} ${theme}: ${name} ${ratio.toFixed(2)}:1 (need ${minimum}:1)`,
    );
  }
}

process.exit(failures ? 1 : 0);
