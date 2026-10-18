import { NextResponse } from "next/server";
import { runCypher } from "@/lib/falkor/run";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { cypher?: string; params?: Record<string, unknown>; readOnly?: boolean };
    const cypher = body.cypher?.trim();
    if (!cypher) {
      return NextResponse.json({ error: "Cypher query string required" }, { status: 400 });
    }

    const readOnly = body.readOnly ?? !/CREATE|MERGE|SET|DELETE|REMOVE|DETACH/i.test(cypher);
    const result = await runCypher(cypher, body.params, readOnly);
    return NextResponse.json({
      ok: true,
      cypher: result.cypher,
      rowCount: result.rows.length,
      rows: result.rows,
      metadata: result.metadata,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
