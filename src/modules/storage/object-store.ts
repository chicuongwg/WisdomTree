// Dev-mode substitution boundary: the demo uses
// the local filesystem behind this module; V1 can swap in real S3 without
// touching callers. Downloads always go through the authorized endpoint —
// object keys are opaque and never public paths.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local-filesystem ObjectStore rooted at FILE_STORAGE_DIR, keyed by opaque
 * `${sourceId}/${versionId}` keys. Content type rides in a sidecar file so
 * the store stays a dumb byte bucket like S3.
 */
class LocalFsObjectStore {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    const p = path.normalize(path.join(this.root, key));
    if (!p.startsWith(path.normalize(this.root + path.sep))) throw new Error("invalid object key");
    return p;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    await writeFile(`${file}.meta`, contentType, "utf8");
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string }> {
    const file = this.resolve(key);
    const body = await readFile(file);
    const contentType = await readFile(`${file}.meta`, "utf8").catch(
      () => "application/octet-stream",
    );
    return { body, contentType };
  }
}

export const objectStore = new LocalFsObjectStore(
  process.env.FILE_STORAGE_DIR ?? "./data/objects",
);
