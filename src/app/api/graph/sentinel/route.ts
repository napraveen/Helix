import { NextResponse } from "next/server";
import { runGraphHealthAudit, executeAutoFix } from "@/lib/graph/sentinel";

export async function GET() {
  try {
    const audit = await runGraphHealthAudit();
    return NextResponse.json(audit);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { anomalyId?: string };
    if (!body.anomalyId) {
      return NextResponse.json({ error: "anomalyId required" }, { status: 400 });
    }
    const result = await executeAutoFix(body.anomalyId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
