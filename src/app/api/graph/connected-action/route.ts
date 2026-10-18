import { NextResponse } from "next/server";
import { runConnectedActionScenario } from "@/lib/graph/connected-actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scenario = body.scenario || "security_cve_quarantine";
    const result = await runConnectedActionScenario(scenario);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
