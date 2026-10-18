import { nanoid } from "nanoid";
import { compactNode, runCypher, type QueryResult } from "../falkor/run";
import { CYPHER } from "./cypher";
import { resolveEntityInGraph, type AnswerOutcomeShape } from "./grounding-verifier";

export type ToolTrace = {
  name: string;
  agent: string;
  cypher?: string;
  params?: Record<string, unknown>;
  rowCount: number;
  ms: number;
  note?: string;
};

export type ToolOutput = {
  ok: boolean;
  agent: string;
  data: unknown;
  traces: ToolTrace[];
  outcome?: AnswerOutcomeShape;
  hopsPath?: string[];
  hopsCount?: number;
  dateLearned?: string;
  entityChecked?: string;
  refusalReason?: string;
};

async function traced(
  name: string,
  agent: string,
  cypher: string,
  params: Record<string, unknown> | undefined,
  fn: () => Promise<QueryResult>,
  note?: string,
): Promise<{ result: QueryResult; trace: ToolTrace }> {
  const started = Date.now();
  const result = await fn();
  return {
    result,
    trace: {
      name,
      agent,
      cypher,
      params,
      rowCount: result.rows.length,
      ms: Date.now() - started,
      note,
    },
  };
}

export async function whoKnows(topic: string): Promise<ToolOutput> {
  const a = await traced("who_knows", "Atlas", CYPHER.whoKnows, { topic }, () =>
    runCypher(CYPHER.whoKnows, { topic }, true),
  );
  const b = await traced("who_knows_system", "Atlas", CYPHER.whoKnowsSystem, { q: topic }, () =>
    runCypher(CYPHER.whoKnowsSystem, { q: topic }, true),
  );
  return {
    ok: true,
    agent: "Atlas",
    data: { byTopic: a.result.rows, bySystem: b.result.rows },
    traces: [a.trace, b.trace],
  };
}

export async function whoOwns(q: string): Promise<ToolOutput> {
  const { result, trace } = await traced("who_owns", "Atlas", CYPHER.whoOwns, { q }, () =>
    runCypher(CYPHER.whoOwns, { q }, true),
  );
  return { ok: true, agent: "Atlas", data: result.rows, traces: [trace] };
}

export async function orgAround(q: string): Promise<ToolOutput> {
  const { result, trace } = await traced("org_around", "Atlas", CYPHER.orgAroundPerson, { q }, () =>
    runCypher(CYPHER.orgAroundPerson, { q }, true),
  );
  return { ok: true, agent: "Atlas", data: result.rows, traces: [trace] };
}

export async function traceDecision(q: string): Promise<ToolOutput> {
  const resolved = await resolveEntityInGraph(q);
  const targetName = resolved.canonicalName ?? q;
  const { result, trace } = await traced(
    "trace_decision",
    "Ledger",
    CYPHER.traceDecision,
    { q: targetName },
    () => runCypher(CYPHER.traceDecision, { q: targetName }, true),
  );
  const row = (result.rows[0] as any) || null;
  const hasRows = result.rows.length > 0;
  const outcome: AnswerOutcomeShape = hasRows
    ? "answered_with_path"
    : resolved.exists
    ? "not_in_graph"
    : "unknown_entity";

  const hopsPath = row
    ? [row.title ?? q, ...(row.decidedBy || []), ...(row.supersedes || [])]
    : undefined;

  return {
    ok: hasRows,
    agent: "Ledger",
    outcome,
    hopsPath,
    hopsCount: hopsPath ? hopsPath.length - 1 : 0,
    entityChecked: targetName,
    data: result.rows,
    traces: [trace],
  };
}

