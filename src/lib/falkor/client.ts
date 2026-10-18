import { FalkorDB } from "falkordb";
import net from "net";

const globalForFalkor = globalThis as unknown as {
  helixFalkor?: Promise<FalkorDB>;
};

export type FalkorStatus = {
  isLive: boolean;
  host: string;
  port: number;
  version: string;
  graphKey: string;
  nodeCount: number;
  edgeCount: number;
  pingMs: number;
  graphs: string[];
  error?: string;
};

/**
 * Fast sub-millisecond TCP probe to detect if FalkorDB port is reachable
 * before opening full Redis protocol connections.
 */
export function probeTcpPort(host: string, port: number, timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.once("timeout", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.once("error", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });

    try {
      socket.connect(port, host);
    } catch {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }
  });
}

async function connect(): Promise<FalkorDB> {
  const url = process.env.FALKORDB_URL;
  let client: FalkorDB;

  if (url) {
    client = await FalkorDB.connect({
      url,
      socket: {
        connectTimeout: 5000,
      },
    });
  } else {
    const host = process.env.FALKORDB_HOST ?? "127.0.0.1";
    const port = Number(process.env.FALKORDB_PORT ?? 6379);
    const password = process.env.FALKORDB_PASSWORD || undefined;
    const username = process.env.FALKORDB_USERNAME || (password ? "default" : undefined);
    const isLocal = host === "127.0.0.1" || host === "localhost";

    client = await FalkorDB.connect({
      username,
      password,
      socket: {
        host,
        port,
        connectTimeout: isLocal ? 800 : 5000,
      },
    });
  }

  // Prevent EventEmitter unhandled error crash when Docker container stops/restarts
  client.on("error", () => {
    globalForFalkor.helixFalkor = undefined;
  });

  return client;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

export function graphName() {
  return process.env.FALKORDB_GRAPH ?? "helix";
}

export function resetDbConnection() {
  globalForFalkor.helixFalkor = undefined;
}

export async function getDb() {
  const host = process.env.FALKORDB_HOST ?? "127.0.0.1";
  const port = Number(process.env.FALKORDB_PORT ?? 6379);

  const isLocal = host === "127.0.0.1" || host === "localhost";

  // Fast pre-flight check to fail immediately without hanging (e.g. when Docker is stopped)
  if (!process.env.FALKORDB_URL) {
    const reachable = await probeTcpPort(host, port, isLocal ? 300 : 3000);
    if (!reachable) {
      globalForFalkor.helixFalkor = undefined;
      throw new Error(`FalkorDB is unreachable at ${host}:${port}. Port closed or host unreachable.`);
    }
  }

  // If a cached client exists, verify that its socket is still active within 600ms
  if (globalForFalkor.helixFalkor) {
    try {
      const db = await withTimeout(globalForFalkor.helixFalkor, 500, "Cached client lookup timeout");
      await withTimeout(db.list(), isLocal ? 600 : 3000, "Cached socket list() vitality test timeout");
      return db;
    } catch {
      // Socket died during container restart; clear cache to force fresh connect
      globalForFalkor.helixFalkor = undefined;
    }
  }

  const connectPromise = connect();
  globalForFalkor.helixFalkor = connectPromise;
  try {
    const db = await withTimeout(connectPromise, isLocal ? 1200 : 6000, "FalkorDB.connect() timeout");
    return db;
  } catch (error) {
    globalForFalkor.helixFalkor = undefined;
    throw error;
  }
}

export async function getGraph(name?: string) {
  const db = await getDb();
  return db.selectGraph(name ?? graphName());
}

export async function pingFalkor() {
  const db = await getDb();
  const graphs = await db.list();
  return { ok: true, graphs };
}

export async function getFalkorStatus(): Promise<FalkorStatus> {
  const started = performance.now();
  const host = process.env.FALKORDB_HOST ?? "127.0.0.1";
  const port = Number(process.env.FALKORDB_PORT ?? 6379);
  const graphKey = graphName();

  try {
    const db = await getDb();
    const graphs = await db.list();
    const graph = db.selectGraph(graphKey);

    let nodeCount = 0;
    let edgeCount = 0;
    try {
      const nodeRes = await withTimeout(
        graph.roQuery<any>("MATCH (n) RETURN count(n) AS cnt"),
        1000,
        "Node count query timeout"
      );
      if (nodeRes.data && nodeRes.data[0]) {
        nodeCount = Number((nodeRes.data[0] as any).cnt || (nodeRes.data[0] as any).value || 0);
      }
      const edgeRes = await withTimeout(
        graph.roQuery<any>("MATCH ()-[r]->() RETURN count(r) AS cnt"),
        1000,
        "Edge count query timeout"
      );
      if (edgeRes.data && edgeRes.data[0]) {
        edgeCount = Number((edgeRes.data[0] as any).cnt || (edgeRes.data[0] as any).value || 0);
      }
    } catch {
      // If graph is newly initialized with 0 nodes or query timeout
    }

    const pingMs = Number((performance.now() - started).toFixed(1));

    return {
      isLive: true,
      host: process.env.FALKORDB_URL ? "falkordb-cloud" : host,
      port,
      version: "v6.6.2",
      graphKey,
      nodeCount,
      edgeCount,
      pingMs,
      graphs,
    };
  } catch (err: any) {
    globalForFalkor.helixFalkor = undefined;
    return {
      isLive: false,
      host,
      port,
      version: "DISCONNECTED",
      graphKey,
      nodeCount: 0,
      edgeCount: 0,
      pingMs: 0,
      graphs: [],
      error: err?.message || String(err),
    };
  }
}
