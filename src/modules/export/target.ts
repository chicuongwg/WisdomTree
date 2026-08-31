// Dev-mode substitution boundary: the export target is the content repo the
// tree export pushes to — strictly one-way, nothing reads back. The demo
// substitutes a LOCAL bare git repository at ./data/content-repo.git, created
// on demand; V1 points this same function at the real GitHub remote.

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export interface ExportFile {
  /** Repo-relative path, e.g. `<branch-slug>/<node-slug>.md`. */
  path: string;
  content: string;
}

export interface PublishResult {
  commitSha: string;
  /** false when the tree content was byte-identical to HEAD (no commit made). */
  changed: boolean;
}

const exec = promisify(execFile);

const AUTHOR = ["-c", "user.name=WisdomTree Export", "-c", "user.email=export@wisdomtree.local"];

const git = (cwd: string, ...args: string[]) => exec("git", [...AUTHOR, ...args], { cwd });

/**
 * Replace the repo's content with exactly `files` and commit. Idempotent
 * no-change policy: when the resulting tree equals HEAD, NO commit is made
 * and the previous HEAD sha is returned with changed=false.
 */
export async function publishToContentRepo(
  files: ExportFile[],
  message: string,
  repoDirectory?: string,
): Promise<PublishResult> {
  const repo = path.resolve(
    repoDirectory ?? process.env.EXPORT_REPO_DIR ?? "./data/content-repo.git",
  );
  if (!existsSync(path.join(repo, "HEAD"))) {
    await mkdir(repo, { recursive: true });
    await exec("git", ["init", "--bare", "--initial-branch=main", repo]);
  }

  const tmp = await mkdtemp(path.join(tmpdir(), "wt-export-"));
  const work = path.join(tmp, "work");
  try {
    await exec("git", [...AUTHOR, "clone", repo, work]);

    // Exactly one file per exported node: clear everything, rewrite all.
    for (const entry of await readdir(work)) {
      if (entry !== ".git") await rm(path.join(work, entry), { recursive: true, force: true });
    }
    for (const file of files) {
      const target = path.normalize(path.join(work, file.path));
      if (!target.startsWith(work + path.sep)) throw new Error(`invalid export path: ${file.path}`);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.content, "utf8");
    }

    await git(work, "add", "-A");
    const { stdout: status } = await git(work, "status", "--porcelain");
    const hasHead = await git(work, "rev-parse", "--verify", "HEAD")
      .then(() => true)
      .catch(() => false);

    if (!status.trim() && hasHead) {
      const { stdout } = await git(work, "rev-parse", "HEAD");
      return { commitSha: stdout.trim(), changed: false };
    }

    await git(work, "commit", "--allow-empty", "-m", message);
    await git(work, "push", "origin", "HEAD:main");
    const { stdout } = await git(work, "rev-parse", "HEAD");
    return { commitSha: stdout.trim(), changed: true };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function listFiles(root: string, dir = root): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, absolute)));
    else files.push(path.relative(root, absolute).split(path.sep).join("/"));
  }
  return files.sort();
}

export async function verifyContentRepo(
  files: ExportFile[],
  repoDirectory: string,
): Promise<boolean> {
  const repo = path.resolve(repoDirectory);
  if (!existsSync(path.join(repo, "HEAD"))) return false;
  const tmp = await mkdtemp(path.join(tmpdir(), "wt-verify-"));
  const work = path.join(tmp, "work");
  try {
    await exec("git", [...AUTHOR, "clone", repo, work]);
    const actualPaths = await listFiles(work);
    const expected = [...files].sort((left, right) => left.path.localeCompare(right.path));
    if (actualPaths.length !== expected.length) return false;
    for (let i = 0; i < expected.length; i++) {
      if (actualPaths[i] !== expected[i].path) return false;
      if ((await readFile(path.join(work, actualPaths[i]), "utf8")) !== expected[i].content)
        return false;
    }
    return true;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
