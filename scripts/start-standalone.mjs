import { cpSync, existsSync } from "node:fs";

const standalone = ".next/standalone";

if (!existsSync(`${standalone}/server.js`)) {
  throw new Error("Missing standalone build. Run `npm run build` first.");
}
if (!existsSync(".next/static")) {
  throw new Error("Missing static build assets. Run `npm run build` first.");
}

// Next deliberately excludes these from standalone output. Copy them before
// every local standalone launch so this command behaves like the Docker image.
cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${standalone}/public`, { recursive: true });

await import(`../${standalone}/server.js`);
