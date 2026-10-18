import { NextResponse } from "next/server";
import { ingestNote } from "@/lib/graph/tools";
import { ingestGitHubRepository } from "@/lib/connectors/github-connector";
import { parseSlackExport } from "@/lib/connectors/slack-connector";
import { parseIssueExport } from "@/lib/connectors/issue-connector";
import { parseAdrMarkdown } from "@/lib/connectors/docs-connector";
import sampleSlackData from "@/fixtures/sample-slack-export.json";
import sampleLinearData from "@/fixtures/sample-linear-export.json";
import { runCypher } from "@/lib/falkor/run";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const action = body.action || "note";

    if (action === "github") {
      const repo = body.repo || process.env.GITHUB_READ_TARGETS || "vercel/next.js";
      const depth = body.depth || "quick";
      const result = await ingestGitHubRepository({ repo, depth });

      // If FalkorDB is live, write nodes into multigraph
      try {
        for (const node of result.nodes.slice(0, 50)) {
          await runCypher(
            `MERGE (n:${node.label} {id: $id}) SET n += $props`,
            { id: node.id, props: node.properties },
            false
          );
        }
      } catch {}

      return NextResponse.json({
        ok: true,
        source: "github",
        repo,
        depth,
        stats: result.stats,
        nodesSample: result.nodes.slice(0, 15),
        edgesSample: result.edges.slice(0, 15),
        topContributors: result.contributors.filter((c) => !c.isBot).slice(0, 5),
      });
    }

    if (action === "slack_sample") {
      const result = parseSlackExport(
        sampleSlackData.channel,
        sampleSlackData.messages as any
      );

      return NextResponse.json({
        ok: true,
        source: "slack_sample",
        isSampleData: true,
        channel: sampleSlackData.channel.name,
        nodesCreated: result.nodes.length,
        edgesCreated: result.edges.length,
        nodes: result.nodes,
        edges: result.edges,
      });
    }

    if (action === "linear_sample") {
      const result = parseIssueExport(sampleLinearData.issues as any);

      return NextResponse.json({
        ok: true,
        source: "linear_sample",
        isSampleData: true,
        ticketsProcessed: sampleLinearData.issues.length,
        nodesCreated: result.nodes.length,
        edgesCreated: result.edges.length,
        nodes: result.nodes,
        edges: result.edges,
      });
    }

    if (action === "adr") {
      const content = body.content || "";
      const result = parseAdrMarkdown(content, body.title || "ADR Document");

      return NextResponse.json({
        ok: true,
        source: "adr_markdown",
        documentId: result.documentId,
        title: result.title,
        author: result.author,
        decisions: result.decisions,
        nodesCreated: result.nodes.length,
        edgesCreated: result.edges.length,
      });
    }

    // Default note ingestion
    if (!body.title || !body.content) {
      return NextResponse.json({ error: "title and content required" }, { status: 400 });
    }

    const result = await ingestNote({
      title: body.title,
      content: body.content,
      author: body.author,
      kind: body.kind,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    availableConnectors: [
      { name: "GitHub Reader", action: "github", description: "Public repository tree, commits, PRs, CODEOWNERS, and measured KNOWS" },
      { name: "Slack Export", action: "slack_sample", description: "Slack channels, message threads, mentions, and reactions" },
      { name: "Linear / Jira Export", action: "linear_sample", description: "Tickets, priorities, assignees, and system impact" },
      { name: "ADR / RFC Markdown", action: "adr", description: "Architecture Decision Records with bitemporal supersedes links" },
    ],
  });
}
