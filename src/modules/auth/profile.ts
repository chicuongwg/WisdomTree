// The member's own record. Until this file, nothing in the app wrote the
// users table at all — the seed script was the only INSERT, so display names
// were frozen, disabled_at was checked on every request and settable by
// nobody, and "update your name" meant asking the developer to run SQL.
//
// Everything here is the actor editing the actor: role, email and google_sub
// are deliberately NOT touchable — those are the admin's (batch F) and the
// identity provider's, and this module must never grow a way around that.

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "./principal";
import { users } from "./schema";
import { recordAudit } from "../audit/service";
import { getObject, putObject } from "../storage/object-store";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const SUPPORTED_UI_LOCALES = ["vi", "en"] as const;
export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export function normalizeUiLocale(value: string | null | undefined): UiLocale {
  return value === "en" ? "en" : "vi";
}

export async function getProfile(actor: Principal) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      avatarKey: users.avatarKey,
      locale: users.locale,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, actor.userId), isNull(users.disabledAt)));
  if (!row) throw notFound();
  return row;
}

export async function updateProfile(
  actor: Principal,
  input: { displayName?: string },
) {
  const displayName = input.displayName?.trim();
  if (input.displayName !== undefined && !displayName) {
    throw new ApiError(400, "invalid_name", "Display name must not be empty.");
  }
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, actor.userId));
    if (!before) throw notFound();
    await tx
      .update(users)
      .set({
        ...(displayName ? { displayName } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, actor.userId));
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "user.profile.update",
      targetType: "user",
      targetId: actor.userId,
      // The old and new display name are the part worth an audit trail: the
      // name is how every other record refers to this person.
      details: displayName ? { from: before.displayName, to: displayName } : {},
    });
  });
}

export async function updateUiLocale(actor: Principal, locale: string) {
  if (!SUPPORTED_UI_LOCALES.includes(locale as UiLocale)) {
    throw new ApiError(400, "invalid_ui_locale", "UI locale must be vi or en.");
  }
  const normalized = locale as UiLocale;
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ locale: normalized, updatedAt: new Date() })
      .where(eq(users.id, actor.userId))
      .returning({ locale: users.locale });
    if (!updated) throw notFound();
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "user.locale.update",
      targetType: "user",
      targetId: actor.userId,
      details: { locale: normalized },
    });
    return { locale: normalizeUiLocale(updated.locale) };
  });
}

/** Store the picture, point the record at it. Old object is left behind —
 *  the store has no delete; a real S3 lifecycle rule reaps orphans. */
export async function setAvatar(actor: Principal, file: File) {
  if (!AVATAR_TYPES.has(file.type)) {
    throw new ApiError(415, "not_an_image", "Avatar must be PNG, JPEG or WebP.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new ApiError(413, "image_too_large", "Image exceeds 2 MB.");
  }
  const body = Buffer.from(await file.arrayBuffer());
  const key = `avatars/${actor.userId}/${Date.now()}`;
  await putObject(key, body, file.type);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ avatarKey: key, updatedAt: new Date() })
      .where(eq(users.id, actor.userId));
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "user.avatar.set",
      targetType: "user",
      targetId: actor.userId,
      details: {},
    });
  });
}

/** Any signed-in member may see a teammate's picture — same footing as the
 *  display name beside it. Returns null when none is set. */
export async function getAvatar(userId: string) {
  const [row] = await db
    .select({ avatarKey: users.avatarKey })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.disabledAt)));
  if (!row?.avatarKey) return null;
  return getObject(row.avatarKey).catch(() => null);
}
