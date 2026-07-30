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
    throw new ApiError(429, "rate_limited", "Bạn thao tác quá nhanh. Vui lòng thử lại sau.", {
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    });
  }
}

/** Best available address at an explicitly trusted reverse-proxy boundary. */
export function requestAddress(request: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "local";
  const candidate =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : "local";
}
