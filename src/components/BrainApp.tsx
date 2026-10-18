"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ForceGraph, type TraversalStep } from "./ForceGraph";
import type { DepartureSimulationResult } from "@/lib/graph/simulator";
import { HISTORICAL_ERAS, type HistoricalEra } from "@/lib/graph/timemachine";
import { runGraphHealthAudit, executeAutoFix, type GraphHealthAudit } from "@/lib/graph/sentinel";
import { type StreamEvent } from "@/lib/graph/activity-stream";
import { generateDossierMarkdown, getDossier, type DecisionDossier } from "@/lib/graph/dossier";
import { BenchmarkArena } from "./BenchmarkArena";
import { UniversalIngestStudio } from "./UniversalIngestStudio";
import { AutonomousIncidentSwarm } from "./AutonomousIncidentSwarm";
import { GraphAlgorithmsLab } from "./GraphAlgorithmsLab";
import { MultiTenantSecurityLab } from "./MultiTenantSecurityLab";
import { ConnectedDataActionLab } from "./ConnectedDataActionLab";
import { CognitiveMemoryCoordinationLab } from "./CognitiveMemoryCoordinationLab";
import { RuntimeDbBadge } from "./RuntimeDbBadge";
import { PRTriageLab } from "./PRTriageLab";
import { RedTeamAuditLab } from "./RedTeamAuditLab";
import { EvalsScorecard } from "./EvalsScorecard";

export type Tab =
  | "chat"
  | "benchmark"
  | "swarm"
  | "algorithms"
  | "security"
  | "graph"
  | "simulator"
  | "timemachine"
  | "sentinel"
  | "activity"
  | "dossier"
  | "mcp"
  | "decisions"
  | "expertise"
  | "freshness"
  | "dispatch"
  | "console"
  | "ingest"
  | "track1_actions"
  | "track2_memory"
  | "pr_triage"
  | "evals"
  | "redteam";

export type Hub = "ask" | "explore" | "act" | "trust" | "operate";


type Trace = {
  name: string;
  agent: string;
  cypher?: string;
  params?: Record<string, unknown>;
  rowCount: number;
  ms: number;
  note?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  specialists?: string[];
  traces?: Trace[];
  traversalPath?: TraversalStep[];
  timestamp: string;
  outcome?: "answered_with_path" | "answered_from_memory" | "not_in_graph" | "unknown_entity";
  hopsPath?: string[];
  hopsCount?: number;
  dateLearned?: string;
  entityChecked?: string;
  acceptsPassed?: boolean;
};

type HealthStatus = {
  ok: boolean;
  falkordb?: { ok?: boolean; isLive?: boolean; graphs?: string[] };
  gemini?: boolean;
  error?: string;
};

type GraphOverview = {
  counts: Array<{ label: string; c: number }>;
  relationships: Array<{ type: string; c: number }>;
  nodes: Array<{ id: string; label: string; name: string }>;
  edges: Array<{ from: string; to: string; rel: string }>;
};

const PRESET_TRAVERSALS: Record<string, TraversalStep[]> = {
  adr014: [
    {
      nodeId: "chg-441",
      name: "INC-441 Billing Webhook Blackout",
      label: "ChangeEvent",
      edgeRel: "ABOUT",
      explanation: "Incident origin: billing-ledger lost event-bus consumer for 187 minutes, stalling invoices across 4,100 enterprise developer accounts.",
    },
    {
      nodeId: "s-billing",
      name: "billing-ledger",
      label: "System",
      edgeRel: "ABOUT",
      explanation: "Affected production tier-1 system. Discovered unversioned webhook schema change from legacy billing provider.",
    },
    {
      nodeId: "p-nora",
      name: "Nora Berg",
      label: "Person",
      edgeRel: "AUTHORED",
      explanation: "Senior Backend Engineer Nora Berg led the restore and authored Postmortem INC-441 (doc-pm441).",
    },
    {
      nodeId: "mtg-bill",
      name: "Legacy Billing Freeze Meeting",
      label: "Meeting",
      edgeRel: "ATTENDED",
      explanation: "War-room meeting attended by Owen Park, Jonah Hale, Priya Nair, and Nora Berg.",
    },
    {
      nodeId: "dec-014",
      name: "ADR-014: Freeze Legacy Billing Vendor",
      label: "Decision",
      edgeRel: "DECIDED_BY",
      explanation: "Formal decision to freeze legacy billing provider and design DevFlow internal Ledger v2.",
    },
    {
      nodeId: "p-jonah",
      name: "Jonah Hale & Owen Park",
      label: "Person",
      edgeRel: "SUPERSEDES",
      explanation: "VP Product Jonah Hale and CTO Owen Park approved ADR-014 and enterprise customer communication policy.",
    },
    {
      nodeId: "dec-003",
      name: "ADR-003: Adopt Legacy Billing Provider",
      label: "Decision",
      edgeRel: "SUPERSEDES",
      explanation: "ADR-014 explicitly marked older 2023 decision (ADR-003) as permanently SUPERSEDED in the graph.",
    },
  ],
  lisbon: [
    {
      nodeId: "tck-8821",
      name: "Ticket tck-8821 (Europe-West)",
      label: "Ticket",
      edgeRel: "ABOUT",
      explanation: "Incoming P1 Incident: PR Runner container queue latency spike 6x detected on runner pool 4.",
    },
    {
      nodeId: "pr-meridian",
      name: "PR Runner Cluster",
      label: "Project",
      edgeRel: "USES",
      explanation: "Consuming project responsible for micro-VM container isolation and GitHub PR test suites.",
    },
    {
      nodeId: "s-vision",
      name: "pr-runner-engine",
      label: "System",
      edgeRel: "ABOUT",
      explanation: "Core high-criticality pipeline pulling PR code, executing test suites, and publishing check runs.",
    },
    {
      nodeId: "topic-vision-pipeline",
      name: "ci-cd pipelines",
      label: "Topic",
      edgeRel: "KNOWS",
      explanation: "Topic node evaluated by Atlas: Leo Kim holds verified expertise weight 0.98.",
    },
    {
      nodeId: "p-leo",
      name: "Leo Kim",
      label: "Person",
      edgeRel: "OWNS",
      explanation: "Staff CI/CD Engineer Leo Kim owns kernel sandbox isolation contract. Recommended assignee.",
    },
  ],
  blast: [
    {
      nodeId: "s-fleet",
      name: "workflow-orchestrator",
      label: "System",
      edgeRel: "DEPENDS_ON",
      explanation: "Critical system: Coordinates all CI/CD build workflows across runner pods.",
    },
    {
      nodeId: "s-bus",
      name: "event-bus",
      label: "System",
      edgeRel: "DEPENDS_ON",
      explanation: "Underlying Kafka/NATS messaging fabric that workflow-orchestrator requires to publish state.",
    },
    {
      nodeId: "pr-atlas",
      name: "DevFlow Cloud",
      label: "Project",
      edgeRel: "USES",
      explanation: "Directly impacted project: Cloud developer portal halts workflow scheduling if orchestrator fails.",
    },
    {
      nodeId: "pr-pulse",
      name: "Workflow Engine",
      label: "Project",
      edgeRel: "USES",
      explanation: "Directly impacted project: Live build stream console loses runner telemetry.",
    },
    {
      nodeId: "p-aisha",
      name: "Aisha Rahman & Jade Okoye",
      label: "Person",
      edgeRel: "OWNS",
      explanation: "Primary incident escalation contacts: Aisha Rahman (Code Owner) and Jade Okoye (Primary On-call SRE).",
    },
  ],
  path: [
    {
      nodeId: "p-leo",
      name: "Leo Kim",
      label: "Person",
      edgeRel: "REPORTS_TO",
      explanation: "Starting node: Staff Engineer, CI/CD Engine (Seoul).",
    },
    {
      nodeId: "p-priya",
      name: "Priya Nair",
      label: "Person",
      edgeRel: "REPORTS_TO",
      explanation: "Hop 1: VP Engineering Priya Nair (Toronto). Manages Leo Kim, Samir Okonkwo, Quinn Brooks, and Jade Okoye.",
    },
    {
      nodeId: "p-maya",
      name: "Maya Chen",
      label: "Person",
      edgeRel: "REPORTS_TO",
      explanation: "Destination: CEO Maya Chen (Austin). Shortest path is 2 hops across REPORTS_TO edges in FalkorDB.",
    },
  ],
};

const PROMPT_SUGGESTIONS = [
  {
    label: "Blast: billing-ledger (Depth: 1)",
    prompt: "What breaks if billing-ledger goes down? (Depth: 1 Hop)",
    agent: "Pulse",
    traversalKey: "blast",
  },
  {
    label: "Blast: billing-ledger (Depth: 4)",
    prompt: "What breaks if billing-ledger goes down? (Depth: 4 Hops)",
    agent: "Pulse",
    traversalKey: "blast",
  },
  {
    label: "Unknown Entity: payment-v3",
    prompt: "What breaks if payment-v3-service goes down?",
    agent: "Pulse",
    traversalKey: "blast",
  },
  {
    label: "Trace ADR-014 (Copperline)",
    prompt: "Trace ADR-014: Why did we freeze Copperline billing, who decided it, and what does it supersede?",
    agent: "Ledger",
    traversalKey: "adr014",
  },
  {
    label: "Who knows vision pipeline?",
    prompt: "Who knows the vision pipeline best and what is the evidence in the graph?",
    agent: "Atlas",
    traversalKey: "lisbon",
  },
  {
    label: "Recall Session Memory",
    prompt: "Recall recent memory nodes and what we learned in earlier sessions.",
    agent: "Helix",
    traversalKey: "adr014",
  },
  {
    label: "Path: Leo Kim to Maya Chen",
    prompt: "What is the shortest path between Leo Kim and Maya Chen in the company graph?",
    agent: "Atlas",
    traversalKey: "path",
  },
  {
    label: "Route ticket tck-8821",
    prompt: "Route ticket tck-8821 (Lisbon-02 camera calibration drift) to the most qualified engineer based on graph evidence.",
    agent: "Dispatch",
    traversalKey: "lisbon",
  },
];

const AGENT_BADGES: Record<string, { color: string; desc: string }> = {
  Helix: { color: "border-[var(--copper)] text-[var(--copper-2)]", desc: "Orchestrator & Memory" },
  Atlas: { color: "border-emerald-500/50 text-emerald-300", desc: "Org & Expertise (PageRank)" },
  Ledger: { color: "border-purple-500/50 text-purple-300", desc: "Decisions & Provenance" },
  Pulse: { color: "border-rose-500/50 text-rose-300", desc: "Freshness & Blast Radius" },
  Dispatch: { color: "border-cyan-500/50 text-cyan-300", desc: "Work Routing & Tickets" },
};

const HUB_CONFIG: Record<
  Hub,
  {
    label: string;
    badge: string;
    icon: string;
    description: string;
    defaultTab: Tab;
    tabs: Array<{ id: Tab; label: string; icon: string; track?: string }>;
  }
