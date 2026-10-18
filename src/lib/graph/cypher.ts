export const CYPHER = {
  counts: `
    MATCH (n)
    WITH labels(n)[0] AS label, count(*) AS c
    RETURN label, c
    ORDER BY c DESC
  `,
  relationshipCounts: `
    MATCH ()-[r]->()
    RETURN type(r) AS type, count(r) AS c
    ORDER BY c DESC
  `,
  whoKnows: `
    MATCH (p:Person)-[k:KNOWS]->(t:Topic)
    WHERE toLower(t.name) CONTAINS toLower($topic)
       OR toLower(t.id) CONTAINS toLower($topic)
    OPTIONAL MATCH (p)-[:WORKS_ON]->(pr:Project)-[:USES]->(s:System)
    WHERE toLower(s.name) CONTAINS toLower($topic)
       OR toLower(s.id) CONTAINS toLower($topic)
    OPTIONAL MATCH (p)-[:OWNS]->(owned)
    RETURN p.id AS personId, p.name AS person, p.role AS role, t.name AS topic,
           k.weight AS weight, k.evidence AS evidence,
           collect(DISTINCT pr.name) AS projects,
           collect(DISTINCT owned.name) AS owns
    ORDER BY k.weight DESC
    LIMIT 12
  `,
  whoKnowsSystem: `
    MATCH (s:System)
    WHERE toLower(s.name) CONTAINS toLower($q) OR toLower(s.id) CONTAINS toLower($q)
    MATCH (p:Person)-[rel]->(x)
    WHERE x = s OR (x:Project AND (x)-[:USES]->(s)) OR (x:Topic AND toLower(x.name) CONTAINS toLower(s.name))
    WITH p, s, type(rel) AS how, rel
    OPTIONAL MATCH (p)-[:KNOWS]->(t:Topic)
    WHERE toLower(t.name) CONTAINS toLower(s.name) OR toLower(t.name) CONTAINS toLower($q)
    RETURN DISTINCT p.id AS personId, p.name AS person, p.role AS role,
           s.name AS system, s.criticality AS criticality, how
    LIMIT 20
  `,
  whoOwns: `
    MATCH (p:Person)-[:OWNS]->(n)
    WHERE toLower(coalesce(n.name, n.title, '')) CONTAINS toLower($q)
       OR toLower(coalesce(n.id, '')) CONTAINS toLower($q)
    RETURN p.name AS owner, p.role AS role, labels(n)[0] AS kind,
           coalesce(n.name, n.title) AS thing, n.id AS id
    LIMIT 20
  `,
  orgAroundPerson: `
    MATCH (p:Person)
    WHERE toLower(p.name) CONTAINS toLower($q) OR p.id = $q
    OPTIONAL MATCH (p)-[:MEMBER_OF]->(t:Team)
    OPTIONAL MATCH (p)-[:REPORTS_TO]->(m:Person)
    OPTIONAL MATCH (r:Person)-[:REPORTS_TO]->(p)
    OPTIONAL MATCH (p)-[:WORKS_ON]->(pr:Project)
    OPTIONAL MATCH (p)-[:KNOWS]->(topic:Topic)
    RETURN p.name AS person, p.role AS role, p.skills AS skills,
           collect(DISTINCT t.name) AS teams,
           collect(DISTINCT m.name) AS managers,
           collect(DISTINCT r.name) AS reports,
           collect(DISTINCT pr.name) AS projects,
           collect(DISTINCT topic.name) AS topics
  `,
  traceDecision: `
    MATCH (d:Decision)
    WHERE toLower(d.title) CONTAINS toLower($q)
       OR toLower(d.id) CONTAINS toLower($q)
       OR toLower(d.rationale) CONTAINS toLower($q)
    OPTIONAL MATCH (d)<-[:DECIDED_BY]-(who:Person)
    OPTIONAL MATCH (d)-[:BASED_ON]->(src)
    OPTIONAL MATCH (d)-[:ABOUT]->(about)
    OPTIONAL MATCH (d)-[:SUPERSEDES]->(old:Decision)
    OPTIONAL MATCH (newer:Decision)-[:SUPERSEDES]->(d)
    RETURN d.id AS id, d.title AS title, d.status AS status, d.rationale AS rationale,
           d.outcome AS outcome, d.decidedAt AS decidedAt,
           collect(DISTINCT who.name) AS decidedBy,
           collect(DISTINCT {kind: labels(src)[0], id: src.id, title: coalesce(src.title, src.name)}) AS sources,
           collect(DISTINCT {kind: labels(about)[0], name: coalesce(about.name, about.title)}) AS about,
           collect(DISTINCT old.title) AS supersedes,
           collect(DISTINCT newer.title) AS supersededBy
  `,
  blastRadius: `
    MATCH (s:System)
    WHERE toLower(s.name) CONTAINS toLower($q) OR toLower(s.id) CONTAINS toLower($q)
    OPTIONAL MATCH (s)<-[:DEPENDS_ON*]-(down:System)
    OPTIONAL MATCH (pr:Project)-[:USES]->(s)
    OPTIONAL MATCH (pr)-[:USES]->(other:System)
    OPTIONAL MATCH (p:Person)-[:OWNS]->(s)
    OPTIONAL MATCH (oncall:Person)-[:OWNS]->(s)
    RETURN s.name AS system, s.criticality AS criticality, s.summary AS summary,
           collect(DISTINCT down.name) AS downstream,
           collect(DISTINCT pr.name) AS projects,
           collect(DISTINCT other.name) AS siblingSystems,
           collect(DISTINCT p.name) AS owners
  `,
  projectContext: `
    MATCH (pr:Project)
    WHERE toLower(pr.name) CONTAINS toLower($q) OR toLower(pr.id) CONTAINS toLower($q)
    OPTIONAL MATCH (p:Person)-[:WORKS_ON]->(pr)
    OPTIONAL MATCH (owner:Person)-[:OWNS]->(pr)
    OPTIONAL MATCH (pr)-[:USES]->(s:System)
    OPTIONAL MATCH (d:Document)-[:ABOUT]->(pr)
    OPTIONAL MATCH (t:Ticket)-[:ABOUT]->(pr)
    OPTIONAL MATCH (dec:Decision)-[:ABOUT]->(pr)
    RETURN pr.name AS project, pr.status AS status, pr.summary AS summary,
           collect(DISTINCT owner.name) AS owners,
           collect(DISTINCT p.name) AS people,
           collect(DISTINCT s.name) AS systems,
           collect(DISTINCT d.title) AS docs,
           collect(DISTINCT t.title) AS tickets,
           collect(DISTINCT dec.title) AS decisions
  `,
  searchNodes: `
    MATCH (n)
    WHERE toLower(coalesce(n.name, '')) CONTAINS toLower($q)
       OR toLower(coalesce(n.title, '')) CONTAINS toLower($q)
       OR toLower(coalesce(n.content, '')) CONTAINS toLower($q)
       OR toLower(coalesce(n.body, '')) CONTAINS toLower($q)
       OR toLower(coalesce(n.excerpt, '')) CONTAINS toLower($q)
       OR toLower(coalesce(n.rationale, '')) CONTAINS toLower($q)
       OR toLower(coalesce(n.notes, '')) CONTAINS toLower($q)
       OR toLower(coalesce(n.id, '')) CONTAINS toLower($q)
    RETURN labels(n)[0] AS kind, n.id AS id,
           coalesce(n.name, n.title) AS title,
           coalesce(n.summary, n.rationale, n.content, n.body, n.excerpt, n.notes, n.role) AS snippet
    LIMIT 25
  `,
  shortestPathPeople: `
    MATCH (a:Person), (b:Person)
    WHERE (toLower(a.name) CONTAINS toLower($from) OR a.id = $from)
      AND (toLower(b.name) CONTAINS toLower($to) OR b.id = $to)
    MATCH p = shortestPath((a)-[*..8]-(b))
    RETURN [n IN nodes(p) | coalesce(n.name, n.title, n.id)] AS hops,
           [r IN relationships(p) | type(r)] AS rels,
           length(p) AS distance
    LIMIT 3
  `,
  pageRankPeople: `
    CALL algo.pageRank('Person', 'REPORTS_TO')
    YIELD node, score
    RETURN node.name AS person, node.role AS role, score
    ORDER BY score DESC
    LIMIT 10
  `,
  pageRankTopics: `
    CALL algo.pageRank('Topic', 'KNOWS')
    YIELD node, score
    RETURN node.name AS topic, score
    ORDER BY score DESC
    LIMIT 10
  `,
  betweennessPeople: `
    CALL algo.betweenness({nodeLabels: ['Person'], relationshipTypes: ['REPORTS_TO', 'WORKS_ON']})
    YIELD node, score
    RETURN node.name AS person, node.role AS role, score
    ORDER BY score DESC
    LIMIT 10
  `,
  communities: `
    CALL algo.WCC({nodeLabels: ['Person', 'Team', 'Project']})
    YIELD node, componentId
    RETURN componentId, collect(coalesce(node.name, node.title))[0..8] AS members, count(node) AS size
    ORDER BY size DESC
    LIMIT 12
  `,
  staleKnowledge: `
    MATCH (d:Document)
    OPTIONAL MATCH (owner:Person)-[:OWNS]->(d)
    OPTIONAL MATCH (newer:Document)-[:SUPERSEDES]->(d)
    RETURN d.id AS id, d.title AS title, d.kind AS kind, d.updatedAt AS updatedAt,
           d.stale AS stale, collect(DISTINCT owner.name) AS owners,
           collect(DISTINCT newer.title) AS supersededBy
    ORDER BY d.updatedAt ASC
  `,
  openTickets: `
    MATCH (t:Ticket)
    OPTIONAL MATCH (t)-[:ASSIGNED_TO]->(p:Person)
    OPTIONAL MATCH (t)-[:ABOUT]->(about)
    RETURN t.id AS id, t.title AS title, t.status AS status, t.priority AS priority,
           t.body AS body, collect(DISTINCT p.name) AS assignees,
           collect(DISTINCT coalesce(about.name, about.title)) AS about
    ORDER BY t.priority DESC
  `,
  routeTicket: `
    MATCH (t:Ticket)
    WHERE t.id = $ticketId OR toLower(t.title) CONTAINS toLower($q)
    OPTIONAL MATCH (t)-[:ABOUT]->(about)
    WITH t, collect(about) AS abouts
    UNWIND abouts AS about
    OPTIONAL MATCH (p:Person)-[k:KNOWS]->(topic:Topic)
    WHERE about:Topic AND topic = about
    OPTIONAL MATCH (p2:Person)-[:OWNS]->(about)
    OPTIONAL MATCH (p3:Person)-[:WORKS_ON]->(pr:Project)-[:USES]->(about)
    WITH t, about, collect(DISTINCT {person: p.name, role: p.role, why: 'knows topic', weight: k.weight}) +
                   collect(DISTINCT {person: p2.name, role: p2.role, why: 'owns entity', weight: 1.0}) +
                   collect(DISTINCT {person: p3.name, role: p3.role, why: 'works on consuming project', weight: 0.7}) AS cands
    UNWIND cands AS c
    WITH t, c WHERE c.person IS NOT NULL
    RETURN t.id AS ticketId, t.title AS title, c.person AS person, c.role AS role, c.why AS why, c.weight AS weight
    ORDER BY c.weight DESC
    LIMIT 8
  `,
  neighborhood: `
    MATCH (n)
    WHERE n.id = $id OR toLower(coalesce(n.name, n.title, '')) = toLower($id)
    OPTIONAL MATCH (n)-[r]-(m)
    RETURN n, collect(DISTINCT {rel: type(r), node: m}) AS neighbors
    LIMIT 1
  `,
  overview: `
    MATCH (n)-[r]->(m)
    WITH n, r, m LIMIT 220
    RETURN n, type(r) AS rel, m
  `,
  recentMemories: `
    MATCH (mem:Memory)
    WHERE $sessionId IS NULL OR mem.sessionId = $sessionId
    OPTIONAL MATCH (mem)-[:RECALLS]->(e)
    RETURN mem.id AS id, mem.kind AS kind, mem.content AS content, mem.agent AS agent,
           mem.sessionId AS sessionId, mem.at AS at,
           collect(DISTINCT coalesce(e.name, e.title)) AS recalls
    ORDER BY mem.at DESC
    LIMIT 12
  `,
  decisions: `
    MATCH (d:Decision)
    OPTIONAL MATCH (d)<-[:DECIDED_BY]-(p:Person)
    OPTIONAL MATCH (d)-[:BASED_ON]->(src)
    RETURN d.id AS id, d.title AS title, d.status AS status, d.decidedAt AS decidedAt,
           d.rationale AS rationale, d.outcome AS outcome,
           collect(DISTINCT p.name) AS decidedBy,
           count(src) AS sourceCount
    ORDER BY d.decidedAt DESC
  `,
  people: `
    MATCH (p:Person)
    OPTIONAL MATCH (p)-[:MEMBER_OF]->(t:Team)
    OPTIONAL MATCH (p)-[:KNOWS]->(topic:Topic)
    OPTIONAL MATCH (p)-[:OWNS]->(owned)
    RETURN p.id AS id, p.name AS name, p.role AS role, p.email AS email,
           p.location AS location, p.skills AS skills,
           collect(DISTINCT t.name) AS teams,
           collect(DISTINCT topic.name) AS topics,
           collect(DISTINCT coalesce(owned.name, owned.title)) AS owns
    ORDER BY p.name
  `,
  resolveEntity: `
    MATCH (n)
    WHERE toLower(coalesce(n.name, '')) = toLower($name)
       OR toLower(coalesce(n.id, '')) = toLower($name)
       OR toLower(coalesce(n.title, '')) = toLower($name)
    RETURN labels(n)[0] AS kind, coalesce(n.name, n.title, n.id) AS canonicalName, n.id AS id
    LIMIT 1
  `,
   blastRadiusWithDepth: `
    MATCH (s:System)
    WHERE toLower(s.name) = toLower($name) OR toLower(s.id) = toLower($name)
    OPTIONAL MATCH path = (upstream:System)-[:DEPENDS_ON*1..4]->(s)
    OPTIONAL MATCH (p:Person)-[:OWNS]->(s)
    OPTIONAL MATCH (pr:Project)-[:USES]->(s)
    RETURN s.name AS system,
           s.criticality AS criticality,
           collect(DISTINCT upstream.name) AS affectedSystems,
           collect(DISTINCT {
             service: upstream.name,
             hops: length(path),
             via: [n IN nodes(path) | coalesce(n.name, n.id)]
           }) AS routes,
           collect(DISTINCT pr.name) AS affectedProjects,
           collect(DISTINCT p.name) AS owners
  `,
  recallFindings: `
    MATCH (f:Finding)-[:ABOUT]->(n)
    WHERE toLower(coalesce(n.name, '')) = toLower($name)
       OR toLower(coalesce(n.id, '')) = toLower($name)
    RETURN f.text AS finding, f.at AS at, f.session AS session
    ORDER BY f.at DESC
    LIMIT 5
  `,
} as const;

export function blastRadiusWithDepthCypher(depth: number = 4): string {
  const boundedDepth = Math.min(Math.max(Math.floor(depth) || 4, 1), 6);
  return `
    MATCH (s:System)
    WHERE toLower(s.name) = toLower($name) OR toLower(s.id) = toLower($name)
    OPTIONAL MATCH path = (upstream:System)-[:DEPENDS_ON*1..${boundedDepth}]->(s)
    OPTIONAL MATCH (p:Person)-[:OWNS]->(s)
    OPTIONAL MATCH (pr:Project)-[:USES]->(s)
    RETURN s.name AS system,
           s.criticality AS criticality,
           collect(DISTINCT upstream.name) AS affectedSystems,
           collect(DISTINCT {
             service: upstream.name,
             hops: length(path),
             via: [n IN nodes(path) | coalesce(n.name, n.id)]
           }) AS routes,
           collect(DISTINCT pr.name) AS affectedProjects,
           collect(DISTINCT p.name) AS owners
  `;
}
