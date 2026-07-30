import path from "node:path";
import { and, asc, eq, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { LocalGitExportTarget, type ExportFile } from "../export/target";
import { branches, treeNodes, vaultGitJobs, vaults } from "./schema";

let timer: ReturnType<typeof setInterval> | undefined;
let processing = false;

function safeSegment(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "notes"
  );
}

async function processNext(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const [job] = await db
      .select()
      .from(vaultGitJobs)
      .where(
        and(
          inArray(vaultGitJobs.state, ["pending", "failed"]),
          lt(vaultGitJobs.attempts, 5),
        ),
      )
      .orderBy(asc(vaultGitJobs.createdAt))
      .limit(1);
    if (!job) return;

    const [claimed] = await db
      .update(vaultGitJobs)
      .set({
        state: "running",
        attempts: job.attempts + 1,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vaultGitJobs.id, job.id),
          inArray(vaultGitJobs.state, ["pending", "failed"]),
        ),
      )
      .returning();
    if (!claimed) return;

    try {
      const [vault] = await db.select().from(vaults).where(eq(vaults.id, job.vaultId));
      if (!vault) throw new Error("vault not found");
      const nodes = await db
        .select({
          title: treeNodes.title,
          slug: treeNodes.slug,
          contentMd: treeNodes.contentMd,
          verification: treeNodes.verification,
          branchName: branches.name,
        })
        .from(treeNodes)
        .innerJoin(branches, eq(treeNodes.branchId, branches.id))
        .where(and(eq(branches.vaultId, vault.id), ne(treeNodes.verification, "archived")));
      const files: ExportFile[] = nodes.map((node) => ({
        path: `${safeSegment(node.branchName)}/${node.slug}.md`,
        content: [
          "---",
          `title: ${JSON.stringify(node.title)}`,
          `verification: ${node.verification}`,
          "---",
          "",
          node.contentMd,
          "",
        ].join("\n"),
      }));
      const root = path.resolve(process.env.VAULT_GIT_DIR ?? "./data/vault-repos");
      const target = new LocalGitExportTarget(path.join(root, `${vault.id}.git`));
      const result = await target.publish(files, `Mirror vault revision ${job.nodeVersionId}`);
      await db
        .update(vaultGitJobs)
        .set({
          state: "done",
          commitSha: result.commitSha,
          updatedAt: new Date(),
        })
        .where(eq(vaultGitJobs.id, job.id));
    } catch (error) {
      await db
        .update(vaultGitJobs)
        .set({
          state: "failed",
          lastError: error instanceof Error ? error.message : "Git mirror failed",
          updatedAt: new Date(),
        })
        .where(eq(vaultGitJobs.id, job.id));
    }
  } finally {
    processing = false;
  }
}

export function startVaultGitWorker(): void {
  if (timer) return;
  timer = setInterval(() => void processNext(), 5000);
  timer.unref();
  void processNext();
}
