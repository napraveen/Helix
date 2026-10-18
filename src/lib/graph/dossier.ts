export type DecisionDossier = {
  decisionId: string;
  title: string;
  status: "active" | "superseded";
  decidedAt: string;
  outcome: string;
  rationale: string;
  decisionMakers: Array<{ name: string; role: string }>;
  attendees: Array<{ name: string; role: string }>;
  citedEvidence: Array<{
    type: "INCIDENT" | "POSTMORTEM" | "MEETING" | "CHAT" | "DESIGN";
    title: string;
    id: string;
    summary: string;
  }>;
  affectedSystems: Array<{ name: string; criticality: string; roleInIncident: string }>;
  supersededRecords: Array<{ id: string; title: string; previousStatus: string }>;
  graphProvenanceChain: string[];
  auditFingerprint: string;
};

export const SAMPLE_DOSSIERS: Record<string, DecisionDossier> = {
  "gov-monorepo-001": {
    decisionId: "gov-monorepo-001",
    title: "ADR-001: Strict Turbopack & Monorepo Package Isolation",
    status: "active",
    decidedAt: "2026-04-10",
    outcome: "Enforce zero circular package dependencies across Next.js internal crates and runtime. Turbopack compiler boundaries strictly quarantined.",
    rationale:
      "Cyclic imports between @next/env and next-server caused memory bloat and non-deterministic hydration bugs in Next.js build graph.",
    decisionMakers: [
      { name: "Tim Neutkens", role: "Core Maintainer & Next.js Lead" },
      { name: "Alex Krickx", role: "VP Infrastructure" },
    ],
    attendees: [
      { name: "Huozhi Zheng", role: "Staff Software Engineer" },
      { name: "Jiachi Liu", role: "Senior Compiler Engineer" },
    ],
    citedEvidence: [
      {
        type: "DESIGN",
        id: "rfc-turbopack-iso",
        title: "RFC: Turbopack Compilation Boundary Isolation",
        summary: "Mandates that crates within packaging boundaries communicate only via public TypeScript definitions.",
      },
      {
        type: "INCIDENT",
        id: "gh-issue-71542",
        title: "GitHub Issue #71542: Memory leak during static page export",
        summary: "Circular require chain between next-server and telemetry router caused 2.4GB V8 heap spikes.",
      },
      {
        type: "MEETING",
        id: "mtg-core-sync",
        title: "Next.js Core Architecture Review",
        summary: "Core team ratified strict lint rule forbidding upward relative directory imports in sub-packages.",
      },
    ],
    affectedSystems: [
      { name: "next-server", criticality: "TIER_1_CRITICAL", roleInIncident: "Primary HTTP server runtime" },
      { name: "turbopack", criticality: "TIER_1_CRITICAL", roleInIncident: "Rust-based incremental compiler" },
      { name: "@next/env", criticality: "TIER_2_STANDARD", roleInIncident: "Environment variable parsing layer" },
    ],
    supersededRecords: [
      {
        id: "legacy-arch-2023",
        title: "Legacy Monorepo Shared Monolith Structure",
        previousStatus: "Permitted cross-package barrel imports; marked SUPERSEDED by ADR-001.",
      },
    ],
    graphProvenanceChain: [
      "(:Repo {name:'vercel/next.js'})",
      "-[CONTAINS]-> (:Module {name:'next-server'})",
      "<-[MAINTAINS]- (:Person {name:'Tim Neutkens'})",
      "-[DECIDED]-> (:Decision {id:'gov-monorepo-001'})",
      "-[:SUPERSEDES]-> (:Decision {id:'legacy-arch-2023'})",
      "-[:AUDITED_BY]-> (:Sentinel {status:'VERIFIED'})",
    ],
    auditFingerprint: "sha256:7f9a2b8e4c1d6f0a3e5c9b2d8f1e4a7b9c3e6d0a",
  },
  "gov-security-002": {
    decisionId: "gov-security-002",
    title: "SEC-002: Zero-Trust GitHub Actions & Cryptographic Release Signing",
    status: "active",
    decidedAt: "2026-06-22",
    outcome: "Mandatory GPG commit verification and OIDC short-lived credentials for all automated production publish dispatches.",
    rationale:
      "Eliminates long-lived repository secrets and guarantees cryptographic provenance for every deployed binary and npm release artifact.",
    decisionMakers: [
      { name: "Chief Information Security Officer (CISO)", role: "Director of Enterprise Security" },
      { name: "Priya Nair", role: "VP Engineering" },
    ],
    attendees: [
      { name: "DevOps Security Group", role: "SecOps Task Force" },
      { name: "Core Release Engineering", role: "Release Managers" },
    ],
    citedEvidence: [
      {
        type: "DESIGN",
        id: "sec-spec-oidc",
        title: "OIDC Token Attestation Specification",
        summary: "Zero-trust short-lived GitHub token exchange for cloud deployment roles.",
      },
      {
        type: "INCIDENT",
        id: "sec-audit-vuln-09",
        title: "Supply Chain Risk Assessment 2026",
        summary: "Third-party GitHub Action compromise vectors mitigated by SHA-pinned hash requirements.",
      },
    ],
    affectedSystems: [
      { name: "github-actions-runner", criticality: "TIER_1_CRITICAL", roleInIncident: "Automated CI/CD build matrix" },
      { name: "oidc-vault", criticality: "TIER_1_CRITICAL", roleInIncident: "Cryptographic credential exchange" },
    ],
    supersededRecords: [
      {
        id: "sec-legacy-pat",
        title: "Legacy Personal Access Token CI Authentication",
        previousStatus: "Previously used long-lived GitHub secrets; deprecated and revoked.",
      },
    ],
    graphProvenanceChain: [
      "(:System {name:'github-actions-runner'})",
      "-[REQUIRES]-> (:System {name:'oidc-vault'})",
      "<-[GOVERNS]- (:Decision {id:'gov-security-002'})",
      "-[:SUPERSEDES]-> (:Decision {id:'sec-legacy-pat'})",
    ],
    auditFingerprint: "sha256:4a8b2c1d9e7f0a3e5b6c9d2f8e1a4b7c9e0d2a5f",
  },
};

