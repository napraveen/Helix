import { getGraph } from "../falkor/client";
import { runCypher } from "../falkor/run";
import {
  chats,
  decisions,
  depends,
  documents,
  knows,
  meetings,
  memberships,
  owns,
  people,
  projects,
  reportsTo,
  systems,
  teams,
  tickets,
  topics,
  uses,
  worksOn,
} from "./seed-data";

async function rel(cypher: string, params: Record<string, unknown>) {
  await runCypher(cypher, params);
}

export async function resetAndSeed() {
  const graph = await getGraph();
  try {
    await graph.delete();
  } catch {
    // graph may not exist yet
  }

  await runCypher(`
    CREATE (:Agent {id:'agent-helix', name:'Helix', specialty:'orchestrator'}),
           (:Agent {id:'agent-atlas', name:'Atlas', specialty:'org-and-expertise'}),
           (:Agent {id:'agent-ledger', name:'Ledger', specialty:'decisions-and-provenance'}),
           (:Agent {id:'agent-pulse', name:'Pulse', specialty:'freshness-and-change'}),
           (:Agent {id:'agent-dispatch', name:'Dispatch', specialty:'work-routing'})
  `);

  for (const p of people) {
    await runCypher(
      `CREATE (:Person {id:$id, name:$name, role:$role, email:$email, location:$location, skills:$skills, hired:$hired})`,
      p,
    );
  }
  for (const t of teams) {
    await runCypher(`CREATE (:Team {id:$id, name:$name, mission:$mission})`, t);
  }
  for (const p of projects) {
    await runCypher(
      `CREATE (:Project {id:$id, name:$name, status:$status, summary:$summary})`,
      p,
    );
  }
  for (const s of systems) {
    await runCypher(
      `CREATE (:System {id:$id, name:$name, criticality:$criticality, summary:$summary})`,
      s,
    );
  }
  for (const name of topics) {
    const id = `topic-${name.toLowerCase().replace(/\s+/g, "-")}`;
    await runCypher(`CREATE (:Topic {id:$id, name:$name})`, { id, name });
  }
  for (const d of documents) {
    await runCypher(
      `CREATE (:Document {id:$id, title:$title, kind:$kind, content:$content, updatedAt:$updatedAt, stale:$stale})`,
      d,
    );
  }
  for (const t of tickets) {
    await runCypher(
      `CREATE (:Ticket {id:$id, title:$title, status:$status, priority:$priority, body:$body, updatedAt:$updatedAt})`,
      t,
    );
  }
  for (const c of chats) {
    await runCypher(
      `CREATE (:Chat {id:$id, channel:$channel, excerpt:$excerpt, at:$at})`,
      c,
    );
  }
  for (const m of meetings) {
    await runCypher(
      `CREATE (:Meeting {id:$id, title:$title, at:$at, notes:$notes})`,
      m,
    );
  }
  for (const d of decisions) {
    await runCypher(
      `CREATE (:Decision {id:$id, title:$title, status:$status, rationale:$rationale, decidedAt:$decidedAt, outcome:$outcome})`,
      d,
    );
  }

  for (const [person, team] of memberships) {
    await rel(
      `MATCH (p:Person {id:$person}), (t:Team {id:$team}) CREATE (p)-[:MEMBER_OF]->(t)`,
      { person, team },
    );
  }
  for (const [person, manager] of reportsTo) {
    await rel(
      `MATCH (p:Person {id:$person}), (m:Person {id:$manager}) CREATE (p)-[:REPORTS_TO]->(m)`,
      { person, manager },
    );
  }
  for (const [person, thing] of owns) {
    await rel(
      `MATCH (p:Person {id:$person}), (n {id:$thing}) CREATE (p)-[:OWNS]->(n)`,
      { person, thing },
    );
  }
  for (const [person, project] of worksOn) {
    await rel(
      `MATCH (p:Person {id:$person}), (pr:Project {id:$project}) CREATE (p)-[:WORKS_ON]->(pr)`,
      { person, project },
    );
  }
  for (const [project, system] of uses) {
    await rel(
      `MATCH (pr:Project {id:$project}), (s:System {id:$system}) CREATE (pr)-[:USES]->(s)`,
      { project, system },
    );
  }
  for (const [from, to] of depends) {
    await rel(
      `MATCH (a:System {id:$from}), (b:System {id:$to}) CREATE (a)-[:DEPENDS_ON]->(b)`,
      { from, to },
    );
  }
  for (const [person, topic, weight, evidence] of knows) {
    await rel(
      `MATCH (p:Person {id:$person}), (t:Topic {name:$topic})
       CREATE (p)-[:KNOWS {weight:$weight, evidence:$evidence}]->(t)`,
      { person, topic, weight, evidence },
    );
  }

  await rel(
    `MATCH (d:Document {id:'doc-adr014'}), (dec:Decision {id:'dec-014'})
     CREATE (d)-[:ABOUT]->(dec)`,
    {},
  );
  await rel(
    `MATCH (a:Person {id:'p-owen'}), (d:Document {id:'doc-adr014'}) CREATE (a)-[:AUTHORED]->(d)`,
    {},
  );
  await rel(
    `MATCH (a:Person {id:'p-nora'}), (d:Document {id:'doc-pm441'}) CREATE (a)-[:AUTHORED]->(d)`,
    {},
  );
  await rel(
    `MATCH (a:Person {id:'p-haruto'}), (d:Document {id:'doc-ota-v4'}) CREATE (a)-[:AUTHORED]->(d)`,
    {},
  );
  await rel(
    `MATCH (a:Person {id:'p-isla'}), (d:Document {id:'doc-ota-wiki'}) CREATE (a)-[:AUTHORED]->(d)`,
    {},
  );
  await rel(
    `MATCH (a:Person {id:'p-leo'}), (d:Document {id:'doc-vision'}) CREATE (a)-[:AUTHORED]->(d)`,
    {},
  );
  await rel(
    `MATCH (a:Person {id:'p-jade'}), (d:Document {id:'doc-fleet'}) CREATE (a)-[:AUTHORED]->(d)`,
    {},
  );

  await rel(`MATCH (d:Document {id:'doc-pm441'}), (s:System {id:'s-billing'}) CREATE (d)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (d:Document {id:'doc-pm441'}), (t:Topic {name:'billing'}) CREATE (d)-[:ABOUT]->(t)`, {});
  await rel(`MATCH (d:Document {id:'doc-adr014'}), (t:Topic {name:'billing'}) CREATE (d)-[:ABOUT]->(t)`, {});
  await rel(`MATCH (d:Document {id:'doc-adr014'}), (pr:Project {id:'pr-copperline'}) CREATE (d)-[:ABOUT]->(pr)`, {});
  await rel(`MATCH (d:Document {id:'doc-ota-wiki'}), (s:System {id:'s-ota'}) CREATE (d)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (d:Document {id:'doc-ota-v4'}), (s:System {id:'s-ota'}) CREATE (d)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (d:Document {id:'doc-ota-v4'}), (t:Topic {name:'secrets vault'}) CREATE (d)-[:ABOUT]->(t)`, {});
  await rel(`MATCH (newer:Document {id:'doc-ota-v4'}), (old:Document {id:'doc-ota-wiki'}) CREATE (newer)-[:SUPERSEDES]->(old)`, {});
  await rel(`MATCH (d:Document {id:'doc-vision'}), (s:System {id:'s-vision'}) CREATE (d)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (d:Document {id:'doc-vision'}), (pr:Project {id:'pr-meridian'}) CREATE (d)-[:ABOUT]->(pr)`, {});
  await rel(`MATCH (d:Document {id:'doc-fleet'}), (s:System {id:'s-fleet'}) CREATE (d)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (d:Document {id:'doc-identity'}), (s:System {id:'s-auth'}) CREATE (d)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (d:Document {id:'doc-oncall'}), (t:Topic {name:'incident response'}) CREATE (d)-[:ABOUT]->(t)`, {});

  await rel(`MATCH (t:Ticket {id:'tck-8821'}), (s:System {id:'s-vision'}) CREATE (t)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8821'}), (pr:Project {id:'pr-meridian'}) CREATE (t)-[:ABOUT]->(pr)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8821'}), (topic:Topic {name:'runner sandboxing'}) CREATE (t)-[:ABOUT]->(topic)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8821'}), (p:Person {id:'p-leo'}) CREATE (t)-[:ASSIGNED_TO]->(p)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8744'}), (s:System {id:'s-ota'}) CREATE (t)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8744'}), (d:Document {id:'doc-ota-wiki'}) CREATE (t)-[:ABOUT]->(d)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8744'}), (p:Person {id:'p-isla'}) CREATE (t)-[:ASSIGNED_TO]->(p)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8602'}), (s:System {id:'s-fleet'}) CREATE (t)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8602'}), (s:System {id:'s-bus'}) CREATE (t)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8602'}), (p:Person {id:'p-jade'}) CREATE (t)-[:ASSIGNED_TO]->(p)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8510'}), (tpc:Topic {name:'billing'}) CREATE (t)-[:ABOUT]->(tpc)`, {});
  await rel(`MATCH (t:Ticket {id:'tck-8412'}), (tpc:Topic {name:'graph context'}) CREATE (t)-[:ABOUT]->(tpc)`, {});

  await rel(`MATCH (c:Chat {id:'chat-1'}), (p:Person {id:'p-jade'}) CREATE (p)-[:AUTHORED]->(c)`, {});
  await rel(`MATCH (c:Chat {id:'chat-1'}), (s:System {id:'s-fleet'}) CREATE (c)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (c:Chat {id:'chat-2'}), (p:Person {id:'p-jonah'}) CREATE (p)-[:AUTHORED]->(c)`, {});
  await rel(`MATCH (c:Chat {id:'chat-2'}), (t:Topic {name:'billing'}) CREATE (c)-[:ABOUT]->(t)`, {});
  await rel(`MATCH (c:Chat {id:'chat-3'}), (p:Person {id:'p-leo'}) CREATE (p)-[:AUTHORED]->(c)`, {});
  await rel(`MATCH (c:Chat {id:'chat-3'}), (s:System {id:'s-vision'}) CREATE (c)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (c:Chat {id:'chat-4'}), (p:Person {id:'p-isla'}) CREATE (p)-[:AUTHORED]->(c)`, {});
  await rel(`MATCH (c:Chat {id:'chat-4'}), (d:Document {id:'doc-ota-wiki'}) CREATE (c)-[:ABOUT]->(d)`, {});

  await rel(`MATCH (m:Meeting {id:'mtg-bill'}), (p:Person {id:'p-owen'}) CREATE (p)-[:ATTENDED]->(m)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-bill'}), (p:Person {id:'p-jonah'}) CREATE (p)-[:ATTENDED]->(m)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-bill'}), (p:Person {id:'p-priya'}) CREATE (p)-[:ATTENDED]->(m)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-bill'}), (p:Person {id:'p-nora'}) CREATE (p)-[:ATTENDED]->(m)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-bill'}), (t:Topic {name:'billing'}) CREATE (m)-[:ABOUT]->(t)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-ota'}), (p:Person {id:'p-haruto'}) CREATE (p)-[:ATTENDED]->(m)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-ota'}), (p:Person {id:'p-quinn'}) CREATE (p)-[:ATTENDED]->(m)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-lisbon'}), (p:Person {id:'p-leo'}) CREATE (p)-[:ATTENDED]->(m)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-lisbon'}), (p:Person {id:'p-elena'}) CREATE (p)-[:ATTENDED]->(m)`, {});
  await rel(`MATCH (m:Meeting {id:'mtg-lisbon'}), (pr:Project {id:'pr-meridian'}) CREATE (m)-[:ABOUT]->(pr)`, {});

  await rel(`MATCH (d:Decision {id:'dec-014'}), (p:Person {id:'p-jonah'}) CREATE (d)<-[:DECIDED_BY]-(p)`, {});
  await rel(`MATCH (d:Decision {id:'dec-014'}), (p:Person {id:'p-owen'}) CREATE (d)<-[:DECIDED_BY]-(p)`, {});
  await rel(`MATCH (d:Decision {id:'dec-014'}), (doc:Document {id:'doc-adr014'}) CREATE (d)-[:BASED_ON]->(doc)`, {});
  await rel(`MATCH (d:Decision {id:'dec-014'}), (doc:Document {id:'doc-pm441'}) CREATE (d)-[:BASED_ON]->(doc)`, {});
  await rel(`MATCH (d:Decision {id:'dec-014'}), (m:Meeting {id:'mtg-bill'}) CREATE (d)-[:BASED_ON]->(m)`, {});
  await rel(`MATCH (d:Decision {id:'dec-014'}), (c:Chat {id:'chat-2'}) CREATE (d)-[:BASED_ON]->(c)`, {});
  await rel(`MATCH (d:Decision {id:'dec-014'}), (t:Topic {name:'billing'}) CREATE (d)-[:ABOUT]->(t)`, {});
  await rel(`MATCH (d:Decision {id:'dec-014'}), (pr:Project {id:'pr-copperline'}) CREATE (d)-[:ABOUT]->(pr)`, {});
  await rel(`MATCH (n:Decision {id:'dec-014'}), (o:Decision {id:'dec-003'}) CREATE (n)-[:SUPERSEDES]->(o)`, {});
  await rel(`MATCH (d:Decision {id:'dec-003'}), (p:Person {id:'p-owen'}) CREATE (d)<-[:DECIDED_BY]-(p)`, {});
  await rel(`MATCH (d:Decision {id:'dec-003'}), (doc:Document {id:'doc-adr003'}) CREATE (d)-[:BASED_ON]->(doc)`, {});
  await rel(`MATCH (d:Decision {id:'dec-021'}), (p:Person {id:'p-haruto'}) CREATE (d)<-[:DECIDED_BY]-(p)`, {});
  await rel(`MATCH (d:Decision {id:'dec-021'}), (p:Person {id:'p-quinn'}) CREATE (d)<-[:DECIDED_BY]-(p)`, {});
  await rel(`MATCH (d:Decision {id:'dec-021'}), (doc:Document {id:'doc-ota-v4'}) CREATE (d)-[:BASED_ON]->(doc)`, {});
  await rel(`MATCH (d:Decision {id:'dec-021'}), (m:Meeting {id:'mtg-ota'}) CREATE (d)-[:BASED_ON]->(m)`, {});
  await rel(`MATCH (d:Decision {id:'dec-021'}), (t:Topic {name:'secrets vault'}) CREATE (d)-[:ABOUT]->(t)`, {});
  await rel(`MATCH (d:Decision {id:'dec-028'}), (p:Person {id:'p-owen'}) CREATE (d)<-[:DECIDED_BY]-(p)`, {});
  await rel(`MATCH (d:Decision {id:'dec-028'}), (t:Topic {name:'graph context'}) CREATE (d)-[:ABOUT]->(t)`, {});

  await runCypher(`
    CREATE (e:ChangeEvent {id:'chg-441', kind:'incident', summary:'INC-441 billing webhook blackout on billing-ledger', at:'2026-08-10'})
  `);
  await rel(`MATCH (e:ChangeEvent {id:'chg-441'}), (s:System {id:'s-billing'}) CREATE (e)-[:ABOUT]->(s)`, {});
  await rel(`MATCH (e:ChangeEvent {id:'chg-441'}), (d:Decision {id:'dec-014'}) CREATE (d)-[:BASED_ON]->(e)`, {});

  try {
    await graph.createNodeRangeIndex("Person", "id", "name");
    await graph.createNodeRangeIndex("System", "id", "name");
    await graph.createNodeRangeIndex("Project", "id", "name");
    await graph.createNodeRangeIndex("Decision", "id", "title");
    await graph.createNodeRangeIndex("Document", "id", "title");
    await graph.createNodeFulltextIndex("Document", "title", "content");
    await graph.createNodeFulltextIndex("Ticket", "title", "body");
  } catch {
    // indexes are best-effort on community images
  }

  const stats = await runCypher(
    `MATCH (n) RETURN count(n) AS nodes
     UNION ALL
     MATCH ()-[r]->() RETURN count(r) AS nodes`,
  );
  return { ok: true, stats: stats.rows };
}
