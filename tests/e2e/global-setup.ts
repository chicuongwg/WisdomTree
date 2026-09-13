import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  addAppProjectMember,
  createAppProject,
  createAppProjectActivity,
  createAppCollaborationComment,
  createAppProjectMaterial,
  createAppProjectNote,
  createAppProjectTask,
  grantAppCoreMember,
  inviteAppUser,
  listAppProjects,
  publishAppNote,
} from "@/modules/application";
import { publishDraft } from "@/modules/knowledge/service";
import { configureIsolatedTestDatabase } from "../db-safety";
import { principalFor } from "../setup";

// Sign the E2E run in the way production signs anyone in: a sessions row for
// the seeded admin, its raw token written into a Playwright storageState as
// the session cookie. No in-app backdoor — the dev-login endpoint is gone.
export default async function globalSetup() {
  configureIsolatedTestDatabase();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id FROM users WHERE email = 'huong@wisdomtree.local' AND disabled_at IS NULL`,
    );
    if (!rows[0]) throw new Error("E2E needs the seeded admin (run db:seed first).");
    const token = randomBytes(32).toString("base64url");
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '1 day')`,
      [rows[0].id, createHash("sha256").update(token).digest("hex")],
    );
    const stateDir = path.join(process.cwd(), "tests", "e2e", ".auth");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      path.join(stateDir, "admin.json"),
      JSON.stringify({
        cookies: [
          {
            name: "session",
            value: token,
            domain: "localhost",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 86_400,
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
          },
        ],
        origins: [],
      }),
    );

    const admin = await principalFor("huong@wisdomtree.local");
    const personalProject = (await listAppProjects(admin)).find((project) => project.isPersonal);
    if (!personalProject) throw new Error("E2E needs the seeded admin Personal Project.");
    const fixtureSuffix = randomBytes(6).toString("hex");
    const stressText = "Nghiên cứu dài bằng tiếng Việt · English research · 漢喃文 · مثال عربي";
    const noteDraft = await createAppProjectNote(admin, {
      projectId: personalProject.id,
      title: `${stressText} — ghi chú ${fixtureSuffix}`,
      contentMd: "# PC2 browser contents\n\nPC2 browser-visible history content.",
    });
    const note = await publishDraft(admin, noteDraft.id);
    const material = await createAppProjectMaterial(admin, {
      projectId: personalProject.id,
      title: `${stressText} — tư liệu ${fixtureSuffix}`,
      file: new File(
        ["PC2 browser material"],
        `pc2-browser-${stressText.replaceAll(" ", "-")}-${fixtureSuffix}.txt`,
        { type: "text/plain" },
      ),
    });
    const sharedProject = await createAppProject(admin, {
      name: `${stressText} — Dự án chung ${fixtureSuffix}`,
      researchLens: "PC2 browser validation",
    });
    const sharedProjectManager = await principalFor("huong@wisdomtree.local");
    const collaboratorName = `PC4 Collaborator Nguyễn Ánh Vương 漢喃 مثال عربي ${fixtureSuffix}`;
    const collaborator = await inviteAppUser(admin, {
      displayName: collaboratorName,
      email: `pc4-browser-${fixtureSuffix}@wisdomtree.local`,
    });
    await addAppProjectMember(sharedProjectManager, {
      projectId: sharedProject.id,
      userId: collaborator.id,
      memberRole: "contributor",
    });
    const collaboratorToken = randomBytes(32).toString("base64url");
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '1 day')`,
      [collaborator.id, createHash("sha256").update(collaboratorToken).digest("hex")],
    );
    writeFileSync(
      path.join(stateDir, "collaborator.json"),
      JSON.stringify({
        cookies: [
          {
            name: "session",
            value: collaboratorToken,
            domain: "localhost",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 86_400,
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
          },
        ],
        origins: [],
      }),
    );
    const activity = await createAppProjectActivity(sharedProjectManager, {
      projectId: sharedProject.id,
      title: `PC3 browser activity ${fixtureSuffix}`,
    });
    const task = await createAppProjectTask(sharedProjectManager, {
      projectId: sharedProject.id,
      activityId: activity.id,
      title: `PC3 browser task ${fixtureSuffix}`,
      dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const sharedNoteDraft = await createAppProjectNote(sharedProjectManager, {
      projectId: sharedProject.id,
      title: `${stressText} — Note công khai ${fixtureSuffix}`,
      contentMd: `# ${stressText}\n\nNội dung công khai có **metadata dài** và đường dẫn an toàn.`,
      tags: ["provenance", "metadata-long-content", "漢喃", "مثال"],
    });
    const sharedNote = await publishDraft(sharedProjectManager, sharedNoteDraft.id);
    await grantAppCoreMember(sharedProjectManager, sharedProjectManager.userId);
    const publicNote = await publishAppNote(sharedProjectManager, {
      noteId: sharedNote.nodeId,
      publicSlug: `pc4-${fixtureSuffix}`,
    });
    const collaboratorActor = await principalFor(`pc4-browser-${fixtureSuffix}@wisdomtree.local`);
    const comment = await createAppCollaborationComment(sharedProjectManager, {
      kind: "activity",
      projectId: sharedProject.id,
      entityId: activity.id,
      body: `@${collaboratorName} vui lòng xem ${stressText}`,
    });
    await createAppCollaborationComment(collaboratorActor, {
      kind: "activity",
      projectId: sharedProject.id,
      entityId: activity.id,
      parentCommentId: comment.id,
      body: "Đã xem và phản hồi.",
    });
    writeFileSync(
      path.join(stateDir, "pc2.json"),
      JSON.stringify({
        personalProjectId: personalProject.id,
        noteId: note.nodeId,
        materialId: material.id,
        sharedProjectId: sharedProject.id,
        materialTitle: material.title,
        activityId: activity.id,
        activityTitle: activity.title,
        taskId: task.id,
        taskTitle: task.title,
        sharedNoteId: sharedNote.nodeId,
        publicSlug: publicNote.slug,
        collaboratorName,
      }),
    );
  } finally {
    await client.end();
  }
}
