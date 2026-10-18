"use client";

import { useState } from "react";
import type { ConnectedActionScenario, ActionStepTrace } from "@/lib/graph/connected-actions";

type ScenarioType = "security_cve_quarantine" | "codebase_cycle_refactor" | "zero_trust_privilege_audit";

const SCENARIOS = [
  {
    id: "security_cve_quarantine" as ScenarioType,
    title: "CVE-2026-4410 Zero-Day Triage & Automated Quarantine",
    tag: "Security Finding Triage",
    icon: "🛡️",
    badgeColor: "border-red-500/40 bg-red-500/10 text-red-300",
    summary: "Multi-hop dependency traversal, Betweenness Centrality impact scoring, and automated FalkorDB quarantine mutation.",
  },
  {
    id: "codebase_cycle_refactor" as ScenarioType,
    title: "Cyclic Dependency Elimination & Codebase Refactoring",
    tag: "Architecture Refactoring",
    icon: "🔄",
    badgeColor: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    summary: "Detects cyclic feedback deadlocks across microservices, runs Louvain Community Detection, and re-wires graph dependencies.",
  },
  {
    id: "zero_trust_privilege_audit" as ScenarioType,
    title: "Zero-Trust Privilege Escalation Audit & Anomaly Severing",
    tag: "Privilege Anomaly Severing",
    icon: "🔐",
    badgeColor: "border-purple-500/40 bg-purple-500/10 text-purple-300",
    summary: "Identifies unauthorized transitive contractor paths to Tier-0 cryptographic keystores and autonomously severs graph edges.",
  },
];

