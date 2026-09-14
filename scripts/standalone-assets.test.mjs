import { readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";

const staticRoot = path.join(process.cwd(), ".next", "static");

function findFirstCss(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findFirstCss(absolute);
      if (nested) return nested;
    } else if (entry.name.endsWith(".css")) {
      return path.relative(staticRoot, absolute).split(path.sep).join("/");
    }
  }
  return null;
}

const cssPath = findFirstCss(staticRoot);
if (!cssPath) throw new Error("Standalone asset check needs a production build with CSS assets.");

const port = 41_000 + (process.pid % 1_000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn("node", ["scripts/start-standalone.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" },
  stdio: "ignore",
});

async function fetchWhenReady(pathname) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}${pathname}`, { redirect: "manual" });
      if (response.status !== 503) return response;
    } catch {
      // The standalone server has not bound the port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Standalone server did not become ready within 10 seconds.");
}

try {
  const css = await fetchWhenReady(`/_next/static/${cssPath}`);
  if (!css.ok) throw new Error(`Standalone CSS returned ${css.status}.`);

  const font = await fetchWhenReady("/fonts/cda-independence-text-regular.otf");
  if (!font.ok) throw new Error(`Standalone public font returned ${font.status}.`);

  console.log("Standalone assets: CSS and public font are reachable.");
} finally {
  server.kill();
  await once(server, "exit");
}
