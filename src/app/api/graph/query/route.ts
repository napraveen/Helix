import { NextResponse } from "next/server";
import { staleKnowledge, whoKnows, blastRadius, expertiseRank } from "@/lib/graph/tools";
import { runCypher } from "@/lib/falkor/run";
import { CYPHER } from "@/lib/graph/cypher";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "people";
  const q = searchParams.get("q") ?? "";
  try {
    if (kind === "people") {
      const result = await runCypher(CYPHER.people, undefined, true);
      return NextResponse.json(result.rows);
    }
    if (kind === "decisions") {
      const result = await runCypher(CYPHER.decisions, undefined, true);
      return NextResponse.json(result.rows);
    }
    if (kind === "stale") {
      const out = await staleKnowledge();
      return NextResponse.json(out.data);
    }
    if (kind === "knows") {
      const out = await whoKnows(q || "vision");
      return NextResponse.json(out.data);
    }
    if (kind === "blast") {
      const out = await blastRadius(q || "fleet-orchestrator");
      return NextResponse.json(out.data);
    }
    if (kind === "rank") {
      const out = await expertiseRank();
      return NextResponse.json(out.data);
    }
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
