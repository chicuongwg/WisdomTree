import type { Principal } from "../auth/principal";
import {
  inviteUser,
  listAuditEvents,
  listUsers,
  setUserDisabled,
  setUserRole,
} from "../auth/admin";
import { healthReport } from "../export/service";

/** Target delivery facade for bounded administration workflows. */
export const listAppUsers = listUsers;
export async function inviteAppUser(actor: Principal, input: Parameters<typeof inviteUser>[1]) {
  return inviteUser(actor, input);
}
export const setAppUserRole = setUserRole;
export async function setAppUserDisabled(actor: Principal, userId: string, disabled: boolean) {
  await setUserDisabled(actor, userId, disabled);
}
export const listAppAuditEvents = listAuditEvents;
export const getAppOperationalStatus = (actor: Principal) => healthReport(actor);
