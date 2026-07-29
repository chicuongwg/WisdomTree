import assert from "node:assert";
import { devLoginEnabled } from "@/modules/auth/dev-auth";

export const run = async () => {
  assert.strictEqual(typeof devLoginEnabled(), "boolean", "devLoginEnabled should return a boolean");
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
