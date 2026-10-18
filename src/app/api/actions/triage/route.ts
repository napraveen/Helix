import { NextResponse } from "next/server";
import { triagePullRequestInContext, approveAndDispatchPrTriage } from "@/lib/actions/pr-triage";
import { executeUndoAction } from "@/lib/actions/action-dispatcher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "triage";

    if (action === "triage") {
      const prUrl = body.prUrl || "https://github.com/vercel/next.js/pull/71542";
      const dossier = await triagePullRequestInContext(prUrl);
      return NextResponse.json({ ok: true, dossier });
    }

    if (action === "approve_and_dispatch") {
      const dossier = body.dossier;
      if (!dossier) return NextResponse.json({ ok: false, error: "Missing dossier" }, { status: 400 });

      const receipt = await approveAndDispatchPrTriage(dossier, body.writeRepo);
      return NextResponse.json({ ok: true, receipt });
    }

    if (action === "undo") {
      const actionId = body.actionId;
      if (!actionId) return NextResponse.json({ ok: false, error: "Missing actionId" }, { status: 400 });

      const success = await executeUndoAction(actionId);
      return NextResponse.json({ ok: true, undone: success });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
