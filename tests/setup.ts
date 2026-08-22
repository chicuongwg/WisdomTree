import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/modules/auth/schema";

export function testName(name: string) {
  return name;
}

/**
 * Sign a test in the way production signs anyone in: a sessions row whose
 * token_hash is the SHA-256 of the cookie value. No in-app backdoor — this is
 * the door tests use now that the dev-login impersonation endpoint is gone.
 */
export async function issueTestSession(
  email: string,
  opts: { ttlMs?: number; lastSeenAt?: Date } = {},
): Promise<{ token: string; userId: string }> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error(`seeded user not found: ${email}`);
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    userId: user.id,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + (opts.ttlMs ?? 7 * 24 * 60 * 60 * 1000)),
    ...(opts.lastSeenAt ? { lastSeenAt: opts.lastSeenAt } : {}),
  });
  return { token, userId: user.id };
}
