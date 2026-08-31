import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { restoreNodeVersionToDraft } from "@/modules/knowledge/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ nodeId: string; seq: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId, seq: rawSeq } = await params;
    const seq = Number(rawSeq);
    if (!Number.isInteger(seq) || seq < 1) {
      return NextResponse.json({ code: "invalid_version" }, { status: 400 });
    }
    return NextResponse.json(await restoreNodeVersionToDraft(actor, nodeId, seq));
  });
}