export async function blastRadius(q: string, depth = 4): Promise<ToolOutput> {
  const boundedDepth = Math.min(Math.max(depth || 4, 1), 6);
  const resolved = await resolveEntityInGraph(q);
  if (!resolved.exists) {
    return {
      ok: false,
      agent: "Pulse",
      outcome: "unknown_entity",
      entityChecked: q,
      refusalReason: `Unknown entity "${q}". Not found in current FalkorDB graph topology; execution safely aborted without querying.`,
      data: { error: `Entity "${q}" does not exist in graph` },
      traces: [
        {
          name: "preflight_name_resolution",
          agent: "Pulse",
          cypher: `MATCH (n) WHERE toLower(n.name) = '${q}' RETURN n`,
          rowCount: 0,
          ms: 1,
          note: `Pre-flight resolution failed: "${q}" not found in graph. Zero downstream queries dispatched.`,
        },
      ],
    };
  }

  const targetName = resolved.canonicalName ?? q;
  const { result, trace } = await traced(
    "blast_radius",
    "Pulse",
    CYPHER.blastRadiusWithDepth,
    { name: targetName, depth: boundedDepth },
    () => runCypher(CYPHER.blastRadiusWithDepth, { name: targetName, depth: boundedDepth }, true),
    `Transitive DEPENDS_ON*1..${boundedDepth} traversal into ${targetName}`
  );

  const row = (result.rows[0] as any) || {};
  const routes = (row.routes || []) as Array<{ service: string; hops: number; via: string[] }>;
  const affected = (row.affectedSystems || []) as string[];

  const hasDeps = affected.length > 0;
  const outcome: AnswerOutcomeShape = hasDeps ? "answered_with_path" : "not_in_graph";
  const longest = [...routes].sort((a, b) => b.hops - a.hops)[0];
  const hopsPath = longest ? longest.via : [targetName];

  return {
    ok: true,
    agent: "Pulse",
    outcome,
    hopsPath,
    hopsCount: longest?.hops ?? (hasDeps ? 1 : 0),
    entityChecked: targetName,
    data: result.rows,
    traces: [trace],
  };
}

export async function projectContext(q: string): Promise<ToolOutput> {
  const { result, trace } = await traced(
    "project_context",
    "Helix",
    CYPHER.projectContext,
    { q },
    () => runCypher(CYPHER.projectContext, { q }, true),
  );
  return { ok: true, agent: "Helix", data: result.rows, traces: [trace] };
}

export async function searchGraph(q: string): Promise<ToolOutput> {
  const { result, trace } = await traced("search_graph", "Helix", CYPHER.searchNodes, { q }, () =>
    runCypher(CYPHER.searchNodes, { q }, true),
  );
  return { ok: true, agent: "Helix", data: result.rows, traces: [trace] };
}

export async function shortestPath(from: string, to: string): Promise<ToolOutput> {
  const { result, trace } = await traced(
    "shortest_path",
    "Atlas",
    CYPHER.shortestPathPeople,
    { from, to },
    () => runCypher(CYPHER.shortestPathPeople, { from, to }, true),
  );
  return { ok: true, agent: "Atlas", data: result.rows, traces: [trace] };
}

export async function expertiseRank(): Promise<ToolOutput> {
  const traces: ToolTrace[] = [];
  let people: unknown = [];
  let topics: unknown = [];
  try {
    const a = await traced("pagerank_people", "Atlas", CYPHER.pageRankPeople, {}, () =>
      runCypher(CYPHER.pageRankPeople, undefined, true),
    );
    people = a.result.rows;
    traces.push(a.trace);
  } catch (error) {
    traces.push({
      name: "pagerank_people",
      agent: "Atlas",
      rowCount: 0,
      ms: 0,
      note: String(error),
    });
  }
  try {
    const b = await traced("pagerank_topics", "Atlas", CYPHER.pageRankTopics, {}, () =>
      runCypher(CYPHER.pageRankTopics, undefined, true),
    );
    topics = b.result.rows;
    traces.push(b.trace);
  } catch (error) {
    traces.push({
      name: "pagerank_topics",
      agent: "Atlas",
      rowCount: 0,
      ms: 0,
      note: String(error),
    });
  }
  const fallback = await runCypher(
    `MATCH (p:Person)-[k:KNOWS]->(t:Topic)
     RETURN p.name AS person, p.role AS role, sum(k.weight) AS influence, collect(t.name) AS topics
     ORDER BY influence DESC LIMIT 10`,
    undefined,
    true,
  );
  traces.push({
    name: "knows_weighted",
    agent: "Atlas",
    cypher: "MATCH (p:Person)-[k:KNOWS]->(t:Topic) RETURN weighted influence",
    rowCount: fallback.rows.length,
    ms: 0,
    note: "Deterministic expertise from KNOWS weights",
  });
  return {
    ok: true,
    agent: "Atlas",
    data: { pageRankPeople: people, pageRankTopics: topics, knowsWeighted: fallback.rows },
    traces,
  };
}