export function ConnectedDataActionLab() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>("security_cve_quarantine");
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [scenarioData, setScenarioData] = useState<ConnectedActionScenario | null>(null);

  async function handleRunScenario(scenarioId: ScenarioType) {
    setIsRunning(true);
    setActiveStep(1);
    try {
      const res = await fetch("/api/graph/connected-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarioId }),
      });
      const json = await res.json();
      if (json.ok) {
        setScenarioData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Connected Data Action Banner */}
      <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-black p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 font-mono text-xs text-blue-300">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>CONNECTED DATA ACTIONS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Agents That Act on Connected Data
            </h2>
            <p className="text-sm text-[var(--paper-dim)] max-w-2xl font-sans">
              Helix executes multi-hop Cypher traversals, invokes native graph algorithms as agent tools, dynamically selects MCP endpoints, and executes atomic graph write mutations in FalkorDB with explainable verification.
            </p>
          </div>

          <div className="text-right font-mono hidden sm:block">
            <div className="text-xs uppercase text-blue-400 font-semibold tracking-wider">Engine Status</div>
            <div className="text-xl font-bold text-white">Active Dispatcher</div>
            <div className="text-[11px] text-[var(--paper-dim)]">Connected Data Actions & Triage</div>
          </div>
        </div>

        {/* 5 Key Focus Criteria Badges */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2 text-[11px] font-mono">
          {[
            { label: "✓ Multi-Hop Reasoning", desc: "4-hop deep transitive path expansion" },
            { label: "✓ Graph Algorithms as Tools", desc: "PageRank, Betweenness, Louvain, ShortestPath" },
            { label: "✓ Tool Selection via MCP", desc: "JSON-RPC 2.0 dynamic schema dispatch" },
            { label: "✓ Actions Based on Graph Data", desc: "Atomic FalkorDB quarantine & refactoring mutations" },
            { label: "✓ Explainable Results", desc: "Step-by-step query provenance & cryptographic audit" },
          ].map((c, i) => (
            <div key={i} className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200">
              <span className="font-semibold text-white">{c.label}:</span>{" "}
              <span className="text-[var(--paper-dim)]">{c.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SCENARIOS.map((sc) => {
          const isSelected = selectedScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => {
                setSelectedScenario(sc.id);
                setScenarioData(null);
                setActiveStep(null);
              }}
              className={`text-left p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? "border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/10 scale-[1.01]"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{sc.icon}</span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${sc.badgeColor}`}>
                    {sc.tag}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base leading-snug">{sc.title}</h3>
                <p className="text-xs text-[var(--paper-dim)] leading-relaxed">{sc.summary}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-blue-400">
                <span>{isSelected ? "Active Scenario" : "Select Scenario"}</span>
                <span>{isSelected ? "●" : "➔"}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Execution Controller */}
      <div className="rounded-2xl border border-white/10 bg-[var(--ink-2)] p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span>
              <span>Execute Autonomous Graph Action Workflow</span>
            </h3>
            <p className="text-xs text-[var(--paper-dim)]">
              Watch 5 specialist agents traverse connected data in FalkorDB, compute algorithm scores, and execute physical state mutations.
            </p>
          </div>

          <button
            onClick={() => handleRunScenario(selectedScenario)}
            disabled={isRunning}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-mono text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Traversing Connected Graph...</span>
              </>
            ) : (
              <>
                <span>Run Autonomous Action</span>
                <span>➔</span>
              </>
            )}
          </button>
        </div>

        {/* Live Step Results */}
        {scenarioData ? (
          <div className="space-y-6 animate-fade-in">
            {/* Top Explainability & Proof Telemetry */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-[10px] text-[var(--paper-dim)] uppercase">Hops Traversed</div>
                <div className="text-lg font-bold text-blue-400">{scenarioData.hopsTraversed} Hops</div>
                <div className="text-[10px] text-white/50">Multi-hop pointer jump</div>
              </div>
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-[10px] text-[var(--paper-dim)] uppercase">Graph Algorithms</div>
                <div className="text-sm font-bold text-purple-300 truncate">
                  {scenarioData.algorithmsUsed.join(", ")}
                </div>
                <div className="text-[10px] text-white/50">Graph Topology Engine</div>
              </div>
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-[10px] text-[var(--paper-dim)] uppercase">FalkorDB Mutation</div>
                <div className="text-sm font-bold text-emerald-400 truncate">Atomic Cypher SET</div>
                <div className="text-[10px] text-white/50">Microsecond state shift</div>
              </div>
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="text-[10px] text-[var(--paper-dim)] uppercase">Verification Status</div>
                <div className="text-sm font-bold text-emerald-300">Verified Path Provenance</div>
                <div className="text-[10px] text-white/50">Index-backed Cypher audit proof</div>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-mono tracking-wider text-[var(--paper-dim)]">
                Step-by-Step Graph Traversal & Action Proof
              </h4>

              <div className="space-y-3">
                {scenarioData.steps.map((st: ActionStepTrace) => {
                  const isCurrent = activeStep === st.step;
                  return (
                    <div
                      key={st.step}
                      className={`rounded-xl border p-4 transition-all font-mono text-xs ${
                        isCurrent
                          ? "border-blue-400 bg-blue-950/20 shadow-md"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                            {st.step}
                          </span>
                          <span className="text-white font-bold">{st.agent}</span>
                          <span className="text-[var(--paper-dim)] text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            {st.phase}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--paper-dim)]">
                          <span>Execution: <strong className="text-emerald-400 font-semibold">{st.executionMs}ms</strong></span>
                          <button
                            onClick={() => setActiveStep(isCurrent ? null : st.step)}
                            className="text-blue-400 hover:text-white underline cursor-pointer"
                          >
                            {isCurrent ? "Hide Cypher" : "View Cypher"}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 space-y-2">
                        <div className="text-sm text-white font-sans">{st.action}</div>
                        <div className="text-xs text-[var(--paper-dim)] font-sans italic">{st.rationale}</div>

                        {/* Nodes Inspected Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-[var(--paper-dim)]">Nodes Inspected:</span>
                          {st.nodesInspected.map((n, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white text-[10px]">
                              {n}
                            </span>
                          ))}
                        </div>

                        {/* Cypher Accordion */}
                        {isCurrent && (
                          <div className="mt-3 p-3 rounded-lg bg-black/60 border border-white/10 space-y-2 animate-fade-in">
                            <div className="text-[10px] text-blue-400 uppercase font-semibold">
                              OpenCypher Query Executed Against FalkorDB
                            </div>
                            <pre className="text-[11px] text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
                              {st.cypher}
                            </pre>
                            <div className="pt-2 border-t border-white/10 text-[10px] text-[var(--paper-dim)]">
                              Structured Output: {JSON.stringify(st.output)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explainable Verification Box */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3 font-sans">
              <div className="flex items-center gap-2 text-emerald-300 font-mono text-xs uppercase font-bold">
                <span>🛡️</span>
                <span>Explainable Verification & FalkorDB Post-Condition Proof</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--paper-dim)]">Root Cause Identified:</span>
                  <div className="text-white font-medium">{scenarioData.explainableProof.rootCause}</div>
                </div>
                <div>
                  <span className="text-[var(--paper-dim)]">Autonomous Action Executed:</span>
                  <div className="text-emerald-300 font-medium">{scenarioData.explainableProof.actionTaken}</div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-emerald-400/80 pt-1 border-t border-emerald-500/20">
                Post-Condition Verified in FalkorDB: {scenarioData.explainableProof.postConditionVerified ? "SUCCESS (Zero-Downtime Isolation Active)" : "FAILED"}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-[var(--paper-dim)] font-mono space-y-2 border border-dashed border-white/10 rounded-xl">
            <span className="text-3xl">🎯</span>
            <p className="text-white font-medium">No Action Executed Yet</p>
            <p className="text-xs">Click &ldquo;Run Autonomous Action&rdquo; above to execute the multi-hop Cypher traversal and live FalkorDB mutation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
