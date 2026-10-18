"use client";

import React, { useEffect, useState } from "react";
import type { FalkorStatus } from "@/lib/falkor/client";

type HealthResponse = {
  ok: boolean;
  mode: string;
  falkordb: FalkorStatus;
  gemini: boolean;
  githubTokenConfigured: boolean;
  actionsMode: string;
  writeRepo: string;
  timestamp: string;
};

export function RuntimeDbBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/health", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const json: HealthResponse = await res.json();
        if (mounted && json.falkordb) {
          setHealth(json);
        }
      } catch (err: any) {
        if (mounted) {
          setHealth({
            ok: false,
            mode: "FALKORDB_DISCONNECTED_REQUIRED",
            falkordb: {
              isLive: false,
              host: "127.0.0.1",
              port: 6379,
              version: "DISCONNECTED",
              graphKey: "helix",
              nodeCount: 0,
              edgeCount: 0,
              pingMs: 0,
              graphs: [],
              error: err?.message || "Failed to connect to /api/health",
            },
            gemini: false,
            githubTokenConfigured: false,
            actionsMode: "dryrun",
            writeRepo: "none",
            timestamp: new Date().toISOString(),
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-white/5 border border-white/10 text-white/60 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-white/40" />
        <span>Checking DB status...</span>
      </div>
    );
  }

  const status = health?.falkordb;
  const isLive = status?.isLive ?? false;
  const isGeminiPresent = health?.gemini ?? false;
  const agentMode = isGeminiPresent
    ? "Live LLM Function Calling (Gemini 2.5 Flash)"
    : "Deterministic Cypher Rule-Engine (Zero-LLM Fallback)";

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
          isLive
            ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 shadow-sm shadow-emerald-950"
            : "bg-rose-950/80 text-rose-300 border-rose-500/70 hover:border-rose-400 shadow-sm shadow-rose-950"
        }`}
        title="Click to view FalkorDB runtime status & topology"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isLive ? "bg-emerald-400 animate-pulse" : "bg-rose-400 animate-ping"
          }`}
        />
        {isLive ? (
          <span className="flex items-center gap-1.5">
            <span className="font-bold">LIVE FALKORDB</span>
            <span className="opacity-75 hidden sm:inline">
              ({status?.host}:{status?.port} | {status?.nodeCount} nodes | {status?.edgeCount} edges | {status?.pingMs}ms)
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="font-bold">FALKORDB DISCONNECTED</span>
            <span className="px-1.5 py-0.2 text-[9px] bg-rose-500/30 text-rose-200 rounded font-bold">
              REQUIRED
            </span>
          </span>
        )}
        <span className="text-[10px] opacity-60">ℹ</span>
      </button>

      {/* Popover Details Modal */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-zinc-950/95 border border-white/15 backdrop-blur-xl shadow-2xl z-50 text-xs font-sans text-white/90 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isLive ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span className="font-bold font-mono text-sm">
                {isLive ? "FalkorDB Live Connection" : "FalkorDB Disconnected"}
              </span>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="text-white/50 hover:text-white font-mono text-sm px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5 mt-3 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Status:</span>
              <span className={isLive ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {isLive ? "CONNECTED (Live Graph Reasoning Active)" : "DISCONNECTED (Reasoning Disabled)"}
              </span>
            </div>
            {!isLive && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] leading-relaxed">
                <span className="font-bold block mb-1">⚠️ WeMakeDevs Architecture Requirement:</span>
                The agent's context lives inside the graph. To ensure 100% authentic graph traversal, queries will not run until FalkorDB is connected:
                <code className="block mt-1.5 p-1 bg-black/60 rounded text-rose-200">docker compose up -d</code>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Host / Instance:</span>
              <span className="text-white/90">{status?.host}:{status?.port}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Engine Version:</span>
              <span className="text-white/90">{status?.version}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Active Graph Key:</span>
              <span className="text-cyan-400 font-bold">{status?.graphKey}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Node Count:</span>
              <span className="text-emerald-400 font-bold">{status?.nodeCount}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Edge Count:</span>
              <span className="text-emerald-400 font-bold">{status?.edgeCount}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Ping Latency:</span>
              <span className="text-purple-400">{status?.pingMs} ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Gemini API Key:</span>
              <span className={isGeminiPresent ? "text-emerald-400 font-bold" : "text-white/60"}>
                {isGeminiPresent ? "CONFIGURED (PRESENT)" : "ABSENT (Fallback Active)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Agent Engine Mode:</span>
              <span className="text-blue-300 font-semibold truncate max-w-[200px]" title={agentMode}>
                {agentMode}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/50">Actions Security Mode:</span>
              <span className="text-amber-300 uppercase font-bold">{health?.actionsMode}</span>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-white/10 text-[11px] leading-relaxed text-white/70 font-sans">
            {isLive ? (
              <p className="text-emerald-300/90">
                ✓ FalkorDB is on the hot path of every agent step. Multi-hop queries and live graph mutations execute directly in memory via GraphBLAS.
              </p>
            ) : (
              <p className="text-amber-300/90">
                ⚠ Operating on deterministic DevFlow graph snapshot. Start local FalkorDB (<code className="text-white bg-white/10 px-1 rounded">docker compose up</code>) or configure <code className="text-white bg-white/10 px-1 rounded">FALKORDB_URL</code> in <code className="text-white bg-white/10 px-1 rounded">.env.local</code> to enable live mutations, webhook sync, and multigraph isolation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
