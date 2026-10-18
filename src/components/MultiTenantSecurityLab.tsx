"use client";

import { useState, useEffect } from "react";
import {
  ENTERPRISE_TENANTS,
  RBAC_PERMISSIONS,
  type TenantId,
  type UserRole,
  type TenantInfo,
} from "@/lib/graph/multitenancy";

export function MultiTenantSecurityLab() {
  const [activeTenantId, setActiveTenantId] = useState<TenantId>("github-production");
  const [activeRole, setActiveRole] = useState<UserRole>("EXECUTIVE_ADMIN");
  const [liveTenant, setLiveTenant] = useState<TenantInfo>(ENTERPRISE_TENANTS["github-production"]);

  // Live Cypher RBAC Test State
  const [scenario, setScenario] = useState<"executive_adrs" | "all_nodes" | "codeowners_modules">("executive_adrs");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);

  useEffect(() => {
    async function fetchLiveTenantData() {
      try {
        const res = await fetch(`/api/graph/tenants?tenant=${activeTenantId}&role=${activeRole}`);
        const data = await res.json();
        if (data.ok && data.activeTenant) {
          setLiveTenant(data.activeTenant);
        }
      } catch {}
    }
    fetchLiveTenantData();
  }, [activeTenantId, activeRole]);

  // Execute RBAC Query whenever role, tenant, or scenario changes
  useEffect(() => {
    executeRbacQuery();
  }, [activeTenantId, activeRole, scenario]);

  async function executeRbacQuery() {
    setQueryLoading(true);
    try {
      const res = await fetch("/api/graph/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: activeTenantId,
          role: activeRole,
          scenario,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setQueryResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQueryLoading(false);
    }
  }

  const tenant = liveTenant || ENTERPRISE_TENANTS[activeTenantId];
  const permission = RBAC_PERMISSIONS[activeRole];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-r from-black via-black/80 to-cyan-950/20">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-0.5 text-xs font-mono text-cyan-300 mb-2">
          <span>🔐 PRODUCTION MULTI-TENANCY & RBAC</span>
          <span>·</span>
          <span>ENTERPRISE ISOLATION</span>
        </div>
        <h2 className="serif text-2xl sm:text-3xl text-white">
          FalkorDB Multi-Tenant & RBAC Security Layer
        </h2>
        <p className="text-xs sm:text-sm text-[var(--paper-dim)] mt-1 max-w-2xl">
          FalkorDB supports thousands of completely isolated graph databases on a single instance via <code>db.selectGraph(tenantId)</code>. 
          Dynamic Cypher query rewriting enforces strict Role-Based Access Control so external contractors never traverse confidential architectural or executive nodes.
        </p>

        {/* Tenant Selector Pills */}
        <div className="flex flex-wrap gap-2 mt-5">
          {Object.values(ENTERPRISE_TENANTS).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTenantId(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                activeTenantId === t.id
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border-cyan-500 shadow-md shadow-cyan-500/10"
                  : "bg-black/40 text-[var(--paper-dim)] border-[var(--line)] hover:text-white"
              }`}
            >
              <span>🏢 {t.name}</span>
              {t.isRealData && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  REAL GRAPH
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tenant Metadata & RBAC Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Tenant Isolation Details */}
        <div className="panel rounded-2xl p-5 border border-[var(--line)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <h3 className="font-mono text-sm font-semibold text-white">Isolated Subgraph Topology</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {tenant.securityClassification}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-mono text-[var(--paper-dim)] uppercase">FALKORDB GRAPH IDENTIFIER</span>
              <div className="font-mono text-sm text-cyan-400 font-bold bg-black/60 p-2.5 rounded-lg border border-white/5">
                db.selectGraph("{tenant.graphName}")
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[var(--paper-dim)] uppercase">ORGANIZATION / DOMAIN</span>
              <p className="text-xs text-[var(--paper)] mt-0.5">{tenant.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-[var(--paper-dim)] block">ISOLATED NODES</span>
                <span className="text-white font-bold text-lg">{tenant.nodeCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-[var(--paper-dim)] block">ISOLATED EDGES</span>
                <span className="text-white font-bold text-lg">{tenant.edgeCount}</span>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <span className="text-[10px] font-mono text-[var(--paper-dim)] uppercase">Critical Domain Subsystems:</span>
              <div className="flex flex-wrap gap-1.5">
                {tenant.criticalSystems.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs font-mono text-white">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Role Selector & Access Matrix */}
        <div className="panel rounded-2xl p-5 border border-[var(--line)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <h3 className="font-mono text-sm font-semibold text-white">Active RBAC Security Context</h3>
            <span className="text-[10px] font-mono text-emerald-400">Zero Leakage Enforced</span>
          </div>

          {/* Role Selector Pills */}
          <div className="flex flex-wrap gap-1.5">
            {(["EXECUTIVE_ADMIN", "STAFF_ENGINEER", "EXTERNAL_CONTRACTOR"] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
                  activeRole === role
                    ? "bg-white/10 text-white font-bold border-cyan-400 shadow-sm shadow-cyan-400/20"
                    : "bg-black/40 text-[var(--paper-dim)] border-white/5 hover:text-white"
                }`}
              >
                {role === "EXECUTIVE_ADMIN" && "👑 Executive Admin"}
                {role === "STAFF_ENGINEER" && "💻 Staff Engineer"}
                {role === "EXTERNAL_CONTRACTOR" && "🔒 External Contractor"}
              </button>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-white/5 text-xs font-mono space-y-2">
            <div className="text-white font-semibold">{permission.label}</div>
            <p className="text-[var(--paper-dim)] text-[11px] font-sans">{permission.description}</p>
          </div>

          {/* Access Matrix */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-mono uppercase text-[var(--copper)]">
              Dynamic Cypher Access Matrix:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-[var(--paper-dim)]">Executive ADRs:</span>
                <span className={permission.canViewExecutiveDecisions ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {permission.canViewExecutiveDecisions ? "ALLOW" : "PRUNED"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-[var(--paper-dim)]">Classified Security:</span>
                <span className={permission.canViewSecurityClassified ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {permission.canViewSecurityClassified ? "ALLOW" : "PRUNED"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-[var(--paper-dim)]">Graph Mutations:</span>
                <span className={permission.canExecuteGraphMutations ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {permission.canExecuteGraphMutations ? "ALLOW" : "READ_ONLY"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-[var(--paper-dim)]">Allowed Edge Kinds:</span>
                <span className="text-cyan-400 font-bold">{permission.allowedEdgeTypes[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive FalkorDB RBAC Query Sandbox */}
      <div className="panel rounded-2xl p-6 border border-emerald-500/30 bg-black/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--line)]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base font-bold text-white">⚡ Live FalkorDB RBAC Query Execution</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Live Query Sandbox
              </span>
            </div>
            <p className="text-xs text-[var(--paper-dim)] mt-0.5">
              Execute live Cypher queries against FalkorDB. Watch how the AST rewriter dynamically injects security predicates based on active role context.
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--paper-dim)]">Query Target:</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as any)}
              className="rounded-xl border border-[var(--line)] bg-black px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="executive_adrs">📑 Confidential Executive ADRs & Decisions</option>
              <option value="codeowners_modules">👥 Module Ownership & Hierarchy</option>
              <option value="all_nodes">🔍 General Subgraph Entities</option>
            </select>

            <button
              onClick={executeRbacQuery}
              disabled={queryLoading}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
            >
              {queryLoading ? "Executing..." : "⚡ Execute Query"}
            </button>
          </div>
        </div>

        {/* Live Query Results */}
        {queryResult && (
          <div className="space-y-4 font-mono text-xs">
            {/* Verdict & Latency Banner */}
            <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
              queryResult.isPruned
                ? "bg-rose-950/20 border-rose-500/40 text-rose-300"
                : "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{queryResult.isPruned ? "🔒" : "✅"}</span>
                <span className="font-bold">{queryResult.rbacExplanation}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--paper-dim)]">
                <span>FalkorDB Latency: <strong className="text-white">{queryResult.latencyMs}ms</strong></span>
                <span>·</span>
                <span>Rows Returned: <strong className="text-white">{queryResult.rowCount}</strong></span>
              </div>
            </div>

            {/* Rewritten Cypher Query Block */}
            <div className="p-3.5 rounded-xl bg-black/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-[var(--paper-dim)] uppercase">
                <span>Rewritten Cypher Query (Dispatched to FalkorDB):</span>
                <span className="text-cyan-400">Context: {queryResult.role}</span>
              </div>
              <pre className="text-cyan-300 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {queryResult.cypherQuery}
              </pre>
            </div>

            {/* Returned Records Table */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <span className="text-[10px] uppercase text-[var(--paper-dim)]">
                FalkorDB Response Rows ({queryResult.rowCount}):
              </span>
              {queryResult.rows.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-rose-500/5 border border-rose-500/20 text-rose-400">
                  Zero rows returned. External contractor RBAC filter successfully prevented unauthorized entity access.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {queryResult.rows.map((row: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                          {row.type || row.classification || "Entity"}
                        </span>
                        {row.id && <span className="text-[var(--paper-dim)]">{row.id}</span>}
                      </div>
                      <div className="text-white font-medium truncate pt-1">
                        {row.name || row.title || row.subject || JSON.stringify(row)}
                      </div>
                      {row.relation && (
                        <div className="text-[10px] text-[var(--copper-2)]">
                          -[:{row.relation}]-&gt; {row.entity}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
