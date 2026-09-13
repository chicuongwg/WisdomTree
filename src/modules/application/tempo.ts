import type { Principal } from "../auth/principal";
import {
  approveProjectLoan,
  declineProjectLoan,
  handoverProjectLoan,
  listProjectLoans,
  requestProjectMaterialLoan,
  returnProjectLoan,
} from "../circulation/service";
import {
  grantProjectLibraryOperator,
  listProjectLibraryOperators,
  revokeProjectLibraryOperator,
} from "../project/capabilities";
import { notFound } from "@/lib/errors";
import { getProject, getProjectApplicationAccess } from "../project/service";
import {
  addProjectMaterialPhysical,
  archivePhysicalItem,
  getPhysicalDetail,
  listProjectPhysicalHoldings,
  updatePhysicalItem,
} from "../storage/physical";
import { requireProjectMaterial } from "../storage/service";

const loanDto = (row: Awaited<ReturnType<typeof listProjectLoans>>[number]) => ({
  id: row.ticket.id,
  materialId: row.sourceId,
  materialTitle: row.itemTitle,
  itemCode: row.itemCode,
  borrowerName: row.borrowerName,
  state: row.ticket.state,
  requestedAt: row.ticket.requestedAt,
  dueAt: row.ticket.dueAt,
  returnedAt: row.ticket.returnedAt,
  version: row.ticket.version,
});

export async function listAppProjectLoans(
  actor: Principal,
  projectId: string,
  states?: Parameters<typeof listProjectLoans>[2],
) {
  return (await listProjectLoans(actor, projectId, states)).map(loanDto);
}

const transitionDto = (ticket: Awaited<ReturnType<typeof approveProjectLoan>>) => ({
  id: ticket.id,
  state: ticket.state,
  dueAt: ticket.dueAt,
  returnedAt: ticket.returnedAt,
  version: ticket.version,
});

export async function requestAppProjectMaterialLoan(actor: Principal, materialId: string) {
  const ticket = await requestProjectMaterialLoan(actor, materialId);
  return { ...transitionDto(ticket), materialId };
}

export async function getAppProjectLibrary(actor: Principal, projectId: string) {
  const [holdings, access] = await Promise.all([
    listProjectPhysicalHoldings(actor, projectId),
    getProjectApplicationAccess(actor, projectId),
  ]);
  const loans = access.capabilities.isLibraryOperator
    ? await listProjectLoans(actor, projectId)
    : [];
  return {
    holdings,
    loans: loans.map(loanDto),
    capabilities: {
      canRequestLoan: access.operationalMember,
      canManageLoans: access.capabilities.isLibraryOperator,
    },
  };
}

/** Target route adapter: the path Project and physical Material must match. */
export async function requestAppProjectLibraryLoan(
  actor: Principal,
  input: { projectId: string; materialId: string },
) {
  await getProject(actor, input.projectId);
  const material = await requireProjectMaterial(input.projectId, input.materialId);
  if (material.id !== input.materialId) throw notFound();
  const ticket = await requestProjectMaterialLoan(actor, input.materialId);
  return { ...transitionDto(ticket), materialId: input.materialId };
}

async function requireAppProjectLoan(actor: Principal, projectId: string, loanId: string) {
  const loan = (await listProjectLoans(actor, projectId)).find((row) => row.ticket.id === loanId);
  if (!loan) throw notFound();
}

export async function transitionAppProjectLibraryLoan(
  actor: Principal,
  input: {
    projectId: string;
    loanId: string;
    action: "approve" | "decline" | "handover" | "return";
    dueAt?: Date;
  },
) {
  await requireAppProjectLoan(actor, input.projectId, input.loanId);
  switch (input.action) {
    case "approve":
      return transitionDto(await approveProjectLoan(actor, input.loanId));
    case "decline":
      return transitionDto(await declineProjectLoan(actor, input.loanId));
    case "handover":
      return transitionDto(await handoverProjectLoan(actor, input.loanId, input.dueAt!));
    case "return":
      return transitionDto(await returnProjectLoan(actor, input.loanId));
  }
}

export async function approveAppProjectLoan(actor: Principal, loanId: string) {
  return transitionDto(await approveProjectLoan(actor, loanId));
}

export async function declineAppProjectLoan(actor: Principal, loanId: string) {
  return transitionDto(await declineProjectLoan(actor, loanId));
}

export async function handoverAppProjectLoan(actor: Principal, loanId: string, dueAt: Date) {
  return transitionDto(await handoverProjectLoan(actor, loanId, dueAt));
}

export async function returnAppProjectLoan(actor: Principal, loanId: string) {
  return transitionDto(await returnProjectLoan(actor, loanId));
}

export async function addAppProjectMaterialPhysical(
  actor: Principal,
  input: Parameters<typeof addProjectMaterialPhysical>[1],
) {
  const physical = await addProjectMaterialPhysical(actor, input);
  return {
    id: physical.id,
    materialId: physical.sourceId,
    itemCode: physical.itemCode,
    author: physical.author,
    location: physical.location,
    copies: physical.copies,
    status: physical.status,
    version: physical.version,
  };
}

function physicalDto(physical: {
  id: string;
  sourceId: string;
  itemCode: string;
  author: string | null;
  location: string | null;
  copies: number;
  status: "available" | "borrowed" | "lost" | "repair";
  version: number;
  availableCopies: number;
}) {
  return {
    id: physical.id,
    materialId: physical.sourceId,
    itemCode: physical.itemCode,
    author: physical.author,
    location: physical.location,
    copies: physical.copies,
    availableCopies: physical.availableCopies,
    status: physical.status,
    version: physical.version,
  };
}

async function requireAppProjectPhysical(actor: Principal, projectId: string, materialId: string) {
  await getProject(actor, projectId);
  const material = await requireProjectMaterial(projectId, materialId);
  if (material.id !== materialId) throw notFound();
  return material;
}

export async function getAppProjectMaterialPhysical(
  actor: Principal,
  input: { projectId: string; materialId: string },
) {
  await requireAppProjectPhysical(actor, input.projectId, input.materialId);
  const physical = await getPhysicalDetail(actor, input.materialId);
  return physical ? physicalDto(physical) : null;
}

export async function updateAppProjectMaterialPhysical(
  actor: Principal,
  input: {
    projectId: string;
    materialId: string;
    copies?: unknown;
    author?: string;
    location?: string;
  },
) {
  await requireAppProjectPhysical(actor, input.projectId, input.materialId);
  return physicalDto(await updatePhysicalItem(actor, input.materialId, input));
}

export async function archiveAppProjectMaterialPhysical(
  actor: Principal,
  input: { projectId: string; materialId: string },
) {
  await requireAppProjectPhysical(actor, input.projectId, input.materialId);
  const physical = await archivePhysicalItem(actor, input.materialId);
  return { id: physical.id, materialId: physical.sourceId, archived: Boolean(physical.archivedAt) };
}
export const listAppProjectLibraryOperators = listProjectLibraryOperators;
export const grantAppProjectLibraryOperator = grantProjectLibraryOperator;
export const revokeAppProjectLibraryOperator = revokeProjectLibraryOperator;
