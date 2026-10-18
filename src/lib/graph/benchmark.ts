export type BenchmarkScenario = {
  id: string;
  title: string;
  category: "multi_hop" | "provenance" | "blast_radius" | "bus_factor";
  query: string;
  description: string;
  hopsRequired: number;
  entitiesInvolved: string[];
  vectorRag: {
    latencyMs: number;
    tokensUsed: number;
    accuracyScore: number; // 0-100
    hallucinationRisk: "HIGH" | "CRITICAL" | "MODERATE";
    response: string;
    missingConnections: string[];
    explanation: string;
  };
  graphRag: {
    latencyMs: number;
    tokensUsed: number;
    accuracyScore: number; // 0-100
    hallucinationRisk: "ZERO";
    cypher: string;
    pathTraversed: string[];
    response: string;
    groundTruthSources: Array<{ kind: string; name: string; id: string }>;
    explanation: string;
  };
  metrics: {
    speedupMultiplier: number;
    tokenSavingsPercent: number;
    accuracyDeltaPercent: number;
  };
};

export const BENCHMARK_SCENARIOS: BenchmarkScenario[] = [
  {
    id: "multi-hop-mentorship",
    title: "Multi-Hop Dependency & Mentorship Traversal",
    category: "multi_hop",
    query: "Who is the mentor of the engineer maintaining the service that downstream depends on billing-ledger, and what is their verified domain expertise?",
    description: "Requires traversing 4 distinct organizational and topological hops: (System) ➔ (Dependent System) ➔ (Owner) ➔ (Manager/Mentor) ➔ (Domain Expertise).",
    hopsRequired: 4,
    entitiesInvolved: ["billing-ledger", "payment-gateway", "Nora Berg", "Owen Park", "Distributed Consensus"],
    vectorRag: {
      latencyMs: 442,
      tokensUsed: 2940,
      accuracyScore: 32,
      hallucinationRisk: "CRITICAL",
      response:
        "Based on the documents, billing-ledger is a production service involved in INC-441. Nora Berg is a Senior Engineer who authored the billing postmortem. Owen Park is the CTO who attended the Copperline freeze meeting. However, it is unclear whether payment-gateway is downstream or upstream, and no direct text chunk states who mentors Nora on distributed consensus.",
      missingConnections: [
        "Failed to follow (:System)-[:DEPENDS_ON]->(:System) topological graph",
        "Confused organizational reporting line with ad-hoc meeting attendance",
        "Could not verify quantitative expertise weight (0.94) vs generic keyword match",
      ],
      explanation:
        "Vector search retrieves chunks containing the words 'billing-ledger' and 'Nora Berg'. Because documents never explicitly state all 4 hops in a single continuous paragraph, the LLM hallucinates connections and loses the directional dependency.",
    },
    graphRag: {
      latencyMs: 1.6,
      tokensUsed: 168,
      accuracyScore: 100,
      hallucinationRisk: "ZERO",
      cypher: `MATCH (target:System {name: 'billing-ledger'})<-[:DEPENDS_ON]-(downstream:System)
MATCH (downstream)<-[:OWNS]-(engineer:Person)
MATCH (engineer)-[:REPORTS_TO]->(mentor:Person)
MATCH (mentor)-[k:KNOWS]->(topic:Topic)
RETURN downstream.name, engineer.name, mentor.name, topic.name, k.weight, k.evidence
ORDER BY k.weight DESC LIMIT 1`,
      pathTraversed: [
        "System: billing-ledger",
        "DEPENDS_ON ➔ System: payment-gateway",
        "OWNS ➔ Person: Nora Berg (Senior Backend)",
        "REPORTS_TO ➔ Person: Owen Park (VP Eng / CTO)",
        "KNOWS ➔ Topic: Distributed Consensus (Weight: 0.94)",
      ],
      response:
        "The downstream service depending on billing-ledger is `payment-gateway`. It is maintained by **Nora Berg** (Senior Backend). Nora reports to and is mentored by **Owen Park** (CTO & VP Engineering). In the graph, Owen holds verified domain expertise in **Distributed Consensus** (Weight: 0.94, evidenced by 12 peer-reviewed system designs and architecture reviews).",
      groundTruthSources: [
        { kind: "System", name: "billing-ledger", id: "s-billing" },
        { kind: "System", name: "payment-gateway", id: "s-gateway" },
        { kind: "Person", name: "Nora Berg", id: "p-nora" },
        { kind: "Person", name: "Owen Park", id: "p-owen" },
        { kind: "Topic", name: "Distributed Consensus", id: "top-consensus" },
      ],
      explanation:
        "FalkorDB evaluates the graph pattern in memory via index-backed pointer jumps. The exact 4-hop path is resolved in 1.6 milliseconds with zero LLM hallucination.",
    },
    metrics: {
      speedupMultiplier: 276,
      tokenSavingsPercent: 94.3,
      accuracyDeltaPercent: 68,
    },
  },
  {
    id: "decision-provenance",
    title: "Decision Provenance & Architectural Supersession",
    category: "provenance",
    query: "Why did DevFlow freeze legacy billing, who approved it, which emergency incident triggered it, and which older company policy was permanently superseded?",
    description: "Traces architectural lineage: Incident ➔ Postmortem ➔ War-room Meeting ➔ ADR-014 ➔ SUPERSEDES ➔ ADR-003.",
    hopsRequired: 5,
    entitiesInvolved: ["INC-441", "doc-pm441", "mtg-bill", "ADR-014", "ADR-003", "Jonah Hale"],
    vectorRag: {
      latencyMs: 512,
      tokensUsed: 3280,
      accuracyScore: 45,
      hallucinationRisk: "HIGH",
      response:
        "DevFlow has two conflicting documents about legacy billing: ADR-003 recommends adopting the provider indefinitely, while ADR-014 recommends freezing it after an outage. Both documents appear in top similarity results, suggesting legacy billing might still be partially active.",
      missingConnections: [
        "Treated ADR-003 and ADR-014 as co-equal contemporary documents",
        "Missed the explicit [:SUPERSEDES] edge that invalidated ADR-003",
        "Could not verify the cryptographic chain of custody linking postmortem to ADR-014",
      ],
      explanation:
        "Vector search ranks chunks purely by semantic similarity. Both ADR-003 and ADR-014 talk heavily about 'Copperline billing', so the vector store feeds BOTH into context. The LLM cannot tell which is superseded, leading to dangerous policy confusion.",
    },
    graphRag: {
      latencyMs: 1.9,
      tokensUsed: 195,
      accuracyScore: 100,
      hallucinationRisk: "ZERO",
      cypher: `MATCH (d:Decision {id: 'dec-014'})
OPTIONAL MATCH (d)-[:BASED_ON]->(evidence)
OPTIONAL MATCH (d)<-[:DECIDED_BY]-(approver:Person)
OPTIONAL MATCH (d)-[:SUPERSEDES]->(old:Decision)
RETURN d.title, d.rationale, approver.name, evidence.title, old.title, old.status`,
      pathTraversed: [
        "Incident: INC-441 Invoice Blackout (187 min outage)",
        "Postmortem: doc-pm441 (Authored by Nora Berg)",
        "Meeting: mtg-bill (Copperline Freeze War-Room)",
        "Decision: ADR-014 Freeze Copperline (Approved by Jonah Hale & Owen Park)",
        "SUPERSEDES ➔ Decision: ADR-003 Adopt Copperline [STATUS: SUPERSEDED / INACTIVE]",
      ],
      response:
        "Copperline was frozen following **INC-441** (187-minute invoice blackout caused by unversioned schema breakage). Postmortem `doc-pm441` led to emergency war-room `mtg-bill`. **ADR-014** was formally approved by **Jonah Hale (VP Product)** and **Owen Park (CTO)**. Crucially, the graph marks older decision **ADR-003 ('Adopt Copperline Indefinitely') as permanently SUPERSEDED and dead**.",
      groundTruthSources: [
        { kind: "Decision", name: "ADR-014 Freeze Copperline", id: "dec-014" },
        { kind: "Decision", name: "ADR-003 Adopt Copperline", id: "dec-003" },
        { kind: "Document", name: "Postmortem INC-441", id: "doc-pm441" },
        { kind: "Meeting", name: "Copperline Freeze Meeting", id: "mtg-bill" },
        { kind: "Person", name: "Jonah Hale", id: "p-jonah" },
      ],
      explanation:
        "In FalkorDB, supersession is a directed edge `(ADR-014)-[:SUPERSEDES]->(ADR-003)`. The agent follows the edge and definitively knows ADR-003 is void, preventing obsolete architecture advice.",
    },
    metrics: {
      speedupMultiplier: 269,
      tokenSavingsPercent: 94.1,
      accuracyDeltaPercent: 55,
    },
  },
  {
    id: "outage-blast-radius",
    title: "Cascading Outage Blast Radius & Downstream Dependency",
    category: "blast_radius",
    query: "If workflow-orchestrator suffers a network partition, what Tier-1 systems fail downstream, what cloud runner pools are impacted, and who are the on-call owners?",
    description: "Calculates variable-length transitive closures: (System)<-[:DEPENDS_ON*]-(Downstream) and resolves cloud regions and primary owners.",
    hopsRequired: 3,
    entitiesInvolved: ["workflow-orchestrator", "pr-runner-engine", "billing-ledger", "Europe-West", "Aisha Rahman"],
    vectorRag: {
      latencyMs: 489,
      tokensUsed: 3120,
      accuracyScore: 40,
      hallucinationRisk: "HIGH",
      response:
        "Workflow orchestrator is a system for managing pipelines. If it goes down, CI/CD jobs might stall. Aisha Rahman is mentioned in relation to workflow operations. It is likely that runner pools are affected, but the exact downstream systems cannot be definitively listed.",
      missingConnections: [
        "Failed to calculate transitive closure of nested dependencies (A depends on B depends on C)",
        "Missed cloud region associations linked via project deployments",
        "Could not verify critical tier ratings (Tier-1 vs Tier-3)",
      ],
      explanation:
        "Recursive dependencies cannot be computed with text similarity. Vector RAG only finds documents that explicitly contain the keyword 'workflow-orchestrator', completely missing 2nd-degree systems that break transitively.",
    },
    graphRag: {
      latencyMs: 2.1,
      tokensUsed: 182,
      accuracyScore: 100,
      hallucinationRisk: "ZERO",
      cypher: `MATCH (root:System {name: 'workflow-orchestrator'})
OPTIONAL MATCH (root)<-[:DEPENDS_ON*1..4]-(down:System)
OPTIONAL MATCH (down)<-[:OWNS]-(owner:Person)
OPTIONAL MATCH (down)-[:DEPLOYED_AT]->(site)
RETURN root.name, down.name, down.tier, owner.name, collect(DISTINCT site.name) AS sites`,
      pathTraversed: [
        "Root Failure: System workflow-orchestrator [Tier-1]",
        "TRANSITIVE DEPENDENCY ➔ System pr-runner-engine [Tier-1, Owner: Leo Kim]",
        "TRANSITIVE DEPENDENCY ➔ System billing-ledger [Tier-1, Owner: Nora Berg]",
        "DEPLOYMENT REGION ➔ Region Europe-West & US-East (120 active runner micro-VMs stalled)",
      ],
      response:
        "A partition on `workflow-orchestrator` triggers immediate cascading failure across **2 downstream systems**: `pr-runner-engine` (Tier-1 critical, owned by **Leo Kim**) and `billing-ledger` (Tier-1, owned by **Nora Berg**). Cloud impact: halts CI/CD pipeline dispatch across **Europe-West** and **US-East** (120 active runner VMs). Aisha Rahman and Jade Okoye are the primary on-call authorities.",
      groundTruthSources: [
        { kind: "System", name: "workflow-orchestrator", id: "s-workflow" },
        { kind: "System", name: "pr-runner-engine", id: "s-runner" },
        { kind: "System", name: "billing-ledger", id: "s-billing" },
        { kind: "Person", name: "Aisha Rahman", id: "p-aisha" },
      ],
      explanation:
        "FalkorDB executes transitive path expansion `[:DEPENDS_ON*1..4]` in a single in-memory graph traversal. Sub-2ms execution guarantees zero missed dependencies.",
    },
    metrics: {
      speedupMultiplier: 232,
      tokenSavingsPercent: 94.2,
      accuracyDeltaPercent: 60,
    },
  },
  {
    id: "bus-factor-succession",
    title: "Single-Point-of-Failure & Organizational Bus Factor",
    category: "bus_factor",
    query: "Which critical systems in DevFlow have a bus-factor of 1 (only one person holds verified expertise > 0.8), and what is the succession gap?",
    description: "Computes knowledge distribution: (System)<-[:OWNS]-(Person)-[KNOWS]->(Topic) and calculates knowledge monopolies.",
    hopsRequired: 3,
    entitiesInvolved: ["pr-runner-engine", "Leo Kim", "CI/CD Pipelines", "Runner Host Cluster"],
    vectorRag: {
      latencyMs: 560,
      tokensUsed: 3600,
      accuracyScore: 20,
      hallucinationRisk: "CRITICAL",
      response:
        "DevFlow has several engineers who work on infrastructure and CI/CD, including Leo Kim and Nora Berg. It seems like the team collaborates well and knowledge is shared across documents.",
      missingConnections: [
        "Incapable of mathematical aggregation across organizational graph",
        "Hallucinated that Nora Berg is a vision expert (Nora is Backend/Billing)",
        "Failed to identify high-risk SPOF on perception-stack",
      ],
      explanation:
        "Vector search cannot compute graph metrics like degree centrality or knowledge monopoly. It sees names near keywords and assumes healthy knowledge distribution, masking dangerous organizational risks.",
    },
    graphRag: {
      latencyMs: 1.8,
      tokensUsed: 175,
      accuracyScore: 100,
      hallucinationRisk: "ZERO",
      cypher: `MATCH (s:System {tier: 'Tier-1'})
MATCH (s)-[:REQUIRES_SKILL]->(top:Topic)
MATCH (expert:Person)-[k:KNOWS]->(top)
WHERE k.weight >= 0.8
WITH s, top, collect(expert.name) AS experts, count(expert) AS expertCount
WHERE expertCount = 1
RETURN s.name AS system, top.name AS skill, experts[0] AS soloHero, expertCount`,
      pathTraversed: [
        "System: perception-stack [Tier-1 Mission Critical]",
        "REQUIRES_SKILL ➔ Topic: Computer Vision & Sensor Fusion",
        "KNOWS (Weight >= 0.8) ➔ Person: Elena Rostova (Solo Expert, Weight: 0.96)",
        "RISK DETECTED ➔ Bus Factor = 1 (Zero secondary engineers with weight > 0.5)",
      ],
      response:
        "**CRITICAL SPOF ALERT**: `perception-stack` has a verified **Bus Factor of 1**. **Elena Rostova** is the sole individual in the entire company with verified domain expertise $\\ge 0.8$ in Computer Vision & Sensor Fusion (Weight: 0.96). No other engineer holds an active knowledge score above 0.35 in this subsystem.",
      groundTruthSources: [
        { kind: "System", name: "perception-stack", id: "s-perception" },
        { kind: "Topic", name: "Computer Vision", id: "top-vision" },
        { kind: "Person", name: "Elena Rostova", id: "p-elena" },
      ],
      explanation:
        "FalkorDB performs exact relational aggregation across graph weights. It mathematically proves knowledge isolation that vector similarity is blind to.",
    },
    metrics: {
      speedupMultiplier: 311,
      tokenSavingsPercent: 95.1,
      accuracyDeltaPercent: 80,
    },
  },
];
