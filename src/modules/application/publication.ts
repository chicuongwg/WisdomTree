import type { Principal } from "../auth/principal";
import {
  getPublishedNoteBySlug,
  publishNote,
  unpublishNote,
} from "../publication/service";
import { grantTmktCore, listTmktCoreMembers, revokeTmktCore } from "../auth/core";

export async function publishAppNote(
  actor: Principal,
  input: { noteId: string; publicSlug?: string },
) {
  const result = await publishNote(actor, input);
  return {
    noteId: result.publication.noteId,
    slug: result.publication.publicSlug,
    state: "published" as const,
    revisionNumber: result.revision.revisionNumber,
    sourceNoteVersionId: result.revision.sourceNoteVersionId,
    changed: result.changed,
  };
}

export async function unpublishAppNote(actor: Principal, noteId: string) {
  const result = await unpublishNote(actor, noteId);
  return {
    noteId: result.publication.noteId,
    slug: result.publication.publicSlug,
    state: "unpublished" as const,
    changed: result.changed,
  };
}

export const getPublicNote = getPublishedNoteBySlug;
export const listAppCoreMembers = listTmktCoreMembers;
export const grantAppCoreMember = grantTmktCore;
export const revokeAppCoreMember = revokeTmktCore;
