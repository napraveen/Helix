import { NextResponse } from "next/server";
import {
  INITIAL_COGNITIVE_MEMORIES,
  reinforceMemory,
  executeAgentBlackboardHandoff,
  runConcurrentStressSimulation,
} from "@/lib/graph/memory-coordination";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "memories";

    if (action === "memories") {
      const sessionId = searchParams.get("sessionId");
      const filtered = sessionId
        ? INITIAL_COGNITIVE_MEMORIES.filter((m) => m.sessionId === sessionId || m.sessionId === "shared-corporate-brain")
        : INITIAL_COGNITIVE_MEMORIES;
      return NextResponse.json({ ok: true, data: filtered });
    }

    return NextResponse.json({ ok: true, data: INITIAL_COGNITIVE_MEMORIES });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "stress_test";

    if (action === "reinforce") {
      const memoryId = body.memoryId;
      const updated = await reinforceMemory(memoryId);
      return NextResponse.json({ ok: true, data: updated });
    }

    if (action === "handoff") {
      const taskTitle = body.title || "Emergency P1 Mitigation: Fleet Partition";
      const result = await executeAgentBlackboardHandoff(taskTitle);
      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "stress_test") {
      const concurrency = Number(body.concurrency) || 25;
      const result = await runConcurrentStressSimulation(concurrency);
      return NextResponse.json({ ok: true, data: result });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
