"use client";

import { useState } from "react";
import type { PRTriageDossier } from "@/lib/actions/pr-triage";
import type { ActionReceipt } from "@/lib/actions/action-dispatcher";

export function PRTriageLab() {
  const [prUrl, setPrUrl] = useState("https://github.com/vercel/next.js/pull/71542");
  const [writeRepo, setWriteRepo] = useState(process.env.NEXT_PUBLIC_GITHUB_WRITE_REPO || "demo-dev/helix-demo-ops");

  const [isLoading, setIsLoading] = useState(false);
  const [dossier, setDossier] = useState<PRTriageDossier | null>(null);
  const [dispatchReceipt, setDispatchReceipt] = useState<ActionReceipt | null>(null);
  const [isUndone, setIsUndone] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleAnalyzePR() {
    setIsLoading(true);
    setStatusMessage(null);
    setDispatchReceipt(null);
    setIsUndone(false);

    try {
      const res = await fetch("/api/actions/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "triage",
          prUrl,
        }),
      });
      const data = await res.json();
      if (data.ok && data.dossier) {
        setDossier(data.dossier);
      } else {
        setStatusMessage(data.error || "Failed to triage PR");
      }
    } catch (err: any) {
      setStatusMessage(err?.message || "Error analyzing PR");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApproveAndDispatch() {
    if (!dossier) return;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/actions/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_and_dispatch",
          dossier,
          writeRepo,
        }),
      });
      const data = await res.json();
      if (data.ok && data.receipt) {
        setDispatchReceipt(data.receipt);
        setStatusMessage("Action dispatched successfully and sealed in cryptographic hash-chain!");
      } else {
        setStatusMessage(data.error || "Failed to dispatch action");
      }
    } catch (err: any) {
      setStatusMessage(err?.message || "Error dispatching action");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompensatingUndo() {
    if (!dispatchReceipt) return;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/actions/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "undo",
          actionId: dispatchReceipt.actionId,
        }),
      });
      const data = await res.json();
      if (data.ok && data.undone) {
        setIsUndone(true);
        setStatusMessage("Compensating undo transaction executed! Action reversed cleanly.");
      } else {
        setStatusMessage(data.error || "Failed to execute undo");
      }
    } catch (err: any) {
      setStatusMessage(err?.message || "Error executing undo");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/30 via-black to-blue-950/20 p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 font-mono text-xs text-blue-300">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>PULL REQUEST CONTEXT & TRIAGE ENGINE</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Live PR Triage, Blast Radius & Cryptographic Dispatch
            </h2>
            <p className="text-sm text-[var(--paper-dim)] max-w-2xl font-sans">
              Triages incoming GitHub pull requests in organizational graph context: traverses downstream dependency topologies, audits ADR policies, filters bot accounts, and executes human-in-the-loop actions with hash-chained receipts and 1-click compensating undo.
            </p>
          </div>
          <div className="font-mono text-xs text-right space-y-1 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="text-blue-400 font-semibold">Allowlist Security Status</div>
            <div className="text-white">Strict Write-Repo Lockdown</div>
            <div className="text-[10px] text-emerald-400">Idempotency & Replay Protected</div>
          </div>
        </div>
      </div>

      {/* Input Panel */}
      <div className="panel p-5 rounded-2xl border border-[var(--line)] bg-black/40 space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--copper)]">
          Target Pull Request Parameters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-[var(--paper-dim)] mb-1">
              Public GitHub PR URL (Read Target: vercel/next.js, facebook/react, etc.)
            </label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-[var(--paper-dim)] mb-1">
              Write Target Repo (Allowed: GITHUB_WRITE_REPO only)
            </label>
            <input
              type="text"
              value={writeRepo}
              onChange={(e) => setWriteRepo(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleAnalyzePR}
          disabled={isLoading}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? "Running Graph Traversals..." : "⚡ Analyze PR in FalkorDB Context"}
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-mono text-blue-200">
          {statusMessage}
        </div>
      )}

      {/* Triage Dossier Results */}
      {dossier && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Blast Radius Card */}
            <div className="panel p-4 rounded-xl border border-[var(--line)] bg-black/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--paper-dim)]">
                <span>Blast Radius</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  dossier.blastRadius.criticalityTier === "TIER_1_CRITICAL"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}>
                  {dossier.blastRadius.criticalityTier}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {dossier.blastRadius.impactedSystemsCount} Systems
              </div>
              <div className="text-xs font-mono text-[var(--paper-dim)]">
                Risk Score: {dossier.riskScore}/100
              </div>
              <div className="pt-2 border-t border-white/10 text-[11px] font-mono space-y-1">
                <div className="text-white font-semibold">Impacted Systems:</div>
                <div className="text-blue-300">{dossier.blastRadius.impactedSystems.join(", ") || "None"}</div>
                <div className="text-slate-400 pt-1">Modules Touched: {dossier.modulesTouched.join(", ")}</div>
              </div>
            </div>

            {/* ADR Policy Card */}
            <div className="panel p-4 rounded-xl border border-[var(--line)] bg-black/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--paper-dim)]">
                <span>ADR Governance</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  dossier.policyChecks.adrContradictionsFound || dossier.policyChecks.violatesFrozenDeprecation
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}>
                  {dossier.policyChecks.adrContradictionsFound || dossier.policyChecks.violatesFrozenDeprecation ? "Violation Flagged" : "Compliant"}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {dossier.policyChecks.adrContradictionsFound ? "Contradiction" : "Clean"}
              </div>
              <div className="text-xs font-mono text-[var(--paper-dim)]">
                Bitemporal Invariants Checked
              </div>
              <div className="pt-2 border-t border-white/10 text-[11px] font-mono space-y-1">
                <div className="text-slate-300">{dossier.policyChecks.details}</div>
              </div>
            </div>

            {/* Reviewer Ranking Card */}
            <div className="panel p-4 rounded-xl border border-[var(--line)] bg-black/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--paper-dim)]">
                <span>Expert Reviewers</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  Bots Stripped
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {dossier.recommendedReviewers.length} Ranked
              </div>
              <div className="text-xs font-mono text-[var(--paper-dim)]">
                Formula: Commit Activity + CODEOWNERS
              </div>
              <div className="pt-2 border-t border-white/10 text-[11px] font-mono space-y-1">
                {dossier.recommendedReviewers.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-white font-semibold">{r.login} ({r.name})</span>
                    <span className="text-blue-400 font-mono">Weight: {r.expertiseWeight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HITL Approval Gate & Action Proposal */}
          <div className="panel p-5 rounded-2xl border-2 border-blue-500/40 bg-blue-950/15 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs">
                  HITL APPROVAL GATE
                </span>
                <span>Proposed Action: PR Review Dispatch</span>
              </div>
              <span className="text-xs font-mono text-[var(--paper-dim)]">
                Write Target: {writeRepo}
              </span>
            </div>

            <div className="bg-black/60 rounded-xl p-4 border border-white/10 font-mono text-xs text-slate-300 space-y-2 whitespace-pre-wrap">
              <div className="text-[var(--paper-dim)] text-[10px] uppercase tracking-wider">Draft Review Comment:</div>
              <div>{dossier.draftReviewComment}</div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleApproveAndDispatch}
                disabled={isLoading || dispatchReceipt !== null}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                {dispatchReceipt ? "✓ Approved & Dispatched" : "✓ Approve & Dispatch Real Action"}
              </button>

              {dispatchReceipt && (
                <button
                  onClick={handleCompensatingUndo}
                  disabled={isLoading || isUndone}
                  className="px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-500/50 hover:bg-amber-600/30 text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUndone ? "✓ Undone Cleanly" : "↩️ 1-Click Compensating Undo"}
                </button>
              )}
            </div>
          </div>

          {/* Cryptographic Audit Receipt */}
          {dispatchReceipt && (
            <div className="panel p-4 rounded-xl border border-emerald-500/40 bg-black/40 font-mono text-xs space-y-2">
              <div className="text-emerald-400 font-bold flex items-center gap-2">
                <span>🛡️ Cryptographic Action Receipt #{dispatchReceipt.actionId}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {dispatchReceipt.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--paper-dim)]">
                <div>Audit Hash: <span className="text-slate-300">{dispatchReceipt.auditHash.slice(0, 24)}...</span></div>
                <div>Previous Hash: <span className="text-slate-300">{dispatchReceipt.previousHash.slice(0, 24)}...</span></div>
                <div>Action Type: <span className="text-slate-300">{dispatchReceipt.actionType}</span></div>
                <div>Timestamp: <span className="text-emerald-300">{dispatchReceipt.timestamp}</span></div>
              </div>
            </div>
          )}

          {/* Compensating Undo Status */}
          {isUndone && (
            <div className="panel p-4 rounded-xl border border-amber-500/40 bg-black/40 font-mono text-xs space-y-2">
              <div className="text-amber-400 font-bold">
                ↩️ Compensating Undo Executed Cleanly
              </div>
              <div className="text-[11px] text-[var(--paper-dim)]">
                Action #{dispatchReceipt?.actionId} compensated. Audit node marked as UNDONE with cryptographic trail preserved.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
