/**
 * Jira & Linear Export JSON Connector
 * Parses standard ticket exports: identifier, title, description, state, priority,
 * assignee, creator, labels, estimate, and linked issues.
 */

export type IssueExportRecord = {
  id: string; // e.g. "ENG-441" or "FW-128"
  title: string;
  description?: string;
  state: "Todo" | "In Progress" | "Done" | "Canceled" | "Backlog";
  priority: "P0" | "P1" | "P2" | "P3" | "None";
  assignee?: { name: string; email?: string };
  creator?: { name: string; email?: string };
  labels?: string[];
  createdAt: string;
  updatedAt?: string;
  estimatePoints?: number;
};

export function parseIssueExport(issues: IssueExportRecord[]): {
  nodes: Array<{ id: string; label: string; name: string; properties: Record<string, unknown> }>;
  edges: Array<{ from: string; to: string; rel: string; properties?: Record<string, unknown> }>;
} {
  const nodes: Array<{ id: string; label: string; name: string; properties: Record<string, unknown> }> = [];
  const edges: Array<{ from: string; to: string; rel: string; properties?: Record<string, unknown> }> = [];

  for (const issue of issues) {
    const issueId = `ticket-${issue.id.toLowerCase()}`;
    nodes.push({
      id: issueId,
      label: "Ticket",
      name: `${issue.id}: ${issue.title}`,
      properties: {
        id: issueId,
        identifier: issue.id,
        title: issue.title,
        status: issue.state,
        priority: issue.priority,
        estimatePoints: issue.estimatePoints ?? 0,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt ?? issue.createdAt,
        source: "issue_export",
      },
    });

    if (issue.assignee) {
      const assigneeId = `person-${issue.assignee.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      nodes.push({
        id: assigneeId,
        label: "Person",
        name: issue.assignee.name,
        properties: { id: assigneeId, name: issue.assignee.name, email: issue.assignee.email },
      });
      edges.push({
        from: issueId,
        to: assigneeId,
        rel: "ASSIGNED_TO",
      });
    }

    if (issue.creator) {
      const creatorId = `person-${issue.creator.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      nodes.push({
        id: creatorId,
        label: "Person",
        name: issue.creator.name,
        properties: { id: creatorId, name: issue.creator.name, email: issue.creator.email },
      });
      edges.push({
        from: creatorId,
        to: issueId,
        rel: "CREATED",
      });
    }

    // Extract impacted systems from title or description
    const textToScan = `${issue.title} ${issue.description || ""}`;
    const systemRegex = /\b([a-z0-9]+-(?:ledger|coordinator|gateway|scheduler|telemetry|stack|service|pipeline|bus))\b/gi;
    const systemsFound = Array.from(new Set(textToScan.match(systemRegex) || []));

    for (const sys of systemsFound) {
      const sysId = `s-${sys.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      nodes.push({
        id: sysId,
        label: "System",
        name: sys,
        properties: { id: sysId, name: sys },
      });
      edges.push({
        from: issueId,
        to: sysId,
        rel: "AFFECTS",
      });
    }
  }

  return { nodes, edges };
}
