import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import {
  clearAppCollaborationPresence,
  listAppCollaborationPresence,
  markAppCollaborationPresence,
  toApplicationError,
} from "@/modules/application";
type Params = { params: Promise<{ projectId: string; taskId: string }> };
const input = async (params: Params["params"]) => {
  const { projectId, taskId } = await params;
  return { kind: "task" as const, projectId, entityId: taskId };
};
export async function GET(_request: Request, { params }: Params) {
  try {
    const actor = await requirePrincipal();
    return NextResponse.json(await listAppCollaborationPresence(actor, await input(params)));
  } catch (error) {
    const app = toApplicationError(error);
    return NextResponse.json(app, { status: app.status });
  }
}
export async function POST(_request: Request, { params }: Params) {
  try {
    const actor = await requirePrincipal();
    return NextResponse.json(await markAppCollaborationPresence(actor, await input(params)));
  } catch (error) {
    const app = toApplicationError(error);
    return NextResponse.json(app, { status: app.status });
  }
}
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const actor = await requirePrincipal();
    await clearAppCollaborationPresence(actor, await input(params));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const app = toApplicationError(error);
    return NextResponse.json(app, { status: app.status });
  }
}