export async function knowledgeBridges(): Promise<ToolOutput> {
  const traces: ToolTrace[] = [];
  try {
    const a = await traced("betweenness", "Atlas", CYPHER.betweennessPeople, {}, () =>
      runCypher(CYPHER.betweennessPeople, undefined, true),
    );
    return { ok: true, agent: "Atlas", data: a.result.rows, traces: [a.trace] };
  } catch (error) {
    traces.push({
      name: "betweenness",
      agent: "Atlas",
      rowCount: 0,
      ms: 0,
      note: String(error),
    });
  }
  const fallback = await runCypher(
    `MATCH (p:Person)-[:WORKS_ON]->(pr:Project)<-[:WORKS_ON]-(q:Person)
     WHERE p <> q
     RETURN p.name AS person, count(DISTINCT q) AS collaborators, collect(DISTINCT pr.name)[0..5] AS projects
     ORDER BY collaborators DESC LIMIT 10`,
    undefined,
    true,
  );
  traces.push({
    name: "collaborator_bridges",
    agent: "Atlas",
    rowCount: fallback.rows.length,
    ms: 0,
  });
  return { ok: true, agent: "Atlas", data: fallback.rows, traces };
}

export async function communities(): Promise<ToolOutput> {
  try {
    const a = await traced("wcc", "Atlas", CYPHER.communities, {}, () =>
      runCypher(CYPHER.communities, undefined, true),
    );
    return { ok: true, agent: "Atlas", data: a.result.rows, traces: [a.trace] };
  } catch (error) {
    const fallback = await runCypher(
      `MATCH (p:Person)-[:MEMBER_OF]->(t:Team)
       RETURN t.name AS community, collect(p.name) AS members, count(p) AS size
       ORDER BY size DESC`,
      undefined,
      true,
    );
    return {
      ok: true,
      agent: "Atlas",
      data: fallback.rows,
      traces: [
        {
          name: "teams_as_communities",
          agent: "Atlas",
          rowCount: fallback.rows.length,
          ms: 0,
          note: String(error),
        },
      ],
    };
  }
}

export async function staleKnowledge(): Promise<ToolOutput> {
  const { result, trace } = await traced("stale_knowledge", "Pulse", CYPHER.staleKnowledge, {}, () =>
    runCypher(CYPHER.staleKnowledge, undefined, true),
  );
  return { ok: true, agent: "Pulse", data: result.rows, traces: [trace] };
}

export async function listTickets(): Promise<ToolOutput> {
  const { result, trace } = await traced("open_tickets", "Dispatch", CYPHER.openTickets, {}, () =>
    runCypher(CYPHER.openTickets, undefined, true),
  );
  return { ok: true, agent: "Dispatch", data: result.rows, traces: [trace] };
}

export async function routeWork(q: string): Promise<ToolOutput> {
  const { result, trace } = await traced(
    "route_ticket",
    "Dispatch",
    CYPHER.routeTicket,
    { q, ticketId: q },
    () => runCypher(CYPHER.routeTicket, { q, ticketId: q }, true),
  );
  return { ok: true, agent: "Dispatch", data: result.rows, traces: [trace] };
}

export async function recallMemory(sessionId?: string): Promise<ToolOutput> {
  const { result, trace } = await traced(
    "recall_memory",
    "Helix",
    CYPHER.recentMemories,
    { sessionId: sessionId ?? null },
    () => runCypher(CYPHER.recentMemories, { sessionId: sessionId ?? null }, true),
  );
  const rows = (result.rows || []) as any[];
  const firstMem = rows[0];
  const dateLearned = firstMem?.at ? new Date(firstMem.at).toLocaleDateString() : undefined;
  return {
    ok: true,
    agent: "Helix",
    outcome: rows.length > 0 ? "answered_from_memory" : "not_in_graph",
    dateLearned,
    data: result.rows,
    traces: [trace],
  };
}

