import { unauthorized } from "./errors";
import { resolvePrincipal } from "@/modules/auth/session";
import type { Principal } from "@/modules/auth/dev-auth";

/** Session middleware step of the enforcement pipeline: principal or 401. */
export async function requirePrincipal(): Promise<Principal> {
  const principal = await resolvePrincipal();
  if (!principal) throw unauthorized();
  return principal;
}
