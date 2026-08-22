import { isIP } from "node:net";
import { ApiError } from "./errors";

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();
let lastCleanup = 0;

/**
 * Small single-process limiter for the current modular-monolith deployment.
 * It protects expensive entry points without pretending to be a distributed
 * quota. Replace the store if the app is ever served by multiple instances.
 */
export function enforceRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number,
): void {
  const now = Date.now();
  if (now - lastCleanup > windowMs) {
    lastCleanup = now;
    for (const [entryKey, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(entryKey);
    }
  }

  const entryKey = `${bucket}:${key}`;
  const current = buckets.get(entryKey);
  if (!current || current.resetAt <= now) {
    buckets.set(entryKey, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new ApiError(429, "rate_limited", "Too many requests. Try again later.", {
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    });
  }
}

/**
 * The per-user traffic cap, applied wherever a principal is resolved (every
 * API route via requirePrincipal, every page via requireUser). Keyed by user
 * id, not address — behind an untrusted proxy every client shares one
 * address, and the quota is a statement about an account, not a machine.
 */
const USER_RATE_LIMIT = Number(process.env.USER_RATE_LIMIT ?? 240);
const USER_RATE_WINDOW_MS = Number(process.env.USER_RATE_WINDOW_MS ?? 60_000);

export function enforceUserRateLimit(userId: string): void {
  enforceRateLimit("user", userId, USER_RATE_LIMIT, USER_RATE_WINDOW_MS);
}

/** Best available address at an explicitly trusted reverse-proxy boundary. */
export function requestAddress(request: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "local";
  const candidate =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : "local";
}
