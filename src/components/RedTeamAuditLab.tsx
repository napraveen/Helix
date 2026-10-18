"use client";

import { useState } from "react";
import type { RedTeamReport, AttackVector } from "@/lib/graph/redteam-security";
import type { MemoryAblationReport, AblationScenarioResult } from "@/lib/graph/memory-ablation";

export function RedTeamAuditLab() {
  const [activeSubTab, setActiveSubTab] = useState<"redteam" | "ablation">("redteam");
  const [isLoading, setIsLoading] = useState(false);
  const [redTeamReport, setRedTeamReport] = useState<RedTeamReport | null>(null);
  const [ablationReport, setAblationReport] = useState<MemoryAblationReport | null>(null);

  async function handleRunRedTeam() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/graph/security-audit?mode=redteam");
      const data = await res.json();
      if (data.ok && data.report) {
        setRedTeamReport(data.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRunAblation() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/graph/security-audit?mode=ablation");
      const data = await res.json();
      if (data.ok && data.report) {
        setAblationReport(data.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl border border-red-500/30 bg-gradient-to-r from-red-950/30 via-black to-red-950/20 p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 font-mono text-xs text-red-300">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span>SECURITY & SCIENTIFIC VERIFICATION · TRUST ENGINE</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Adversarial Red Team Battery & Memory Ablation
            </h2>
            <p className="text-sm text-[var(--paper-dim)] max-w-2xl font-sans">
              Proves FalkorDB multigraph tenant isolation, blocks prompt injection attempts, validates repo allowlists, and measures empirical multi-session ablation benefits.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveSubTab("redteam")}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                activeSubTab === "redteam"
                  ? "bg-red-500 text-white font-bold border-red-400"
                  : "bg-white/5 text-[var(--paper-dim)] border-white/10 hover:text-white"
              }`}
            >
              🛡️ Red Team Suite
            </button>
            <button
              onClick={() => setActiveSubTab("ablation")}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                activeSubTab === "ablation"
                  ? "bg-purple-500 text-white font-bold border-purple-400"
                  : "bg-white/5 text-[var(--paper-dim)] border-white/10 hover:text-white"
              }`}
            >
              🔬 Memory Ablation
            </button>
          </div>
        </div>
      </div>

      {/* Red Team Sub-Tab */}
      {activeSubTab === "redteam" && (
        <div className="space-y-4">
          <div className="panel p-5 rounded-2xl border border-[var(--line)] bg-black/40 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-bold font-mono text-white">Adversarial Attack Simulation Suite</div>
              <div className="text-xs text-[var(--paper-dim)] font-mono">
                Executes cross-tenant injection, write-target breakout, and malicious Cypher sanitization tests.
              </div>
            </div>
            <button
              onClick={handleRunRedTeam}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Executing Battery..." : "💥 Run Adversarial Battery"}
            </button>
          </div>

          {redTeamReport && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
                <div className="panel p-3 rounded-xl border border-white/10 bg-black/30">
                  <div className="text-[10px] text-[var(--paper-dim)] uppercase">Total Attacks</div>
                  <div className="text-xl font-bold text-white">{redTeamReport.totalAttacksExecuted}</div>
                </div>
                <div className="panel p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
                  <div className="text-[10px] text-emerald-400 uppercase">Defended / Neutralized</div>
                  <div className="text-xl font-bold text-emerald-300">{redTeamReport.attacksBlockedCount}</div>
                </div>
                <div className="panel p-3 rounded-xl border border-red-500/30 bg-red-950/20">
                  <div className="text-[10px] text-red-400 uppercase">Breaches</div>
                  <div className="text-xl font-bold text-red-300">{redTeamReport.attacksLeakedCount}</div>
                </div>
                <div className="panel p-3 rounded-xl border border-white/10 bg-black/30">
                  <div className="text-[10px] text-[var(--paper-dim)] uppercase">Defense Rate</div>
                  <div className="text-xl font-bold text-emerald-400">{redTeamReport.passRatePercent}%</div>
                </div>
              </div>

              <div className="space-y-2">
                {redTeamReport.attackResults.map((att: AttackVector) => (
                  <div
                    key={att.id}
                    className="panel p-4 rounded-xl border border-white/10 bg-black/30 font-mono text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">{att.id}</span>
                        <span className="text-white font-semibold">{att.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        att.status === "PASSED_BLOCKED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-red-500/20 text-red-300 border border-red-500/40"
                      }`}>
                        {att.status === "PASSED_BLOCKED" ? "✓ Neutralized" : "⚠️ Breached"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--paper-dim)]">
                      <span className="text-slate-400">Payload / Vector:</span> {att.attackPayload}
                    </div>
                    <div className="text-[11px] text-emerald-300/90 bg-emerald-950/20 p-2 rounded border border-emerald-500/20">
                      <span className="font-semibold text-emerald-300">Defense Mechanism:</span> {att.defenseMechanism}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ablation Sub-Tab */}
      {activeSubTab === "ablation" && (
        <div className="space-y-4">
          <div className="panel p-5 rounded-2xl border border-[var(--line)] bg-black/40 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-bold font-mono text-white">Empirical Memory Ablation Experiment</div>
              <div className="text-xs text-[var(--paper-dim)] font-mono">
                Compares agent sessions with Cognitive Memory ON vs OFF across accuracy, tokens, steps, and latency.
              </div>
            </div>
            <button
              onClick={handleRunAblation}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Running Experiment..." : "🔬 Run Ablation Study"}
            </button>
          </div>

          {ablationReport && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
                <div className="panel p-3 rounded-xl border border-purple-500/30 bg-purple-950/20">
                  <div className="text-[10px] text-purple-300 uppercase">Avg Accuracy Gain</div>
                  <div className="text-xl font-bold text-white">{ablationReport.aggregateDelta.avgAccuracyGain}</div>
                </div>
                <div className="panel p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
                  <div className="text-[10px] text-emerald-300 uppercase">Token Savings</div>
                  <div className="text-xl font-bold text-emerald-300">{ablationReport.aggregateDelta.avgTokenSavings}</div>
                </div>
                <div className="panel p-3 rounded-xl border border-blue-500/30 bg-blue-950/20">
                  <div className="text-[10px] text-blue-300 uppercase">Step Reduction</div>
                  <div className="text-xl font-bold text-blue-300">{ablationReport.aggregateDelta.avgStepReduction}</div>
                </div>
                <div className="panel p-3 rounded-xl border border-white/10 bg-black/30">
                  <div className="text-[10px] text-[var(--paper-dim)] uppercase">Speedup Multiplier</div>
                  <div className="text-xl font-bold text-white">{ablationReport.aggregateDelta.avgSpeedup}</div>
                </div>
              </div>

              <div className="space-y-3">
                {ablationReport.scenarios.map((sc: AblationScenarioResult) => (
                  <div
                    key={sc.scenarioId}
                    className="panel p-4 rounded-xl border border-white/10 bg-black/30 font-mono text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-white font-bold">{sc.name}</div>
                      <span className="text-emerald-400 font-bold">Accuracy: {sc.memoryOff.accuracyPercent}% → {sc.memoryOn.accuracyPercent}% (+{sc.delta.accuracyDeltaPercent}%)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded-lg bg-red-950/15 border border-red-500/20 space-y-1">
                        <div className="text-red-400 font-semibold uppercase">Memory OFF (Stateless Baseline)</div>
                        <div>Tokens: {sc.memoryOff.tokensConsumed} | Steps: {sc.memoryOff.stepsTaken} | Latency: {sc.memoryOff.latencyMs}ms</div>
                        <div className="text-[var(--paper-dim)]">{sc.memoryOff.outcomeSummary}</div>
                      </div>

                      <div className="p-3 rounded-lg bg-emerald-950/15 border border-emerald-500/20 space-y-1">
                        <div className="text-emerald-400 font-semibold uppercase">Memory ON (FalkorDB Cognitive Core)</div>
                        <div>Tokens: {sc.memoryOn.tokensConsumed} | Steps: {sc.memoryOn.stepsTaken} | Latency: {sc.memoryOn.latencyMs}ms</div>
                        <div className="text-[var(--paper-dim)]">{sc.memoryOn.outcomeSummary}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
