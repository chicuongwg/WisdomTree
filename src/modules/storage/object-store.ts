// Dev-mode substitution boundary: the demo stores objects on the local
// filesystem under FILE_STORAGE_DIR, keyed by opaque `${sourceId}/${versionId}`
// keys; V1 can point these two functions at real S3 without touching callers.
// Content type rides in a sidecar file so the store stays a dumb byte bucket.
// Downloads always go through the authorized endpoint — object keys are
// opaque and never public paths.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.env.FILE_STORAGE_DIR ?? "./data/objects";

function resolveKey(key: string): string {
  const p = path.normalize(path.join(ROOT, key));
  if (!p.startsWith(path.normalize(ROOT + path.sep))) throw new Error("invalid object key");
  return p;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const file = resolveKey(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  await writeFile(`${file}.meta`, contentType, "utf8");
}

export async function getObject(key: string): Promise<{ body: Buffer; contentType: string }> {
  const file = resolveKey(key);
  const body = await readFile(file);
  const contentType = await readFile(`${file}.meta`, "utf8").catch(
    () => "application/octet-stream",
  );
  return { body, contentType };
}
