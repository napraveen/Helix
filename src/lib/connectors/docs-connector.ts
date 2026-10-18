/**
 * ADR / RFC Architecture Decision Document Connector
 * Parses Markdown documents and ADRs (Architecture Decision Records)
 * Extracts structured decisions, authors, systems impacted, and [:SUPERSEDES] bitemporal links.
 */

import { nanoid } from "nanoid";

export type ParsedDecision = {
  id: string;
  title: string;
  status: "PROPOSED" | "ACCEPTED" | "SUPERSEDED" | "REJECTED";
  author: string;
  decidedAt: string;
  context: string;
  decision: string;
  consequences: string;
  supersedes?: string[];
  impactedSystems: string[];
};

export type DocsIngestResult = {
  documentId: string;
  title: string;
  author: string;
  kind: "ADR" | "RFC" | "RUNBOOK" | "DOC";
  decisions: ParsedDecision[];
  nodes: Array<{ id: string; label: string; name: string; properties: Record<string, unknown> }>;
  edges: Array<{ from: string; to: string; rel: string; properties?: Record<string, unknown> }>;
};

export function parseAdrMarkdown(content: string, filenameHint?: string): DocsIngestResult {
  const documentId = `doc-adr-${nanoid(6)}`;

  // Extract Title (e.g. "# ADR-014: Freeze Copperline Billing Engine")
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : filenameHint || "Architecture Decision Record";

  // Extract Status (e.g. "Status: Accepted" or "Status: Superseded by ADR-021")
  const statusMatch = content.match(/(?:Status|State):\s*([A-Za-z0-9_\- ]+)/i);
  const rawStatus = (statusMatch ? statusMatch[1].trim().toUpperCase() : "ACCEPTED");
  const status = rawStatus.includes("SUPERSED")
    ? "SUPERSEDED"
    : rawStatus.includes("REJECT")
    ? "REJECTED"
    : rawStatus.includes("PROP")
    ? "PROPOSED"
    : "ACCEPTED";

  // Extract Author
  const authorMatch = content.match(/(?:Author|Decided By|Owner):\s*([^\n\r,]+)/i);
  const author = authorMatch ? authorMatch[1].trim() : "Owen Park";

  // Extract Date
  const dateMatch = content.match(/(?:Date|Decided At):\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const decidedAt = dateMatch ? dateMatch[1].trim() : new Date().toISOString().split("T")[0];

  // Extract Supersedes (e.g. "Supersedes: ADR-003" or "Superseded by: ADR-021")
  const supersedesMatch = content.match(/Supersedes:\s*([A-Za-z0-9_\-, ]+)/i);
  const supersedesList = supersedesMatch
    ? supersedesMatch[1].split(",").map((s) => s.trim())
    : [];

  // Extract Context, Decision, Consequences sections
  const contextMatch = content.match(/## Context\s+([\s\S]*?)(?=##|$)/i);
  const context = contextMatch ? contextMatch[1].trim() : "";

  const decisionMatch = content.match(/## Decision\s+([\s\S]*?)(?=##|$)/i);
  const decisionText = decisionMatch ? decisionMatch[1].trim() : "";

  const consequencesMatch = content.match(/## Consequences\s+([\s\S]*?)(?=##|$)/i);
  const consequences = consequencesMatch ? consequencesMatch[1].trim() : "";

  // Extract impacted systems
  const systemRegex = /\b([a-z0-9]+-(?:ledger|coordinator|gateway|scheduler|telemetry|stack|service|pipeline|bus|hub))\b/gi;
  const impactedSystems = Array.from(new Set(content.match(systemRegex) || []));

  const nodes: DocsIngestResult["nodes"] = [];
  const edges: DocsIngestResult["edges"] = [];

  // 1. Document node
  nodes.push({
    id: documentId,
    label: "Document",
    name: title,
    properties: {
      id: documentId,
      title,
      author,
      kind: "ADR",
      status,
      decidedAt,
      ingestedAt: new Date().toISOString(),
    },
  });

  // 2. Decision node
  const decisionId = `dec-${nanoid(6)}`;
  nodes.push({
    id: decisionId,
    label: "Decision",
    name: title,
    properties: {
      id: decisionId,
      title,
      status,
      author,
      decidedAt,
      rationale: decisionText || context,
      consequences,
      validFrom: decidedAt,
      validTo: status === "SUPERSEDED" ? new Date().toISOString().split("T")[0] : "9999-12-31",
    },
  });

  edges.push({
    from: documentId,
    to: decisionId,
    rel: "RECORDS",
  });

  // 3. Person node
  const personId = `p-${author.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  nodes.push({
    id: personId,
    label: "Person",
    name: author,
    properties: { id: personId, name: author },
  });

  edges.push({
    from: decisionId,
    to: personId,
    rel: "DECIDED_BY",
  });

  // 4. Systems connected
  for (const sys of impactedSystems) {
    const sysId = `s-${sys.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    nodes.push({
      id: sysId,
      label: "System",
      name: sys,
      properties: { id: sysId, name: sys },
    });
    edges.push({
      from: decisionId,
      to: sysId,
      rel: "IMPACTS",
    });
  }

  // 5. Supersedes edges
  for (const oldDec of supersedesList) {
    const oldDecId = `dec-${oldDec.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    nodes.push({
      id: oldDecId,
      label: "Decision",
      name: oldDec,
      properties: { id: oldDecId, title: oldDec, status: "SUPERSEDED" },
    });
    edges.push({
      from: decisionId,
      to: oldDecId,
      rel: "SUPERSEDES",
      properties: {
        supersededAt: decidedAt,
        evidence: `Explicitly superseded by ${title}`,
      },
    });
  }

  return {
    documentId,
    title,
    author,
    kind: "ADR",
    decisions: [
      {
        id: decisionId,
        title,
        status,
        author,
        decidedAt,
        context,
        decision: decisionText,
        consequences,
        supersedes: supersedesList,
        impactedSystems,
      },
    ],
    nodes,
    edges,
  };
}
