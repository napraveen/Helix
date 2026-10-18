import { NextResponse } from "next/server";
import { toolHandlers } from "@/lib/graph/tools";
import { simulateEmployeeDeparture } from "@/lib/graph/simulator";
import { runCypher } from "@/lib/falkor/run";

const MCP_TOOLS = [
  {
    name: "who_knows",
    description: "Query DevFlow company brain for verified domain experts with KNOWS weights and evidence.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic, skill, or system name (e.g. 'ci-cd pipelines', 'billing', 'secrets vault')" },
      },
      required: ["topic"],
    },
  },
  {
    name: "who_owns",
    description: "Determine who owns a specific project, system, document, or infrastructure service.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Name or ID of system, project, or document" },
      },
      required: ["q"],
    },
  },
  {
    name: "trace_decision",
    description: "Trace an Architecture Decision Record (ADR) back to original incident postmortems, meetings, chats, and superseded decisions.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Decision title or ID (e.g. 'ADR-014', 'Legacy Billing', 'Zero-Trust OIDC')" },
      },
      required: ["q"],
    },
  },
  {
    name: "blast_radius",
    description: "Compute downstream impact if a system fails by traversing DEPENDS_ON* and USES edges.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "System name (e.g. 'fleet-orchestrator', 'event-bus', 'auth-gateway')" },
      },
      required: ["q"],
    },
  },
  {
    name: "stale_knowledge",
    description: "Audit documentation freshness in FalkorDB; list runbooks and ADRs marked stale or superseded.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "route_work",
    description: "Quantitatively score and recommend engineer assignees for tickets using KNOWS and OWNS weights.",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket ID or description" },
      },
      required: ["ticketId"],
    },
  },
  {
    name: "simulate_departure",
    description: "Run What-If departure and Single Point of Failure (SPOF) analysis on an employee, generating an automated succession plan.",
    inputSchema: {
      type: "object",
      properties: {
        person: { type: "string", description: "Name or ID of employee (e.g. 'Leo Kim', 'Aisha Rahman')" },
      },
      required: ["person"],
    },
  },
  {
    name: "run_cypher",
    description: "Execute a custom OpenCypher query directly against FalkorDB with read-only optimization.",
    inputSchema: {
      type: "object",
      properties: {
        cypher: { type: "string", description: "Valid OpenCypher query string" },
      },
      required: ["cypher"],
    },
  },
  {
    name: "triage_pull_request",
    description: "Triage a GitHub pull request in live organizational context. Computes blast radius across DEPENDS_ON edges, ranks verified non-bot expert reviewers, and verifies ADR invariants.",
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
    description: "Execute mathematical graph algorithms (PageRank, Betweenness Centrality, Dijkstra Shortest Path, Louvain Community Detection) over active company topology.",
    inputSchema: {
      type: "object",
      properties: {
        algorithm: { type: "string", enum: ["pagerank", "betweenness", "communities", "shortest_path"], description: "Algorithm to evaluate" },
        from: { type: "string", description: "Source node for shortest path" },
        to: { type: "string", description: "Target node for shortest path" },
      },
      required: ["algorithm"],
    },
  },
  {
    name: "get_knowledge_debt",
    description: "Audit organizational knowledge debt, bus-factor risks, stale runbooks, and contradictory assertions.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

const MCP_RESOURCES = [
  {
    uri: "helix://adr/014",
    name: "ADR-014: Freeze Legacy Billing Engine",
    description: "Active architecture decision record freezing legacy billing ledger after INC-441 webhook outage.",
    mimeType: "application/json",
  },
  {
    uri: "helix://adr/021",
    name: "ADR-021: Mandatory Zero-Trust OIDC Workload Identity",
    description: "Decision mandating short-lived OIDC tokens and cryptographic artifact signing across all runner clusters.",
    mimeType: "application/json",
  },
  {
    uri: "helix://system/workflow-orchestrator",
    name: "System: workflow-orchestrator",
    description: "Tier-1 pipeline workflow engine. Criticality: critical. Owns: Aisha Rahman, Jade Okoye.",
    mimeType: "application/json",
  },
  {
    uri: "helix://system/pr-runner-engine",
    name: "System: pr-runner-engine",
    description: "Isolated micro-VM PR runner execution cluster. Criticality: high. Owns: Leo Kim.",
    mimeType: "application/json",
  },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, method, params } = body;

    // 1. Initialize
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
          serverInfo: {
            name: "helix-company-brain-mcp",
            version: "1.0.0",
          },
        },
      });
    }

    // 2. Tools List
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: MCP_TOOLS },
      });
    }

    // 3. Tools Call
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments ?? {};

      if (toolName === "simulate_departure") {
        const result = await simulateEmployeeDeparture(String(args.person ?? "Leo Kim"));
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          },
        });
      }

      if (toolName === "run_cypher") {
        const result = await runCypher(String(args.cypher), undefined, true);
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
          },
        });
      }

      if (toolName === "triage_pull_request") {
        const { triagePullRequestInContext } = await import("@/lib/actions/pr-triage");
        const dossier = await triagePullRequestInContext(
          String(args.prUrl || "https://github.com/vercel/next.js/pull/71542")
        );
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(dossier, null, 2) }] },
        });
      }

      if (toolName === "run_graph_algorithm") {
        const { runFalkorAlgorithm } = await import("@/lib/graph/algorithms");
        const algoResult = await runFalkorAlgorithm(args.algorithm as any, {
          from: args.from ? String(args.from) : undefined,
          to: args.to ? String(args.to) : undefined,
        });
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(algoResult, null, 2) }] },
        });
      }

      if (toolName === "get_knowledge_debt") {
        const { getKnowledgeDebtLedger, SAMPLE_CONTRADICTIONS } = await import(
          "@/lib/graph/contradiction-engine"
        );
        const debt = getKnowledgeDebtLedger();
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { knowledgeDebtLedger: debt, contradictions: SAMPLE_CONTRADICTIONS },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      const handler = toolHandlers[toolName];
      if (!handler) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Tool not found: ${toolName}` },
        });
      }

      const out = await handler(args);
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(out.data, null, 2),
            },
          ],
        },
      });
    }

    // 4. Resources List
    if (method === "resources/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { resources: MCP_RESOURCES },
      });
    }

    // 5. Resources Read
    if (method === "resources/read") {
      const uri = params?.uri;
      if (uri === "helix://adr/014") {
        const out = await toolHandlers.trace_decision({ q: "Copperline" });
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{ uri, mimeType: "application/json", text: JSON.stringify(out.data, null, 2) }],
          },
        });
      }
      if (uri === "helix://system/fleet-orchestrator") {
        const out = await toolHandlers.blast_radius({ q: "fleet-orchestrator" });
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{ uri, mimeType: "application/json", text: JSON.stringify(out.data, null, 2) }],
          },
        });
      }
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Resource not found: ${uri}` },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not supported: ${method}` },
    });
  } catch (error) {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: String(error) },
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    name: "Helix Company Brain MCP Server",
    protocolVersion: "2024-11-05",
    description: "Official Model Context Protocol (MCP) endpoint for FalkorDB Company Brain context.",
    endpoint: "/api/mcp",
    transport: "HTTP JSON-RPC 2.0 (compatible with Claude Desktop, Cursor, and custom agents)",
    availableTools: MCP_TOOLS.map((t) => t.name),
    sampleClaudeDesktopConfig: {
      mcpServers: {
        helix: {
          url: "http://localhost:3000/api/mcp",
          headers: { "Content-Type": "application/json" },
        },
      },
    },
  });
}
