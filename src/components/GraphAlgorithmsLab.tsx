"use client";

import { useEffect, useState } from "react";
import {
  ALGORITHM_DEFINITIONS,
  type AlgorithmType,
  type PageRankNode,
  type CentralityNode,
  type CommunityCluster,
} from "@/lib/graph/algorithms-data";
import type { AlgorithmExecutionResult } from "@/lib/graph/algorithms";

export function GraphAlgorithmsLab() {
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>("pagerank");
  const [result, setResult] = useState<AlgorithmExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCypher, setCopiedCypher] = useState(false);

  const def = ALGORITHM_DEFINITIONS[selectedAlgo];

  async function fetchAlgorithmData(algo: AlgorithmType) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/graph/algorithms?algo=${algo}`);
      const json = await res.json();
      if (json.ok && json.result) {
        setResult(json.result);
      } else {
        setError(json.error || "Failed to execute algorithm");
      }
    } catch (err: any) {
      setError(err?.message || "Network error executing algorithm");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlgorithmData(selectedAlgo);
  }, [selectedAlgo]);

  const handleCopy = () => {
    navigator.clipboard.writeText(def.cypher);
    setCopiedCypher(true);
    setTimeout(() => setCopiedCypher(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel rounded-2xl p-6 border border-purple-500/30 bg-gradient-to-r from-black via-black/80 to-purple-950/20">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-0.5 text-xs font-mono text-purple-300 mb-2">
          <span>🧬 NATIVE FALKORDB GRAPH ALGORITHMS</span>
          <span>·</span>
          <span>RUNTIME MEASURED DYNAMICS</span>
        </div>
        <h2 className="serif text-2xl sm:text-3xl text-white">
          FalkorDB Graph Algorithm Suite
        </h2>
        <p className="text-xs sm:text-sm text-[var(--paper-dim)] mt-1 max-w-2xl">
          FalkorDB runs high-performance graph traversals implemented directly in C on top of RedisGraph. 
          Algorithms execute with live latency measurement and transparent engine labeling.
        </p>

        {/* Algorithm Selectors */}
        <div className="flex flex-wrap gap-2 mt-5">
          <button
            type="button"
            onClick={() => setSelectedAlgo("pagerank")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              selectedAlgo === "pagerank"
                ? "bg-purple-500/20 text-purple-300 font-bold border-purple-500 shadow-md shadow-purple-500/10"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            📊 PageRank (Authority & Influence)
          </button>
          <button
            type="button"
            onClick={() => setSelectedAlgo("betweenness")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              selectedAlgo === "betweenness"
                ? "bg-purple-500/20 text-purple-300 font-bold border-purple-500 shadow-md shadow-purple-500/10"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            🌉 Betweenness Centrality (Silo Bridges)
          </button>
          <button
            type="button"
            onClick={() => setSelectedAlgo("communities")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              selectedAlgo === "communities"
                ? "bg-purple-500/20 text-purple-300 font-bold border-purple-500 shadow-md shadow-purple-500/10"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            👥 Louvain Community Pods
          </button>
          <button
            type="button"
            onClick={() => setSelectedAlgo("shortest_path")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              selectedAlgo === "shortest_path"
                ? "bg-purple-500/20 text-purple-300 font-bold border-purple-500 shadow-md shadow-purple-500/10"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            ⚡ Dijkstra Shortest Path
          </button>
        </div>
      </div>

      {/* Main Algorithm View Card */}
      <div className="panel rounded-2xl p-6 border border-[var(--line)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
          <div>
            <h3 className="serif text-xl sm:text-2xl text-white">{def.title}</h3>
            <p className="text-xs text-[var(--paper-dim)] mt-1">{def.explanation}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 shrink-0">
              {result?.engine ?? "Helix Graph Engine"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
              {loading ? "Computing..." : `Runtime: ${result?.runtimeMs ?? 0} ms`}
            </span>
          </div>
        </div>

        {/* Cypher Code Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--paper-dim)]">
            <span>Cypher Procedure Specification:</span>
            <button onClick={handleCopy} className="text-purple-300 hover:underline cursor-pointer">
              {copiedCypher ? "✓ Copied" : "Copy Cypher"}
            </button>
          </div>
          <pre className="p-3.5 rounded-xl bg-black/80 border border-purple-500/20 font-mono text-xs text-purple-200 overflow-x-auto leading-relaxed">
            {def.cypher}
          </pre>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 py-6">
            <div className="flex items-center gap-3 text-xs font-mono text-[var(--paper-dim)]">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>Executing {def.title} over live graph topology...</span>
            </div>
            <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-xs font-mono text-red-300 flex items-center justify-between">
            <span>Error executing algorithm: {error}</span>
            <button
              onClick={() => fetchAlgorithmData(selectedAlgo)}
              className="px-3 py-1 rounded bg-red-500/20 border border-red-500/40 text-white cursor-pointer hover:bg-red-500/30"
            >
              Retry
            </button>
          </div>
        )}

        {/* Algorithm Results Display */}
        {!loading && !error && result && (
          <div>
            {selectedAlgo === "pagerank" && (
              <div className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                  Ranked Organizational Authority Scores (Dynamic Power Iteration)
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {(result.data as PageRankNode[]).map((node, i) => (
                    <div
                      key={node.name}
                      className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{node.name}</span>
                            <span className="text-xs font-mono text-[var(--paper-dim)]">({node.role})</span>
                          </div>
                          <p className="text-xs text-[var(--paper-dim)] mt-0.5">{node.summary}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 sm:text-right">
                        <div>
                          <div className="text-[10px] font-mono text-[var(--paper-dim)]">PAGERANK SCORE</div>
                          <div className="text-base font-bold font-mono text-emerald-400">{node.score}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          {node.influenceLevel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAlgo === "betweenness" && (
              <div className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                  Silo Risk & Communication Bridge Ranking (Brandes Betweenness Centrality)
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {(result.data as CentralityNode[]).map((node, i) => (
                    <div
                      key={node.name}
                      className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{node.name}</span>
                          <span className="text-xs font-mono text-[var(--paper-dim)]">({node.role})</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              node.riskIfDeparted === "HIGH_SILO_RISK"
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                : "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                            }`}
                          >
                            {node.riskIfDeparted}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--paper-dim)]">{node.whyCritical}</p>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <div className="text-[10px] font-mono text-[var(--paper-dim)]">CENTRALITY SCORE</div>
                        <div className="text-base font-bold font-mono text-emerald-400">{node.betweennessScore}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAlgo === "communities" && (
              <div className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                  Detected Functional Pods (Louvain Label Propagation / Modularity)
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {(result.data as CommunityCluster[]).map((cluster) => (
                    <div
                      key={cluster.id}
                      className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">{cluster.clusterName}</span>
                        <span className="text-xs font-mono text-emerald-400">
                          Density: {cluster.densityScore}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--paper-dim)]">{cluster.primaryFocus}</div>
                      <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                        {cluster.members.map((m) => (
                          <span key={m} className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 text-slate-300">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAlgo === "shortest_path" && (
              <div className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                  Dijkstra Shortest Traversal Chain
                </h4>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs space-y-2">
                  <div className="text-slate-300">
                    From: <span className="text-white font-bold">{result.data[0]?.from ?? "Maya Chen"}</span> ➔ To: <span className="text-white font-bold">{result.data[0]?.to ?? "billing-ledger"}</span>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    Distance: {result.data[0]?.distance ?? 2} hops
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-2">
                    {(result.data[0]?.path ?? []).map((step: string, idx: number) => (
                      <span key={idx} className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {step}
                        </span>
                        {idx < (result.data[0]?.path?.length ?? 0) - 1 && (
                          <span className="text-slate-500">➔</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
