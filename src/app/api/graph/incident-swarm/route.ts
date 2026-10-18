import { NextResponse } from "next/server";
import { runAutonomousIncidentSwarm } from "@/lib/graph/incident-swarm";

export async function GET() {
  const simulation = await runAutonomousIncidentSwarm("billing_blackout");
  return NextResponse.json({
    ok: true,
    simulation,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const incidentType = body.type || "billing_blackout";
    const simulation = await runAutonomousIncidentSwarm(incidentType);

    return NextResponse.json({
      ok: true,
      simulation,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to run swarm" },
      { status: 500 },
    );
  }
}
