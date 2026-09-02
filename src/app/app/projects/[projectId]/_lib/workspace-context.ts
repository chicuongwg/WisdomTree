import { cache } from "react";
import { notFound } from "next/navigation";
import { getProjectWorkspace, toApplicationError } from "@/modules/application";
import { getAppRequestContext } from "../../../_lib/request-context";

export const getProjectWorkspaceContext = cache(async (projectId: string) => {
  const context = await getAppRequestContext();
  try {
    const workspace = await getProjectWorkspace(context.actor, projectId);
    return { ...context, workspace };
  } catch (error) {
    const applicationError = toApplicationError(error);
    if (applicationError.error === "not_found" || applicationError.error === "forbidden") {
      notFound();
    }
    throw error;
  }
});

export async function requireProjectModule(
  projectId: string,
  module: keyof Awaited<ReturnType<typeof getProjectWorkspaceContext>>["workspace"]["modules"],
) {
  const context = await getProjectWorkspaceContext(projectId);
  if (!context.workspace.modules[module]) notFound();
  return context;
}
