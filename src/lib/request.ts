import { unauthorized } from "./errors";
import { enforceUserRateLimit } from "./rate-limit";
import { resolvePrincipal } from "@/modules/auth/session";
import type { Principal } from "@/modules/auth/principal";

/** Session middleware step of the enforcement pipeline: principal or 401,
 *  then the account's traffic cap (429). */
export async function requirePrincipal(): Promise<Principal> {
  const principal = await resolvePrincipal();
  if (!principal) throw unauthorized();
  enforceUserRateLimit(principal.userId);
  return principal;
}
