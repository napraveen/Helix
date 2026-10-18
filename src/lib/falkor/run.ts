import { getGraph, withTimeout } from "./client";
import { getOfflineResult } from "./offline-data";

export type QueryRow = Record<string, unknown>;

export type QueryResult = {
  cypher: string;
  params?: Record<string, unknown>;
  rows: QueryRow[];
  metadata?: unknown;
};

function asRows(data: unknown): QueryRow[] {
  if (!data) return [];
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return row as QueryRow;
    }
    return { value: row };
  });
}

export class FalkorDBConnectionError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "FalkorDBConnectionError";
  }
}

export async function runCypher(
  cypher: string,
  params?: Record<string, unknown>,
  readOnly = false,
): Promise<QueryResult> {
  try {
    const graph = await getGraph();
    const options = params ? { params: params as any } : undefined;
    const queryPromise = readOnly
      ? graph.roQuery<QueryRow>(cypher, options)
      : graph.query<QueryRow>(cypher, options);
    const reply = await withTimeout(queryPromise, 3500, "FalkorDB query execution timed out after 3500ms");

    return {
      cypher,
      params,
      rows: asRows(reply.data),
      metadata: reply.metadata,
    };
  } catch (error) {
    // WeMakeDevs Architecture: A graph agent must NOT simulate answers from mock data when FalkorDB is disconnected.
    // The graph IS the context layer; fail explicitly with connection instructions.
    if (process.env.ALLOW_OFFLINE_MOCK === "true") {
      const offlineRows = getOfflineResult(cypher, params);
      return {
        cypher,
        params,
        rows: offlineRows,
        metadata: { note: "FalkorDB offline snapshot (ALLOW_OFFLINE_MOCK=true)" },
      };
    }

    throw new FalkorDBConnectionError(
      `FalkorDB is unreachable at 127.0.0.1:6379. The agent cannot reason without its live graph context layer. Please start FalkorDB: docker compose up -d (or docker run -p 6379:6379 falkordb/falkordb)`,
      error
    );
  }
}

export function nodeProps(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  if (record.properties && typeof record.properties === "object") {
    return record.properties as Record<string, unknown>;
  }
  return record;
}

export function nodeLabel(value: unknown): string {
  if (!value || typeof value !== "object") return "Node";
  const record = value as { labels?: string[]; label?: string };
  if (Array.isArray(record.labels) && record.labels[0]) return record.labels[0];
  if (record.label) return record.label;
  return "Node";
}

export function compactNode(value: unknown) {
  const props = nodeProps(value);
  return {
    id: String(props.id ?? props.name ?? ""),
    label: nodeLabel(value),
    name: String(props.name ?? props.title ?? props.id ?? "unknown"),
    properties: props,
  };
}
