import { NextResponse } from "next/server";
import {
  parseMarkdownRFC,
  parseGitHubRepo,
  executeIngestionToFalkor,
  SAMPLE_INGEST_TEMPLATES,
  DYNAMIC_INGESTED_NODES,
  DYNAMIC_INGESTED_EDGES,
} from "@/lib/graph/universal-ingest";

export async function GET() {
  return NextResponse.json({
    ok: true,
    templates: SAMPLE_INGEST_TEMPLATES,
    dynamicCounts: {
      nodes: DYNAMIC_INGESTED_NODES.length,
      edges: DYNAMIC_INGESTED_EDGES.length,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body.type || "markdown";

    let result;
    if (type === "github") {
      result = parseGitHubRepo(body.repoData || SAMPLE_INGEST_TEMPLATES.githubWarehouseManifest);
    } else {
      const text = body.text || SAMPLE_INGEST_TEMPLATES.stripeRfc;
      const title = body.title;
      result = parseMarkdownRFC(text, title);
    }

    // Try executing directly into FalkorDB
    const liveExecuted = await executeIngestionToFalkor(result.cypherStatements);

    // Record real live activity stream event
    try {
      const { recordLiveActivity } = await import("@/lib/graph/activity-stream");
      recordLiveActivity({
        source: type === "github" ? "GITHUB" : "DECISION",
        author: "Universal Ingest Studio",
        channelOrRepo: result.title || (type === "github" ? "monorepo-manifest" : "rfc-document"),
        title: `Ingested ${result.nodesCreated.length} nodes & ${result.edgesCreated.length} edges`,
        content: `Universal Ingest parsed ${type.toUpperCase()} source. Systems: ${result.entitiesDetected.systems.slice(0, 3).join(", ") || "none"}. Provenance: ${result.provenanceHash.slice(0, 16)}...`,
        affectedEntities: result.nodesCreated.map((n: { name: string }) => n.name).slice(0, 5),
        cypherMutation: result.cypherStatements[0] || "MERGE (n:System {name: 'ingested'})",
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      result,
      liveFalkorDBMutated: liveExecuted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to ingest" },
      { status: 500 },
    );
  }
}
