import { NextResponse } from "next/server";
import { runRedTeamAdversarialSuite } from "@/lib/graph/redteam-security";
import { runMemoryAblationStudy } from "@/lib/graph/memory-ablation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "redteam";

  if (mode === "ablation") {
    const ablationReport = runMemoryAblationStudy();
    return NextResponse.json({ ok: true, report: ablationReport });
  }

  const redTeamReport = await runRedTeamAdversarialSuite();
  return NextResponse.json({ ok: true, report: redTeamReport });
}

export async function POST(req: Request) {
  const redTeamReport = await runRedTeamAdversarialSuite();
  return NextResponse.json({ ok: true, report: redTeamReport });
}