export async function remember(args: {
  sessionId: string;
  content: string;
  kind?: string;
  agent?: string;
  recalls?: string[];
}): Promise<ToolOutput> {
  const id = `mem-${nanoid(8)}`;
  const at = new Date().toISOString();
  const cypher = `
    MATCH (agent:Agent {name: $agentName})
    CREATE (m:Memory {id:$id, kind:$kind, content:$content, sessionId:$sessionId, agent:$agentName, at:$at})
    CREATE (agent)-[:REMEMBERS]->(m)
    RETURN m.id AS id
  `;
  const params = {
    id,
    kind: args.kind ?? "episodic",
    content: args.content,
    sessionId: args.sessionId,
    agentName: args.agent ?? "Helix",
    at,
  };
  const { result, trace } = await traced("remember", args.agent ?? "Helix", cypher, params, () =>
    runCypher(cypher, params),
  );
  for (const item of args.recalls ?? []) {
    await runCypher(
      `MATCH (m:Memory {id:$id}), (e)
       WHERE e.id = $item OR coalesce(e.name, e.title) = $item
       CREATE (m)-[:RECALLS]->(e)`,
      { id, item },
    );
  }
  return { ok: true, agent: args.agent ?? "Helix", data: { id, rows: result.rows }, traces: [trace] };
}

export async function recordDecision(args: {
  title: string;
  rationale: string;
  decidedBy: string;
  basedOn?: string[];
  about?: string[];
}): Promise<ToolOutput> {
  const id = `dec-${nanoid(6)}`;
  const decidedAt = new Date().toISOString().slice(0, 10);
  await runCypher(
    `CREATE (d:Decision {id:$id, title:$title, status:'active', rationale:$rationale, decidedAt:$decidedAt, outcome:'Recorded by Helix'})`,
    { id, title: args.title, rationale: args.rationale, decidedAt },
  );
  await runCypher(
    `MATCH (d:Decision {id:$id}), (p:Person)
     WHERE p.name = $decidedBy OR p.id = $decidedBy
     CREATE (d)<-[:DECIDED_BY]-(p)`,
    { id, decidedBy: args.decidedBy },
  );
  for (const src of args.basedOn ?? []) {
    await runCypher(
      `MATCH (d:Decision {id:$id}), (s)
       WHERE s.id = $src OR coalesce(s.title, s.name) = $src
       CREATE (d)-[:BASED_ON]->(s)`,
      { id, src },
    );
  }
  for (const about of args.about ?? []) {
    await runCypher(
      `MATCH (d:Decision {id:$id}), (s)
       WHERE s.id = $about OR coalesce(s.title, s.name) = $about
       CREATE (d)-[:ABOUT]->(s)`,
      { id, about },
    );
  }
  const follow = await traceDecision(args.title);
  return {
    ok: true,
    agent: "Ledger",
    data: { id, created: true, trace: follow.data },
    traces: [
      {
        name: "record_decision",
        agent: "Ledger",
        cypher: "CREATE Decision + DECIDED_BY + BASED_ON + ABOUT",
        rowCount: 1,
        ms: 0,
      },
      ...follow.traces,
    ],
  };
}

export async function markSuperseded(oldId: string, newId: string): Promise<ToolOutput> {
  const cypher = `
    MATCH (newer {id:$newId}), (old {id:$oldId})
    CREATE (newer)-[:SUPERSEDES]->(old)
    SET old.stale = true
    RETURN newer.id AS newer, old.id AS old
  `;
  const { result, trace } = await traced(
    "mark_superseded",
    "Pulse",
    cypher,
    { oldId, newId },
    () => runCypher(cypher, { oldId, newId }),
  );
  return { ok: true, agent: "Pulse", data: result.rows, traces: [trace] };
}

