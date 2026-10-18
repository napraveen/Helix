export type MemoryKind = "episodic" | "semantic" | "procedural";

export type CognitiveMemory = {
  id: string;
  kind: MemoryKind;
  title: string;
  content: string;
  agent: string;
  sessionId: string;
  tenantId: string;
  importance: number; // 0.0 - 1.0
  accessCount: number;
  lastRecalledAt: string;
  tags: string[];
  associatedEntity?: string;
  decayRate: number; // decay per hour
  effectiveStrength: number; // current memory retention percentage
};

export type BlackboardTask = {
  id: string;
  title: string;
  status: "INITIATED" | "CLAIMED" | "IN_PROGRESS" | "COMPLETED" | "PENDING" | "DEAD_LETTER";
  initiatorAgent?: string;
  currentAgent?: string;
  handoffCount?: number;
  payload?: Record<string, unknown>;
  history?: Array<{
    agent: string;
    action: string;
    timestamp: string;
    cypherMutation?: string;
  }>;
  version?: number;
  leaseOwner?: string;
  leaseExpiresAt?: number;
  retryCount?: number;
  deadLetterReason?: string;
  handoffLedger?: Array<{
    step: number;
    fromAgent: string;
    toAgent: string;
    action: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }>;
};

export type ConcurrentStressResult = {
  concurrencyLevel: number;
  totalOperations: number;
  completedOperations: number;
  durationMs: number;
  throughputOpsSec: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  lockContentionErrors: number;
  consistencyCheck: "100% ACID VERIFIED" | "FAILED";
  workers: Array<{
    workerId: number;
    opsCompleted: number;
    avgLatencyMs: number;
  }>;
  timestamp?: string;
  targetInstance?: string;
  breakingPointConcurrency?: number;
  breakingPointReason?: string;
  levelsTested?: Array<unknown>;
};

export const INITIAL_COGNITIVE_MEMORIES: CognitiveMemory[] = [
  // Episodic Memories (Events, Incidents, Sessions)
  {
    id: "mem-ep-441",
    kind: "episodic",
    title: "INC-441 Billing Webhook Blackout Restoration Protocol",
    content: "Nora Berg resolved billing-ledger consumer hang by resetting Kafka consumer group offsets to latest committed partition in ADR-014 war-room.",
    agent: "Ledger",
    sessionId: "session-warroom-441",
    tenantId: "devflow-cloud",
    importance: 0.96,
    accessCount: 42,
    lastRecalledAt: "2026-10-15T19:40:00Z",
    tags: ["billing", "outage", "kafka", "ADR-014"],
    associatedEntity: "billing-ledger",
    decayRate: 0.02,
    effectiveStrength: 94,
  },
  {
    id: "mem-ep-8821",
    kind: "episodic",
    title: "Europe-West Runner Queue Latency Resolution",
    content: "Leo Kim tuned Europe-West micro-VM runner pool cgroups with sub-millisecond container startup time after memory contention.",
    agent: "Dispatch",
    sessionId: "session-europe-west",
    tenantId: "devflow-cloud",
    importance: 0.88,
    accessCount: 19,
    lastRecalledAt: "2026-10-16T08:15:00Z",
    tags: ["europe-west", "pr-runner", "ci-cd-pipelines"],
    associatedEntity: "pr-runner-engine",
    decayRate: 0.03,
    effectiveStrength: 86,
  },
  // Semantic Memories (Distilled facts, concepts, entity relations)
  {
    id: "mem-sem-01",
    kind: "semantic",
    title: "Leo Kim: Primary CI/CD Engine & Sandbox Authority",
    content: "Leo Kim holds definitive domain authority (weight 0.98) on container sandboxing and micro-VM runner engines across Europe and US.",
    agent: "Atlas",
    sessionId: "shared-corporate-brain",
    tenantId: "devflow-cloud",
    importance: 0.95,
    accessCount: 88,
    lastRecalledAt: "2026-10-16T14:10:00Z",
    tags: ["expertise", "ci-cd", "sandboxing"],
    associatedEntity: "Leo Kim",
    decayRate: 0.01,
    effectiveStrength: 98,
  },
  {
    id: "mem-sem-02",
    kind: "semantic",
    title: "Legacy Billing Vendor Deprecation Invariant",
    content: "ADR-014 explicitly froze legacy billing vendor integration. No new services may establish API connections to legacy billing endpoints.",
    agent: "Ledger",
    sessionId: "shared-corporate-brain",
    tenantId: "devflow-cloud",
    importance: 0.99,
    accessCount: 112,
    lastRecalledAt: "2026-10-16T15:22:00Z",
    tags: ["architecture", "ADR-014", "vendor-freeze"],
    associatedEntity: "billing-ledger",
    decayRate: 0.005,
    effectiveStrength: 99,
  },
  // Procedural Memories (Agent runbooks & operational SOPs)
  {
    id: "mem-proc-01",
    kind: "procedural",
    title: "P1 Emergency Blast Radius & Escalation SOP v3.1",
    content: "Step 1: Pulse audits downstream DEPENDS_ON* graph. Step 2: Atlas fetches highest KNOWS weight author. Step 3: Ledger blocks obsolete runbooks. Step 4: Dispatch creates mutated ticket in FalkorDB.",
    agent: "Helix",
    sessionId: "agent-coordination-core",
    tenantId: "devflow-cloud",
    importance: 0.98,
    accessCount: 154,
    lastRecalledAt: "2026-10-16T16:00:00Z",
    tags: ["SOP", "emergency", "incident-swarm"],
    associatedEntity: "workflow-orchestrator",
    decayRate: 0.002,
    effectiveStrength: 99,
  },
  {
    id: "mem-proc-02",
    kind: "procedural",
    title: "ADR Supersession & Architectural Invalidation Workflow",
    content: "When authoring a replacement ADR, create directed [:SUPERSEDES] edge to prior ADR node in FalkorDB. Update old decision status to 'SUPERSEDED' and invalidate cached agent runbooks.",
    agent: "Ledger",
    sessionId: "agent-coordination-core",
    tenantId: "devflow-cloud",
    importance: 0.92,
    accessCount: 63,
    lastRecalledAt: "2026-10-16T12:00:00Z",
    tags: ["ADR", "governance", "supersession"],
    associatedEntity: "ADR-003",
    decayRate: 0.01,
    effectiveStrength: 91,
  },
];
