export type AlgorithmType = "pagerank" | "betweenness" | "communities" | "shortest_path";

export type PageRankNode = {
  name: string;
  role: string;
  score: number;
  connections: number;
  influenceLevel: "CRITICAL_AUTHORITY" | "CORE_COLLABORATOR" | "SPECIALIST";
  summary: string;
};

export type CentralityNode = {
  name: string;
  role: string;
  betweennessScore: number;
  bridgesTeams: string[];
  riskIfDeparted: "HIGH_SILO_RISK" | "MODERATE_SILO_RISK" | "LOW_SILO_RISK";
  whyCritical: string;
};

export type CommunityCluster = {
  id: string;
  clusterName: string;
  densityScore: number;
  primaryFocus: string;
  members: string[];
  systemsOwned: string[];
};

export const ALGORITHM_DEFINITIONS: Record<
  AlgorithmType,
  {
    title: string;
    cypher: string;
    explanation: string;
  }
> = {
  pagerank: {
    title: "Enterprise PageRank: Organizational Authority & Influence",
    cypher: "CALL algo.pageRank('Person', 'REPORTS_TO | WORKS_ON', {dampingFactor: 0.85, maxIterations: 20}) YIELD node, score RETURN node.name, node.role, score ORDER BY score DESC",
    explanation: "FalkorDB evaluates authority not by job title, but by the topological density of collaborative incoming edges (who works with whom, who reviews ADRs, and who reports to whom).",
  },
  betweenness: {
    title: "Betweenness Centrality: Organizational Bridges & Silo Risks",
    cypher: "CALL algo.betweennessCentrality('Person', 'WORKS_ON | USES') YIELD node, score RETURN node.name, node.role, score ORDER BY score DESC",
    explanation: "Calculates the number of shortest paths passing through each person using Brandes' algorithm. High scores indicate 'bridge nodes'—individuals whose departure isolates teams from each other.",
  },
  communities: {
    title: "Louvain Community Detection: Organic Cross-Functional Pods",
    cypher: "CALL algo.communityDetection('Person | System', 'WORKS_ON | USES') YIELD communityId, nodes RETURN communityId, count(nodes) AS size",
    explanation: "Unveils true working pods based on code commits, system dependencies, and project memberships rather than the formal HR chart.",
  },
  shortest_path: {
    title: "Weighted Dijkstra: Shortest Collaborative Path",
    cypher: "MATCH (a:Person {name: $from}), (b:Person {name: $to}) MATCH p = shortestPath((a)-[*..6]-(b)) RETURN [n in nodes(p) | coalesce(n.name, n.title)] AS path, length(p) AS hops",
    explanation: "Determines the fastest chain of introductions or operational escalation between any two disconnected individuals in the enterprise.",
  },
};
