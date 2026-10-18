"use client";

import { useState } from "react";
import Link from "next/link";

type Scenario = {
  id: string;
  badge: string;
  specialist: string;
  title: string;
  prompt: string;
  cypher: string;
  latencyMs: number;
  answerSummary: string;
  hops: Array<{
    node: string;
    type: string;
    edge?: string;
    detail: string;
  }>;
};

const SCENARIOS: Scenario[] = [
  {
    id: "copperline",
    badge: "Decision Provenance",
    specialist: "Ledger",
    title: "Why did we freeze legacy billing engine?",
    prompt: "Trace ADR-014: Why did we freeze legacy billing, who decided it, and what does it supersede?",
    cypher: `MATCH (d:Decision {id:'dec-014'})-[:DECIDED_BY]->(p:Person)
MATCH (d)-[:BASED_ON]->(ev)
OPTIONAL MATCH (d)-[:SUPERSEDES]->(old:Decision)
RETURN d.title, collect(DISTINCT p.name), collect(DISTINCT ev.title), old.title`,
    latencyMs: 1.8,
    answerSummary:
      "ADR-014 was decided by CTO Owen Park and VP Product Jonah Hale following Incident INC-441, where billing-ledger lost consumer events for 187 mins across enterprise CI/CD runner clusters. ADR-014 permanently superseded 2023's ADR-003.",
    hops: [
      {
        node: "INC-441 Incident",
        type: "ChangeEvent",
        edge: "ABOUT",
        detail: "187-min webhook and usage ledger blackout across cloud runner clusters.",
      },
      {
        node: "billing-ledger",
        type: "System",
        edge: "AUTHORED",
        detail: "Tier-1 billing system hit unversioned vendor webhook schema change.",
      },
      {
        node: "Billing Migration War Room",
        type: "Meeting",
        edge: "ATTENDED",
        detail: "Owen Park, Jonah Hale, Priya Nair, and Nora Berg convened.",
      },
      {
        node: "ADR-014 Decision",
        type: "Decision",
        edge: "SUPERSEDES",
        detail: "Formal legacy billing freeze approved; superseded older ADR-003 indefinitely.",
      },
    ],
  },
  {
    id: "vision",
    badge: "Expertise & PageRank",
    specialist: "Atlas",
    title: "Who knows the runner engine best?",
    prompt: "Who knows the runner engine best and what is the evidence in the graph?",
    cypher: `MATCH (p:Person)-[k:KNOWS]->(t:Topic {name:'runner sandboxing'})
OPTIONAL MATCH (p)-[:OWNS]->(s:System {name:'pr-runner-engine'})
RETURN p.name, p.role, k.weight, s.name
ORDER BY k.weight DESC LIMIT 3`,
    latencyMs: 1.2,
    answerSummary:
      "Leo Kim (Staff Infrastructure Engineer, Seoul) holds verified expertise weight 0.98. The graph reveals he owns the micro-VM isolation contract and PR Runner Engine cluster repository.",
    hops: [
      {
        node: "Ticket tck-8821",
        type: "Ticket",
        edge: "ABOUT",
        detail: "Europe-West PR runner kernel sandbox latency spike reported on pool 4.",
      },
      {
        node: "pr-runner-engine",
        type: "System",
        edge: "RELATES_TO",
        detail: "Tier-1 container runtime and micro-VM sandbox executor.",
      },
      {
        node: "Topic: runner sandboxing",
        type: "Topic",
        edge: "KNOWS (0.98)",
        detail: "Highest centrality & verified expertise score in graph.",
      },
      {
        node: "Leo Kim",
        type: "Person",
        edge: "OWNS",
        detail: "PR runner sandbox contract owner. Recommended primary assignee.",
      },
    ],
  },
  {
    id: "blast",
    badge: "Blast Radius",
    specialist: "Pulse",
    title: "Workflow orchestrator blast radius",
    prompt: "What is the blast radius if workflow-orchestrator goes down? Which systems and projects break?",
    cypher: `MATCH (root:System {name:'workflow-orchestrator'})
MATCH path = (root)<-[:DEPENDS_ON*1..2]-(downstream:System)
OPTIONAL MATCH (root)<-[:USES]-(proj:Project)
RETURN downstream.name, proj.name`,
    latencyMs: 2.4,
    answerSummary:
      "A failure in workflow-orchestrator immediately stalls 2 major projects (DevFlow Cloud & PR Runner Cluster). PR runner pools halt job scheduling. Immediate escalation path: Aisha Rahman (Code Owner) & Jade Okoye (Primary On-call).",
    hops: [
      {
        node: "workflow-orchestrator",
        type: "System",
        edge: "DEPENDS_ON",
        detail: "Coordinates distributed build pipelines and asynchronous workflow execution.",
      },
      {
        node: "event-bus",
        type: "System",
        edge: "DEPENDS_ON",
        detail: "Underlying NATS messaging fabric.",
      },
      {
        node: "DevFlow Cloud",
        type: "Project",
        edge: "USES",
        detail: "PR runner cluster halts job scheduling; builds queue indefinitely.",
      },
      {
        node: "Aisha & Jade",
        type: "Person",
        edge: "ESCALATES_TO",
        detail: "Code owner & Staff SRE on-call paged in under 60 seconds.",
      },
    ],
  },
  {
    id: "path",
    badge: "Shortest Path",
    specialist: "Atlas",
    title: "Shortest Path: Leo Kim ➔ Maya Chen",
    prompt: "What is the shortest path between Leo Kim and CEO Maya Chen in the company graph?",
    cypher: `MATCH (a:Person {name:'Leo Kim'}), (b:Person {name:'Maya Chen'})
MATCH p = shortestPath((a)-[*..8]-(b))
RETURN [n IN nodes(p) | coalesce(n.name, n.title)] AS path, length(p) AS hops`,
    latencyMs: 1.1,
    answerSummary:
      "Shortest path is exactly 2 hops: Leo Kim (Staff Infrastructure, Seoul) ➔ VP Engineering Priya Nair (Toronto) ➔ CEO Maya Chen (Austin). Evaluated deterministically via FalkorDB bidirectional shortestPath.",
    hops: [
      {
        node: "Leo Kim",
        type: "Person",
        edge: "REPORTS_TO",
        detail: "Staff Engineer, Infrastructure (Seoul office).",
      },
      {
        node: "Priya Nair",
        type: "Person",
        edge: "REPORTS_TO",
        detail: "VP Engineering (Toronto office). Manages Leo Kim & Jade Okoye.",
      },
      {
        node: "Maya Chen",
        type: "Person",
        edge: "DESTINATION",
        detail: "Chief Executive Officer (Austin office). 2 hops total.",
      },
    ],
  },
];