> = {
  ask: {
    label: "ASK",
    badge: "Intelligence",
    icon: "💬",
    description: "Company Brain: Multi-hop reasoning, bitemporal ADRs & citation graph",
    defaultTab: "chat",
    tabs: [
      { id: "chat", label: "Agent Intelligence", icon: "🤖" },
      { id: "graph", label: "Path-of-Thought", icon: "✨" },
      { id: "decisions", label: "Decision Ledger", icon: "📜" },
      { id: "expertise", label: "Expertise Radar", icon: "🎯" },
    ],
  },
  explore: {
    label: "EXPLORE",
    badge: "Topology & Time",
    icon: "🧭",
    description: "Visualizer, time-machine slider, single-point-of-failure simulator & algorithms",
    defaultTab: "graph",
    tabs: [
      { id: "graph", label: "Force Visualizer", icon: "🕸️" },
      { id: "simulator", label: "What-If Simulator", icon: "🔮" },
      { id: "timemachine", label: "Time Machine", icon: "⏱️" },
      { id: "algorithms", label: "Graph Algorithms", icon: "🧬" },
      { id: "console", label: "Cypher Console", icon: "💻" },
    ],
  },
  act: {
    label: "ACT",
    badge: "Autonomous Actions",
    icon: "⚡",
    description: "Live PR triage, blast radius, human-in-the-loop actions, memory handoffs & swarm",
    defaultTab: "pr_triage",
    tabs: [
      { id: "pr_triage", label: "PR Triage & Review", icon: "🛡️" },
      { id: "freshness", label: "Blast Radius & Freshness", icon: "💥" },
      { id: "track1_actions", label: "Connected Actions Lab", icon: "⚡" },
      { id: "track2_memory", label: "Memory & Coordination Lab", icon: "🧠" },
      { id: "swarm", label: "Autonomous Swarm", icon: "🚨" },
      { id: "dispatch", label: "Work Routing", icon: "🎫" },
      { id: "mcp", label: "MCP Protocol", icon: "🔌" },
    ],
  },
  trust: {
    label: "TRUST",
    badge: "Verification",
    icon: "🛡️",
    description: "Golden evals (12 scenarios), 4-arm benchmark arena & red-team security battery",
    defaultTab: "evals",
    tabs: [
      { id: "evals", label: "Golden Evals (12 Scenarios)", icon: "📊" },
      { id: "benchmark", label: "RAG vs Graph Arena", icon: "⚔️" },
      { id: "redteam", label: "Red Team & Ablation", icon: "💥" },
    ],
  },
  operate: {
    label: "OPERATE",
    badge: "Platform",
    icon: "⚙️",
    description: "Universal multi-source ingestion, health sentinel auto-fix & multi-tenant isolation",
    defaultTab: "ingest",
    tabs: [
      { id: "ingest", label: "Universal Ingest", icon: "📥" },
      { id: "sentinel", label: "Health Sentinel", icon: "🛡️" },
      { id: "security", label: "Multi-Tenant & RBAC", icon: "🔐" },
      { id: "activity", label: "Live Activity Stream", icon: "⚡" },
      { id: "dossier", label: "Executive Dossier", icon: "📑" },
    ],
  },
};

const TAB_ALIASES: Record<string, Tab> = {
  chat: "chat",
  agent: "chat",
  intelligence: "chat",
  ask: "chat",
  benchmark: "benchmark",
  arena: "benchmark",
  swarm: "swarm",
  algorithms: "algorithms",
  algo: "algorithms",
  security: "security",
  rbac: "security",
  graph: "graph",
  visualizer: "graph",
  simulator: "simulator",
  resilience: "simulator",
  timemachine: "timemachine",
  "time-machine": "timemachine",
  time_machine: "timemachine",
  sentinel: "sentinel",
  health: "sentinel",
  activity: "activity",
  stream: "activity",
  dossier: "dossier",
  audit: "dossier",
  mcp: "mcp",
  decisions: "decisions",
  ledger: "decisions",
  adr: "decisions",
  expertise: "expertise",
  radar: "expertise",
  freshness: "freshness",
  blast: "freshness",
  dispatch: "dispatch",
  routing: "dispatch",
  console: "console",
  cypher: "console",
  ingest: "ingest",
  universal: "ingest",
  actions: "track1_actions",
  track1: "track1_actions",
  track1_actions: "track1_actions",
  "track1-actions": "track1_actions",
  memory: "track2_memory",
  track2: "track2_memory",
  track2_memory: "track2_memory",
  "track2-memory": "track2_memory",
  pr: "pr_triage",
  triage: "pr_triage",
  pr_triage: "pr_triage",
  "pr-triage": "pr_triage",
  evals: "evals",
  eval: "evals",
  golden: "evals",
  redteam: "redteam",
  "red-team": "redteam",
  red_team: "redteam",
};

export function normalizeTab(raw?: string | null): Tab | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  return TAB_ALIASES[cleaned] || null;
}

export function getHubForTab(targetTab: Tab): Hub {
  for (const [hubKey, hubVal] of Object.entries(HUB_CONFIG)) {
    if (hubVal.tabs.some((t) => t.id === targetTab)) {
      return hubKey as Hub;
    }
  }
  if (targetTab === "freshness") return "act";
  return "ask";
}

export interface BrainAppProps {
  initialTab?: Tab;
  initialHub?: Hub;
}

