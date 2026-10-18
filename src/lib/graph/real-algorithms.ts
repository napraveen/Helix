// Real graph algorithm implementations in TypeScript over active graph topology
// Labeled "computed in-app" per Hard Ground Rule 3: NEVER FABRICATE AN API / NEVER FABRICATE A METRIC.

export type GraphEdge = {
  source: string;
  target: string;
  weight?: number;
  type?: string;
};

export type GraphAdjacency = {
  nodes: string[];
  edges: GraphEdge[];
  nodeLabels?: Record<string, string>;
  nodeDetails?: Record<string, Record<string, unknown>>;
};

/**
 * Computes PageRank over graph adjacency with power iteration.
 */
export function computePageRank(
  graph: GraphAdjacency,
  damping: number = 0.85,
  maxIterations: number = 30,
  epsilon: number = 0.0001
): { name: string; score: number; rank: number }[] {
  const nodes = Array.from(new Set(graph.nodes));
  const n = nodes.length;
  if (n === 0) return [];

  // Outgoing edges map
  const outDegree: Record<string, number> = {};
  const inEdges: Record<string, string[]> = {};
  for (const node of nodes) {
    outDegree[node] = 0;
    inEdges[node] = [];
  }

  for (const edge of graph.edges) {
    if (outDegree[edge.source] !== undefined) {
      outDegree[edge.source]++;
    }
    if (inEdges[edge.target] !== undefined) {
      inEdges[edge.target].push(edge.source);
    }
  }

  // Initial rank
  let ranks: Record<string, number> = {};
  for (const node of nodes) {
    ranks[node] = 1.0 / n;
  }

  for (let it = 0; it < maxIterations; it++) {
    const nextRanks: Record<string, number> = {};
    let diff = 0;

    for (const node of nodes) {
      let incomingSum = 0;
      for (const pred of inEdges[node]) {
        const out = outDegree[pred];
        if (out > 0) {
          incomingSum += ranks[pred] / out;
        }
      }
      nextRanks[node] = (1 - damping) / n + damping * incomingSum;
      diff += Math.abs(nextRanks[node] - ranks[node]);
    }

    ranks = nextRanks;
    if (diff < epsilon) break;
  }

  const result = nodes.map((name) => ({
    name,
    score: Number((ranks[name] || 0).toFixed(4)),
    rank: 0,
  }));

  result.sort((a, b) => b.score - a.score);
  result.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return result;
}

/**
 * Computes Betweenness Centrality using Brandes' Algorithm (O(V * E)).
 */
export function computeBetweennessCentrality(
  graph: GraphAdjacency
): { name: string; score: number; rawBetweenness: number }[] {
  const nodes = Array.from(new Set(graph.nodes));
  const n = nodes.length;
  if (n === 0) return [];

  // Adjacency list
  const adj: Record<string, string[]> = {};
  for (const node of nodes) {
    adj[node] = [];
  }
  for (const edge of graph.edges) {
    if (adj[edge.source] && !adj[edge.source].includes(edge.target)) {
      adj[edge.source].push(edge.target);
    }
    // Consider undirected if symmetrical
    if (adj[edge.target] && !adj[edge.target].includes(edge.source)) {
      adj[edge.target].push(edge.source);
    }
  }

  const CB: Record<string, number> = {};
  for (const node of nodes) {
    CB[node] = 0;
  }

  for (const s of nodes) {
    const S: string[] = [];
    const P: Record<string, string[]> = {};
    const sigma: Record<string, number> = {};
    const d: Record<string, number> = {};

    for (const node of nodes) {
      P[node] = [];
      sigma[node] = 0;
      d[node] = -1;
    }

    sigma[s] = 1;
    d[s] = 0;

    const Q: string[] = [s];

    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);

      for (const w of adj[v] || []) {
        if (d[w] < 0) {
          Q.push(w);
          d[w] = d[v] + 1;
        }
        if (d[w] === d[v] + 1) {
          sigma[w] += sigma[v];
          P[w].push(v);
        }
      }
    }

    const delta: Record<string, number> = {};
    for (const node of nodes) {
      delta[node] = 0;
    }

    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== s) {
        CB[w] += delta[w];
      }
    }
  }

  // Normalization factor for undirected graphs: (n-1)*(n-2)
  const normFactor = n > 2 ? (n - 1) * (n - 2) : 1;

  const results = nodes.map((name) => {
    const raw = CB[name] / 2; // undirected divide by 2
    const normalized = Number((raw / (normFactor / 2)).toFixed(4));
    return {
      name,
      score: isNaN(normalized) ? 0 : normalized,
      rawBetweenness: Number(raw.toFixed(2)),
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Computes Shortest Path (BFS) between two nodes in the graph.
 */
export function computeShortestPath(
  graph: GraphAdjacency,
  startNode: string,
  endNode: string
): { path: string[]; hops: number; found: boolean } {
  if (startNode === endNode) {
    return { path: [startNode], hops: 0, found: true };
  }

  const adj: Record<string, string[]> = {};
  for (const edge of graph.edges) {
    if (!adj[edge.source]) adj[edge.source] = [];
    if (!adj[edge.target]) adj[edge.target] = [];
    adj[edge.source].push(edge.target);
    adj[edge.target].push(edge.source);
  }

  const queue: string[][] = [[startNode]];
  const visited = new Set<string>([startNode]);

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    const lastNode = currentPath[currentPath.length - 1];

    for (const neighbor of adj[lastNode] || []) {
      if (neighbor === endNode) {
        const fullPath = [...currentPath, neighbor];
        return { path: fullPath, hops: fullPath.length - 1, found: true };
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...currentPath, neighbor]);
      }
    }
  }

  return { path: [], hops: -1, found: false };
}

