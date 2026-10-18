import Link from "next/link";
import { HeroGraphCanvas } from "@/components/HeroGraphCanvas";
import { LandingQueryPlayground } from "@/components/LandingQueryPlayground";

export default function HomePage() {
  return (
    <div className="relative min-h-screen text-[var(--paper)] selection:bg-[var(--copper)] selection:text-[var(--ink)]">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24 pt-4 sm:pt-6">
        {/* ========================================================================= */}
        {/* HERO SECTION (100% ABOVE THE FOLD IN SINGLE VIEWPORT)                     */}
        {/* ========================================================================= */}
        <section className="relative pt-2 sm:pt-4 pb-8 sm:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-8 lg:gap-12 items-center">
            {/* Left Column: Proposition, CTAs, and Integrated Telemetry HUD */}
            <div className="space-y-6">
              {/* Brand Logo inside Hero */}
              <div className="pb-1">
                <Link href="/" className="inline-flex items-center gap-3 group">
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--copper)]/30 via-black to-black border border-[var(--copper)]/40 shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-transform group-hover:scale-105">
                    <span className="font-mono text-base font-bold text-[var(--copper-2)]">H</span>
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold tracking-[0.2em] text-white">HELIX</span>
                      <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full bg-[var(--copper)]/15 text-[var(--copper-2)] border border-[var(--copper)]/30">
                        Company Brain
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--paper-dim)] font-mono">FalkorDB Context Layer</div>
                  </div>
                </Link>
              </div>

              <h1 className="serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.04] tracking-tight text-white">
                The company brain that{" "}
                <span className="text-gradient-copper italic font-normal">actually reasons</span>.
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-[var(--paper-dim)] leading-relaxed font-sans max-w-xl">
                Helix turns scattered tribal knowledge into an in-memory knowledge graph on{" "}
                <strong className="text-white font-semibold">FalkorDB</strong>. Five collaborative agents walk typed edges in microseconds to trace decisions, assess outage blast radius, and route tickets with{" "}
                <strong className="text-emerald-400 font-semibold">provable graph grounding</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/brain"
                  className="btn-primary rounded-xl px-7 py-3.5 text-xs sm:text-sm font-mono font-bold flex items-center gap-2.5 shadow-xl shadow-[var(--copper)]/20"
                >
                  <span>Enter The Brain</span>
                  <span>➔</span>
                </Link>
                <a
                  href="#features"
                  className="btn-secondary rounded-xl px-6 py-3.5 text-xs sm:text-sm font-mono font-semibold flex items-center gap-2"
                >
                  <span>Explore Features</span>
                  <span className="text-xs">↓</span>
                </a>
              </div>

              {/* Compact Telemetry Strip (Integrated seamlessly above the fold) */}
              <div className="pt-4 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: "Graph Nodes", val: "80+", sub: "In-memory entities", color: "text-[var(--copper-2)]" },
                  { label: "Semantic Edges", val: "150+", sub: "Typed relationships", color: "text-[var(--sage)]" },
                  { label: "FalkorDB Latency", val: "Sub-5ms", sub: "Index-backed queries", color: "text-emerald-400" },
                  { label: "Provenance Grounding", val: "Verifiable", sub: "Direct Cypher proof", color: "text-purple-400" },
                ].map((m, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono">
                    <div className={`text-base sm:text-lg font-bold ${m.color}`}>{m.val}</div>
                    <div className="text-[10px] text-[var(--paper-dim)] font-sans">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Physical Graph Canvas Simulation */}
            <div className="w-full">
              <HeroGraphCanvas />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE QUERY PLAYGROUND SECTION                                      */}
        {/* ========================================================================= */}
        <section id="playground" className="scroll-mt-24">
          <LandingQueryPlayground />
        </section>

        {/* ========================================================================= */}
        {/* 7 BREAKTHROUGH FEATURES BENTO GRID                                        */}
        {/* ========================================================================= */}
        <section id="features" className="scroll-mt-24 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--copper)]">
              Enterprise Graph Engineering
            </p>
            <h2 className="serif text-4xl sm:text-5xl text-[var(--paper)]">
              7 World-Class Innovations Powered by FalkorDB
            </h2>
            <p className="text-sm sm:text-base text-[var(--paper-dim)]">
              Engineered from the ground up to solve the most difficult enterprise knowledge dilemmas: knowledge silos, unversioned architectural decisions, and undetected single points of failure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Path of Thought */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">✨</span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Feature 1
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Path-of-Thought Visualizer
                </h3>
                <p className="text-xs text-[var(--paper-dim)] leading-relaxed font-sans">
                  Watch the agent physically traverse nodes and edges on FalkorDB with glowing laser pulses, traveling photons, and narrated step-by-step reasoning playback.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-[var(--sage)]">
                ● Autoplay, scrub controls, and hop explanation HUD
              </div>
            </div>

            {/* Card 2: What-If Simulator */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🔮</span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Feature 3
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  What-If Resilience Simulator
                </h3>
                <p className="text-xs text-[var(--paper-dim)] leading-relaxed font-sans">
                  Simulate employee departures or re-orgs. Computes single-point-of-failure (SPOF) risk scores (0-100), reveals orphaned systems, and proposes automated succession reassignments.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-purple-300">
                ● 1-Click succession write-back to FalkorDB
              </div>
            </div>

            {/* Card 3: Time Machine */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">⏱️</span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Feature 4
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Time-Machine Decision Slider
                </h3>
                <p className="text-xs text-[var(--paper-dim)] leading-relaxed font-sans">
                  Scrub across historical eras (2022 to present). Inspect how company architecture, ADRs, and team structures mutated, and how past decisions were superseded.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-cyan-300">
                ● Historical diffs with exact Cypher mutations
              </div>
            </div>

            {/* Card 4: Autonomous Sentinel */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🛡️</span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Feature 5
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Autonomous Graph Sentinel
                </h3>
                <p className="text-xs text-[var(--paper-dim)] leading-relaxed font-sans">
                  Continuous self-healing graph health auditor. Detects orphaned tier-1 systems, deprecated runbooks, knowledge silos, and unrouted P1 tickets with 1-click auto-repair.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-rose-300">
                ● Instant self-healing graph mutation fixes
              </div>
            </div>

            {/* Card 5: Live Activity Stream */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">⚡</span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Feature 6
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Bi-Directional Activity Stream
                </h3>
                <p className="text-xs text-[var(--paper-dim)] leading-relaxed font-sans">
                  Simulate enterprise events from Slack (#incidents), Jira tickets, and GitHub PR merges that automatically extract entities and write live Cypher mutations directly to FalkorDB.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-cyan-300">
                ● Sub-second live ingestion & auto-streaming
              </div>
            </div>

            {/* Card 6: Model Context Protocol */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🔌</span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Feature 2
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Universal MCP Server (/api/mcp)
                </h3>
                <p className="text-xs text-[var(--paper-dim)] leading-relaxed font-sans">
                  Official JSON-RPC 2.0 Model Context Protocol endpoint. External IDEs (Claude Desktop, Cursor, Gemini tools) can query who knows what, trace decisions, and execute Cypher directly.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-blue-300">
                ● Ready for claude_desktop_config.json
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* THE 5 SPECIALIST AGENTS SECTION                                           */}
        {/* ========================================================================= */}
        <section id="specialists" className="scroll-mt-24 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--copper)]">
              Multi-Agent Architecture
            </p>
            <h2 className="serif text-4xl sm:text-5xl text-[var(--paper)]">
              Five Autonomous Specialists. One Living Graph.
            </h2>
            <p className="text-sm sm:text-base text-[var(--paper-dim)]">
              Instead of a monolithic prompt, Helix delegates queries to specialized agent personas that share state, cross-reference Cypher results, and synthesize verifiable enterprise conclusions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                name: "Atlas",
                title: "Org & Expertise",
                badge: "PageRank Centrality",
                color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
                desc: "Evaluates KNOWS edges, PageRank centrality, and shortest paths to find verified human experts without bias.",
                tools: "who_knows, org_path, shortest_path",
              },
              {
                name: "Ledger",
                title: "Decisions & Provenance",
                badge: "ADR Lineage",
                color: "border-purple-500/40 text-purple-400 bg-purple-500/10",
                desc: "Traces DECIDED_BY, BASED_ON, and SUPERSEDES relationships to verify why choices were made and what older records they overturn.",
                tools: "trace_decision, verify_audit, export_dossier",
              },
              {
                name: "Pulse",
                title: "Blast & Freshness",
                badge: "System Resilience",
                color: "border-rose-500/40 text-rose-400 bg-rose-500/10",
                desc: "Performs transitive DEPENDS_ON* walks to calculate catastrophic blast radius and flags outdated runbooks.",
                tools: "blast_radius, stale_docs, spof_audit",
              },
              {
                name: "Dispatch",
                title: "Work Routing",
                badge: "Ticket Assignee",
                color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
                desc: "Inspects incoming incident tickets, examines affected systems, and matches highest-weighted code owners quantitatively.",
                tools: "route_ticket, score_assignee, auto_assign",
              },
              {
                name: "Helix",
                title: "Orchestrator & Memory",
                badge: "Multi-Agent State",
                color: "border-[var(--copper)]/40 text-[var(--copper-2)] bg-[var(--copper)]/10",
                desc: "Coordinates multi-specialist debate, synthesizes cross-domain traces, and commits conversation memories back to FalkorDB.",
                tools: "orchestrate, store_memory, recall_context",
              },
            ].map((ag) => (
              <div
                key={ag.name}
                className="glass-card rounded-2xl p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-white">{ag.name}</h4>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${ag.color}`}>
                      {ag.badge}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[var(--copper-2)]">{ag.title}</div>
                  <p className="text-xs text-[var(--paper-dim)] font-sans leading-relaxed">
                    {ag.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/5 font-mono text-[10px] text-[var(--paper-dim)]/70">
                  Tools: {ag.tools}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CALL TO ACTION FINALE                                                     */}
        {/* ========================================================================= */}
        <section className="rounded-3xl border border-[var(--copper)]/50 bg-gradient-to-b from-[#1c1424] via-[#100d18] to-[#07060a] p-8 sm:p-12 lg:p-16 text-center space-y-6 shadow-2xl shadow-[var(--copper)]/10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--copper)]/40 bg-[var(--copper)]/15 px-4 py-1.5 text-xs font-mono text-[var(--copper-2)]">
            <span>Ready to explore the graph?</span>
          </div>

          <h2 className="serif text-4xl sm:text-5xl md:text-6xl text-white max-w-2xl mx-auto leading-tight">
            Step inside DevFlow. The graph is alive.
          </h2>

          <p className="text-sm sm:text-base text-[var(--paper-dim)] max-w-xl mx-auto font-sans leading-relaxed">
            Test multi-hop reasoning, inspect Cypher queries, simulate employee departures, scrub historical decisions, and audit graph health in real time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/brain"
              className="btn-primary rounded-2xl px-10 py-4 text-base font-mono font-bold flex items-center gap-3 shadow-2xl"
            >
              <span>Launch Helix Company Brain</span>
              <span>➔</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Global Modern Footer */}
      <footer className="mt-24 border-t border-[var(--line)] bg-[#050407] py-12 text-xs font-mono text-[var(--paper-dim)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] text-sm font-bold text-[var(--copper)]">
              H
            </span>
            <div>
              <div className="text-white font-bold tracking-wider">HELIX COMPANY BRAIN</div>
              <div className="text-[10px]">In-Memory Knowledge Graph & Multi-Agent Context Layer</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/brain" className="hover:text-white transition-colors">
              Open Brain App
            </Link>
            <a
              href="https://www.falkordb.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--copper-2)] transition-colors"
            >
              Powered by FalkorDB ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
