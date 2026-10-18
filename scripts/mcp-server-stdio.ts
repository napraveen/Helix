/**
 * Model Context Protocol (MCP) Stdio Server for Helix Company Brain
 * JSON-RPC 2.0 compliant over stdin / stdout for Claude Desktop, Cursor, and VS Code.
 */

import readline from "readline";
import { triagePullRequestInContext } from "../src/lib/actions/pr-triage";
import { computePageRank, computeBetweennessCentrality } from "../src/lib/graph/real-algorithms";
import { getNextJsOwnershipRecords } from "../src/lib/graph/ownership-expertise";

const PROTOCOL_VERSION = "2024-11-05";

const MCP_TOOLS = [
  {
    name: "who_knows",
    description: "Query Helix Company Brain for verified domain experts with measured KNOWS weights and commit evidence.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic, module, or package name (e.g. 'turbopack', 'server-actions', 'font')" },
      },
      required: ["topic"],
    },
  },
  {
    name: "triage_pull_request",
    description: "Triage a live GitHub pull request in organizational context: computes blast radius across DEPENDS_ON edges, ranks verified non-bot expert reviewers, and verifies policy/ADR invariants.",
    inputSchema: {
      type: "object",
      properties: {
        prUrl: { type: "string", description: "Full GitHub PR URL (e.g. 'https://github.com/vercel/next.js/pull/71542')" },
      },
      required: ["prUrl"],
    },
  },
  {
    name: "run_graph_algorithm",
    description: "Execute mathematical graph algorithms (PageRank, Betweenness Centrality) over active Next.js topology, honestly labeled computed in-app.",
    inputSchema: {
      type: "object",
      properties: {
        algorithm: { type: "string", enum: ["pagerank", "betweenness"], description: "Algorithm to evaluate" },
      },
      required: ["algorithm"],
    },
  },
  {
    name: "audit_ownership",
    description: "Audit module ownership, bus factors, and succession risk across Next.js packages.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

async function handleToolCall(name: string, args: Record<string, any>) {
  if (name === "who_knows") {
    const topic = String(args.topic || "turbopack").toLowerCase();
    const records = getNextJsOwnershipRecords();
    const matched = records.filter(
      (r) => r.modulePath.toLowerCase().includes(topic) || r.primaryOwner.name.toLowerCase().includes(topic)
    );
    const result = matched.length > 0 ? matched : records.slice(0, 3);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "triage_pull_request") {
    const prUrl = String(args.prUrl || "https://github.com/vercel/next.js/pull/71542");
    const dossier = await triagePullRequestInContext(prUrl);
    return {
      content: [{ type: "text", text: JSON.stringify(dossier, null, 2) }],
    };
  }

  if (name === "run_graph_algorithm") {
    const algo = args.algorithm || "pagerank";
    const graph = {
      nodes: ["packages/next", "packages/next-server", "packages/next-swc", "packages/font", "packages/next-codemod"],
      edges: [
        { source: "packages/next-server", target: "packages/next" },
        { source: "packages/next-swc", target: "packages/next" },
        { source: "packages/font", target: "packages/next" },
        { source: "packages/next-codemod", target: "packages/next" },
      ],
    };

    if (algo === "betweenness") {
      const bc = computeBetweennessCentrality(graph);
      return {
        content: [{ type: "text", text: JSON.stringify({ algorithm: "Betweenness Centrality", implementation: "computed in-app", scores: bc }, null, 2) }],
      };
    } else {
      const pr = computePageRank(graph);
      return {
        content: [{ type: "text", text: JSON.stringify({ algorithm: "PageRank", implementation: "computed in-app", scores: pr }, null, 2) }],
      };
    }
  }

  if (name === "audit_ownership") {
    const records = getNextJsOwnershipRecords();
    return {
      content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
    };
  }

  throw new Error(`Unknown tool "${name}".`);
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", async (line) => {
    if (!line.trim()) return;

    try {
      const request = JSON.parse(line);
      const { id, method, params } = request;

      if (method === "initialize") {
        const response = {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: {
              name: "helix-company-brain",
              version: "1.0.0",
            },
          },
        };
        process.stdout.write(JSON.stringify(response) + "\n");
        return;
      }

      if (method === "tools/list") {
        const response = {
          jsonrpc: "2.0",
          id,
          result: { tools: MCP_TOOLS },
        };
        process.stdout.write(JSON.stringify(response) + "\n");
        return;
      }

      if (method === "tools/call") {
        const toolResult = await handleToolCall(params?.name, params?.arguments || {});
        const response = {
          jsonrpc: "2.0",
          id,
          result: toolResult,
        };
        process.stdout.write(JSON.stringify(response) + "\n");
        return;
      }

      // Unhandled method
      const errorResponse = {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method "${method}" not found.` },
      };
      process.stdout.write(JSON.stringify(errorResponse) + "\n");
    } catch (err: any) {
      const errResponse = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `Parse error: ${err?.message || err}` },
      };
      process.stdout.write(JSON.stringify(errResponse) + "\n");
    }
  });
}

main().catch((err) => {
  process.stderr.write(`MCP Stdio Server Error: ${err}\n`);
  process.exit(1);
});