/**
 * Computes organic communities using Label Propagation (LPA).
 */
export function computeCommunities(
  graph: GraphAdjacency,
  maxIterations: number = 20
): {
  communities: { id: string; clusterName: string; members: string[]; densityScore: number }[];
  modularityScore: number;
} {
  const nodes = Array.from(new Set(graph.nodes));
  const n = nodes.length;
  if (n === 0) return { communities: [], modularityScore: 0 };

  const adj: Record<string, string[]> = {};
  for (const node of nodes) adj[node] = [];
  for (const edge of graph.edges) {
    adj[edge.source]?.push(edge.target);
    adj[edge.target]?.push(edge.source);
  }

  // Initial label for each node is its own index
  const labels: Record<string, string> = {};
  nodes.forEach((node) => {
    labels[node] = node;
  });

  for (let it = 0; it < maxIterations; it++) {
    let changed = false;
    // Shuffle nodes
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);

    for (const node of shuffled) {
      const neighbors = adj[node] || [];
      if (neighbors.length === 0) continue;

      const labelCount: Record<string, number> = {};
      for (const nb of neighbors) {
        const l = labels[nb];
        labelCount[l] = (labelCount[l] || 0) + 1;
      }

      // Find highest frequency label
      let maxCount = 0;
      let bestLabel = labels[node];
      for (const [l, count] of Object.entries(labelCount)) {
        if (count > maxCount) {
          maxCount = count;
          bestLabel = l;
        }
      }

      if (labels[node] !== bestLabel) {
        labels[node] = bestLabel;
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Group by label
  const grouped: Record<string, string[]> = {};
  for (const [node, label] of Object.entries(labels)) {
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(node);
  }

  const clusters = Object.entries(grouped)
    .filter(([_, members]) => members.length > 0)
    .map(([label, members], idx) => {
      // Compute density: 2 * internal_edges / (nodes * (nodes - 1))
      let internalEdges = 0;
      const memberSet = new Set(members);
      for (const m of members) {
        for (const nb of adj[m] || []) {
          if (memberSet.has(nb)) internalEdges++;
        }
      }
      internalEdges = internalEdges / 2;
      const possibleEdges = members.length > 1 ? (members.length * (members.length - 1)) / 2 : 1;
      const densityScore = Number((internalEdges / possibleEdges).toFixed(3));

      return {
        id: `cluster-${idx + 1}`,
        clusterName: `Pod ${idx + 1}: ${members[0]} Group`,
        members,
        densityScore,
      };
    })
    .sort((a, b) => b.members.length - a.members.length);

  // Compute real Newman modularity Q
  const m = graph.edges.length || 1;
  let q = 0;
  for (const cluster of clusters) {
    const memberSet = new Set(cluster.members);
    let lc = 0;
    let dc = 0;
    for (const mNode of cluster.members) {
      const deg = adj[mNode]?.length || 0;
      dc += deg;
      for (const nb of adj[mNode] || []) {
        if (memberSet.has(nb)) lc++;
      }
    }
    lc = lc / 2;
    q += lc / m - Math.pow(dc / (2 * m), 2);
  }

  const modularityScore = Number(Math.max(0, q).toFixed(3));

  return { communities: clusters, modularityScore };
}

/**
 * Computes Weakly Connected Components (WCC) using BFS traversal.
 * Honestly labeled "computed in-app" per Hard Ground Rule 3.
 */
export function computeConnectedComponents(
  graph: GraphAdjacency
): { componentCount: number; components: { id: number; size: number; members: string[] }[] } {
  const nodes = Array.from(new Set(graph.nodes));
  const adj: Record<string, string[]> = {};
  for (const n of nodes) adj[n] = [];
  for (const e of graph.edges) {
    if (adj[e.source]) adj[e.source].push(e.target);
    if (adj[e.target]) adj[e.target].push(e.source);
  }

  const visited = new Set<string>();
  const components: { id: number; size: number; members: string[] }[] = [];

  let compId = 1;
  for (const node of nodes) {
    if (!visited.has(node)) {
      const members: string[] = [];
      const queue: string[] = [node];
      visited.add(node);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        members.push(curr);

        for (const neighbor of adj[curr] || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      components.push({
        id: compId++,
        size: members.length,
        members,
      });
    }
  }

  components.sort((a, b) => b.size - a.size);
  return { componentCount: components.length, components };
}

