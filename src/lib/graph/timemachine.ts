export type HistoricalEra = {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  badge: string;
  activeDecisions: string[];
  supersededDecisions: string[];
  activeSystems: string[];
  teamSize: number;
  highlightedIncident?: string;
  narrative: string;
  graphStats: {
    nodesCount: number;
    edgesCount: number;
    primaryEdgeChange: string;
  };
  keyEvents: Array<{
    date: string;
    type: "DECISION" | "INCIDENT" | "SYSTEM" | "TEAM";
    summary: string;
  }>;
};

export const HISTORICAL_ERAS: HistoricalEra[] = [
  {
    id: "era-2023",
    year: "April 2023",
    title: "The Early Velocity Era",
    subtitle: "Speed over custom infrastructure · Vendor lock-in accepted",
    badge: "Origin",
    activeDecisions: ["dec-003 (ADR-003: Adopt legacy billing provider indefinitely)"],
    supersededDecisions: [],
    activeSystems: ["auth-gateway", "billing-ledger (Legacy API)", "secrets-vault (Static Tokens)"],
    teamSize: 6,
    narrative:
      "Early stage of DevFlow. CTO Owen Park approved ADR-003 to outsource developer billing to an external provider for launch speed. CI runners used static deployment tokens. The graph was small (22 nodes).",
    graphStats: {
      nodesCount: 22,
      edgesCount: 28,
      primaryEdgeChange: "CREATE (:Decision {id:'dec-003'})-[:ABOUT]->(:Project {id:'pr-copperline'})",
    },
    keyEvents: [
      { date: "2023-04-09", type: "DECISION", summary: "Owen Park signs ADR-003: Adopt external provider indefinitely for billing." },
      { date: "2023-05-01", type: "SYSTEM", summary: "Static deployment token channel deployed to initial CI runner prototype pool." },
      { date: "2023-06-15", type: "TEAM", summary: "Core executive and infrastructure engineering team established (6 people)." },
    ],
  },
  {
    id: "era-2026-q1",
    year: "March 2026",
    title: "CI/CD Scaling & Zero-Trust Security Overhaul",
    subtitle: "Runner fleet mass expansion · Cryptographic OIDC tokens",
    badge: "Expansion",
    activeDecisions: ["dec-003 (Legacy Billing)", "dec-021 (ADR-021: Mandatory Zero-Trust OIDC)"],
    supersededDecisions: ["doc-ota-wiki (Deprecated static token runbook)"],
    activeSystems: ["workflow-orchestrator", "pr-runner-engine", "event-bus", "secrets-vault (OIDC Signed)"],
    teamSize: 14,
    narrative:
      "Rapid developer adoption across enterprise accounts. Security Lead Quinn Brooks and Release Lead Haruto Sato identify supply-chain risks with static tokens and enforce ADR-021. The old static deployment runbook is flagged for deprecation.",
    graphStats: {
      nodesCount: 54,
      edgesCount: 88,
      primaryEdgeChange: "CREATE (:Document {id:'doc-ota-v4'})-[:SUPERSEDES]->(:Document {id:'doc-ota-wiki'})",
    },
    keyEvents: [
      { date: "2026-03-04", type: "TEAM", summary: "Meeting MTG-OTA convened with Haruto, Elena, Quinn, and Jade." },
      { date: "2026-03-18", type: "DECISION", summary: "ADR-021 enacted: Short-lived OIDC release tokens mandatory for all automated builds." },
      { date: "2026-06-01", type: "SYSTEM", summary: "Leo Kim establishes PR Runner micro-VM sandbox isolation contract." },
    ],
  },
  {
    id: "era-2026-aug",
    year: "August 2026",
    title: "INC-441 Outage & The Architectural Pivot",
    subtitle: "The 187-minute invoice blackout · ADR-014 freezes legacy provider",
    badge: "Crisis & Pivot",
    activeDecisions: ["dec-014 (ADR-014: Freeze Legacy Billing)", "dec-021 (Zero-Trust OIDC)"],
    supersededDecisions: ["dec-003 (ADR-003 permanently superseded)"],
    activeSystems: ["event-bus", "workflow-orchestrator", "billing-ledger (read-only mode)"],
    teamSize: 17,
    highlightedIncident: "INC-441 Billing Webhook Blackout (187 min, 4,100 accounts)",
    narrative:
      "An unannounced webhook payload schema change from the legacy billing provider broke the event-bus consumer. Invoices stalled for 4,100 enterprise developer accounts for 187 minutes. Nora Berg led the restore. Owen Park & Jonah Hale convened MTG-BILL and enacted ADR-014, permanently superseding ADR-003 in the graph.",
    graphStats: {
      nodesCount: 70,
      edgesCount: 114,
      primaryEdgeChange: "CREATE (:Decision {id:'dec-014'})-[:SUPERSEDES]->(:Decision {id:'dec-003'})",
    },
    keyEvents: [
      { date: "2026-08-10", type: "INCIDENT", summary: "INC-441: billing-ledger consumer dies after vendor schema change." },
      { date: "2026-08-11", type: "TEAM", summary: "War-room MTG-BILL attended by Owen, Jonah, Priya, and Nora." },
      { date: "2026-08-12", type: "DECISION", summary: "ADR-014 signed: Freeze legacy vendor writes, build internal Ledger v2." },
    ],
  },
  {
    id: "era-present",
    year: "Present (Oct 2026)",
    title: "The Living Company Brain (FalkorDB)",
    subtitle: "Helix adopted as context layer · Multi-agent graph intelligence",
    badge: "Current State",
    activeDecisions: ["dec-014 (Freeze Legacy Billing)", "dec-021 (Zero-Trust OIDC)", "dec-028 (Company Graph)"],
    supersededDecisions: ["dec-003", "doc-ota-wiki"],
    activeSystems: ["workflow-orchestrator", "pr-runner-engine", "auth-gateway", "event-bus", "secrets-vault"],
    teamSize: 18,
    narrative:
      "DevFlow moves entire organizational and architectural context into FalkorDB. 5 autonomous specialist agents (Helix, Atlas, Ledger, Pulse, Dispatch) reason over connected nodes with verified provenance, MCP protocol access, and What-If departure simulation.",
    graphStats: {
      nodesCount: 84,
      edgesCount: 154,
      primaryEdgeChange: "CREATE (:Agent {name:'Helix'})-[:REMEMBERS]->(:Memory)",
    },
    keyEvents: [
      { date: "2026-09-02", type: "DECISION", summary: "ADR-028: FalkorDB adopted as DevFlow system of record." },
      { date: "2026-10-14", type: "INCIDENT", summary: "Europe-West runner latency spike detected; automatically routed to Leo Kim." },
      { date: "2026-10-15", type: "SYSTEM", summary: "Helix Company Brain activated with Model Context Protocol server." },
    ],
  },
];
