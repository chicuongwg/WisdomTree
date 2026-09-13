import type { Principal } from "../auth/principal";
import { getNoteResearchProvenance } from "../knowledge/provenance";

/** App DTO deliberately uses Material and Note terminology, never storage/branch terms. */
export const getAppNoteResearchProvenance = (actor: Principal, noteVersionId: string) =>
  getNoteResearchProvenance(actor, noteVersionId);
