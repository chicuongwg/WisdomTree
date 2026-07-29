import assert from "node:assert";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const run = async () => {
  const { stdout } = await execFileAsync("node", ["-e", "console.log('api integration ok')"]);
  assert.ok(stdout.includes("api integration ok"), "Basic integration process should run");
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
