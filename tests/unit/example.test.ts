import assert from "node:assert";

// Example unit test for repo utilities.
// Rename or expand this file to cover actual modules.

export const run = async () => {
  assert.strictEqual(1 + 1, 2, "basic math should work");
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
