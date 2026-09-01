import { authorize } from "../auth/authorize";
import { hasTmktCoreCapability } from "../auth/core";
import type { Principal } from "../auth/principal";
import {
  getProfile,
  normalizeUiLocale,
  SUPPORTED_UI_LOCALES,
  updateUiLocale,
} from "../auth/profile";

function may(actor: Principal, permission: Parameters<typeof authorize>[1]) {
  try {
    authorize(actor, permission, { kind: "read" });
    return true;
  } catch {
    return false;
  }
}

export async function getApplicationContext(actor: Principal) {
  const [profile, canPublish] = await Promise.all([
    getProfile(actor),
    hasTmktCoreCapability(actor, "tmkt.publish"),
  ]);
  return {
    currentUser: {
      id: profile.id,
      displayName: profile.displayName,
      avatarUrl: profile.avatarKey ? `/api/avatar/${profile.id}` : null,
    },
    locale: normalizeUiLocale(profile.locale),
    supportedUiLocales: [...SUPPORTED_UI_LOCALES],
    globalCapabilities: {
      canManageCoreRoster: may(actor, "admin.tmkt_core.manage"),
      canAccessAdministration: may(actor, "admin.health.read"),
      canPublish,
    },
  };
}

export const setApplicationLocale = updateUiLocale;