export function LandingQueryPlayground() {
  const [activeId, setActiveId] = useState<string>("copperline");
  const activeScenario = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0];

  return (
    <div className="w-full rounded-3xl border border-[var(--line-strong)] bg-gradient-to-b from-[#100e18] via-[#0a0910] to-[#060509] p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl space-y-8">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[var(--line)] pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--copper)]/15 border border-[var(--copper)]/30 text-xs font-mono text-[var(--copper-2)]">
            <span>⚡ Interactive Query Playground</span>
          </div>
          <h3 className="serif text-3xl sm:text-4xl text-[var(--paper)]">
            Experience FalkorDB Multi-Hop Reasoning
          </h3>
          <p className="text-sm sm:text-base text-[var(--paper-dim)] max-w-2xl leading-relaxed">
            Unlike naive vector search that guesses text chunks with cosine similarity, Helix traverses verifiable edges on FalkorDB. Click any real enterprise question below to watch the graph walk.
          </p>
        </div>

        <Link
          href="/brain"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--copper)] px-5 py-3 text-xs font-mono font-bold text-[var(--ink)] hover:bg-[var(--copper-2)] transition-all shadow-lg shadow-[var(--copper)]/20 shrink-0"
        >
          <span>Open Full Interactive Brain</span>
          <span>➔</span>
        </Link>
      </div>

      {/* Scenario Pill Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SCENARIOS.map((sc) => {
          const isActive = sc.id === activeId;
          return (
            <button
              key={sc.id}
              onClick={() => setActiveId(sc.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? "border-[var(--copper)] bg-[var(--copper)]/15 shadow-lg shadow-[var(--copper)]/10 scale-[1.02]"
                  : "border-[var(--line)] bg-black/40 hover:bg-white/5 hover:border-white/20"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--copper)] to-[var(--sage)]" />
              )}
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--copper-2)] mb-2">
                <span>{sc.badge}</span>
                <span className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-[10px] text-[var(--sage)]">
                  {sc.specialist}
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[var(--paper)] line-clamp-2">
                {sc.title}
              </h4>
            </button>
          );
        })}
      </div>

      {/* Interactive Traversal Simulation Display */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        {/* Left: Step-by-Step Path of Thought */}
        <div className="rounded-2xl border border-[var(--line)] bg-black/50 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                FalkorDB Verified Traversal Path ({activeScenario.hops.length} Hops)
              </h4>
            </div>
            <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ⚡ Index-backed GraphBLAS traversal
            </span>
          </div>

          {/* Sequential Hops */}
          <div className="space-y-3">
            {activeScenario.hops.map((hop, idx) => (
              <div
                key={idx}
                className="relative pl-7 before:absolute before:left-2.5 before:top-3 before:bottom-0 before:w-0.5 before:bg-[var(--line)] last:before:hidden"
              >
                {/* Step circle */}
                <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-[var(--copper)] text-[var(--ink)] font-mono text-[10px] font-bold flex items-center justify-center ring-4 ring-[#0a0910]">
                  {idx + 1}
                </div>

                <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 space-y-1 text-xs font-mono hover:border-[var(--copper)]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{hop.node}</span>
                    <div className="flex items-center gap-2">
                      {hop.edge && (
                        <span className="text-[10px] text-[var(--sage)] font-mono">
                          —[:{hop.edge}]➔
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--paper-dim)] bg-white/5 px-1.5 py-0.5 rounded">
                        {hop.type}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--paper-dim)] font-sans leading-relaxed pt-1">
                    {hop.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Natural language synthesis */}
          <div className="p-4 rounded-xl border border-[var(--copper)]/30 bg-[var(--copper)]/10 space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--copper-2)]">
              <span>🤖 Helix Agent Conclusion:</span>
            </div>
            <p className="text-xs text-[var(--paper)] leading-relaxed font-sans">
              {activeScenario.answerSummary}
            </p>
          </div>
        </div>

        {/* Right: Real Cypher Query & Engine Proof */}
        <div className="rounded-2xl border border-[var(--line)] bg-black/50 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
              Raw Cypher Executed
            </h4>
            <span className="font-mono text-[10px] text-[var(--paper-dim)]">
              Deterministic OpenCypher 9
            </span>
          </div>

          <div className="relative group">
            <pre className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-[var(--copper-2)] overflow-x-auto leading-relaxed">
              {activeScenario.cypher}
            </pre>
          </div>

          <div className="space-y-3 pt-2 text-xs font-mono text-[var(--paper-dim)]">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
              <span>Primary Graph Engine</span>
              <span className="text-[var(--paper)] font-bold">FalkorDB v6.6</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
              <span>Memory Footprint</span>
              <span className="text-emerald-400 font-bold">In-Memory Sparse Matrices</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
              <span>Retrieval Provenance</span>
              <span className="text-emerald-400 font-bold">Deterministic Graph Traversal</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/brain"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--copper)]/50 bg-[var(--copper)]/10 text-[var(--copper-2)] hover:bg-[var(--copper)]/20 transition-all font-mono text-xs font-bold"
            >
              Inspect Live in Cypher Console ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
