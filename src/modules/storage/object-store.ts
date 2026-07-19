// Dev-mode substitution boundary (docs/roadmap/demo-brief.md): the demo uses
// the local filesystem behind this interface; V1 swaps in real S3 without
// touching callers. Downloads always go through the authorized endpoint
// (docs/design/authorization-design.md § Object Storage Delivery) — object
// keys are opaque and never public paths.

export interface ObjectStore {
  /** Store a file body under an opaque key. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Read a stored object; throws if the key does not exist. */
  get(key: string): Promise<{ body: Buffer; contentType: string }>;
}

// Implementation lands in step 2 (build): LocalFsObjectStore rooted at
// FILE_STORAGE_DIR, keyed by `${sourceId}/${versionId}` style opaque keys.
