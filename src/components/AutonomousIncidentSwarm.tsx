"use client";

import { useState } from "react";
import type { IncidentSimulation } from "@/lib/graph/incident-swarm";

export function AutonomousIncidentSwarm() {
  const [incidentType, setIncidentType] = useState<"billing_blackout" | "agv_calibration" | "auth_partition">(
    "billing_blackout",
  );
  const [isRunning, setIsRunning] = useState(false);
  const [simulation, setSimulation] = useState<IncidentSimulation | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const handleLaunch = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/graph/incident-swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: incidentType }),
      });
      const data = await res.json();
      if (data.ok && data.simulation) {
        setSimulation(data.simulation);
      }
    } catch (err) {
      alert("Swarm execution error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyBrief = () => {
    if (!simulation) return;
    const brief = `# Incident Response Brief: ${simulation.incidentId}
**Title:** ${simulation.title}
**Severity:** ${simulation.initialSeverity}
**Impacted Site:** ${simulation.siteImpacted}

## Executive Command Structure
- **Primary Incident Commander:** ${simulation.executiveBrief.incidentCommander}
- **Secondary Escalation Lead:** ${simulation.executiveBrief.secondaryEscalation}
- **Downstream Systems Affected:** ${simulation.executiveBrief.downstreamSystemsAffected.join(", ")}
- **Verified Current Runbook:** ${simulation.executiveBrief.verifiedRunbook}
- **Deprecated Policies Blocked:** ${simulation.executiveBrief.deprecatedPoliciesBlocked.join(", ")}

## Action Items
${simulation.executiveBrief.actionItems.join("\n")}
`;
    navigator.clipboard.writeText(brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel rounded-2xl p-6 border border-rose-500/30 bg-gradient-to-r from-black via-black/80 to-rose-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-0.5 text-xs font-mono text-rose-300 mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>🚨 PROACTIVE AUTONOMOUS SWARM</span>
              <span>·</span>
              <span>INCIDENT MITIGATION & WORK ROUTING</span>
            </div>
            <h2 className="serif text-2xl sm:text-3xl text-white">
              Autonomous Production Incident Response
            </h2>
            <p className="text-xs sm:text-sm text-[var(--paper-dim)] mt-1 max-w-2xl">
              Multi-agent incident triage and automated mitigation. 
              Watch 5 specialist agents triage an outage, audit blast radius, assign work, and mutate FalkorDB in sub-10 milliseconds.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLaunch}
              disabled={isRunning}
              className="btn-primary rounded-xl px-5 py-2.5 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20 bg-rose-600 hover:bg-rose-500 text-white border-none disabled:opacity-50"
            >
              <span>{isRunning ? "Coordinating Swarm..." : "🚨 Trigger P1 Incident Swarm"}</span>
            </button>
          </div>
        </div>

        {/* Incident Type Selectors */}
        <div className="flex flex-wrap gap-2 mt-5">
          <button
            type="button"
            onClick={() => setIncidentType("billing_blackout")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              incidentType === "billing_blackout"
                ? "bg-rose-500/20 text-rose-300 font-bold border-rose-500 shadow-md shadow-rose-500/10"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            💳 Billing Ledger Queue Backlog
          </button>
          <button
            type="button"
            onClick={() => setIncidentType("agv_calibration")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              incidentType === "agv_calibration"
                ? "bg-rose-500/20 text-rose-300 font-bold border-rose-500 shadow-md shadow-rose-500/10"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            🤖 AGV Sensor Fusion Calibration Halt
          </button>
          <button
            type="button"
            onClick={() => setIncidentType("auth_partition")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              incidentType === "auth_partition"
                ? "bg-rose-500/20 text-rose-300 font-bold border-rose-500 shadow-md shadow-rose-500/10"
                : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
            }`}
          >
            🌐 Fleet Coordinator Heartbeat Partition
          </button>
        </div>
      </div>

      {!simulation ? (
        <div className="panel rounded-2xl p-12 text-center text-xs text-[var(--paper-dim)] space-y-3 border border-dashed border-white/10">
          <span className="text-4xl">📡</span>
          <h4 className="font-mono text-sm text-white">No active incident simulation in progress</h4>
          <p className="max-w-md mx-auto">
            Select an incident scenario above and click "Trigger P1 Incident Swarm" to witness autonomous multi-agent coordination on FalkorDB.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Incident Header Card */}
          <div className="panel rounded-2xl p-5 border border-rose-500/40 bg-black/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500 text-black">
                  {simulation.incidentId}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {simulation.initialSeverity}
                </span>
                <span className="text-xs font-mono text-[var(--paper-dim)]">Site: {simulation.siteImpacted}</span>
              </div>
              <h3 className="serif text-xl sm:text-2xl text-white mt-1.5">{simulation.title}</h3>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-mono text-[var(--paper-dim)]">TOTAL SWARM TIME</div>
                <div className="font-mono text-lg font-bold text-emerald-400">
                  {simulation.totalDurationMs} ms
                </div>
              </div>
              <button
                onClick={handleCopyBrief}
                className="btn-secondary rounded-xl px-4 py-2 text-xs font-mono font-semibold cursor-pointer"
              >
                {copiedBrief ? "✓ Copied Brief" : "Copy War-Room Brief"}
              </button>
            </div>
          </div>

          {/* 5-Step Agent Timeline */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
              Autonomous Swarm Execution Timeline (5 Coordinated Agents)
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {simulation.steps.map((step) => {
                const badgeColor =
                  step.agentName === "Pulse"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : step.agentName === "Atlas"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : step.agentName === "Ledger"
                    ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                    : step.agentName === "Dispatch"
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border-[var(--copper)]/40 bg-[var(--copper)]/10 text-[var(--copper-2)]";

                return (
                  <div
                    key={step.stepIndex}
                    className="panel rounded-xl p-4 border border-[var(--line)] bg-black/40 space-y-2.5 transition-all hover:border-white/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-mono">
                          {step.stepIndex}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${badgeColor}`}>
                          {step.agentName}
                        </span>
                        <span className="text-xs text-[var(--paper-dim)] font-sans">{step.agentRole}</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">
                        {step.executionMs} ms
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-white font-sans">{step.outputSummary}</div>

                    {/* Cypher Box */}
                    <div className="rounded-lg bg-black/80 border border-white/5 p-2.5 overflow-x-auto">
                      <div className="text-[9px] font-mono text-[var(--paper-dim)] uppercase mb-1">
                        OpenCypher Action:
                      </div>
                      <pre className="font-mono text-[10px] text-emerald-300/90 leading-tight">
                        {step.cypherExecuted}
                      </pre>
                    </div>

                    {step.stateMutation && (
                      <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                        <span>⚡ FalkorDB Write Mutation:</span>
                        <span>
                          {step.stateMutation.action} :{step.stateMutation.label} [{step.stateMutation.nodeId}]
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Executive War-Room Brief Card */}
          <div className="panel rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-black to-black space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="serif text-xl text-white">Synthesized Executive Incident Brief</h3>
              <span className="text-xs font-mono text-emerald-400">Cryptographically Signed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/60 border border-white/5">
                <span className="text-[10px] text-[var(--paper-dim)] block uppercase">Incident Commander</span>
                <span className="text-white font-bold text-sm">{simulation.executiveBrief.incidentCommander}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-white/5">
                <span className="text-[10px] text-[var(--paper-dim)] block uppercase">Secondary Escalation</span>
                <span className="text-white font-bold text-sm">{simulation.executiveBrief.secondaryEscalation}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-white/5">
                <span className="text-[10px] text-[var(--paper-dim)] block uppercase">Verified Active Runbook</span>
                <span className="text-emerald-400 font-bold text-sm">{simulation.executiveBrief.verifiedRunbook}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-mono text-[var(--copper)] uppercase">Immediate Swarm Action Directives:</span>
              <ul className="space-y-1.5">
                {simulation.executiveBrief.actionItems.map((item, i) => (
                  <li key={i} className="text-xs text-[var(--paper)] font-mono flex items-start gap-2">
                    <span className="text-emerald-400">✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
