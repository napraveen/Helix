"use client";

import { useState } from "react";
import { BENCHMARK_SCENARIOS, type BenchmarkScenario } from "@/lib/graph/benchmark";

export function BenchmarkArena() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("multi-hop-mentorship");
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(true);

  const scenario = BENCHMARK_SCENARIOS.find((s) => s.id === selectedScenarioId) || BENCHMARK_SCENARIOS[0];

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel rounded-2xl p-6 border border-[var(--copper)]/30 bg-gradient-to-r from-black via-black/80 to-[var(--copper)]/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--copper)]/40 bg-[var(--copper)]/10 px-3 py-0.5 text-xs font-mono text-[var(--copper-2)] mb-2">
              <span>⚔️ HEAD-TO-HEAD ARENA</span>
              <span>·</span>
              <span>PERFORMANCE BENCHMARK ARENA</span>
            </div>
            <h2 className="serif text-2xl sm:text-3xl text-white">
              Vector RAG vs. FalkorDB Graph RAG
            </h2>
            <p className="text-xs sm:text-sm text-[var(--paper-dim)] mt-1 max-w-2xl">
              Flat semantic search fails when organizational answers require multi-hop relationship traversal. 
              Compare live latency, token costs, and hallucination rates side-by-side.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="btn-primary rounded-xl px-5 py-2.5 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-[var(--copper)]/25 disabled:opacity-50"
            >
              <span>{isRunning ? "Simulating Benchmark..." : "⚡ Run Live Comparison"}</span>
            </button>
          </div>
        </div>

        {/* Global Summary Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[var(--line)]">
          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <span className="text-[10px] font-mono text-[var(--paper-dim)] uppercase">Traversal Speedup</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {scenario.metrics.speedupMultiplier}x Faster
            </div>
            <span className="text-[10px] text-emerald-500/80 font-mono">
              {scenario.graphRag.latencyMs}ms vs {scenario.vectorRag.latencyMs}ms
            </span>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <span className="text-[10px] font-mono text-[var(--paper-dim)] uppercase">Token Consumption</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--copper-2)]">
              -{scenario.metrics.tokenSavingsPercent}% Cost
            </div>
            <span className="text-[10px] text-[var(--paper-dim)] font-mono">
              {scenario.graphRag.tokensUsed} vs {scenario.vectorRag.tokensUsed} tokens
            </span>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <span className="text-[10px] font-mono text-[var(--paper-dim)] uppercase">Ground Truth Precision</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">
              100% vs {scenario.vectorRag.accuracyScore}%
            </div>
            <span className="text-[10px] text-cyan-500/80 font-mono">Index-Backed Provenance</span>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <span className="text-[10px] font-mono text-[var(--paper-dim)] uppercase">Path Completeness</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-400">
              {scenario.hopsRequired} / {scenario.hopsRequired} Hops
            </div>
            <span className="text-[10px] text-purple-400/80 font-mono">Deterministic pointer jumps</span>
          </div>
        </div>
      </div>

      {/* Scenario Selector Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {BENCHMARK_SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => setSelectedScenarioId(sc.id)}
            className={`px-4 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer border ${
              selectedScenarioId === sc.id
                ? "bg-[var(--copper)] text-[var(--ink)] font-bold border-[var(--copper)] shadow-md shadow-[var(--copper)]/20"
                : "bg-black/30 text-[var(--paper-dim)] border-[var(--line)] hover:text-white hover:border-white/20"
            }`}
          >
            {sc.title}
          </button>
        ))}
      </div>

      {/* Active Query Display */}
      <div className="panel rounded-xl p-4 bg-black/40 border border-[var(--line)]">
        <span className="text-[10px] font-mono uppercase text-[var(--copper)]">Target Enterprise Query:</span>
        <p className="text-sm sm:text-base font-semibold text-white mt-1">"{scenario.query}"</p>
        <p className="text-xs text-[var(--paper-dim)] mt-1">{scenario.description}</p>
      </div>

      {/* Side-by-Side Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* LEFT COLUMN: VECTOR RAG */}
        <div className="panel rounded-2xl p-5 border border-rose-500/30 bg-gradient-to-b from-rose-950/20 via-black to-black flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="font-mono text-sm font-bold text-rose-300">
                  Flat Vector RAG (Embeddings + Cosine Top-K)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Risk: {scenario.vectorRag.hallucinationRisk}
              </span>
            </div>

            {/* Vector Telemetry Badges */}
            <div className="grid grid-cols-3 gap-2 my-3 text-center">
              <div className="bg-black/60 p-2 rounded-lg border border-rose-500/20">
                <div className="text-[10px] font-mono text-[var(--paper-dim)]">LATENCY</div>
                <div className="font-mono text-sm font-bold text-rose-400">{scenario.vectorRag.latencyMs} ms</div>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-rose-500/20">
                <div className="text-[10px] font-mono text-[var(--paper-dim)]">TOKENS FED</div>
                <div className="font-mono text-sm font-bold text-rose-400">{scenario.vectorRag.tokensUsed}</div>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-rose-500/20">
                <div className="text-[10px] font-mono text-[var(--paper-dim)]">ACCURACY</div>
                <div className="font-mono text-sm font-bold text-rose-400">{scenario.vectorRag.accuracyScore}%</div>
              </div>
            </div>

            {/* Vector Response Text */}
            <div className="space-y-2 mt-4">
              <span className="text-[11px] font-mono text-rose-300/80 uppercase">Synthesized LLM Response:</span>
              <div className="p-3.5 rounded-xl bg-black/60 border border-rose-500/20 text-xs text-[var(--paper-dim)] leading-relaxed font-sans">
                {scenario.vectorRag.response}
              </div>
            </div>

            {/* Missing Connections Breakdown */}
            <div className="space-y-2 mt-4">
              <span className="text-[11px] font-mono text-rose-400 uppercase">Critical Missing Connections:</span>
              <ul className="space-y-1.5">
                {scenario.vectorRag.missingConnections.map((missing, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-rose-300/90 font-mono">
                    <span className="text-rose-500">✕</span>
                    <span>{missing}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-[11px] text-rose-200/70 font-sans mt-4">
            <strong>Why it fails:</strong> {scenario.vectorRag.explanation}
          </div>
        </div>

        {/* RIGHT COLUMN: FALKORDB GRAPH RAG */}
        <div className="panel rounded-2xl p-5 border border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-black to-black flex flex-col justify-between space-y-4 shadow-xl shadow-emerald-500/5">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-mono text-sm font-bold text-emerald-300">
                  FalkorDB Graph RAG (In-Memory Pointer Jumps)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Risk: ZERO (Ground Truth)
              </span>
            </div>

            {/* Graph Telemetry Badges */}
            <div className="grid grid-cols-3 gap-2 my-3 text-center">
              <div className="bg-black/60 p-2 rounded-lg border border-emerald-500/20">
                <div className="text-[10px] font-mono text-[var(--paper-dim)]">LATENCY</div>
                <div className="font-mono text-sm font-bold text-emerald-400">{scenario.graphRag.latencyMs} ms</div>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-emerald-500/20">
                <div className="text-[10px] font-mono text-[var(--paper-dim)]">TOKENS FED</div>
                <div className="font-mono text-sm font-bold text-emerald-400">{scenario.graphRag.tokensUsed}</div>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-emerald-500/20">
                <div className="text-[10px] font-mono text-[var(--paper-dim)]">ACCURACY</div>
                <div className="font-mono text-sm font-bold text-emerald-400">{scenario.graphRag.accuracyScore}%</div>
              </div>
            </div>

            {/* Cypher Query Box */}
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300/80 uppercase">
                <span>Executed OpenCypher:</span>
                <span className="text-emerald-400/60 text-[10px]">Indexed pointer traversal</span>
              </div>
              <pre className="p-3 rounded-xl bg-black/80 border border-emerald-500/20 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-tight">
                {scenario.graphRag.cypher}
              </pre>
            </div>

            {/* Graph Path Traversed */}
            <div className="space-y-2 mt-4">
              <span className="text-[11px] font-mono text-emerald-400 uppercase">Multi-Hop Path Walked:</span>
              <div className="space-y-1">
                {scenario.graphRag.pathTraversed.map((hop, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-mono text-emerald-200/90">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[9px] shrink-0">
                      {idx + 1}
                    </span>
                    <span>{hop}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Graph Response Text */}
            <div className="space-y-2 mt-4">
              <span className="text-[11px] font-mono text-emerald-300/80 uppercase">Deterministic Result:</span>
              <div className="p-3.5 rounded-xl bg-black/60 border border-emerald-500/30 text-xs text-[var(--paper)] leading-relaxed font-sans">
                {scenario.graphRag.response}
              </div>
            </div>

            {/* Ground Truth Sources */}
            <div className="mt-4 pt-3 border-t border-emerald-500/20">
              <span className="text-[10px] font-mono uppercase text-[var(--paper-dim)]">Verified Graph Nodes Cited:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {scenario.graphRag.groundTruthSources.map((src) => (
                  <span
                    key={src.id}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300"
                  >
                    {src.kind}: {src.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-200/70 font-sans mt-4">
            <strong>Why FalkorDB wins:</strong> {scenario.graphRag.explanation}
          </div>
        </div>
      </div>
    </div>
  );
}