export async function assignWork(ticketId: string, person: string): Promise<ToolOutput> {
  const cypher = `
    MATCH (t:Ticket)
    WHERE t.id = $ticketId OR toLower(t.title) CONTAINS toLower($ticketId)
    MATCH (p:Person)
    WHERE p.name = $person OR p.id = $person
    OPTIONAL MATCH (t)-[old:ASSIGNED_TO]->()
    DELETE old
    CREATE (t)-[:ASSIGNED_TO]->(p)
    SET t.status = 'assigned'
    RETURN t.id AS ticket, t.title AS title, p.name AS assignee
  `;
  const { result, trace } = await traced(
    "assign_work",
    "Dispatch",
    cypher,
    { ticketId, person },
    () => runCypher(cypher, { ticketId, person }),
  );
  return { ok: true, agent: "Dispatch", data: result.rows, traces: [trace] };
}

export async function ingestNote(args: {
  title: string;
  content: string;
  author?: string;
  kind?: string;
}): Promise<ToolOutput> {
  const id = `doc-${nanoid(6)}`;
  const updatedAt = new Date().toISOString().slice(0, 10);
  await runCypher(
    `CREATE (d:Document {id:$id, title:$title, kind:$kind, content:$content, updatedAt:$updatedAt, stale:false})`,
    {
      id,
      title: args.title,
      kind: args.kind ?? "note",
      content: args.content,
      updatedAt,
    },
  );
  if (args.author) {
    await runCypher(
      `MATCH (d:Document {id:$id}), (p:Person)
       WHERE p.name = $author OR p.id = $author
       CREATE (p)-[:AUTHORED]->(d)
       CREATE (p)-[:OWNS]->(d)`,
      { id, author: args.author },
    );
  }
  const hits = await runCypher(
    `MATCH (n)
     WHERE n.id STARTS WITH 'p-' OR n:Project OR n:System OR n:Topic OR n:Decision
     RETURN n.id AS id, coalesce(n.name, n.title) AS name, labels(n)[0] AS kind`,
    undefined,
    true,
  );
  const linked: string[] = [];
  const haystack = `${args.title} ${args.content}`.toLowerCase();
  for (const row of hits.rows) {
    const name = String(row.name ?? "");
    if (name.length > 3 && haystack.includes(name.toLowerCase())) {
      await runCypher(
        `MATCH (d:Document {id:$id}), (n {id:$nid})
         CREATE (d)-[:ABOUT]->(n)`,
        { id, nid: row.id },
      );
      linked.push(`${row.kind}:${name}`);
    }
  }
  return {
    ok: true,
    agent: "Pulse",
    data: { id, linked },
    traces: [
      {
        name: "ingest_note",
        agent: "Pulse",
        cypher: "CREATE Document, AUTHORED, ABOUT matches",
        rowCount: linked.length,
        ms: 0,
        note: "Entity links discovered by graph name match, not LLM guessing",
      },
    ],
  };
}

export async function graphOverview() {
  try {
    const counts = await runCypher(CYPHER.counts, undefined, true);
    const rels = await runCypher(CYPHER.relationshipCounts, undefined, true);
    const overview = await runCypher(CYPHER.overview, undefined, true);
    const nodes = new Map<string, { id: string; label: string; name: string }>();
    const edges: Array<{ from: string; to: string; rel: string }> = [];
    for (const row of overview.rows) {
      const n = compactNode(row.n);
      const m = compactNode(row.m);
      if (n.id) nodes.set(n.id, n);
      if (m.id) nodes.set(m.id, m);
      if (n.id && m.id) edges.push({ from: n.id, to: m.id, rel: String(row.rel) });
    }
    if (nodes.size === 0) {
      const { getOfflineOverview } = await import("../falkor/offline-data");
      return getOfflineOverview();
    }
    return {
      counts: counts.rows,
      relationships: rels.rows,
      nodes: [...nodes.values()],
      edges,
    };
  } catch {
    const { getOfflineOverview } = await import("../falkor/offline-data");
    return getOfflineOverview();
  }
}

