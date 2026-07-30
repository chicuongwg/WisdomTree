import { notFound as nextNotFound, redirect } from "next/navigation";
import { ApiError } from "./errors";
import { currentUser } from "@/modules/auth/session";
import type { Principal } from "@/modules/auth/dev-auth";

export type PageUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/** Server pages: session or redirect to the dev sign-in picker. */
export async function requireUser(): Promise<PageUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export function toPrincipal(user: PageUser): Principal {
  return {
    userId: user.id,
    role: user.role,
    spaceIds: user.spaceIds,
    capabilities: user.capabilities,
    vaultIds: user.vaultIds,
    vaultGrants: user.vaultGrants,
  };
}

/** Map service-layer 404s to the framework's notFound page. */
export async function orNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) nextNotFound();
    throw err;
  }
}
