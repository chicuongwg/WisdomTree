import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { toApplicationError, transitionAppProjectLibraryLoan } from "@/modules/application";

const ACTIONS = ["approve", "decline", "handover", "return"] as const;
type LoanAction = (typeof ACTIONS)[number];

function actionFrom(value: unknown): LoanAction {
  if (typeof value === "string" && ACTIONS.includes(value as LoanAction)) {
    return value as LoanAction;
  }
  throw new ApiError(400, "invalid_input", "A valid Library loan action is required.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; loanId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, loanId } = await params;
    const body = (await request.json().catch(() => null)) as {
      action?: unknown;
      dueAt?: unknown;
    } | null;
    const action = actionFrom(body?.action);
    const dueAt =
      typeof body?.dueAt === "string" && body.dueAt.trim() ? new Date(body.dueAt) : undefined;
    if (action === "handover" && (!dueAt || Number.isNaN(dueAt.getTime()))) {
      throw new ApiError(400, "invalid_input", "A valid handover due date is required.");
    }
    return NextResponse.json(
      await transitionAppProjectLibraryLoan(actor, { projectId, loanId, action, dueAt }),
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