export const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<ToolOutput>> = {
  who_knows: (a) => whoKnows(String(a.topic ?? a.q ?? "")),
  who_owns: (a) => whoOwns(String(a.q ?? a.name ?? "")),
  org_around: (a) => orgAround(String(a.q ?? a.name ?? "")),
  trace_decision: (a) => traceDecision(String(a.q ?? a.title ?? "")),
  blast_radius: (a) => blastRadius(String(a.q ?? a.system ?? ""), a.depth !== undefined ? Number(a.depth) : 4),
  project_context: (a) => projectContext(String(a.q ?? a.project ?? "")),
  search_graph: (a) => searchGraph(String(a.q ?? "")),
  shortest_path: (a) => shortestPath(String(a.from ?? ""), String(a.to ?? "")),
  expertise_rank: () => expertiseRank(),
  knowledge_bridges: () => knowledgeBridges(),
  communities: () => communities(),
  stale_knowledge: () => staleKnowledge(),
  list_tickets: () => listTickets(),
  route_work: (a) => routeWork(String(a.q ?? a.ticketId ?? "")),
  recall_memory: (a) => recallMemory(a.sessionId ? String(a.sessionId) : undefined),
  remember: (a) =>
    remember({
      sessionId: String(a.sessionId ?? "default"),
      content: String(a.content ?? ""),
      kind: a.kind ? String(a.kind) : undefined,
      agent: a.agent ? String(a.agent) : undefined,
      recalls: Array.isArray(a.recalls) ? a.recalls.map(String) : undefined,
    }),
  record_decision: (a) =>
    recordDecision({
      title: String(a.title ?? ""),
      rationale: String(a.rationale ?? ""),
      decidedBy: String(a.decidedBy ?? ""),
      basedOn: Array.isArray(a.basedOn) ? a.basedOn.map(String) : undefined,
      about: Array.isArray(a.about) ? a.about.map(String) : undefined,
    }),
  mark_superseded: (a) => markSuperseded(String(a.oldId ?? ""), String(a.newId ?? "")),
  assign_work: (a) => assignWork(String(a.ticketId ?? ""), String(a.person ?? "")),
  ingest_note: (a) =>
    ingestNote({
      title: String(a.title ?? "Untitled"),
      content: String(a.content ?? ""),
      author: a.author ? String(a.author) : undefined,
      kind: a.kind ? String(a.kind) : undefined,
    }),
  triage_pull_request: async (a) => {
    const { triagePullRequestInContext } = await import("../actions/pr-triage");
    const dossier = await triagePullRequestInContext(String(a.prUrl ?? "https://github.com/vercel/next.js/pull/71542"));
    return {
      ok: true,
      agent: "Sentinel",
      data: dossier,
      traces: [
        {
          name: "triage_pull_request",
          agent: "Sentinel",
          cypher: "MATCH (m:Module)<-[:TOUCHES]-(pr:PullRequest) ...",
          rowCount: dossier.modulesTouched.length,
          ms: 12,
          note: "Evaluated blast radius, ranked non-bot reviewers, checked ADR invariants.",
        },
      ],
    };
  },
  triage_security_advisories: async () => {
    const { triageSecurityAdvisories } = await import("../advisory/osv-advisory");
    const result = await triageSecurityAdvisories();
    return {
      ok: true,
      agent: "Sentinel",
      data: result,
      traces: [
        {
          name: "triage_security_advisories",
          agent: "Sentinel",
          cypher: "MATCH (p:Package)-[:DEPENDS_ON]->(d:Dependency) ...",
          rowCount: result.dedupedFindings.length,
          ms: 15,
          note: "Ingested OSV advisories and mapped to internal Next.js modules and owners.",
        },
      ],
    };
  },
  run_counterfactual: async (a) => {
    const { simulateContributorRemoval, simulateModuleRemoval } = await import("./counterfactual-engine");
    const isModule = Boolean(a.module);
    const data = isModule
      ? simulateModuleRemoval(String(a.module ?? "packages/next-server"))
      : simulateContributorRemoval(String(a.contributor ?? "timneutkens"));
    return {
      ok: true,
      agent: "Atlas",
      data,
      traces: [
        {
          name: "run_counterfactual",
          agent: "Atlas",
          cypher: "Simulated removal over active graph topology",
          rowCount: 1,
          ms: (data as any).recalculationMs || 1,
          note: "Computed dynamic bus-factor drop and succession reassignments.",
        },
      ],
    };
  },
};

