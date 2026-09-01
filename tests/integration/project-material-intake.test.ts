import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { auditEvents } from "@/modules/audit/schema";
import {
  enableProjectCapability,
  grantProjectLibraryOperator,
} from "@/modules/project/capabilities";
import { createProject } from "@/modules/project/service";
import { extractionWorker } from "@/modules/storage/extraction";
import { addProjectMaterialPhysical, getPhysicalDetail } from "@/modules/storage/physical";
import {
  folders,
  sourcePhysical,
  sources,
  sourceVersions,
  spaces,
} from "@/modules/storage/schema";
import {
  addProjectMaterialVersion,
  addSpaceMember,
  createProjectMaterial,
  listProjectMaterials,
  moveSource,
  renameSource,
  uploadSource,
} from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  const initialAdmin = await principalFor("huong@wisdomtree.local");
  const contributorUser = await principalFor("minh@wisdomtree.local");
  const viewerUser = await principalFor("lan@wisdomtree.local");
  const outsider = await principalFor("duc@wisdomtree.local");
  const [legacyTeam] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Kho Dự Án Cộng Đồng"));
  const [personal] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.type, "personal"));
  assert.ok(legacyTeam);
  assert.ok(personal);

  const legacySourceIds = await db.select({ id: sources.id }).from(sources);
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const projectA = await createProject(initialAdmin, {
    name: `Material Project A ${suffix}`,
    researchLens: "Project-owned Material intake",
  });
  const projectB = await createProject(initialAdmin, {
    name: `Material Project B ${suffix}`,
    researchLens: "Cross-Project Material isolation",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await enableProjectCapability(initialAdmin, {
    projectId: projectA.id,
    capability: "library_circulation",
  });
  await grantProjectLibraryOperator(manager, {
    projectId: projectA.id,
    userId: manager.userId,
  });
  await addSpaceMember(manager, projectA.id, contributorUser.userId, "contributor");
  await addSpaceMember(manager, projectA.id, viewerUser.userId, "viewer");
  const contributor = await principalFor("minh@wisdomtree.local");
  const viewer = await principalFor("lan@wisdomtree.local");

  const queued: Array<{ versionId: string; method: string }> = [];
  const enqueue = extractionWorker.enqueue;
  extractionWorker.enqueue = (versionId, method = "auto") => {
    queued.push({ versionId, method });
  };

  try {
    const body = "Project Material integration evidence.";
    const digital = await createProjectMaterial(contributor, {
      projectId: projectA.id,
      title: " Field recording ",
      description: " First digital representation ",
      file: new File([body], "field-recording.txt", { type: "text/plain" }),
      extractionMethod: "auto",
    });
    assert.equal(digital.spaceId, projectA.id);
    assert.equal(digital.title, "Field recording");
    assert.equal(digital.description, "First digital representation");
    assert.equal(digital.currentVersion?.seq, 1);
    assert.deepEqual(queued, [{ versionId: digital.currentVersion?.id, method: "auto" }]);

    const [digitalRow] = await db.select().from(sources).where(eq(sources.id, digital.id));
    const [firstVersion] = await db
      .select()
      .from(sourceVersions)
      .where(eq(sourceVersions.id, digital.currentVersion!.id));
    assert.equal(digitalRow.spaceId, projectA.id);
    assert.equal(firstVersion.checksumSha256, createHash("sha256").update(body).digest("hex"));
    const [uploadAudit] = await db
      .select({ details: auditEvents.details })
      .from(auditEvents)
      .where(
        and(eq(auditEvents.action, "source.upload"), eq(auditEvents.targetId, digital.id)),
      );
    assert.equal((uploadAudit.details as { projectId?: string }).projectId, projectA.id);

    await assert.rejects(
      createProjectMaterial(viewer, {
        projectId: projectA.id,
        title: "Viewer upload",
      }),
      errorCode("forbidden"),
    );
    await assert.rejects(
      createProjectMaterial(contributor, { title: "Missing Project" }),
      errorCode("invalid_project_material"),
    );
    for (const invalidProjectId of [randomUUID(), legacyTeam.id, personal.id]) {
      await assert.rejects(
        createProjectMaterial(contributor, {
          projectId: invalidProjectId,
          title: "Invalid Project",
        }),
        errorCode("not_found"),
      );
    }

    const tooLarge = {
      name: "too-large.txt",
      type: "text/plain",
      size: 104_857_601,
      arrayBuffer: () => {
        throw new Error("size must be checked before reading");
      },
    } as unknown as File;
    await assert.rejects(
      createProjectMaterial(contributor, {
        projectId: projectA.id,
        title: "Too large",
        file: tooLarge,
      }),
      errorCode("file_too_large"),
    );
    const deniedFormat = {
      name: "unsafe.bin",
      type: "application/x-executable",
      size: 1,
      arrayBuffer: () => {
        throw new Error("format must be checked before reading");
      },
    } as unknown as File;
    await assert.rejects(
      createProjectMaterial(contributor, {
        projectId: projectA.id,
        title: "Unsafe",
        file: deniedFormat,
      }),
      errorCode("format_not_allowed"),
    );

    const other = await createProjectMaterial(manager, {
      projectId: projectB.id,
      title: "Other Project Material",
      file: new File(["other"], "other.txt", { type: "text/plain" }),
    });
    const metadataOnly = await createProjectMaterial(contributor, {
      projectId: projectA.id,
      title: "Sổ tay 1972",
      description: "Physical copy awaiting a scan",
    });
    assert.equal(metadataOnly.spaceId, projectA.id);
    assert.equal(metadataOnly.currentVersion, null);

    const projectMaterials = await listProjectMaterials(viewer, projectA.id);
    assert.ok(projectMaterials.some((item) => item.sourceId === digital.id));
    assert.ok(projectMaterials.some((item) => item.sourceId === metadataOnly.id));
    assert.ok(projectMaterials.every((item) => item.projectId === projectA.id));
    assert.ok(projectMaterials.every((item) => item.sourceId !== other.id));
    assert.ok(
      projectMaterials.every((item) => !legacySourceIds.some((legacy) => legacy.id === item.sourceId)),
    );
    await assert.rejects(listProjectMaterials(outsider, projectA.id), errorCode("not_found"));
    await assert.rejects(listProjectMaterials(manager, legacyTeam.id), errorCode("not_found"));

    const physical = await addProjectMaterialPhysical(manager, {
      projectId: projectA.id,
      sourceId: metadataOnly.id,
      author: "TMKT archive",
      location: "Shelf T1",
      copies: 2,
    });
    assert.equal(physical.sourceId, metadataOnly.id);
    const [physicalRow] = await db
      .select()
      .from(sourcePhysical)
      .where(eq(sourcePhysical.sourceId, metadataOnly.id));
    assert.equal(physicalRow.sourceId, metadataOnly.id);
    assert.equal((await getPhysicalDetail(viewer, metadataOnly.id))?.copies, 2);
    assert.equal(
      await db
        .select({ spaceId: sources.spaceId })
        .from(sources)
        .where(eq(sources.id, metadataOnly.id))
        .then((rows) => rows[0]?.spaceId),
      projectA.id,
    );

    const scanned = await addProjectMaterialVersion(contributor, {
      projectId: projectA.id,
      sourceId: metadataOnly.id,
      file: new File(["scan"], "scan.pdf", { type: "application/pdf" }),
      extractionMethod: "ocr",
    });
    assert.equal(scanned.currentVersion?.seq, 1);
    assert.equal(scanned.spaceId, projectA.id);
    assert.ok(await getPhysicalDetail(viewer, metadataOnly.id));

    const corrected = await addProjectMaterialVersion(contributor, {
      projectId: projectA.id,
      sourceId: digital.id,
      file: new File(["corrected"], "field-recording-v2.txt", { type: "text/plain" }),
    });
    assert.equal(corrected.currentVersion?.seq, 2);
    assert.equal(corrected.spaceId, projectA.id);
    await assert.rejects(
      addProjectMaterialVersion(manager, {
        projectId: projectB.id,
        sourceId: digital.id,
        file: new File(["wrong"], "wrong.txt", { type: "text/plain" }),
      }),
      errorCode("not_found"),
    );

    await renameSource(contributor, digital.id, { title: "Renamed field recording" });
    const [folderA] = await db
      .insert(folders)
      .values({ spaceId: projectA.id, name: `Folder A ${suffix}`, createdBy: manager.userId })
      .returning();
    const [folderB] = await db
      .insert(folders)
      .values({ spaceId: projectB.id, name: `Folder B ${suffix}`, createdBy: manager.userId })
      .returning();
    await moveSource(contributor, digital.id, folderA.id);
    await assert.rejects(
      moveSource(contributor, digital.id, folderB.id),
      errorCode("folder_other_space"),
    );
    const [unchangedOwnership] = await db
      .select({ spaceId: sources.spaceId, folderId: sources.folderId })
      .from(sources)
      .where(eq(sources.id, digital.id));
    assert.equal(unchangedOwnership.spaceId, projectA.id);
    assert.equal(unchangedOwnership.folderId, folderA.id);

    const legacyUpload = await uploadSource(initialAdmin, {
      spaceId: legacyTeam.id,
      title: `Legacy compatibility ${suffix}`,
      file: new File(["legacy"], "legacy.txt", { type: "text/plain" }),
    });
    assert.equal(legacyUpload.spaceId, legacyTeam.id);
    const [legacyAudit] = await db
      .select({ details: auditEvents.details })
      .from(auditEvents)
      .where(
        and(eq(auditEvents.action, "source.upload"), eq(auditEvents.targetId, legacyUpload.id)),
      );
    assert.equal("projectId" in (legacyAudit.details as Record<string, unknown>), false);
  } finally {
    extractionWorker.enqueue = enqueue;
  }
}
