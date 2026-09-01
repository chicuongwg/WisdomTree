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
import { addProjectMaterialPhysical } from "../storage/physical";

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
export const listAppProjectLibraryOperators = listProjectLibraryOperators;
export const grantAppProjectLibraryOperator = grantProjectLibraryOperator;
export const revokeAppProjectLibraryOperator = revokeProjectLibraryOperator;
