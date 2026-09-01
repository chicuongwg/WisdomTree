import { cache } from "react";
import { redirect } from "next/navigation";
import { getApplicationContext, listAppProjects } from "@/modules/application";
import { resolvePrincipal } from "@/modules/auth/session";

export const getAppRequestContext = cache(async () => {
  const actor = await resolvePrincipal();
  if (!actor) redirect("/login");

  const [application, projects] = await Promise.all([
    getApplicationContext(actor),
    listAppProjects(actor),
  ]);

  return { actor, application, projects };
});

