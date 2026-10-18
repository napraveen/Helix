import { Type, type FunctionDeclaration } from "@google/genai";

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "who_knows",
    description: "Find people who know a topic or system, with evidence weights from the graph.",
    parameters: {
      type: Type.OBJECT,
      properties: { topic: { type: Type.STRING, description: "Topic, system, or skill" } },
      required: ["topic"],
    },
  },
  {
    name: "who_owns",
    description: "Who owns a project, system, or document.",
    parameters: {
      type: Type.OBJECT,
      properties: { q: { type: Type.STRING } },
      required: ["q"],
    },
  },
  {
    name: "org_around",
    description: "Org context for a person: manager, reports, teams, projects, topics.",
    parameters: {
      type: Type.OBJECT,
      properties: { q: { type: Type.STRING } },
      required: ["q"],
    },
  },
  {
    name: "trace_decision",
    description: "Trace a decision back to people, documents, meetings, tickets, and what it supersedes.",
    parameters: {
      type: Type.OBJECT,
      properties: { q: { type: Type.STRING } },
      required: ["q"],
    },
  },
  {
    name: "blast_radius",
    description: "What breaks if a system goes down: downstream systems, projects, owners. Supports configurable graph hop depth.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        q: { type: Type.STRING, description: "System name to analyze blast radius for" },
        depth: { type: Type.INTEGER, description: "Graph traversal hop depth (1 to 6, default 4)" },
      },
      required: ["q"],
    },
  },
  {
    name: "project_context",
    description: "People, systems, docs, tickets, and decisions around a project.",
    parameters: {
      type: Type.OBJECT,
      properties: { q: { type: Type.STRING } },
      required: ["q"],
    },
  },
  {
    name: "search_graph",
    description: "Keyword search across people, docs, tickets, chats, decisions.",
    parameters: {
      type: Type.OBJECT,
      properties: { q: { type: Type.STRING } },
      required: ["q"],
    },
  },
  {
    name: "shortest_path",
    description: "Shortest path between two people in the company graph.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        from: { type: Type.STRING },
        to: { type: Type.STRING },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "expertise_rank",
    description: "PageRank plus KNOWS weights to rank influential people and topics.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "knowledge_bridges",
    description: "Betweenness / collaborator bridges — people who connect otherwise separate groups.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "communities",
    description: "Connected components / team communities in the company graph.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "stale_knowledge",
    description: "Documents that are stale or superseded. Use this to keep knowledge current.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "list_tickets",
    description: "Open and pending tickets with assignees and related entities.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "route_work",
    description: "Recommend who should own a ticket from KNOWS, OWNS, and WORKS_ON.",
    parameters: {
      type: Type.OBJECT,
      properties: { q: { type: Type.STRING } },
      required: ["q"],
    },
  },
  {
    name: "recall_memory",
    description: "Read persistent agent memory from prior sessions in FalkorDB.",
    parameters: {
      type: Type.OBJECT,
      properties: { sessionId: { type: Type.STRING } },
    },
  },
  {
    name: "remember",
    description: "Write an episodic or semantic memory into the shared graph so other agents can use it.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionId: { type: Type.STRING },
        content: { type: Type.STRING },
        kind: { type: Type.STRING },
        recalls: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["sessionId", "content"],
    },
  },
  {
    name: "record_decision",
    description: "Write a new decision node with sources. Use only when the user asks to record one.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        rationale: { type: Type.STRING },
        decidedBy: { type: Type.STRING },
        basedOn: { type: Type.ARRAY, items: { type: Type.STRING } },
        about: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["title", "rationale", "decidedBy"],
    },
  },
  {
    name: "mark_superseded",
    description: "Mark old knowledge as superseded by a newer node id.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        oldId: { type: Type.STRING },
        newId: { type: Type.STRING },
      },
      required: ["oldId", "newId"],
    },
  },
  {
    name: "assign_work",
    description: "Assign a ticket to a person in the graph.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ticketId: { type: Type.STRING },
        person: { type: Type.STRING },
      },
      required: ["ticketId", "person"],
    },
  },
  {
    name: "ingest_note",
    description: "Ingest a document or note into the graph and link it to matching entities.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        author: { type: Type.STRING },
        kind: { type: Type.STRING },
      },
      required: ["title", "content"],
    },
  },
];

export const SYSTEM_PROMPT = `You are Helix, the company brain for DevFlow (a modern developer platform & automated CI/CD infrastructure company).

You do not guess. You query FalkorDB through tools. The graph is the system of record.

Specialist agents share the same graph:
- Atlas: who knows / who owns / org / paths / PageRank
- Ledger: decisions and provenance
- Pulse: freshness, blast radius, ingest
- Dispatch: tickets and routing
- Helix: orchestration and memory

Rules:
1. Call tools before answering. Prefer 2–4 targeted tools over a vague search.
2. Every claim must name sources (document, decision, ticket, chat, person).
3. Show the path: who connected to what, and why that hop matters.
4. If knowledge is stale, say so and who should update it.
5. You may take actions (assign_work, record_decision, ingest_note, mark_superseded, remember) when the user wants work done.
6. After a useful answer, remember a one-line episodic memory for this session.
7. Never invent people, systems, or decisions that the tools did not return.
8. Write like a precise operator, not a chatbot. Short paragraphs. Named sources.`;