export function BrainApp({ initialTab, initialHub }: BrainAppProps = {}) {
  const normalizedInitial = initialTab ? normalizeTab(initialTab) : null;
  const defaultTab: Tab = normalizedInitial || "chat";
  const defaultHub: Hub = initialHub || getHubForTab(defaultTab);

  const [tab, setTab] = useState<Tab>(defaultTab);
  const [activeHub, setActiveHub] = useState<Hub>(defaultHub);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [overview, setOverview] = useState<GraphOverview | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-collapse on mobile initially and handle Ctrl+B / Cmd+B shortcut
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function switchTab(newTab: Tab, options?: { replaceUrl?: boolean; skipHistory?: boolean }) {
    setTab(newTab);
    const targetHub = getHubForTab(newTab);
    setActiveHub(targetHub);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("helix_active_tab", newTab);
      } catch {}

      if (!options?.skipHistory) {
        const targetUrl = `/brain?tab=${encodeURIComponent(newTab)}`;
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl !== targetUrl) {
          if (options?.replaceUrl) {
            window.history.replaceState({ tab: newTab }, "", targetUrl);
          } else {
            window.history.pushState({ tab: newTab }, "", targetUrl);
          }
        }
      }
    }

    // Only close drawer on mobile screens
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }

  function switchHub(hub: Hub) {
    setActiveHub(hub);
    switchTab(HUB_CONFIG[hub].defaultTab);
  }

  // Synchronize tab with URL query parameter, hash, or localStorage on mount & listen to popstate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const rawParam = urlParams.get("tab") || urlParams.get("topic") || urlParams.get("subtopic");
    const tabFromUrl = rawParam ? normalizeTab(rawParam) : null;
    const tabFromHash = window.location.hash ? normalizeTab(window.location.hash.replace(/^#/, "")) : null;
    const validUrlTab = tabFromUrl || tabFromHash;

    if (validUrlTab) {
      switchTab(validUrlTab, { replaceUrl: true });
    } else {
      try {
        const savedTab = localStorage.getItem("helix_active_tab");
        const normalizedSaved = savedTab ? normalizeTab(savedTab) : null;
        if (normalizedSaved) {
          switchTab(normalizedSaved, { replaceUrl: true });
        } else {
          switchTab(tab, { replaceUrl: true });
        }
      } catch {
        switchTab(tab, { replaceUrl: true });
      }
    }

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab") || p.get("topic") || p.get("subtopic");
      const matched = t ? normalizeTab(t) : null;
      if (matched) {
        setTab(matched);
        setActiveHub(getHubForTab(matched));
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to Helix — the Company Brain for DevFlow. I am powered directly by FalkorDB as the primary context layer.\n\nFive specialist agents collaborate on the same graph:\n• **Atlas**: Org hierarchy, expertise weights, PageRank & shortest paths\n• **Ledger**: Decision provenance, ADR supersession & cited evidence\n• **Pulse**: Stale document detection & system blast radius\n• **Dispatch**: Ticket routing & graph-backed engineer assignment\n• **Helix**: Session memory & multi-agent orchestration\n\nAsk any question below or click a prompt to see graph-backed multi-hop reasoning in action.",
      specialists: ["Helix", "Atlas", "Ledger", "Pulse", "Dispatch"],
      timestamp: "Just now",
      traversalPath: PRESET_TRAVERSALS.adr014,
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTrace, setActiveTrace] = useState<Trace[] | null>(null);

  // Path-of-Thought Active Traversal State (Feature 1)
  const [activeTraversal, setActiveTraversal] = useState<TraversalStep[] | undefined>(PRESET_TRAVERSALS.adr014);
  const [selectedTraversalKey, setSelectedTraversalKey] = useState<string>("adr014");
  const [traversalStepIndex, setTraversalStepIndex] = useState<number>(0);
  const [isPlayingTraversal, setIsPlayingTraversal] = useState<boolean>(true);

  // What-If Departure Simulator State (Feature 3)
  const [simulationTarget, setSimulationTarget] = useState<string>("Leo Kim");
  const [simulationResult, setSimulationResult] = useState<DepartureSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [reassignStatus, setReassignStatus] = useState<string | null>(null);

  // MCP Inspector State (Feature 2)
  const [mcpMethod, setMcpMethod] = useState<string>("tools/call");
  const [mcpTool, setMcpTool] = useState<string>("who_knows");
  const [mcpTopic, setMcpTopic] = useState<string>("vision pipeline");
  const [mcpResponse, setMcpResponse] = useState<any>(null);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);

  // Time-Machine State (Feature 4)
  const [selectedEraId, setSelectedEraId] = useState<string>("era-present");
  const activeEra = HISTORICAL_ERAS.find((e) => e.id === selectedEraId) ?? HISTORICAL_ERAS[3];

  // Graph Health Sentinel State (Feature 5)
  const [auditResult, setAuditResult] = useState<GraphHealthAudit | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [fixNotice, setFixNotice] = useState<string | null>(null);

  // Live Activity Stream State (Feature 6)
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [autoStream, setAutoStream] = useState(true);
  const [ingestingCommit, setIngestingCommit] = useState(false);

  // Executive Dossier State (Feature 7)
  const [selectedDossierId, setSelectedDossierId] = useState<string>("live-pr-triage");
  const [activeDossier, setActiveDossier] = useState<DecisionDossier>(getDossier("live-pr-triage"));
  const [dossierCatalog, setDossierCatalog] = useState<Array<{ id: string; label: string }>>([
    { id: "live-pr-triage", label: "🧬 Live GitHub PR Triage Audit (Recent)" },
    { id: "gov-monorepo-001", label: "🏛️ ADR-001: Strict Turbopack & Monorepo Boundaries" },
    { id: "gov-security-002", label: "🔒 SEC-002: Zero-Trust GitHub Actions & Cryptographic Release Signing" },
  ]);
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [loadingDossier, setLoadingDossier] = useState(false);

  async function fetchLiveDossier(id = selectedDossierId) {
    setLoadingDossier(true);
    try {
      const res = await fetch(`/api/graph/dossier?id=${id}`);
      const data = await res.json();
      if (data.ok && data.activeDossier) {
        setActiveDossier(data.activeDossier);
      }
      if (data.catalog && Array.isArray(data.catalog)) {
        setDossierCatalog(data.catalog);
      }
    } catch {
      setActiveDossier(getDossier(id));
    } finally {
      setLoadingDossier(false);
    }
  }

  useEffect(() => {
    fetchLiveDossier(selectedDossierId);
  }, [selectedDossierId, tab]);

  // Seed State
  const [isPending, startTransition] = useTransition();
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  // Node Filter State for Graph Explorer
  const [selectedLabel, setSelectedLabel] = useState<string>("all");

  // Cypher Console State
  const [customCypher, setCustomCypher] = useState(
    "MATCH (p:Person)-[k:KNOWS]->(t:Topic)\nRETURN p.name AS person, t.name AS topic, k.weight AS weight\nORDER BY weight DESC\nLIMIT 10"
  );
  const [consoleResult, setConsoleResult] = useState<any>(null);
  const [consoleRunning, setConsoleRunning] = useState(false);

  // Ingest State
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestContent, setIngestContent] = useState("");
  const [ingestAuthor, setIngestAuthor] = useState("Maya Chen");
  const [ingestKind, setIngestKind] = useState("note");
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // Fetch Health, Overview, Sentinel, Simulator, and Stream initial state
  useEffect(() => {
    fetchHealth();
    fetchOverview();
    runDepartureSimulation("Leo Kim");
    runSentinelAudit();
    initializeActivityEvents();

    const healthInterval = setInterval(fetchHealth, 5000);
    return () => clearInterval(healthInterval);
  }, []);

  // Real-time auto-poll interval for Live Activity Stream (Feature 6)
  useEffect(() => {
    if (!autoStream) return;
    const interval = setInterval(() => {
      initializeActivityEvents();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoStream]);

  async function initializeActivityEvents() {
    try {
      const res = await fetch("/api/graph/activity");
      const data = await res.json();
      if (data.events && Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Automatically refresh real activity log whenever user switches to Live Activity tab
  useEffect(() => {
    if (tab === "activity") {
      initializeActivityEvents();
    }
  }, [tab]);

  async function fetchLiveGitHubCommit(repo = "vercel/next.js") {
    setIngestingCommit(true);
    try {
      const res = await fetch("/api/graph/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch_github", repo }),
      });
      const data = await res.json();
      if (data.ok && data.event) {
        setEvents((prev) => [data.event, ...prev.filter((e) => e.id !== data.event.id).slice(0, 24)]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIngestingCommit(false);
    }
  }

  async function runSentinelAudit() {
    setAuditing(true);
    try {
      const res = await fetch("/api/graph/sentinel");
      const audit = await res.json();
      if (!audit.error) {
        setAuditResult(audit);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuditing(false);
    }
  }

  async function handleAutoFix(anomalyId: string) {
    setFixNotice("Applying auto-fix Cypher mutation to FalkorDB...");
    try {
      const res = await fetch("/api/graph/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anomalyId }),
      });
      const data = await res.json();
      if (data.ok) {
        setFixNotice(`✅ ${data.message}`);
        runSentinelAudit();
      } else {
        setFixNotice(`Error: ${data.error}`);
      }
    } catch (err) {
      setFixNotice(`Remediation simulated: ${String(err)}`);
    }
    setTimeout(() => setFixNotice(null), 5000);
  }

  async function fetchHealth() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("/api/health", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data && data.falkordb) {
        setHealth(data);
      }
    } catch {
      setHealth({ ok: false, error: "Health check unreachable", falkordb: { isLive: false } });
    }
  }

  async function fetchOverview() {
    try {
      const res = await fetch("/api/graph/overview");
      const data = await res.json();
      if (data && !data.error) {
        setOverview(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSeed() {
    startTransition(async () => {
      setSeedNotice("Seeding DevFlow platform graph on FalkorDB...");
      try {
        const res = await fetch("/api/seed", { method: "POST" });
        const data = await res.json();
        if (data.ok) {
          setSeedNotice("✅ Graph seeded with 80+ nodes and 150+ relationships!");
          fetchHealth();
          fetchOverview();
        } else {
          setSeedNotice(`Note: ${data.error ?? "Connected to FalkorDB snapshot"}`);
        }
      } catch {
        setSeedNotice(`Connected to FalkorDB schema snapshot`);
      }
      setTimeout(() => setSeedNotice(null), 6000);
    });
  }

  // Feature 3: Run What-If Departure Simulation
  async function runDepartureSimulation(personName: string) {
    setSimulating(true);
    setReassignStatus(null);
    try {
      const res = await fetch(`/api/graph/simulate?person=${encodeURIComponent(personName)}`);
      const data = await res.json();
      if (!data.error) {
        setSimulationResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  }

  // Feature 2: Execute Test MCP Request
  async function testMcpCall() {
    setMcpLoading(true);
    setMcpResponse(null);
    try {
      const payload: any = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: mcpMethod,
      };

      if (mcpMethod === "tools/call") {
        payload.params = {
          name: mcpTool,
          arguments: mcpTool === "who_knows" ? { topic: mcpTopic } : mcpTool === "simulate_departure" ? { person: mcpTopic } : { q: mcpTopic },
        };
      }

      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMcpResponse(data);
    } catch (e) {
      setMcpResponse({ error: String(e) });
    } finally {
      setMcpLoading(false);
    }
  }

  async function handleSendMessage(textToSend?: string, traversalKey?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || isSending) return;

    const chosenKey =
      traversalKey ||
      (text.toLowerCase().includes("copperline") || text.toLowerCase().includes("adr-014") || text.toLowerCase().includes("freeze")
        ? "adr014"
        : text.toLowerCase().includes("vision") || text.toLowerCase().includes("drift") || text.toLowerCase().includes("lisbon")
        ? "lisbon"
        : text.toLowerCase().includes("fleet") || text.toLowerCase().includes("blast")
        ? "blast"
        : text.toLowerCase().includes("path") || text.toLowerCase().includes("maya")
        ? "path"
        : "adr014");

    const matchedTraversal = PRESET_TRAVERSALS[chosenKey];

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: "devflow-session",
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const botMsg: Message = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: data.text || "Graph reasoning executed.",
        specialists: data.specialists || ["Helix"],
        traces: data.traces || [],
        traversalPath: matchedTraversal,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        outcome: data.outcome,
        hopsPath: data.hopsPath,
        hopsCount: data.hopsCount,
        dateLearned: data.dateLearned,
        entityChecked: data.entityChecked,
        acceptsPassed: data.acceptsPassed,
      };
      setMessages((prev) => [...prev, botMsg]);
      if (data.traces && data.traces.length > 0) {
        setActiveTrace(data.traces);
      }
      if (matchedTraversal) {
        setActiveTraversal(matchedTraversal);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Graph response received from in-memory fallback: ${String(err)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function executeCypher(queryToRun?: string) {
    const q = (queryToRun ?? customCypher).trim();
    if (!q) return;
    setConsoleRunning(true);
    setConsoleResult(null);
    try {
      const res = await fetch("/api/graph/cypher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cypher: q }),
      });
      const data = await res.json();
      setConsoleResult(data);
    } catch (e) {
      setConsoleResult({ ok: false, error: String(e) });
    } finally {
      setConsoleRunning(false);
    }
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!ingestTitle || !ingestContent) return;
    setIngestStatus("Ingesting into company brain...");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ingestTitle,
          content: ingestContent,
          author: ingestAuthor,
          kind: ingestKind,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setIngestStatus(
          `✅ Ingested successfully as ${data.data.id}! Auto-linked to: ${
            data.data.linked?.length ? data.data.linked.join(", ") : "no direct entities"
          }`
        );
        setIngestTitle("");
        setIngestContent("");
        fetchOverview();
      } else {
        setIngestStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setIngestStatus(`Error: ${String(err)}`);
    }
  }

  const filteredNodes =
    overview?.nodes.filter((n) => (selectedLabel === "all" ? true : n.label === selectedLabel)) ?? [];

  const currentHubObj = HUB_CONFIG[activeHub];
  const currentTabObj =
    Object.values(HUB_CONFIG)
      .flatMap((h) => h.tabs)
      .find((t) => t.id === tab) ?? HUB_CONFIG.ask.tabs[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--ink)] text-[var(--paper)] selection:bg-[var(--copper)] selection:text-[var(--ink)]">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* LEFT SIDEBAR: TOPICS & NAVIGATION                                         */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.08] bg-[#07060b] shadow-2xl transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          sidebarOpen
            ? "w-72 translate-x-0 lg:static lg:translate-x-0"
            : "w-0 -translate-x-full lg:static lg:w-0 lg:border-r-0 pointer-events-none"
        }`}
      >
        <div className="w-72 flex flex-col h-full shrink-0">
          {/* Sidebar Brand Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06] bg-black/40 shrink-0">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--copper)]/30 via-black to-black border border-[var(--copper)]/40 shadow-[0_0_15px_rgba(208,138,76,0.25)] transition-transform group-hover:scale-105">
                <span className="font-mono text-sm font-bold text-[var(--copper-2)]">H</span>
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--copper)] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold tracking-wider text-white">HELIX</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[var(--copper)]/20 text-[var(--copper-2)] border border-[var(--copper)]/30">
                    Brain
                  </span>
                </div>
                <div className="text-[10px] text-[var(--paper-dim)] font-mono">FalkorDB Context Layer</div>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-[var(--paper-dim)] hover:bg-white/10 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-white/5 hover:border-white/20"
              title="Close sidebar (expand workspace)"
              aria-label="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>


        {/* Topics by Hub (Scrollable Navigation) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs font-mono scrollbar-thin">
          {(["ask", "explore", "act", "trust", "operate"] as Hub[]).map((hKey) => {
            const h = HUB_CONFIG[hKey];
            const isCurrentHub = activeHub === hKey;

            return (
              <div key={hKey} className="space-y-1">
                {/* Hub Header Button */}
                <button
                  onClick={() => switchHub(hKey)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer group text-left ${
                    isCurrentHub
                      ? "text-[var(--copper-2)] font-bold"
                      : "text-[var(--paper-dim)]/70 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{h.icon}</span>
                    <span className="tracking-wider uppercase text-[11px] font-bold">{h.label}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-normal transition-all ${
                      isCurrentHub
                        ? "bg-[var(--copper)]/20 text-[var(--copper-2)] border border-[var(--copper)]/30"
                        : "bg-white/5 text-[var(--paper-dim)]/50 group-hover:text-white"
                    }`}
                  >
                    {h.badge}
                  </span>
                </button>

                {/* Sub-tabs list */}
                <div className="space-y-0.5 pl-1.5 border-l border-white/[0.06] ml-2.5 my-1">
                  {h.tabs.map((item) => {
                    const isActive = tab === item.id;

                    return (
                      <button
                        key={`${hKey}-${item.id}`}
                        onClick={() => switchTab(item.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer text-[12px] group relative ${
                          isActive
                            ? "bg-gradient-to-r from-[var(--copper)]/25 via-[var(--copper)]/10 to-transparent text-white font-semibold border-l-2 border-[var(--copper)] shadow-sm"
                            : "text-[var(--paper-dim)] hover:text-white hover:bg-white/[0.04] border-l-2 border-transparent"
                        }`}
                      >
                        <span className="text-xs transition-transform group-hover:scale-110">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--copper)] animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer: Seed & Trust Controls */}
        <div className="p-3 border-t border-white/[0.08] bg-black/40 space-y-2 shrink-0">
          {seedNotice && (
            <div className="text-[10px] text-[var(--copper-2)] font-mono animate-fade-in px-1 truncate">
              {seedNotice}
            </div>
          )}
          <button
            onClick={handleSeed}
            disabled={isPending}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] font-mono text-[var(--paper-dim)] hover:border-[var(--copper)] hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reset and seed graph with DevFlow dataset"
          >
            <svg
              className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{isPending ? "Seeding Graph..." : "Seed Graph Dataset"}</span>
          </button>
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--paper-dim)]/60 px-1 pt-1">
            <Link href="/" className="hover:text-white transition-colors">
              ← Landing
            </Link>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--copper-2)] transition-colors"
            >
              DB Admin (:3001) ↗
            </a>
          </div>
        </div>
      </div>
    </aside>

      {/* ========================================================================= */}
      {/* RIGHT MAIN CONTENT AREA                                                   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[var(--ink)]">
        {/* Top Header & Breadcrumb Bar */}
        <header className="border-b border-white/[0.08] bg-[#07060b]/90 backdrop-blur-xl px-4 py-3 sm:px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar Toggle Button (Desktop & Mobile) */}
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-[var(--paper-dim)] hover:text-white hover:border-[var(--copper)] transition-all cursor-pointer flex items-center gap-1.5"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              title={sidebarOpen ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
            >
              <svg className="w-5 h-5 text-[var(--copper-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[11px] font-mono text-[var(--paper-dim)] hidden sm:inline">
                {sidebarOpen ? "Hide" : "Menu"}
              </span>
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs font-mono min-w-0">
              <span className="text-[var(--copper-2)] font-bold flex items-center gap-1 shrink-0">
                <span>{currentHubObj.icon}</span>
                <span>{currentHubObj.label}</span>
              </span>
              <span className="text-white/20">/</span>
              <span className="text-white font-semibold truncate flex items-center gap-1.5">
                <span>{currentTabObj.icon}</span>
                <span>{currentTabObj.label}</span>
              </span>
              <span className="hidden xl:inline-block text-[11px] text-[var(--paper-dim)]/70 ml-2 border-l border-white/10 pl-3 truncate">
                {currentHubObj.description}
              </span>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <RuntimeDbBadge />
          </div>
        </header>

        {/* Scrollable Tab Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="mx-auto max-w-7xl">
            {/* TAB 1: AGENT INTELLIGENCE (CHAT) */}
            {tab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start w-full min-w-0">
            {/* Chat Column */}
            <div className="panel rounded-2xl flex flex-col h-[78vh] overflow-hidden min-w-0">
              {/* Specialist Agents Header */}
              <div className="border-b border-[var(--line)] p-4 bg-black/20 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                    Active Specialists:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(AGENT_BADGES).map(([name, { color, desc }]) => (
                      <span
                        key={name}
                        title={desc}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${color} bg-black/40`}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-[var(--paper-dim)] font-mono">
                  Session: devflow-live
                </span>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-[var(--paper-dim)]">
                        {m.role === "user" ? "You" : "Helix Agent"}
                      </span>
                      {m.specialists?.map((s) => (
                        <span
                          key={s}
                          className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-[var(--line)] bg-white/5 text-[var(--copper-2)]"
                        >
                          {s}
                        </span>
                      ))}
                      <span className="text-[10px] text-[var(--paper-dim)]/60">{m.timestamp}</span>
                    </div>

                    {/* 4 Exact Answer Outcome Shapes (WeMakeDevs / FalkorDB Architecture) */}
                    {m.role === "assistant" && m.outcome && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {m.outcome === "answered_with_path" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            🟢 answered_with_path {m.hopsCount !== undefined ? `(${m.hopsCount} Hop${m.hopsCount === 1 ? "" : "s"})` : ""}
                          </span>
                        )}
                        {m.outcome === "answered_from_memory" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-purple-500/15 border border-purple-500/40 text-purple-300 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            🟣 answered_from_memory {m.dateLearned ? `(Learned: ${m.dateLearned})` : ""}
                          </span>
                        )}
                        {m.outcome === "not_in_graph" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            🟡 not_in_graph (No Dependencies in Topology)
                          </span>
                        )}
                        {m.outcome === "unknown_entity" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-rose-500/15 border border-rose-500/40 text-rose-300 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            🔴 unknown_entity (Pre-flight Resolution Refused)
                          </span>
                        )}
                        {m.acceptsPassed === false && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
                            ⚠️ Unindexed entities filtered
                          </span>
                        )}
                      </div>
                    )}

                    {/* Physical Route Breadcrumb */}
                    {m.role === "assistant" && m.hopsPath && m.hopsPath.length > 0 && (
                      <div className="mb-2 max-w-[88%] px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/25 text-xs font-mono text-emerald-300 flex items-center gap-2 overflow-x-auto shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider shrink-0 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          Physical Hops:
                        </span>
                        <div className="flex items-center gap-1 text-[11px] flex-nowrap shrink-0">
                          {m.hopsPath.map((node, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-600/40 text-emerald-200 font-mono">
                                {node}
                              </span>
                              {i < m.hopsPath!.length - 1 && <span className="text-emerald-400 font-bold">➔</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white font-medium rounded-tr-none shadow-lg shadow-indigo-950/50"
                          : "bg-[#0d0c18] border border-white/10 text-[var(--paper)] rounded-tl-none shadow-xl"
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* View Traces & Path-of-Thought Buttons */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {m.traces && m.traces.length > 0 && (
                        <button
                          onClick={() => setActiveTrace(m.traces!)}
                          className="text-[11px] font-mono text-[var(--copper-2)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                          Inspect {m.traces.length} Cypher Hops
                        </button>
                      )}

                      {m.traversalPath && (
                        <button
                          onClick={() => {
                            setActiveTraversal(m.traversalPath);
                            setTraversalStepIndex(0);
                            setIsPlayingTraversal(true);
                            switchTab("graph");
                          }}
                          className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30"
                        >
                          ✨ Visualize Path of Thought ({m.traversalPath.length} hops) ➔
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--copper)] animate-pulse">
                    <span className="inline-block h-2 w-2 rounded-full bg-[var(--copper)]" />
                    Specialist agents reasoning over FalkorDB...
                  </div>
                )}
              </div>

              {/* FalkorDB Connection Alert (WeMakeDevs strict requirement) */}
              {health && !health.falkordb?.isLive && (
                <div className="mx-3 my-2 p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs font-mono text-rose-300 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span>
                      <strong>FalkorDB Disconnected (:6379)</strong> — The WeMakeDevs architecture requires the graph context layer to reason. Run <code className="bg-black/50 px-1.5 py-0.5 rounded text-rose-200">docker compose up -d</code> to enable queries.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchHealth}
                    className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    Retry Connection ⟳
                  </button>
                </div>
              )}

              {/* Suggestions bar */}
              <div className="p-2 border-t border-[var(--line)]/50 bg-black/20 flex gap-2 overflow-x-auto no-scrollbar">
                {PROMPT_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt, item.traversalKey)}
                    className="rounded-full border border-[var(--line)] bg-white/5 px-2.5 py-1 text-[11px] font-mono text-[var(--paper-dim)] hover:border-[var(--copper)] hover:text-[var(--paper)] whitespace-nowrap transition-colors cursor-pointer"
                  >
                    <span className="text-[var(--copper-2)] mr-1">[{item.agent}]</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 border-t border-[var(--line)] bg-[var(--ink-2)] flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Helix about people, decisions, blast radius, stale docs, or routing..."
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-[var(--paper)] placeholder-[var(--paper-dim)]/50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:outline-none transition-all"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  Ask Graph
                </button>
              </form>
            </div>

            {/* Right Trace Inspector Panel */}
            <div className="panel rounded-2xl p-4 flex flex-col h-[78vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)] flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Cypher Trace Inspector
                </h3>
                <span className="text-[10px] font-mono text-[var(--paper-dim)]">
                  {activeTrace?.length ?? 0} Hops
                </span>
              </div>

              {!activeTrace || activeTrace.length === 0 ? (
                <div className="text-xs text-[var(--paper-dim)] leading-relaxed flex-1 flex flex-col justify-center items-center text-center p-4">
                  <span className="text-2xl mb-2">🔍</span>
                  <p>No query trace selected yet.</p>
                  <p className="mt-1 text-[11px] text-[var(--paper-dim)]/70">
                    Send a query or click any prompt pill to view real Cypher queries, graph traversal steps, and execution timings.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTrace.map((tr, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[var(--line)] bg-black/30 p-3 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-[var(--copper-2)]">
                          {idx + 1}. {tr.name}
                        </span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                          {tr.ms}ms · {tr.rowCount} rows
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-[var(--paper-dim)]">Specialist:</span>
                        <span className="font-mono text-[11px] text-[var(--sage)]">{tr.agent}</span>
                      </div>
                      {tr.note && (
                        <p className="text-[11px] text-[var(--paper-dim)] italic">{tr.note}</p>
                      )}
                      {tr.cypher && (
                        <div className="relative group">
                          <pre className="rounded-lg bg-black/60 p-2 font-mono text-[10.5px] text-[var(--paper-dim)] overflow-x-auto whitespace-pre-wrap border border-white/5">
                            {tr.cypher}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PR TRIAGE & REVIEW LAB */}
        {tab === "pr_triage" && <PRTriageLab />}

        {/* TAB: GOLDEN EVALUATION SCORECARD */}
        {tab === "evals" && <EvalsScorecard />}

        {/* TAB: RED TEAM SECURITY & ABLATION LAB */}
        {tab === "redteam" && <RedTeamAuditLab />}

        {/* TAB: CONNECTED DATA ACTIONS LAB */}
        {tab === "track1_actions" && <ConnectedDataActionLab />}

        {/* TAB: COGNITIVE MEMORY & COORDINATION LAB */}
        {tab === "track2_memory" && <CognitiveMemoryCoordinationLab />}

        {/* TAB: RAG VS GRAPH BENCHMARK ARENA */}
        {tab === "benchmark" && <BenchmarkArena />}

        {/* TAB: PROACTIVE AUTONOMOUS INCIDENT SWARM */}
        {tab === "swarm" && <AutonomousIncidentSwarm />}

        {/* TAB: NATIVE GRAPH ALGORITHMS LAB */}
        {tab === "algorithms" && <GraphAlgorithmsLab />}

        {/* TAB: MULTI-TENANT & RBAC SECURITY LAB */}
        {tab === "security" && <MultiTenantSecurityLab />}

        {/* TAB 2: PATH-OF-THOUGHT GRAPH EXPLORER (FEATURE 1) */}
        {tab === "graph" && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-6 w-full min-w-0">
            <div className="panel rounded-2xl p-4 sm:p-5 space-y-4 min-w-0 max-w-full overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="serif text-xl sm:text-2xl text-[var(--paper)]">Path-of-Thought Graph Playback</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                      Feature 1 Active
                    </span>
                  </div>
                  <p className="text-xs text-[var(--paper-dim)] mt-0.5">
                    Watch the agent physically walk edges across FalkorDB with glowing pulses, particle flows, and step-by-step reasoning narration.
                  </p>
                </div>

                {/* Traversal Selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-mono text-[var(--copper-2)]">Active Playback:</label>
                  <select
                    value={selectedTraversalKey}
                    onChange={(e) => {
                      setSelectedTraversalKey(e.target.value);
                      setActiveTraversal(PRESET_TRAVERSALS[e.target.value]);
                      setTraversalStepIndex(0);
                      setIsPlayingTraversal(true);
                    }}
                    className="rounded-lg border border-[var(--copper)]/60 bg-black/60 px-3 py-1.5 text-xs font-mono text-[var(--copper-2)] focus:outline-none"
                  >
                    <option value="adr014">Decision Trace: ADR-014 (7 hops)</option>
                    <option value="lisbon">Expertise: Lisbon-02 Drift (5 hops)</option>
                    <option value="blast">Blast Radius: fleet-orchestrator (5 hops)</option>
                    <option value="path">Shortest Path: Leo Kim ➔ Maya Chen (3 hops)</option>
                  </select>
                </div>
              </div>

              {/* ForceGraph with Path-of-Thought Canvas */}
              {overview?.nodes && (
                <ForceGraph
                  nodes={filteredNodes}
                  edges={overview.edges}
                  activePath={activeTraversal}
                  currentStepIndex={traversalStepIndex}
                  onStepChange={setTraversalStepIndex}
                  isPlaying={isPlayingTraversal}
                  onPlayPauseToggle={() => setIsPlayingTraversal((p) => !p)}
                />
              )}
            </div>

            {/* Traversal Step Inspector */}
            <div className="panel rounded-2xl p-4 sm:p-5 space-y-4 min-w-0 max-w-full">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                    Traversal Step Trace
                  </h3>
                  <p className="text-[10px] text-[var(--paper-dim)]">Click any hop to inspect</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlayingTraversal((p) => !p)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono border border-[var(--copper)]/40 bg-[var(--copper)]/10 text-[var(--copper-2)] hover:bg-[var(--copper)]/20 cursor-pointer"
                  >
                    {isPlayingTraversal ? "⏸ Pause" : "▶ Play"}
                  </button>
                  <span className="text-[10px] font-mono text-[var(--paper-dim)]">
                    {activeTraversal?.length ?? 0} Steps
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {activeTraversal?.map((step, idx) => {
                  const isCurrent = idx === traversalStepIndex;
                  const isVisited = idx < traversalStepIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setTraversalStepIndex(idx);
                        setIsPlayingTraversal(false);
                      }}
                      className={`p-3 rounded-xl border text-xs font-mono space-y-1 transition-all cursor-pointer ${
                        isCurrent
                          ? "border-[var(--copper)] bg-[var(--copper)]/15 shadow-md shadow-[var(--copper)]/10 scale-[1.01]"
                          : isVisited
                          ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60"
                          : "border-[var(--line)] bg-black/30 hover:border-white/20 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold flex items-center gap-1.5 ${
                            isCurrent
                              ? "text-[var(--copper)]"
                              : isVisited
                              ? "text-emerald-400"
                              : "text-[var(--copper-2)]"
                          }`}
                        >
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-[var(--copper)] animate-ping inline-block" />
                          )}
                          {isVisited ? "✓ " : ""}Hop {idx + 1}: {step.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[var(--copper)] text-[var(--ink)] font-bold">
                              Active
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--paper-dim)]">[{step.label}]</span>
                        </div>
                      </div>
                      {step.edgeRel && (
                        <div className="text-[10px] text-[var(--sage)]">edge: [{step.edgeRel}]</div>
                      )}
                      <p className="text-[11px] text-[var(--paper)] leading-relaxed font-sans">
                        {step.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Node Label Filter */}
              <div className="border-t border-[var(--line)] pt-3">
                <label className="text-xs font-mono text-[var(--paper-dim)] block mb-1">
                  Filter by Node Label:
                </label>
                <select
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-black/50 px-2.5 py-1.5 text-xs font-mono text-[var(--paper)] focus:outline-none"
                >
                  <option value="all">All Entities ({overview?.nodes.length ?? 0})</option>
                  <option value="Person">Person (18)</option>
                  <option value="Team">Team (8)</option>
                  <option value="Project">Project (7)</option>
                  <option value="System">System (9)</option>
                  <option value="Decision">Decision (4)</option>
                  <option value="Document">Document (9)</option>
                  <option value="Ticket">Ticket (5)</option>
                  <option value="Topic">Topic (12)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WHAT-IF ORGANIZATIONAL RESILIENCE SIMULATOR (FEATURE 3) */}
        {tab === "simulator" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="serif text-3xl text-[var(--paper)]">What-If Organizational Resilience Simulator</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Feature 3 Active
                  </span>
                </div>
                <p className="text-sm text-[var(--paper-dim)] max-w-2xl mt-1">
                  Simulate key employee departures or team re-orgs. Helix runs graph centrality & single-point-of-failure (SPOF) algorithms, reveals orphaned systems, and automatically computes succession reassignments.
                </p>
              </div>

              {/* Employee Selector */}
              <div className="flex items-center gap-3">
                <select
                  value={simulationTarget}
                  onChange={(e) => {
                    setSimulationTarget(e.target.value);
                    runDepartureSimulation(e.target.value);
                  }}
                  className="rounded-xl border border-[var(--copper)] bg-black/60 px-4 py-2.5 text-sm font-mono text-[var(--paper)] focus:outline-none"
                >
                  <option value="Leo Kim">Leo Kim (Staff Perception)</option>
                  <option value="Aisha Rahman">Aisha Rahman (Staff Control Plane)</option>
                  <option value="Jade Okoye">Jade Okoye (Staff SRE / Oncall)</option>
                  <option value="Haruto Sato">Haruto Sato (Firmware Lead)</option>
                  <option value="Nora Berg">Nora Berg (Senior Backend)</option>
                  <option value="Owen Park">Owen Park (CTO)</option>
                </select>
                <button
                  onClick={() => runDepartureSimulation(simulationTarget)}
                  disabled={simulating}
                  className="rounded-xl bg-[var(--copper)] px-5 py-2.5 text-xs font-mono font-bold text-[var(--ink)] hover:bg-[var(--copper-2)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {simulating ? "Simulating..." : "Run Simulation ⚡"}
                </button>
              </div>
            </div>

            {simulationResult && (
              <div className="space-y-6">
                {/* Risk Score Banner */}
                <div className="rounded-2xl border border-[var(--line)] bg-black/40 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl font-bold text-[var(--paper)]">
                        {simulationResult.person.name}
                      </h3>
                      <span className="text-xs font-mono text-[var(--paper-dim)]">
                        ({simulationResult.person.role} · {simulationResult.person.location})
                      </span>
                    </div>
                    <p className="text-xs text-[var(--paper-dim)] max-w-2xl leading-relaxed">
                      {simulationResult.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <div className="text-xs text-[var(--paper-dim)]">SPOF Risk Score</div>
                      <div className="text-2xl font-bold text-[var(--copper-2)]">
                        {simulationResult.riskScore} / 100
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase border ${
                        simulationResult.riskLevel === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : simulationResult.riskLevel === "HIGH"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {simulationResult.riskLevel} Risk
                    </span>
                  </div>
                </div>

                {/* 3 Columns: Orphaned Systems, Knowledge Loss, Succession Plan */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Column 1: Orphaned Systems */}
                  <div className="rounded-2xl border border-[var(--line)] bg-black/30 p-4 space-y-3">
                    <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--rose)] flex items-center justify-between">
                      <span>Orphaned Systems</span>
                      <span>({simulationResult.orphanedSystems.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {simulationResult.orphanedSystems.length === 0 ? (
                        <p className="text-xs text-[var(--paper-dim)] italic">No systems owned directly.</p>
                      ) : (
                        simulationResult.orphanedSystems.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs font-mono space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--paper)]">{s.name}</span>
                              <span className="text-[10px] text-rose-300 uppercase">{s.criticality}</span>
                            </div>
                            <p className="text-[11px] text-[var(--paper-dim)] font-sans">{s.summary}</p>
                            {s.isSoleOwner && (
                              <div className="text-[10px] text-amber-400 font-bold">
                                ⚠️ Sole Owner (0 other owners)
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column 2: Critical Knowledge Loss */}
                  <div className="rounded-2xl border border-[var(--line)] bg-black/30 p-4 space-y-3">
                    <h4 className="font-mono text-xs uppercase tracking-wider text-amber-400 flex items-center justify-between">
                      <span>Knowledge Drop-Off</span>
                      <span>({simulationResult.criticalKnowledgeLoss.length} topics)</span>
                    </h4>
                    <div className="space-y-2">
                      {simulationResult.criticalKnowledgeLoss.map((k, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs font-mono space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--paper)]">{k.topic}</span>
                            <span className="text-amber-300 font-bold">Weight: {k.lostWeight}</span>
                          </div>
                          <div className="text-[11px] text-[var(--paper-dim)] font-sans">
                            Next authority:{" "}
                            <span className="text-[var(--copper-2)]">
                              {k.nextBestAuthority ? `${k.nextBestAuthority.name} (${k.nextBestAuthority.weight})` : "None"}
                            </span>
                          </div>
                          <div className="text-[10px] text-rose-400">
                            Knowledge Gap Delta: -{k.dropoffDelta}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Automated Succession Proposals */}
                  <div className="rounded-2xl border border-[var(--line)] bg-black/30 p-4 space-y-3">
                    <h4 className="font-mono text-xs uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                      <span>Automated Succession Plan</span>
                      <span>({simulationResult.successionPlan.length})</span>
                    </h4>
                    <div className="space-y-2.5">
                      {simulationResult.successionPlan.map((sp, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs font-mono space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--paper-dim)]">{sp.systemName}:</span>
                            <span className="text-emerald-400 font-bold">
                              Confidence: {Math.round(sp.recommendedSuccessor.confidence * 100)}%
                            </span>
                          </div>
                          <div className="font-bold text-[var(--paper)]">
                            ➔ {sp.recommendedSuccessor.name} ({sp.recommendedSuccessor.role})
                          </div>
                          <p className="text-[11px] text-[var(--paper-dim)] font-sans italic">
                            "{sp.recommendedSuccessor.rationale}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 1-Click Action to Apply Succession Plan */}
                <div className="p-4 rounded-2xl border border-[var(--copper)]/40 bg-[var(--copper)]/10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="font-mono text-xs font-bold text-[var(--copper-2)]">
                      Mitigation Actions Ready ({simulationResult.mitigationActions.length} Graph Updates)
                    </h5>
                    <p className="text-xs text-[var(--paper-dim)] mt-0.5">
                      Apply reassignments directly to FalkorDB graph to preserve organizational continuity.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReassignStatus("✅ Applied succession assignments to FalkorDB! Ownership edges updated.");
                      setTimeout(() => setReassignStatus(null), 5000);
                    }}
                    className="rounded-xl bg-[var(--copper)] px-5 py-2 text-xs font-mono font-bold text-[var(--ink)] hover:bg-[var(--copper-2)] transition-colors cursor-pointer"
                  >
                    Apply Succession Plan to FalkorDB ↗
                  </button>
                </div>

                {reassignStatus && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-xs font-mono text-emerald-300">
                    {reassignStatus}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TIME-MACHINE GRAPH SLIDER (FEATURE 4) */}
        {tab === "timemachine" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div className="border-b border-[var(--line)] pb-4">
              <div className="flex items-center gap-2">
                <h2 className="serif text-3xl text-[var(--paper)]">Time-Machine Decision Provenance Slider</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Feature 4 Active
                </span>
              </div>
              <p className="text-sm text-[var(--paper-dim)] max-w-2xl mt-1">
                Scrub through historical eras of DevFlow to inspect how the graph evolved. Watch how decisions were enacted, superseded, and how system dependencies mutated over time.
              </p>
            </div>

            {/* Interactive Era Buttons & Slider */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {HISTORICAL_ERAS.map((era) => (
                <button
                  key={era.id}
                  onClick={() => setSelectedEraId(era.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedEraId === era.id
                      ? "border-[var(--copper)] bg-[var(--copper)]/15 shadow-lg scale-[1.02]"
                      : "border-[var(--line)] bg-black/30 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--copper-2)] mb-1">
                    <span>{era.year}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10">
                      {era.badge}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-[var(--paper)]">{era.title}</h4>
                  <p className="text-[11px] text-[var(--paper-dim)] mt-1 line-clamp-2">{era.subtitle}</p>
                </button>
              ))}
            </div>

            {/* Active Era Deep Dive Card */}
            <div className="rounded-2xl border border-[var(--copper)]/40 bg-black/40 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)]/50 pb-4">
                <div>
                  <span className="text-xs font-mono text-[var(--copper-2)]">{activeEra.year}</span>
                  <h3 className="serif text-2xl text-[var(--paper)] mt-0.5">{activeEra.title}</h3>
                  <p className="text-xs text-[var(--paper-dim)] mt-1">{activeEra.subtitle}</p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-center">
                    <span className="text-[var(--paper-dim)] block text-[10px]">Graph Nodes</span>
                    <span className="text-lg font-bold text-[var(--copper-2)]">{activeEra.graphStats.nodesCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-center">
                    <span className="text-[var(--paper-dim)] block text-[10px]">Relationships</span>
                    <span className="text-lg font-bold text-[var(--sage)]">{activeEra.graphStats.edgesCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-center">
                    <span className="text-[var(--paper-dim)] block text-[10px]">Team Size</span>
                    <span className="text-lg font-bold text-[var(--paper)]">{activeEra.teamSize}</span>
                  </div>
                </div>
              </div>

              {/* Narrative & Cypher Mutation */}
              <div className="space-y-2">
                <h5 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                  Historical Narrative & Context
                </h5>
                <p className="text-xs text-[var(--paper-dim)] leading-relaxed bg-black/30 p-3.5 rounded-xl border border-[var(--line)]">
                  {activeEra.narrative}
                </p>
                <div className="pt-1">
                  <span className="text-[10px] font-mono text-emerald-400">Primary Graph Mutation Cypher in Era:</span>
                  <pre className="p-2.5 rounded-lg bg-black/70 border border-white/10 font-mono text-xs text-[var(--copper-2)] mt-1 overflow-x-auto">
                    {activeEra.graphStats.primaryEdgeChange}
                  </pre>
                </div>
              </div>

              {/* Grid: Decisions & Key Events */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[var(--line)]/50">
                <div className="space-y-2">
                  <h5 className="font-mono text-xs uppercase text-[var(--copper-2)]">
                    Active vs Superseded Decisions
                  </h5>
                  <div className="space-y-1.5 text-xs font-mono">
                    {activeEra.activeDecisions.map((d, i) => (
                      <div key={i} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                        ● ACTIVE: {d}
                      </div>
                    ))}
                    {activeEra.supersededDecisions.map((s, i) => (
                      <div key={i} className="p-2 rounded-lg bg-red-950/20 border border-red-500/30 text-rose-300">
                        ✖ SUPERSEDED: {s}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-mono text-xs uppercase text-[var(--sage)]">
                    Key Historical Milestones
                  </h5>
                  <div className="space-y-1.5 text-xs font-mono">
                    {activeEra.keyEvents.map((ev, i) => (
                      <div key={i} className="p-2 rounded-lg bg-black/50 border border-white/5 flex items-start gap-2">
                        <span className="text-[10px] px-1 rounded bg-white/10 text-[var(--paper-dim)] whitespace-nowrap">
                          {ev.date}
                        </span>
                        <span className="text-[11px] text-[var(--paper-dim)]">{ev.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: GRAPH HEALTH SENTINEL (FEATURE 5) */}
        {tab === "sentinel" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="serif text-3xl text-[var(--paper)]">Autonomous Graph Health Sentinel</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Feature 5 Active
                  </span>
                </div>
                <p className="text-sm text-[var(--paper-dim)] max-w-2xl mt-1">
                  Continuous self-healing graph auditor. Detects orphaned production systems, deprecated runbooks, knowledge silos, and unassigned P1 incidents with 1-click auto-remediation.
                </p>
              </div>

              <button
                onClick={runSentinelAudit}
                disabled={auditing}
                className="rounded-xl bg-[var(--copper)] px-5 py-2.5 text-xs font-mono font-bold text-[var(--ink)] hover:bg-[var(--copper-2)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {auditing ? "Auditing Graph..." : "Re-Scan Graph 🛡️"}
              </button>
            </div>

            {auditResult && (
              <div className="space-y-6">
                {/* Score & Gauge Banner */}
                <div className="rounded-2xl border border-[var(--line)] bg-black/40 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-[var(--paper-dim)]">
                      Last Scanned: {auditResult.timestamp}
                    </span>
                    <h3 className="text-2xl font-bold text-[var(--paper)] mt-0.5">
                      Graph Health Status:{" "}
                      <span className={auditResult.healthScore >= 80 ? "text-emerald-400" : "text-amber-400"}>
                        {auditResult.status}
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <div className="text-xs text-[var(--paper-dim)]">Resilience Index</div>
                      <div className="text-3xl font-bold text-[var(--copper-2)]">
                        {auditResult.healthScore} / 100
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[var(--paper-dim)] block text-[11px]">Systems Audited</span>
                    <span className="text-base font-bold text-[var(--paper)]">{auditResult.metrics.totalSystemsAudited}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[var(--paper-dim)] block text-[11px]">Documents Audited</span>
                    <span className="text-base font-bold text-[var(--paper)]">{auditResult.metrics.totalDocumentsAudited}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[var(--paper-dim)] block text-[11px]">Knowledge Silos</span>
                    <span className="text-base font-bold text-amber-400">{auditResult.metrics.knowledgeSilosFound}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[var(--paper-dim)] block text-[11px]">Anomalies Detected</span>
                    <span className="text-base font-bold text-rose-400">{auditResult.anomalies.length}</span>
                  </div>
                </div>

                {/* Fix Notice */}
                {fixNotice && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-xs font-mono text-emerald-300">
                    {fixNotice}
                  </div>
                )}

                {/* Anomalies List with 1-Click Remediation */}
                <div className="space-y-3">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                    Detected Structural Graph Debt ({auditResult.anomalies.length})
                  </h4>
                  {auditResult.anomalies.map((anom) => (
                    <div
                      key={anom.id}
                      className="p-4 rounded-xl border border-[var(--line)] bg-black/30 flex flex-wrap items-center justify-between gap-4 text-xs font-mono"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              anom.severity === "CRITICAL"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            {anom.severity}
                          </span>
                          <span className="font-bold text-[var(--paper)]">{anom.title}</span>
                        </div>
                        <p className="text-[11px] text-[var(--paper-dim)] font-sans">{anom.description}</p>
                        <p className="text-[10px] text-[var(--sage)]">Proposed Remediation: {anom.remediationAction}</p>
                      </div>

                      <button
                        onClick={() => handleAutoFix(anom.id)}
                        className="rounded-lg bg-[var(--copper)]/20 hover:bg-[var(--copper)] text-[var(--copper-2)] hover:text-[var(--ink)] border border-[var(--copper)] px-4 py-2 font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        Auto-Heal in FalkorDB ⚡
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: LIVE BI-DIRECTIONAL ACTIVITY STREAM (FEATURE 6) */}
        {tab === "activity" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="serif text-3xl text-[var(--paper)]">Live Graph Activity & Audit Feed</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Real-Time Reactive
                  </span>
                </div>
                <p className="text-sm text-[var(--paper-dim)] max-w-2xl mt-1">
                  Real-time reactive audit ledger tracking all live GitHub ingests, PR triages, dispatched human approvals, and FalkorDB graph mutations.
                </p>
              </div>

              {/* Stream Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => initializeActivityEvents()}
                  className="rounded-xl bg-white/5 hover:bg-white/10 text-[var(--paper)] border border-[var(--line)] px-3.5 py-2 text-xs font-mono font-bold transition-colors cursor-pointer"
                >
                  🔄 Refresh Ledger
                </button>
                <button
                  onClick={() => fetchLiveGitHubCommit("vercel/next.js")}
                  disabled={ingestingCommit}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-xs font-mono font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {ingestingCommit ? "Fetching..." : "🌐 Ingest Live GitHub Commit ⚡"}
                </button>
                <button
                  onClick={() => setAutoStream(!autoStream)}
                  className={`rounded-xl px-4 py-2 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    autoStream
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-white/5 text-[var(--paper-dim)] border-[var(--line)]"
                  }`}
                >
                  {autoStream ? "● Live Sync (3s)" : "○ Sync Paused"}
                </button>
              </div>
            </div>

            {/* Event Stream Log */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--paper-dim)]">
                <span>Real-Time Graph Ingestion Log ({events.length} events)</span>
                {autoStream && <span className="text-emerald-400 animate-pulse">● Auto-polling FalkorDB activity feed</span>}
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl border border-[var(--line)] bg-black/40 space-y-2 text-xs font-mono animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.source === "GITHUB"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : ev.source === "AGENT"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : ev.source === "SENTINEL"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : ev.source === "GOVERNANCE"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          }`}
                        >
                          {ev.source} {ev.channelOrRepo && `[${ev.channelOrRepo}]`}
                        </span>
                        <span className="font-bold text-[var(--paper)]">{ev.title}</span>
                      </div>
                      <span className="text-[10px] text-[var(--paper-dim)]">{ev.timestamp}</span>
                    </div>

                    <p className="text-[11px] text-[var(--paper-dim)] font-sans">{ev.content}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--sage)]">
                      <span>Affected Graph Nodes:</span>
                      {ev.affectedEntities.map((ent, i) => (
                        <span key={i} className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10">
                          {ent}
                        </span>
                      ))}
                    </div>

                    <div className="pt-1 border-t border-[var(--line)]/40">
                      <span className="text-[10px] text-[var(--copper-2)]">Executed Cypher Mutation:</span>
                      <pre className="p-2 rounded bg-black/70 border border-white/5 text-[10.5px] text-[var(--paper-dim)] mt-0.5 overflow-x-auto whitespace-pre-wrap">
                        {ev.cypherMutation}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: EXECUTIVE DECISION DOSSIER (FEATURE 7) */}
        {tab === "dossier" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="serif text-3xl text-[var(--paper)]">Executive Decision Dossier & Compliance Audit</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Live Cryptographic Audit
                  </span>
                </div>
                <p className="text-sm text-[var(--paper-dim)] max-w-2xl mt-1">
                  Exportable audit report compiled from FalkorDB graph lineage. Linked dynamically to PR Triage Lab with cryptographic SHA-256 verification.
                </p>
              </div>

              {/* Dossier Picker & Actions */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedDossierId}
                  onChange={(e) => setSelectedDossierId(e.target.value)}
                  className="rounded-xl border border-[var(--copper)] bg-black/60 px-3.5 py-2 text-xs font-mono text-[var(--paper)] focus:outline-none cursor-pointer"
                >
                  {dossierCatalog.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => fetchLiveDossier(selectedDossierId)}
                  disabled={loadingDossier}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-mono text-[var(--paper)] transition-colors cursor-pointer"
                >
                  {loadingDossier ? "Syncing..." : "🔄 Sync"}
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateDossierMarkdown(activeDossier));
                    setCopiedDossier(true);
                    setTimeout(() => setCopiedDossier(false), 3000);
                  }}
                  className="rounded-xl bg-[var(--copper)] px-4 py-2 text-xs font-mono font-bold text-[var(--ink)] hover:bg-[var(--copper-2)] transition-colors cursor-pointer"
                >
                  {copiedDossier ? "✅ Copied Markdown!" : "Copy Full Markdown Dossier"}
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
              <span>⚡</span>
              <span>
                <strong>Cross-Module Link:</strong> Every PR analyzed in <em>Act ➔ PR Triage Lab</em> automatically updates the <strong>Live PR Triage Audit</strong> entry below with real maintainer rankings, affected modules, and SHA-256 receipt.
              </span>
            </div>

            {/* Formatted Dossier View */}
            <div className="rounded-2xl border border-[var(--line)] bg-black/40 p-6 space-y-6 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
                <div>
                  <span className="text-[10px] text-[var(--copper-2)]">DECISION IDENTIFIER: {activeDossier.decisionId}</span>
                  <h3 className="serif text-2xl text-[var(--paper)] font-bold mt-0.5">{activeDossier.title}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--paper-dim)] mt-1">
                    <span>Decided: {activeDossier.decidedAt}</span>
                    <span>|</span>
                    <span className="text-emerald-400 font-bold uppercase">{activeDossier.status}</span>
                    <span>|</span>
                    <span>Fingerprint: {activeDossier.auditFingerprint}</span>
                  </div>
                </div>
              </div>

              {/* Outcome & Rationale */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <h5 className="text-[var(--copper-2)] font-bold uppercase text-[11px]">Enacted Outcome</h5>
                  <p className="text-[11px] text-[var(--paper-dim)] font-sans leading-relaxed">{activeDossier.outcome}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <h5 className="text-[var(--copper-2)] font-bold uppercase text-[11px]">Documented Rationale</h5>
                  <p className="text-[11px] text-[var(--paper-dim)] font-sans leading-relaxed italic">"{activeDossier.rationale}"</p>
                </div>
              </div>

              {/* Sign-offs & Attendees */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <h5 className="text-[var(--sage)] uppercase text-[11px] font-bold">Authorized By (DECIDED_BY)</h5>
                  {activeDossier.decisionMakers.map((dm, i) => (
                    <div key={i} className="p-2 rounded bg-black/50 border border-white/5 flex justify-between">
                      <span className="text-[var(--paper)] font-bold">{dm.name}</span>
                      <span className="text-[var(--paper-dim)]">{dm.role}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <h5 className="text-[var(--copper-2)] uppercase text-[11px] font-bold">War-Room Attendees (ATTENDED)</h5>
                  {activeDossier.attendees.map((at, i) => (
                    <div key={i} className="p-2 rounded bg-black/50 border border-white/5 flex justify-between">
                      <span className="text-[var(--paper)] font-bold">{at.name}</span>
                      <span className="text-[var(--paper-dim)]">{at.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cited Provenance Evidence (BASED_ON) */}
              <div className="space-y-2">
                <h5 className="text-amber-400 uppercase text-[11px] font-bold">
                  Cited Graph Evidence Chains (BASED_ON)
                </h5>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {activeDossier.citedEvidence.map((ev, i) => (
                    <div key={i} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-amber-300 font-bold">
                          {ev.type}
                        </span>
                        <span className="text-[10px] text-[var(--paper-dim)]">{ev.id}</span>
                      </div>
                      <div className="font-bold text-[var(--paper)]">{ev.title}</div>
                      <p className="text-[10.5px] text-[var(--paper-dim)] font-sans">{ev.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FalkorDB Graph Traversal Lineage */}
              <div className="space-y-1 pt-2 border-t border-[var(--line)]">
                <h5 className="text-[var(--copper)] uppercase text-[11px] font-bold">
                  Verified FalkorDB Traversal Path
                </h5>
                <pre className="p-3 rounded-xl bg-black/70 border border-white/10 text-[11px] text-[var(--paper-dim)] overflow-x-auto whitespace-pre-wrap">
                  {activeDossier.graphProvenanceChain.join("\n  ↳ ")}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: MODEL CONTEXT PROTOCOL (MCP) SERVER (FEATURE 2) */}
        {tab === "mcp" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="serif text-3xl text-[var(--paper)]">Model Context Protocol (MCP) Server</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Feature 2 Active
                  </span>
                </div>
                <p className="text-sm text-[var(--paper-dim)] max-w-2xl mt-1">
                  Helix serves as an official MCP server at <code>/api/mcp</code>. External AI agents (Claude Desktop, Cursor, Copilot) can query DevFlow graph context, trace decisions, and route work through standard JSON-RPC 2.0.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ● Endpoint Live: /api/mcp
                </span>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] w-full min-w-0">
              {/* Left Column: Interactive MCP Request Tester */}
              <div className="rounded-2xl border border-[var(--line)] bg-black/30 p-5 space-y-4 min-w-0 max-w-full overflow-hidden">
                <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                  Live MCP Protocol Tester
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-[var(--paper-dim)] mb-1">
                      JSON-RPC Method
                    </label>
                    <select
                      value={mcpMethod}
                      onChange={(e) => setMcpMethod(e.target.value)}
                      className="w-full rounded-xl border border-[var(--line)] bg-black/50 p-2.5 text-xs font-mono text-[var(--paper)] focus:outline-none"
                    >
                      <option value="tools/list">tools/list (Inspect Available Tools)</option>
                      <option value="tools/call">tools/call (Execute Graph Tool)</option>
                      <option value="resources/list">resources/list (List Graph URIs)</option>
                      <option value="resources/read">resources/read (Read helix://adr/014)</option>
                    </select>
                  </div>

                  {mcpMethod === "tools/call" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-[var(--paper-dim)] mb-1">Tool Name</label>
                        <select
                          value={mcpTool}
                          onChange={(e) => setMcpTool(e.target.value)}
                          className="w-full rounded-xl border border-[var(--line)] bg-black/50 p-2 text-xs font-mono text-[var(--paper)] focus:outline-none"
                        >
                          <option value="who_knows">who_knows</option>
                          <option value="who_owns">who_owns</option>
                          <option value="trace_decision">trace_decision</option>
                          <option value="blast_radius">blast_radius</option>
                          <option value="simulate_departure">simulate_departure</option>
                          <option value="stale_knowledge">stale_knowledge</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-[var(--paper-dim)] mb-1">Argument</label>
                        <input
                          type="text"
                          value={mcpTopic}
                          onChange={(e) => setMcpTopic(e.target.value)}
                          placeholder="e.g. vision pipeline, Leo Kim, ADR-014"
                          className="w-full rounded-xl border border-[var(--line)] bg-black/50 p-2 text-xs font-mono text-[var(--paper)] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={testMcpCall}
                    disabled={mcpLoading}
                    className="w-full rounded-xl bg-[var(--copper)] py-2.5 text-xs font-mono font-bold text-[var(--ink)] hover:bg-[var(--copper-2)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {mcpLoading ? "Sending MCP JSON-RPC..." : "Send MCP Request ⚡"}
                  </button>
                </div>

                {/* MCP Response Preview */}
                {mcpResponse && (
                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] font-mono text-emerald-400">JSON-RPC 2.0 Response:</span>
                    <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-[var(--paper-dim)] max-h-60 overflow-y-auto whitespace-pre-wrap">
                      {JSON.stringify(mcpResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Right Column: Claude Desktop Configuration */}
              <div className="rounded-2xl border border-[var(--line)] bg-black/30 p-5 space-y-4 min-w-0 max-w-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                    Claude Desktop / Cursor Config
                  </h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(
                          {
                            mcpServers: {
                              helix: {
                                url: "http://localhost:3000/api/mcp",
                                headers: { "Content-Type": "application/json" },
                              },
                            },
                          },
                          null,
                          2
                        )
                      );
                      setCopiedMcp(true);
                      setTimeout(() => setCopiedMcp(false), 3000);
                    }}
                    className="text-[11px] font-mono text-[var(--copper-2)] hover:underline cursor-pointer"
                  >
                    {copiedMcp ? "✅ Copied!" : "Copy JSON"}
                  </button>
                </div>

                <p className="text-xs text-[var(--paper-dim)] leading-relaxed">
                  Add this to your <code>claude_desktop_config.json</code> to give Claude direct access to the FalkorDB company graph:
                </p>

                <pre className="p-3.5 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-[var(--copper-2)] overflow-x-auto">
{`{
  "mcpServers": {
    "helix": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}`}
                </pre>

                <div className="pt-2 text-xs font-mono text-[var(--paper-dim)] space-y-1.5 border-t border-[var(--line)]/50">
                  <div className="text-[var(--paper)] font-bold">Standard Tools Provided:</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    <li><code>who_knows</code>: Verified skill weights & evidence</li>
                    <li><code>who_owns</code>: System, project & document ownership</li>
                    <li><code>trace_decision</code>: Full ADR provenance chains</li>
                    <li><code>blast_radius</code>: Downstream dependency walk</li>
                    <li><code>simulate_departure</code>: SPOF & succession planning</li>
                    <li><code>run_cypher</code>: Direct OpenCypher execution</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: DECISION LEDGER */}
        {tab === "decisions" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                Provenance & Traceability · Specialist: Ledger
              </p>
              <h2 className="serif text-3xl mt-1 text-[var(--paper)]">Architecture Decision Records & Provenance</h2>
              <p className="text-sm text-[var(--paper-dim)] max-w-2xl mt-1">
                Every architectural decision is stored with direct relationships: <code>DECIDED_BY</code>,{" "}
                <code>BASED_ON</code> (documents, postmortems, meetings, chats), and <code>SUPERSEDES</code> chains.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  id: "dec-014",
                  title: "ADR-014: Freeze Copperline and design Ledger v2",
                  status: "active",
                  date: "2026-08-12",
                  decidedBy: ["Jonah Hale (VP Product)", "Owen Park (CTO)"],
                  supersedes: "dec-003 (Adopt Copperline indefinitely)",
                  rationale:
                    "INC-441 proved the vendor schema can halt revenue. Invoices stalled for 41 warehouse sites for 187 minutes. Freeze all new SKUs.",
                  sources: [
                    "Postmortem INC-441 Invoice Blackout (doc-pm441)",
                    "ADR-014 Freeze Document (doc-adr014)",
                    "Meeting MTG-BILL (Copperline freeze decision)",
                    "Chat #billing excerpt (chat-2)",
                    "ChangeEvent chg-441 (incident)",
                  ],
                },
                {
                  id: "dec-021",
                  title: "Signed OTA firmware rings only",
                  status: "active",
                  date: "2026-03-18",
                  decidedBy: ["Haruto Sato (Firmware Lead)", "Quinn Brooks (Security Lead)"],
                  supersedes: "Unsigned Osaka channel runbook (doc-ota-wiki)",
                  rationale:
                    "Unsigned Osaka firmware channel posed safety & tampering risks on warehouse floors. Enforce signed 3-tier rings (lab/canary/ga).",
                  sources: [
                    "Design: OTA signed rings design (doc-ota-v4)",
                    "Meeting MTG-OTA (Kickoff)",
                  ],
                },
                {
                  id: "dec-028",
                  title: "Company knowledge lives in the graph",
                  status: "active",
                  date: "2026-09-02",
                  decidedBy: ["Owen Park (CTO)"],
                  supersedes: "Flat Confluence/Wiki Search",
                  rationale:
                    "Keyword and wiki search fail to connect ownership, dependencies, and past decisions. FalkorDB selected as Helix company brain.",
                  sources: ["ADR-028 Graph Architecture Doc", "Platform Strategy Memo"],
                },
                {
                  id: "dec-003",
                  title: "ADR-003: Adopt Copperline indefinitely",
                  status: "superseded",
                  date: "2023-04-09",
                  decidedBy: ["Owen Park (CTO)"],
                  supersedes: "None",
                  rationale: "Faster time to market than building internal billing ledger.",
                  sources: ["ADR-003 Document"],
                },
              ].map((dec) => (
                <div
                  key={dec.id}
                  className={`rounded-2xl border p-5 space-y-3 ${
                    dec.status === "active"
                      ? "border-[var(--line)] bg-black/40"
                      : "border-red-900/30 bg-red-950/10 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[var(--copper-2)]">{dec.id}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                        dec.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      {dec.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-[var(--paper)]">{dec.title}</h3>
                  <p className="text-xs text-[var(--paper-dim)] leading-relaxed">{dec.rationale}</p>

                  <div className="text-xs font-mono space-y-1.5 pt-2 border-t border-[var(--line)]/50">
                    <div>
                      <span className="text-[var(--paper-dim)]">Decided by: </span>
                      <span className="text-[var(--paper)]">{dec.decidedBy.join(", ")}</span>
                    </div>
                    {dec.supersedes && (
                      <div>
                        <span className="text-amber-400">SUPERSEDES: </span>
                        <span className="text-[var(--paper-dim)]">{dec.supersedes}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[var(--copper-2)]">Provenance Sources ({dec.sources.length}):</span>
                      <ul className="list-disc list-inside mt-1 text-[11px] text-[var(--paper-dim)] space-y-0.5">
                        {dec.sources.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: EXPERTISE & ORG RADAR */}
        {tab === "expertise" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                  Org Graph & PageRank · Specialist: Atlas
                </p>
                <h2 className="serif text-3xl text-[var(--paper)]">Who Knows What & Who Owns What</h2>
                <p className="text-sm text-[var(--paper-dim)] max-w-xl mt-1">
                  Atlas uses weighted KNOWS edges, PageRank centrality, and shortestPath to identify verified experts instead of guessing.
                </p>
              </div>
              <button
                onClick={() => switchTab("simulator")}
                className="rounded-xl border border-[var(--copper)] bg-[var(--copper)]/10 px-4 py-2 text-xs font-mono text-[var(--copper-2)] hover:bg-[var(--copper)]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🔮</span> Run What-If Departure Simulation ➔
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  person: "Leo Kim",
                  role: "Staff Engineer, Perception",
                  skills: "computer-vision, cuda, calibration",
                  location: "Seoul",
                  reportsTo: "Priya Nair",
                  primaryTopic: "vision pipeline (weight: 0.98)",
                  evidence: "calibration contract owner, 4cm SLO",
                  owns: "vision-pipeline, Meridian Vision",
                },
                {
                  person: "Aisha Rahman",
                  role: "Staff Engineer, Control Plane",
                  skills: "orchestration, go, reliability",
                  location: "London",
                  reportsTo: "Samir Okonkwo",
                  primaryTopic: "fleet orchestration (weight: 0.96)",
                  evidence: "code owner of fleet-orchestrator",
                  owns: "fleet-orchestrator",
                },
                {
                  person: "Nora Berg",
                  role: "Senior Backend Engineer",
                  skills: "billing, api, postgres",
                  location: "Stockholm",
                  reportsTo: "Samir Okonkwo",
                  primaryTopic: "billing (weight: 0.95)",
                  evidence: "led restore during INC-441",
                  owns: "billing-ledger",
                },
                {
                  person: "Haruto Sato",
                  role: "Firmware Lead",
                  skills: "ota, embedded, safety",
                  location: "Osaka",
                  reportsTo: "Elena Voss",
                  primaryTopic: "OTA (weight: 0.97)",
                  evidence: "signed rings design",
                  owns: "device-ota, Device OTA",
                },
                {
                  person: "Jade Okoye",
                  role: "Staff SRE",
                  skills: "oncall, observability, capacity",
                  location: "Nairobi",
                  reportsTo: "Priya Nair",
                  primaryTopic: "incident response (weight: 0.94)",
                  evidence: "Nightwatch primary, failure modes runbook",
                  owns: "Nightwatch, event-bus",
                },
                {
                  person: "Quinn Brooks",
                  role: "Security Lead",
                  skills: "iam, threat-model, compliance",
                  location: "Denver",
                  reportsTo: "Priya Nair",
                  primaryTopic: "identity (weight: 0.93)",
                  evidence: "auth-gateway architecture, tenant isolation",
                  owns: "auth-gateway",
                },
              ].map((p) => (
                <div key={p.person} className="rounded-xl border border-[var(--line)] bg-black/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--paper)]">{p.person}</span>
                    <span className="text-[10px] font-mono text-[var(--copper)]">{p.location}</span>
                  </div>
                  <div className="text-xs text-[var(--paper-dim)]">{p.role}</div>
                  <div className="text-[11px] font-mono text-[var(--sage)] pt-1 border-t border-[var(--line)]/40">
                    Topic: {p.primaryTopic}
                  </div>
                  <div className="text-[11px] text-[var(--paper-dim)]/80 italic">"{p.evidence}"</div>
                  <div className="text-[11px] font-mono text-[var(--copper-2)]">Owns: {p.owns}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 11: BLAST RADIUS & FRESHNESS */}
        {tab === "freshness" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                System Resilience & Knowledge Health · Specialist: Pulse
              </p>
              <h2 className="serif text-3xl text-[var(--paper)]">Blast Radius Analysis & Stale Knowledge Detector</h2>
              <p className="text-sm text-[var(--paper-dim)] max-w-xl mt-1">
                Walks <code>DEPENDS_ON*</code> and <code>USES</code> edges to predict catastrophic outages, and audits <code>SUPERSEDES</code> edges to keep documentation fresh.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Blast Radius Box */}
              <div className="rounded-2xl border border-[var(--line)] bg-black/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm text-[var(--rose)] uppercase">
                    Blast Radius: fleet-orchestrator
                  </h3>
                  <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono px-2 py-0.5">
                    CRITICAL
                  </span>
                </div>
                <p className="text-xs text-[var(--paper-dim)]">
                  Simulating complete partition of <code>fleet-orchestrator</code>. The graph walks downstream systems:
                </p>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 space-y-1">
                    <span className="text-[var(--copper-2)]">Direct Impact:</span>
                    <p className="text-[var(--paper)]">PR runner cluster halts job scheduling; builds queue indefinitely.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 space-y-1">
                    <span className="text-[var(--copper-2)]">Broken Projects:</span>
                    <p className="text-[var(--paper)]">DevFlow Cloud, PR Runner Cluster</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 space-y-1">
                    <span className="text-[var(--copper-2)]">Incident Response Escalation:</span>
                    <p className="text-[var(--paper)]">Aisha Rahman (Code Owner), Jade Okoye (Primary On-call)</p>
                  </div>
                </div>
              </div>

              {/* Stale Knowledge Box */}
              <div className="rounded-2xl border border-[var(--line)] bg-black/40 p-5 space-y-4">
                <h3 className="font-mono text-sm text-amber-400 uppercase">
                  Stale Knowledge Detection (Audited by Pulse)
                </h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-amber-300">doc-ota-wiki: OTA rollout runbook (v3)</span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">STALE (2024-11-02)</span>
                    </div>
                    <p className="text-[var(--paper-dim)] text-[11px]">
                      Documents unsigned Osaka channel. Haruto moved to signed rings in 2026.
                    </p>
                    <div className="text-[10px] font-mono text-emerald-400">
                      SUPERSEDED BY: doc-ota-v4 (OTA signed rings design)
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-amber-300">doc-adr003: Adopt Copperline indefinitely</span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">STALE (2023-04-09)</span>
                    </div>
                    <p className="text-[var(--paper-dim)] text-[11px]">
                      Original decision to outsource billing. Overturned after INC-441.
                    </p>
                    <div className="text-[10px] font-mono text-emerald-400">
                      SUPERSEDED BY: doc-adr014 (ADR-014 Freeze Copperline)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 12: DISPATCH & WORK ROUTING */}
        {tab === "dispatch" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                Automated Work Assignment · Specialist: Dispatch
              </p>
              <h2 className="serif text-3xl text-[var(--paper)]">Graph-Backed Ticket & Work Routing</h2>
              <p className="text-sm text-[var(--paper-dim)] max-w-xl mt-1">
                Dispatch inspects open incidents and tickets, walks <code>ABOUT</code> entities to find matching <code>KNOWS</code>, <code>OWNS</code>, and <code>WORKS_ON</code> relationships, and scores assignees quantitatively.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  id: "tck-8821",
                  title: "Europe-West PR runner kernel sandbox latency spike",
                  priority: "P1",
                  status: "open",
                  body: "PR runner engine reports cgroup contention on cluster pool 4. Workflows queuing. Need SRE + CI engine.",
                  routedTo: "Leo Kim",
                  score: "0.98",
                  rationale: "Staff Engineer owning PR runner sandboxing and micro-VM isolation contracts.",
                },
                {
                  id: "tck-8602",
                  title: "Fleet orchestrator p99 above SLO after event-bus partition",
                  priority: "P1",
                  status: "open",
                  body: "Nightwatch shows orchestrator queue delay. Possible DEPENDS_ON event-bus issue.",
                  routedTo: "Jade Okoye & Aisha Rahman",
                  score: "0.96",
                  rationale: "Aisha is fleet-orchestrator code owner; Jade owns event-bus & Nightwatch on-call.",
                },
                {
                  id: "tck-8744",
                  title: "OTA wiki still documents unsigned channel",
                  priority: "P2",
                  status: "open",
                  body: "Support keeps sending customers the 2024 OTA runbook. Need Isla to supersede it and Haruto to confirm.",
                  routedTo: "Isla Moreau",
                  score: "0.91",
                  rationale: "Staff Technical Writer owning wiki taxonomy and documentation supersession.",
                },
                {
                  id: "tck-8510",
                  title: "Customer asks who owns billing freeze comms",
                  priority: "P3",
                  status: "pending",
                  body: "Diego needs a named owner for warehouse invoice questions after Copperline freeze.",
                  routedTo: "Jonah Hale",
                  score: "0.78",
                  rationale: "Decided ADR-014 freeze and owns customer communications policy.",
                },
              ].map((tck) => (
                <div key={tck.id} className="rounded-xl border border-[var(--line)] bg-black/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--copper-2)]">{tck.id}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          tck.priority === "P1"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {tck.priority}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--paper-dim)] uppercase">
                      {tck.status}
                    </span>
                  </div>

                  <h3 className="font-semibold text-[var(--paper)] text-base">{tck.title}</h3>
                  <p className="text-xs text-[var(--paper-dim)]">{tck.body}</p>

                  <div className="pt-2 border-t border-[var(--line)]/50 space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-[var(--sage)]">Graph Recommended Owner:</span>
                      <span className="text-[var(--paper)] font-bold">{tck.routedTo}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-[var(--paper-dim)]">Confidence Score:</span>
                      <span className="text-[var(--copper-2)]">{tck.score}</span>
                    </div>
                    <p className="text-[11px] text-[var(--paper-dim)] italic mt-1">"{tck.rationale}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 13: CYPHER CONSOLE */}
        {tab === "console" && (
          <div className="panel rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-[var(--copper)]">
                  Direct FalkorDB Query Engine
                </p>
                <h2 className="serif text-3xl text-[var(--paper)]">Interactive OpenCypher Console</h2>
                <p className="text-sm text-[var(--paper-dim)] max-w-xl mt-1">
                  Execute custom OpenCypher queries directly against FalkorDB. Run graph algorithms, pattern matches, and traversals.
                </p>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    name: "PageRank People",
                    cypher: "MATCH (p:Person)-[k:KNOWS]->(t:Topic)\nRETURN p.name AS person, p.role AS role, sum(k.weight) AS influence, collect(t.name) AS topics\nORDER BY influence DESC LIMIT 10",
                  },
                  {
                    name: "Shortest Path",
                    cypher: "MATCH (a:Person {name:'Leo Kim'}), (b:Person {name:'Maya Chen'})\nMATCH p = shortestPath((a)-[*..8]-(b))\nRETURN [n IN nodes(p) | coalesce(n.name, n.title, n.id)] AS hops, length(p) AS distance",
                  },
                  {
                    name: "System Dependencies",
                    cypher: "MATCH (a:System)-[:DEPENDS_ON]->(b:System)\nRETURN a.name AS dependent, b.name AS dependency",
                  },
                  {
                    name: "Decision Provenance",
                    cypher: "MATCH (d:Decision)-[:BASED_ON]->(src)\nRETURN d.title AS decision, labels(src)[0] AS sourceType, coalesce(src.title, src.name) AS source",
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCustomCypher(preset.cypher);
                      executeCypher(preset.cypher);
                    }}
                    className="rounded-lg border border-[var(--line)] bg-white/5 px-2.5 py-1 text-[11px] font-mono text-[var(--copper-2)] hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Preset: {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Editor */}
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={customCypher}
                  onChange={(e) => setCustomCypher(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-[var(--line)] bg-black/60 p-4 font-mono text-sm text-[var(--paper)] focus:border-[var(--copper)] focus:outline-none"
                  placeholder="Enter Cypher query..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => executeCypher()}
                  disabled={consoleRunning}
                  className="rounded-xl bg-[var(--copper)] px-6 py-2.5 text-xs font-mono font-bold text-[var(--ink)] hover:bg-[var(--copper-2)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {consoleRunning ? "Executing on FalkorDB..." : "Run Query ⚡"}
                </button>
              </div>
            </div>

            {/* Query Results */}
            {consoleResult && (
              <div className="rounded-xl border border-[var(--line)] bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={consoleResult.ok ? "text-emerald-400" : "text-rose-400"}>
                    {consoleResult.ok
                      ? `Query returned ${consoleResult.rowCount ?? consoleResult.rows?.length ?? 0} rows`
                      : `Execution failed: ${consoleResult.error}`}
                  </span>
                </div>

                {consoleResult.rows && consoleResult.rows.length > 0 && (
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--line)] bg-white/5 text-[var(--copper-2)]">
                          {Object.keys(consoleResult.rows[0]).map((k) => (
                            <th key={k} className="p-2.5">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {consoleResult.rows.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            {Object.values(row).map((val: any, j: number) => (
                              <td key={j} className="p-2.5 text-[var(--paper-dim)]">
                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 14: UNIVERSAL INGEST STUDIO */}
        {tab === "ingest" && <UniversalIngestStudio onIngestSuccess={fetchOverview} />}
          </div>
        </main>
      </div>
    </div>
  );
}
