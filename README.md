# 🧬 HELIX — Enterprise Company Brain
> *High-performance company graph on FalkorDB for autonomous agents, engineering teams, and incident response.*

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.1-black?logo=next.js)](https://nextjs.org/)
[![FalkorDB](https://img.shields.io/badge/FalkorDB-6.6.2-blueviolet)](https://falkordb.com/)
[![OpenCypher](https://img.shields.io/badge/Query_Language-OpenCypher-critical)](https://opencypher.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4.3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![MCP Server](https://img.shields.io/badge/Protocol-MCP_2024--11--05-cyan)](https://modelcontextprotocol.io/)
[![Google Gemini](https://img.shields.io/badge/LLM-Gemini_2.5_Flash-orange)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

---

## 🌟 Executive Summary

AI agents are only as good as the context they work with. Flat vector stores, disparate SQL tables, and isolated keyword searches cannot answer real organizational questions:
- *"Who owns this system, who understands its internals, and what is the verified evidence?"*
- *"Why did we freeze this billing vendor, who decided it, and what policies does that decision supersede?"*
- *"If this message queue partitions, which downstream services and worker clusters halt?"*
- *"If our lead infrastructure engineer departs tomorrow, what is our single-point-of-failure exposure?"*

**Helix** is a production-grade Company Brain. Helix unifies code ownership, team hierarchies, architectural decision records (ADRs), incident postmortems, Linear/Jira tickets, Slack discussions, and cognitive agent memories into a single, high-performance graph on **FalkorDB**.

### 🛡️ Ground Rules & Truth Guarantees
1. **Measured Reality Over Faked Constants:** Latencies, token counts, and graph traversal times shown in the UI are measured dynamically at runtime using `performance.now()`.
2. **Deterministic Context Over Guesswork:** Agents query structured relationships and bitemporal paths directly, eliminating multi-hop hallucination.
3. **No Silent Fallbacks:** The UI renders an active runtime status badge indicating whether you are connected to a live FalkorDB instance.
4. **Public `/trust` Registry:** Visit [`/trust`](http://localhost:3000/trust) at any time to inspect the implementation inventory, data provenance, and cryptographic audit proofs.

---

## 🏛️ The 5 Primary Surfaces

Helix consolidates enterprise workflows into 5 clean surfaces:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HELIX COMPANY BRAIN                             │
├──────────────┬──────────────┬──────────────┬─────────────┬─────────────┤
│   1. ASK     │  2. EXPLORE  │    3. ACT    │  4. TRUST   │ 5. OPERATE  │
│  (Chat,      │  (Topology,  │  (PR Triage, │  (Evals,    │  (Ingest,   │
│  Grounding,  │  Time-Machine│  Connected   │  Audit &    │  Sentinel,  │
│  Citations)  │  & SPOF)     │  & Swarm)    │  Red Team)  │  Tenants)   │
└──────────────┴──────────────┴──────────────┴─────────────┴─────────────┘
```

### 1. `ASK` — Multi-Entity Grounded Intelligence
- **5 Coordinated Domain Specialists:** Orchestrator (Helix), Org & Expertise (Atlas), Decision Provenance (Ledger), Freshness & Blast Radius (Pulse), and Work Routing (Dispatch).
- **Grounded Answer Contract:** Every statement is verified against retrieved graph nodes (`coverageScorePercent`). Unsupported claims trigger an explicit, honest refusal with missing evidence requirements.
- **Path-of-Thought Visualizer:** Force-directed graph canvas highlighting exact multi-hop reasoning paths.

### 2. `EXPLORE` — Topology, Time & Single-Point-of-Failure
- **Interactive Force Graph:** Physics-driven exploration of people, teams, systems, decisions, and dependencies.
- **What-If Departure Simulator (SPOF):** Simulates what happens if key engineers depart—calculates orphaned critical systems and generates succession recommendations.
- **Time Machine Slider:** Bitemporal graph scrubber tracing how architecture decisions evolve across time.
- **Graph Algorithms Lab:** Live executions of PageRank, Betweenness Centrality, and Shortest Path.

### 3. `ACT` — Real Connected Data Actions
- **PR Triage in Org Context:** Ingests GitHub PRs (e.g. `vercel/next.js`), traverses downstream `DEPENDS_ON` topologies, validates bitemporal ADR policies, filters bot accounts, and ranks expert reviewers.
- **Human-In-The-Loop Approval Gate:** Inspect proposed mutations before execution.
- **Allowlist Security Lockdown:** Strict enforcement preventing mutations to any repo other than `GITHUB_WRITE_REPO`.
- **Cryptographic Audit Chain & 1-Click Undo:** Every mutation produces a SHA-256 hash-chained receipt (`hash(prev + payload)`), backed by automated compensating transactions.
- **Autonomous Incident Swarm:** Multi-agent emergency containment with sub-10ms response time.

### 4. `TRUST` — Empirical Verification & Red-Team Security
- **Golden Evaluation Harness:** 60 programmatic benchmark scenarios verifying 1-hop, multi-hop, supersession, negation, and refusal correctness.
- **Red Team Security Battery:** Proves FalkorDB multigraph tenant isolation, blocks prompt-injected destructive Cypher (`validateCypherSafety`), and tests write-repo breakout attempts.
- **Cognitive Memory Lifecycle:** Evaluates multi-session retention and token savings across `:Episodic`, `:Semantic`, and `:Procedural` agent memory layers.

### 5. `OPERATE` — Multi-Source Ingestion & Enterprise Operations
- **Universal Ingest Studio:** Connectors for GitHub repositories, Slack exports, Jira/Linear issue exports, and ADR Markdown documents.
- **Entity Resolution Engine:** Unifies GitHub logins, commit author emails, and Slack usernames with reviewable merge logs and 1-click unmerge.
- **Health Sentinel:** Continuous audit scanning for orphaned systems, stale runbooks, and unassigned P1 tickets with 1-click auto-healing.
- **Multi-Tenant FalkorDB Isolation:** Separate graph keys per tenant (`github-production` default, `forgeworks-demo` guided tour).

---

## 🏗️ Architecture Diagram

```mermaid
flowchart TD
    User["👤 Human Operator / Engineer"] --> UI["💻 Next.js 16 App Router UI (5 Primary Hubs)"]
    MCPClient["🔌 Claude Desktop / Cursor"] -->|JSON-RPC 2.0| MCPServer["🔌 MCP Endpoint (/api/mcp)"]
    GitHubWebhook["⚡ GitHub Webhook (/api/webhooks/github)"] -->|HMAC-SHA256| Ingest["📥 Real-Time Ingest Pipeline"]

    subgraph "Agent & Governance Layer"
        UI --> API["API Layer (/api/agent/chat, /api/actions/triage, /api/eval)"]
        API --> Dispatcher["🛡️ Action Dispatcher (Allowlist + HITL Gate)"]
        API --> Grounding["🔍 Grounding Verifier (0-100% Coverage & Honest Refusal)"]
        API --> Memory["🧠 Memory Consolidation (Episodic · Semantic · Procedural)"]
    end

    subgraph "FalkorDB Graph Context Layer (Hot Path of Every Step)"
        Dispatcher --> FalkorDB[("🟣 FalkorDB Graph Engine (multigraph)")]
        Grounding --> FalkorDB
        Memory --> FalkorDB
        Ingest --> FalkorDB
    end

    subgraph "Multigraph Tenant Isolation"
        FalkorDB --> Tenant1["📊 github-production (Production Graph)"]
        FalkorDB --> Tenant2["🤖 forgeworks-demo (Demo Graph)"]
        FalkorDB --> Tenant3["🔐 tenant-isolated-sandbox"]
    end

    subgraph "External Mutation Targets"
        Dispatcher -->|GITHUB_WRITE_REPO Only| WriteRepo["🐙 GitHub Issues & PR Reviews"]
        Dispatcher -->|Outbound Webhook| Discord["💬 Discord / Slack Channel"]
    end
```

---

## ⚡ Quickstart Guide

### Prerequisites
- **Node.js 20+**
- **Docker** (for local FalkorDB container) *OR* a **FalkorDB Cloud** instance

### 1. Clone & Install
```bash
git clone https://github.com/napraveen/Helix.git
cd Helix
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your FalkorDB connection in `.env.local`:
```env
# Option A: Local Docker (Default)
FALKORDB_HOST=127.0.0.1
FALKORDB_PORT=6379
FALKORDB_GRAPH=helix

# Option B: FalkorDB Cloud (Uncomment if using cloud instance instead of Docker)
# FALKORDB_URL=falkor://username:password@your-cloud-instance.cloud:port

# Optional: Google Gemini API key for natural-language synthesis
# (If omitted, Helix still runs fully on deterministic OpenCypher query synthesis)
GEMINI_API_KEY=
```

### 3. Start FalkorDB & Seed the Graph
If using local Docker:
```bash
# Start local FalkorDB Docker container
npm run falkor:up
```

Seed the graph with the organizational dataset (people, teams, ADRs, systems, incident tickets, and dependencies):
```bash
npm run seed
```

### 4. Run Golden Evaluations (Optional)
```bash
# Run the 60-scenario programmatic golden evaluation harness
npm run eval
```

### 5. Launch the Web Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📊 Verification & Evaluation Results

### Golden Evaluation Harness (60 Scenarios)
Run anytime with `npm run eval` to inspect or regenerate `EVAL_REPORT.md`:

| Metric | Measured Score | Target | Status |
|---|---|---|---|
| **Ground-Truth Exact Match** | **100%** (60/60) | > 85% | ✓ PASSED |
| **Groundedness Score** | **95.7%** | > 90% | ✓ PASSED |
| **Citation Precision / Recall** | **95.5% / 94.0%** | > 85% | ✓ PASSED |
| **Refusal Correctness (Unsupported Queries)** | **100%** (8/8) | 100% | ✓ PASSED |
| **Bitemporal Supersession Precision** | **100%** (12/12) | > 90% | ✓ PASSED |
| **Multi-Hop Traversal Completeness** | **100%** (12/12) | > 90% | ✓ PASSED |
| **Average Query Latency (GraphBLAS)** | **1.2ms** | < 15ms | ✓ PASSED |

---

## 🔌 Model Context Protocol (MCP) Integration

Helix exposes an official MCP JSON-RPC 2.0 endpoint at `/api/mcp` for external agents (Claude Desktop, Cursor, Copilot).

### Configure Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "helix-company-brain": {
      "command": "npx",
      "args": ["-y", "tsx", "./scripts/mcp-server-stdio.ts"]
    }
  }
}
```

### Callable MCP Tools
- `who_knows`: Quantitatively ranks verified engineers for a topic or system using weighted `KNOWS` edges.
- `trace_decision`: Follows bitemporal decision provenance across `SUPERSEDES`, `BASED_ON`, and `DECIDED_BY` edges.
- `blast_radius`: Computes topological downstream systems affected by a proposed change or outage.
- `triage_pull_request`: Runs PR triage with blast radius, ADR invariants, and non-bot expert reviewer ranking.
- `run_graph_algorithm`: Executes native GraphBLAS algorithms (PageRank, Betweenness Centrality, Shortest Path).
- `get_knowledge_debt`: Identifies systems with bus factor of 1 and stale documentation.

---

## 📜 License

This project is licensed under the [Apache 2.0 License](./LICENSE).
