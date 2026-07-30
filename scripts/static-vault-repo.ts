import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

async function readFiles(root: string, dir = root): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [name, content] of await readFiles(root, absolute)) files.set(name, content);
    } else if (entry.isFile()) {
      files.set(path.relative(root, absolute).split(path.sep).join("/"), await readFile(absolute, "utf8"));
    }
  }
  return files;
}

export async function readStaticVaultRepo(repoInput: string): Promise<Map<string, string>> {
  const repo = path.resolve(repoInput);
  const { stdout } = await exec("git", ["-C", repo, "rev-parse", "--is-bare-repository"]);
  if (stdout.trim() !== "true") return readFiles(repo);

  const temp = await mkdtemp(path.join(tmpdir(), "wt-vault-verify-"));
  const work = path.join(temp, "work");
  try {
    await exec("git", ["clone", "--quiet", repo, work]);
    return await readFiles(work);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
