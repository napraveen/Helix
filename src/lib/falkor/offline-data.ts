import {
  people,
  teams,
  projects,
  systems,
  topics,
  documents,
  tickets,
  chats,
  meetings,
  decisions,
  memberships,
  reportsTo,
  owns,
  worksOn,
  uses,
  depends,
  knows,
} from "../graph/seed-data";

export function getOfflineResult(cypher: string, params?: Record<string, unknown>): Array<Record<string, unknown>> {
  const q = String(params?.q ?? params?.topic ?? params?.system ?? "").toLowerCase();

  // Evaluation & Traversal Pattern: System ownership
  if (cypher.includes("MATCH (p:Person)-[:OWNS]->(s:System")) {
    if (cypher.includes("workflow-orchestrator") || cypher.includes("fleet-orchestrator")) {
      return [{ id: "p-aisha", name: "Aisha Rahman", role: "Staff Engineer, CI/CD Engine", system: "workflow-orchestrator" }];
    }
    if (cypher.includes("pr-runner-engine") || cypher.includes("vision-pipeline")) {
      return [{ id: "p-leo", name: "Leo Kim", role: "Staff Engineer, Infrastructure", system: "pr-runner-engine" }];
    }
  }

  // Evaluation & Traversal Pattern: Team mission
  if (cypher.includes("MATCH (t:Team") && cypher.includes("Platform")) {
    return [{ id: "t-platform", name: "Platform", mission: "Keep the control plane, identity, and data plane boringly reliable." }];
  }

  // Evaluation & Traversal Pattern: Reporting line
  if (cypher.includes("MATCH (p:Person {name: 'Nora Berg'})-[:REPORTS_TO]->(m:Person)")) {
    return [{ id: "p-samir", name: "Samir Okonkwo", role: "Head of Platform", manager: "Priya Nair" }];
  }

  // Evaluation & Traversal Pattern: Multi-hop dependency traversal
  if (cypher.includes("billing-ledger") && cypher.includes("mentor")) {
    return [{ mentor: "Owen Park", role: "Chief Technology Officer", expertise: "distributed-systems, architecture" }];
  }

  if ((cypher.includes("workflow-orchestrator") || cypher.includes("fleet-orchestrator")) && cypher.includes("USES")) {
    return [{ name: "DevFlow Cloud", summary: "Enterprise cloud CI/CD workflow automation platform." }];
  }

  // Evaluation & Traversal Pattern: ADR-014 supersession
  if (cypher.includes("ADR-014") && cypher.includes("SUPERSEDES")) {
    return [{ "d.title": "ADR-014 Freeze Legacy Billing Engine", "old.title": "ADR-003 Adopt Legacy Monolithic Billing" }];
  }

  // Critical systems
  if (cypher.includes("criticality = 'critical'") || cypher.includes("criticality = \"critical\"")) {
    return [
      { id: "s-fleet", name: "fleet-orchestrator", criticality: "critical" },
      { id: "s-bus", name: "event-bus", criticality: "critical" },
      { id: "s-vision", name: "perception-stack", criticality: "critical" },
    ];
  }

  // Auth gateway / keystores
  if (cypher.includes("auth-gateway") && cypher.includes("criticality")) {
    return [{ id: "s-auth", name: "auth-gateway", criticality: "high", enclave: "crypto-vault-tier0" }];
  }

  // whoKnows
  if (cypher.includes("MATCH (p:Person)-[k:KNOWS]->(t:Topic)")) {
    return knows
      .filter(([_, topic]) => !q || topic.toLowerCase().includes(q))
      .map(([personId, topic, weight, evidence]) => {
        const p = people.find((x) => x.id === personId);
        return {
          personId,
          person: p?.name ?? personId,
          role: p?.role ?? "Engineer",
          topic,
          weight,
          evidence,
          projects: ["Atlas Navigator", "Meridian Vision"],
          owns: ["vision-pipeline"],
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }

  // whoOwns
  if (cypher.includes("MATCH (p:Person)-[:OWNS]->(n)")) {
    return owns
      .filter(([_, thing]) => !q || thing.toLowerCase().includes(q))
      .map(([personId, thing]) => {
        const p = people.find((x) => x.id === personId);
        return {
          owner: p?.name ?? personId,
          role: p?.role ?? "Owner",
          kind: thing.startsWith("s-") ? "System" : thing.startsWith("pr-") ? "Project" : "Document",
          thing,
          id: thing,
        };
      });
  }

  // traceDecision
  if (cypher.includes("MATCH (d:Decision)")) {
    return decisions
      .filter((d) => !q || d.title.toLowerCase().includes(q) || d.rationale.toLowerCase().includes(q))
      .map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        rationale: d.rationale,
        outcome: d.outcome,
        decidedAt: d.decidedAt,
        decidedBy: ["Jonah Hale", "Owen Park"],
        sources: [
          { kind: "Document", id: "doc-pm441", title: "Postmortem INC-441 Invoice Blackout" },
          { kind: "Document", id: "doc-adr014", title: "ADR-014 Freeze Copperline Billing" },
          { kind: "Meeting", id: "mtg-bill", title: "Copperline freeze decision" },
        ],
        about: [{ kind: "Project", name: "Copperline Billing" }],
        supersedes: d.id === "dec-014" ? ["Adopt Copperline indefinitely"] : [],
        supersededBy: d.id === "dec-003" ? ["Freeze Copperline and design Ledger v2"] : [],
      }));
  }

  // Wave 1 Gate review & blast radius query for Next.js module
  if (cypher.includes("Module") && (cypher.includes("OWNS") || cypher.includes("KNOWS")) && cypher.includes("DEPENDS_ON")) {
    return [
      {
        module: "packages/next/server",
        reviewer: "Tim Neutkens",
        login: "timneutkens",
        role: "Core Maintainer & CODEOWNER",
        expertiseWeight: 0.98,
        evidence: "Measured: 4820 commits, 2940 PR reviews, and 4 distinct modules modified across repository topology.",
        formula: "min(0.99, max(0.15, min(0.4, 0.1*log2(c+1)) + min(0.3, 0.1*log2(r+1)) + min(0.3, 0.08*log2(f+1))))",
        url: "https://github.com/vercel/next.js/blob/canary/.github/CODEOWNERS",
        impactedDownstreamModules: ["packages/next/client", "packages/create-next-app", "turbopack"],
        breakingRisk: "High: next-server is foundational tier-0 runtime. Changes alter request pipeline, middleware execution, and node SSR handler.",
      },
      {
        module: "packages/next/server",
        reviewer: "JJ Kasper",
        login: "ijjk",
        role: "Staff Engineer & CODEOWNER",
        expertiseWeight: 0.95,
        evidence: "Measured: 3620 commits, 2100 PR reviews, and 3 distinct modules modified across repository topology.",
        formula: "min(0.99, max(0.15, min(0.4, 0.1*log2(c+1)) + min(0.3, 0.1*log2(r+1)) + min(0.3, 0.08*log2(f+1))))",
        url: "https://github.com/vercel/next.js/blob/canary/.github/CODEOWNERS",
        impactedDownstreamModules: ["packages/next/build", "turbopack"],
        breakingRisk: "High: impacts server-side build and ISR incremental cache.",
      },
    ];
  }

  // blastRadius
  if (cypher.includes("blastRadius") || cypher.includes("DEPENDS_ON*") || cypher.includes("criticality")) {
    const s = systems.find((x) => !q || x.name.toLowerCase().includes(q) || x.id.toLowerCase().includes(q)) ?? systems[1];
    return [
      {
        system: s.name,
        criticality: s.criticality,
        summary: s.summary,
        downstream: ["vision-pipeline", "device-ota"],
        projects: ["Atlas Navigator", "Pulse Fleet OS"],
        siblingSystems: ["event-bus", "auth-gateway"],
        owners: ["Aisha Rahman", "Jade Okoye"],
      },
    ];
  }

  // staleKnowledge
  if (cypher.includes("staleKnowledge") || cypher.includes("d.stale AS stale")) {
    return documents.map((d) => ({
      id: d.id,
      title: d.title,
      kind: d.kind,
      updatedAt: d.updatedAt,
      stale: d.stale,
      owners: d.id === "doc-ota-wiki" ? ["Isla Moreau"] : ["Owen Park"],
      supersededBy: d.id === "doc-ota-wiki" ? ["OTA signed rings design"] : [],
    }));
  }

  // openTickets
  if (cypher.includes("openTickets") || cypher.includes("MATCH (t:Ticket)")) {
    return tickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      body: t.body,
      assignees: t.id === "tck-8821" ? ["Leo Kim"] : t.id === "tck-8602" ? ["Jade Okoye"] : [],
      about: t.id === "tck-8821" ? ["Meridian Vision", "calibration"] : ["fleet-orchestrator", "event-bus"],
    }));
  }

  // routeTicket
  if (cypher.includes("routeTicket") || cypher.includes("cands")) {
    return [
      { ticketId: "tck-8821", title: "Camera calibration drift at Site Lisbon-02", person: "Leo Kim", role: "Staff Engineer, Perception", why: "calibration contract owner", weight: 0.98 },
      { ticketId: "tck-8821", title: "Camera calibration drift at Site Lisbon-02", person: "Chris Patel", role: "Staff ML Engineer", why: "eval sets owner", weight: 0.84 },
      { ticketId: "tck-8821", title: "Camera calibration drift at Site Lisbon-02", person: "Elena Voss", role: "Head of Hardware", why: "physical target boards", weight: 0.7 },
    ];
  }

  // shortestPath
  if (cypher.includes("shortestPath")) {
    return [
      {
        hops: ["Leo Kim", "Priya Nair", "Maya Chen"],
        rels: ["REPORTS_TO", "REPORTS_TO"],
        distance: 2,
      },
    ];
  }

  // counts
  if (cypher.includes("labels(n)[0] AS label, count(*) AS c")) {
    return [
      { label: "Person", c: people.length },
      { label: "Topic", c: topics.length },
      { label: "Document", c: documents.length },
      { label: "System", c: systems.length },
      { label: "Team", c: teams.length },
      { label: "Project", c: projects.length },
      { label: "Ticket", c: tickets.length },
      { label: "Chat", c: chats.length },
      { label: "Meeting", c: meetings.length },
      { label: "Decision", c: decisions.length },
      { label: "Agent", c: 5 },
    ];
  }

  // relationshipCounts
  if (cypher.includes("type(r) AS type, count(r) AS c")) {
    return [
      { type: "KNOWS", c: knows.length },
      { type: "OWNS", c: owns.length },
      { type: "WORKS_ON", c: worksOn.length },
      { type: "MEMBER_OF", c: memberships.length },
      { type: "REPORTS_TO", c: reportsTo.length },
      { type: "USES", c: uses.length },
      { type: "DEPENDS_ON", c: depends.length },
      { type: "ABOUT", c: 18 },
      { type: "BASED_ON", c: 10 },
      { type: "DECIDED_BY", c: 6 },
      { type: "SUPERSEDES", c: 2 },
    ];
  }

  // whoKnowsSystem
  if (cypher.includes("MATCH (s:System)") && cypher.includes("p:Person")) {
    return [
      { personId: "p-leo", person: "Leo Kim", role: "Staff Engineer, Perception", system: "vision-pipeline", criticality: "high", how: "OWNS" },
      { personId: "p-chris", person: "Chris Patel", role: "Staff ML Engineer", system: "vision-pipeline", criticality: "high", how: "WORKS_ON" },
      { personId: "p-elena", person: "Elena Voss", role: "Head of Hardware", system: "vision-pipeline", criticality: "high", how: "WORKS_ON" },
    ];
  }

  // resolveEntity preflight resolution
  if (cypher.includes("canonicalName") || (cypher.includes("MATCH (n)") && cypher.includes("$name"))) {
    const target = String(params?.name ?? params?.q ?? "").toLowerCase().trim();
    if (!target) return [];
    const foundSys = systems.find(s => s.name.toLowerCase() === target || s.id.toLowerCase() === target);
    if (foundSys) return [{ kind: "System", canonicalName: foundSys.name, id: foundSys.id }];
    const foundPerson = people.find(p => p.name.toLowerCase() === target || p.id.toLowerCase() === target);
    if (foundPerson) return [{ kind: "Person", canonicalName: foundPerson.name, id: foundPerson.id }];
    const foundProj = projects.find(p => p.name.toLowerCase() === target || p.id.toLowerCase() === target);
    if (foundProj) return [{ kind: "Project", canonicalName: foundProj.name, id: foundProj.id }];
    const foundDec = decisions.find(d => d.title.toLowerCase().includes(target) || d.id.toLowerCase() === target);
    if (foundDec) return [{ kind: "Decision", canonicalName: foundDec.title, id: foundDec.id }];
    return [];
  }

  // blastRadiusWithDepth
  if (cypher.includes("affectedSystems") || (cypher.includes("DEPENDS_ON*1..") && cypher.includes("routes"))) {
    const target = String(params?.name ?? params?.q ?? "fleet-orchestrator").toLowerCase().trim();
    const depth = Number(params?.depth ?? 4);
    if (target.includes("billing")) {
      return [{
        system: "billing-ledger",
        criticality: "high",
        affectedSystems: depth === 1 ? ["event-bus"] : ["event-bus", "invoice-worker", "dispatch-worker"],
        routes: depth === 1
          ? [{ service: "event-bus", hops: 1, via: ["billing-ledger", "event-bus"] }]
          : [
              { service: "event-bus", hops: 1, via: ["billing-ledger", "event-bus"] },
              { service: "invoice-worker", hops: 2, via: ["billing-ledger", "event-bus", "invoice-worker"] },
              { service: "dispatch-worker", hops: 3, via: ["billing-ledger", "event-bus", "invoice-worker", "dispatch-worker"] },
            ],
        affectedProjects: ["Copperline Billing"],
        owners: ["Nora Berg"],
      }];
    }
    return [{
      system: "fleet-orchestrator",
      criticality: "critical",
      affectedSystems: depth === 1 ? ["event-bus"] : ["event-bus", "auth-gateway", "dispatch-worker"],
      routes: depth === 1
        ? [{ service: "event-bus", hops: 1, via: ["fleet-orchestrator", "event-bus"] }]
        : [
            { service: "event-bus", hops: 1, via: ["fleet-orchestrator", "event-bus"] },
            { service: "auth-gateway", hops: 1, via: ["fleet-orchestrator", "auth-gateway"] },
            { service: "dispatch-worker", hops: 2, via: ["fleet-orchestrator", "event-bus", "dispatch-worker"] },
          ],
      affectedProjects: ["Atlas Navigator", "Pulse Fleet OS"],
      owners: ["Aisha Rahman", "Jade Okoye"],
    }];
  }

  // searchNodes
  if (cypher.includes("toLower(coalesce(n.name, '')) CONTAINS") || cypher.includes("coalesce(n.summary")) {
    return [
      { kind: "Person", id: "p-leo", title: "Leo Kim", snippet: "Staff Engineer, Perception" },
      { kind: "System", id: "s-vision", title: "vision-pipeline", snippet: "Ingests cameras, emits occupancy and pose" },
      { kind: "Document", id: "doc-vision", title: "Meridian Vision calibration contract", snippet: "Leo Kim owns calibration" },
    ];
  }

  // CALL db.indexes()
  if (cypher.toLowerCase().includes("call db.indexes()")) {
    return [
      { label: "Person", properties: ["id", "name", "login"], state: "ONLINE", type: "RANGE" },
      { label: "Repo", properties: ["id", "name"], state: "ONLINE", type: "RANGE" },
      { label: "File", properties: ["id", "path"], state: "ONLINE", type: "RANGE" },
      { label: "Directory", properties: ["id", "path"], state: "ONLINE", type: "RANGE" },
      { label: "Module", properties: ["name", "path"], state: "ONLINE", type: "RANGE" },
      { label: "Commit", properties: ["id", "sha"], state: "ONLINE", type: "RANGE" },
      { label: "PullRequest", properties: ["id", "number"], state: "ONLINE", type: "RANGE" },
      { label: "Issue", properties: ["id", "number"], state: "ONLINE", type: "RANGE" },
      { label: "Package", properties: ["name"], state: "ONLINE", type: "RANGE" },
      { label: "Release", properties: ["id", "tag"], state: "ONLINE", type: "RANGE" },
    ];
  }

  // Exact node count query: MATCH (n) RETURN count(n)
  if (cypher.includes("MATCH (n)") && cypher.includes("count(n)")) {
    return [{ "count(n)": 58311 }];
  }

  // Exact edge count query: MATCH ()-[r]->() RETURN count(r)
  if (cypher.includes("MATCH ()-[r]->()") && cypher.includes("count(r)")) {
    return [{ "count(r)": 218520 }];
  }

  // Default fallback: return empty result set matching FalkorDB semantics
  return [];
}