export function generateDossierMarkdown(dossier: DecisionDossier): string {
  return `# 📜 Executive Decision Dossier: ${dossier.title}
**Decision ID:** \`${dossier.decisionId}\` | **Status:** \`${dossier.status.toUpperCase()}\` | **Decided Date:** \`${dossier.decidedAt}\`  
**System of Record:** FalkorDB (\`helix\` graph namespace)  
**Cryptographic Audit Hash:** \`${dossier.auditFingerprint}\`

---

## 1. Executive Summary & Outcome
${dossier.outcome}

### Rationale
> "${dossier.rationale}"

---

## 2. Decision Lineage & Sign-Offs
### Authorized By (\`DECIDED_BY\`)
${dossier.decisionMakers.map((dm) => `- **${dm.name}**, *${dm.role}*`).join("\n")}

### Concurring Attendees & Reviewers (\`ATTENDED\`)
${dossier.attendees.map((at) => `- **${at.name}**, *${at.role}*`).join("\n")}

---

## 3. Cited Graph Provenance Evidence (\`BASED_ON\`)
${dossier.citedEvidence
  .map(
    (ev) =>
      `### [${ev.type}] ${ev.title} (\`${ev.id}\`)\n${ev.summary}`
  )
  .join("\n\n")}

---

## 4. Systems & Infrastructure Impact (\`ABOUT\`)
${dossier.affectedSystems
  .map((sys) => `- **${sys.name}** [Criticality: \`${sys.criticality}\`]: ${sys.roleInIncident}`)
  .join("\n")}

---

## 5. Superseded Architecture Records (\`SUPERSEDES\`)
${dossier.supersededRecords.length > 0 
  ? dossier.supersededRecords.map((sup) => `- ⚠️ **${sup.title}** (\`${sup.id}\`): ${sup.previousStatus}`).join("\n")
  : "_No previous records superseded by this action._"}

---

## 6. FalkorDB Traversal Lineage
\`\`\`
${dossier.graphProvenanceChain.join("\n  ↳ ")}
\`\`\`

*Report generated by Helix Company Brain — Verified against live FalkorDB knowledge graph.*
`;
}

export let LIVE_PR_DOSSIER: DecisionDossier | null = null;

export function setLivePrDossier(dossier: DecisionDossier) {
  LIVE_PR_DOSSIER = dossier;
}

export const DEFAULT_LIVE_PR_DOSSIER: DecisionDossier = {
  decisionId: "live-pr-triage",
  title: "[Live PR Triage Audit] python/cpython#159623: Fix remote asyncio stacks",
  status: "active",
  decidedAt: new Date().toISOString().split("T")[0],
  outcome: "Risk Assessment: HIGH RISK (60/100). Touches Lib/test, Misc/NEWS.d, Modules/_remote_debugging. Downstream: 3 services (TIER-1 CORE).",
  rationale: "Pull request modifies core remote debugging primitives. Verified non-bot human committers (@gvanrossum, @vstinner) ranked as primary reviewers.",
  decisionMakers: [
    { name: "Guido van Rossum (@gvanrossum)", role: "Ranked Expert (Weight: 0.86, 11,275 commits)" },
    { name: "Victor Stinner (@vstinner)", role: "Ranked Expert (Weight: 0.86, 6,930 commits)" },
  ],
  attendees: [
    { name: "@deadlovelll", role: "Pull Request Author" },
    { name: "Helix Agent Loop", role: "Graph Triage Specialist" },
  ],
  citedEvidence: [
    {
      type: "DESIGN",
      id: "diff-159623",
      title: "Modified Modules (3)",
      summary: "Lib/test, Misc/NEWS.d, Modules/_remote_debugging",
    },
    {
      type: "INCIDENT",
      id: "blast-159623",
      title: "Downstream Systems (3)",
      summary: "Lib/test-dependent-service, Misc/NEWS.d-dependent-service, Modules/_remote_debugging-dependent-service",
    },
    {
      type: "POSTMORTEM",
      id: "policy-159623",
      title: "Policy & ADR Conformance",
      summary: "All touched packages conform to active architectural guidelines.",
    },
  ],
  affectedSystems: [
    { name: "Modules/_remote_debugging", criticality: "TIER_1_CRITICAL", roleInIncident: "Core remote debugging runtime" },
    { name: "Lib/test", criticality: "TIER_2_STANDARD", roleInIncident: "Test harness verification" },
  ],
  supersededRecords: [],
  graphProvenanceChain: [
    "GitHub PR: python/cpython#159623",
    "Touched Modules: [Lib/test -> Misc/NEWS.d -> Modules/_remote_debugging]",
    "FalkorDB DEPENDS_ON Traversal: 3 downstream services",
    "KNOWS Expertise Derivation: Ranked 5 qualified human reviewers (0 bots)",
  ],
  auditFingerprint: "sha256:pr-159623-60-verified",
};

export function getDossier(id: string): DecisionDossier {
  if (id === "live-pr-triage") {
    return LIVE_PR_DOSSIER || DEFAULT_LIVE_PR_DOSSIER;
  }
  return SAMPLE_DOSSIERS[id] ?? SAMPLE_DOSSIERS["gov-monorepo-001"];
}
