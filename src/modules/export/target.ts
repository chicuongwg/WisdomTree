// Dev-mode substitution boundary: the export target is the content repo the
// tree export pushes to — strictly one-way, nothing reads back. The demo
// substitutes a LOCAL bare git repository at ./data/content-repo.git, created
// on demand; V1 swaps in the real GitHub remote behind this same interface.

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

export interface ExportTarget {
  /**
   * Replace the repo's content with exactly `files` and commit. Idempotent
   * no-change policy: when the resulting tree equals HEAD, NO commit is made
   * and the previous HEAD sha is returned with changed=false.
   */
  publish(files: ExportFile[], message: string): Promise<PublishResult>;
}

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

const AUTHOR = ["-c", "user.name=WisdomTree Export", "-c", "user.email=export@wisdomtree.local"];

export class LocalGitExportTarget implements ExportTarget {
  constructor(private readonly repoDir: string) {}

  private git(cwd: string, ...args: string[]) {
    return exec("git", [...AUTHOR, ...args], { cwd });
  }

  async publish(files: ExportFile[], message: string): Promise<PublishResult> {
    const repo = path.resolve(this.repoDir);
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
        if (!target.startsWith(work + path.sep))
          throw new Error(`invalid export path: ${file.path}`);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, file.content, "utf8");
      }

      await this.git(work, "add", "-A");
      const { stdout: status } = await this.git(work, "status", "--porcelain");
      const hasHead = await this.git(work, "rev-parse", "--verify", "HEAD")
        .then(() => true)
        .catch(() => false);

      if (!status.trim() && hasHead) {
        const { stdout } = await this.git(work, "rev-parse", "HEAD");
        return { commitSha: stdout.trim(), changed: false };
      }

      await this.git(work, "commit", "--allow-empty", "-m", message);
      await this.git(work, "push", "origin", "HEAD:main");
      const { stdout } = await this.git(work, "rev-parse", "HEAD");
      return { commitSha: stdout.trim(), changed: true };
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
}

export const exportTarget: ExportTarget = new LocalGitExportTarget(
  process.env.EXPORT_REPO_DIR ?? "./data/content-repo.git",
);