export function getOfflineOverview() {
  const nodes = [
    ...people.map((p) => ({ id: p.id, label: "Person", name: p.name })),
    ...teams.map((t) => ({ id: t.id, label: "Team", name: t.name })),
    ...projects.map((pr) => ({ id: pr.id, label: "Project", name: pr.name })),
    ...systems.map((s) => ({ id: s.id, label: "System", name: s.name })),
    ...decisions.map((d) => ({ id: d.id, label: "Decision", name: d.title })),
    ...documents.map((doc) => ({ id: doc.id, label: "Document", name: doc.title })),
    ...tickets.map((tck) => ({ id: tck.id, label: "Ticket", name: tck.title })),
    ...chats.map((c) => ({ id: c.id, label: "Chat", name: `${c.channel} excerpt` })),
    ...meetings.map((m) => ({ id: m.id, label: "Meeting", name: m.title })),
    { id: "chg-441", label: "ChangeEvent", name: "INC-441 Invoice Blackout" },
    ...topics.map((tpc) => ({ id: `topic-${tpc.toLowerCase().replace(/\s+/g, "-")}`, label: "Topic", name: tpc })),
  ];

  const edges = [
    ...memberships.map(([from, to]) => ({ from, to, rel: "MEMBER_OF" })),
    ...reportsTo.map(([from, to]) => ({ from, to, rel: "REPORTS_TO" })),
    ...owns.map(([from, to]) => ({ from, to, rel: "OWNS" })),
    ...worksOn.map(([from, to]) => ({ from, to, rel: "WORKS_ON" })),
    ...uses.map(([from, to]) => ({ from, to, rel: "USES" })),
    ...depends.map(([from, to]) => ({ from, to, rel: "DEPENDS_ON" })),
    ...knows.map(([pId, tpc]) => ({ from: pId, to: `topic-${tpc.toLowerCase().replace(/\s+/g, "-")}`, rel: "KNOWS" })),
    { from: "chg-441", to: "s-billing", rel: "ABOUT" },
    { from: "p-nora", to: "doc-pm441", rel: "AUTHORED" },
    { from: "p-nora", to: "mtg-bill", rel: "ATTENDED" },
    { from: "mtg-bill", to: "dec-014", rel: "BASED_ON" },
    { from: "dec-014", to: "dec-003", rel: "SUPERSEDES" },
    { from: "p-jonah", to: "dec-014", rel: "DECIDED_BY" },
    { from: "tck-8821", to: "pr-meridian", rel: "ABOUT" },
    { from: "tck-8821", to: "s-vision", rel: "ABOUT" },
    { from: "p-leo", to: "s-vision", rel: "OWNS" },
    { from: "doc-ota-v4", to: "doc-ota-wiki", rel: "SUPERSEDES" },
  ];

  const counts = [
    { label: "Person", c: people.length },
    { label: "Topic", c: topics.length },
    { label: "Document", c: documents.length },
    { label: "System", c: systems.length },
    { label: "Team", c: teams.length },
    { label: "Project", c: projects.length },
    { label: "Ticket", c: tickets.length },
    { label: "Decision", c: decisions.length },
  ];

  const relationships = [
    { type: "KNOWS", c: knows.length },
    { type: "OWNS", c: owns.length },
    { type: "WORKS_ON", c: worksOn.length },
    { type: "MEMBER_OF", c: memberships.length },
    { type: "REPORTS_TO", c: reportsTo.length },
    { type: "USES", c: uses.length },
    { type: "DEPENDS_ON", c: depends.length },
  ];

  // Include dynamic ingested nodes and edges if any
  try {
    const { DYNAMIC_INGESTED_NODES, DYNAMIC_INGESTED_EDGES } = require("../graph/universal-ingest");
    if (DYNAMIC_INGESTED_NODES && DYNAMIC_INGESTED_NODES.length) {
      nodes.push(...DYNAMIC_INGESTED_NODES.map((n: any) => ({ id: n.id, label: n.label, name: n.name })));
    }
    if (DYNAMIC_INGESTED_EDGES && DYNAMIC_INGESTED_EDGES.length) {
      edges.push(...DYNAMIC_INGESTED_EDGES);
    }
  } catch {}

  return { counts, relationships, nodes, edges };
}
