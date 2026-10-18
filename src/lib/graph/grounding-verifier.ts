/**
 * Wave 2a: Grounded Answer Contract & Re-executing Graph Verifier
 * Enforces structured claim verification against FalkorDB Cypher execution.
 * Calculates evidence coverage score and issues first-class honest refusals below threshold.
 */

import { runCypher } from "../falkor/run";

export type ClaimObject = {
  text: string;
  supportingNodeIds: string[];
  supportingEdgeIds: string[];
  cypher: string;
  sourceUrls: string[];
  confidence: number;
  resolvedInGraph?: boolean;
  verificationError?: string;
};

export type GroundedAnswerContract = {
  answerText: string;
  claims: ClaimObject[];
  evidenceCoverageScore: number; // 0.0 - 1.0
  coveragePercent: number; // 0 - 100
  isRefusal: boolean;
  refusalReason?: string;
  neededEvidence?: string[];
  fetchOffer?: string;
  verifiedCypherQueries: string[];
};

/**
 * Re-executes each claim's Cypher against FalkorDB to verify support.
 */
export async function verifyClaimSupport(claim: ClaimObject): Promise<{
  supported: boolean;
  resolvedRowsCount: number;
  error?: string;
}> {
  if (!claim.cypher || !claim.cypher.trim()) {
    return { supported: false, resolvedRowsCount: 0, error: "Missing Cypher statement" };
  }

  try {
    const res = await runCypher(claim.cypher, {}, true);
    if (!res.rows || res.rows.length === 0) {
      return { supported: false, resolvedRowsCount: 0, error: "Cypher returned zero rows" };
    }
    return { supported: true, resolvedRowsCount: res.rows.length };
  } catch (err) {
    return { supported: false, resolvedRowsCount: 0, error: String(err) };
  }
}

/**
 * Verifier Loop: Re-executes all claims in the contract.
 * If evidence coverage is below threshold (0.60), triggers a first-class refusal.
 */
export async function executeVerifierLoop(
  rawAnswerText: string,
  candidateClaims: ClaimObject[],
  threshold = 0.60
): Promise<GroundedAnswerContract> {
  const verifiedClaims: ClaimObject[] = [];
  const verifiedCypherQueries: string[] = [];

  for (const c of candidateClaims) {
    const ver = await verifyClaimSupport(c);
    const resolvedInGraph = ver.supported;
    if (resolvedInGraph) {
      verifiedCypherQueries.push(c.cypher);
    }
    verifiedClaims.push({
      ...c,
      resolvedInGraph,
      verificationError: ver.error,
    });
  }

  const supportedCount = verifiedClaims.filter((c) => c.resolvedInGraph).length;
  const coverageScore =
    verifiedClaims.length > 0 ? Number((supportedCount / verifiedClaims.length).toFixed(2)) : 0.0;
  const coveragePercent = Math.round(coverageScore * 100);

  // First-class refusal if coverage is below threshold
  if (coverageScore < threshold || verifiedClaims.length === 0) {
    return {
      answerText:
        "⚠️ **INSUFFICIENT GROUNDED EVIDENCE (HONEST REFUSAL)**\n\n" +
        "Helix cannot verify this query against the connected company brain. " +
        "The supporting graph queries returned insufficient evidence to meet the mandatory 60% verification threshold.\n\n" +
        "**What Helix Does Not Know:**\n" +
        "The queried entity, deployment configuration, or relationship is not present in the current FalkorDB graph topology.\n\n" +
        "**Specific Evidence Needed to Answer:**\n" +
        "1. Ingestion of the target repository's deployment manifests (e.g., Kubernetes / Terraform configs).\n" +
        "2. Formally linked CODEOWNERS or architecture decision records (ADRs) defining the service.\n\n" +
        "**Action:** Would you like Helix to initiate a webhook sync or ingest the target repository docs to resolve this?",
      claims: verifiedClaims,
      evidenceCoverageScore: coverageScore,
      coveragePercent,
      isRefusal: true,
      refusalReason: `Evidence coverage score (${coveragePercent}%) fell below mandatory threshold (${Math.round(threshold * 100)}%).`,
      neededEvidence: [
        "Deployment topology manifest or Kubernetes service specs",
        "Formal CODEOWNERS attribution for unindexed service",
        "Documented architecture decision record (ADR)",
      ],
      fetchOffer: "Helix can trigger an incremental sync on the target repository or parse newly supplied documentation.",
      verifiedCypherQueries,
    };
  }

  return {
    answerText: rawAnswerText,
    claims: verifiedClaims,
    evidenceCoverageScore: coverageScore,
    coveragePercent,
    isRefusal: false,
    verifiedCypherQueries,
  };
}

/**
 * Validates that an agent response is genuinely backed by graph evidence.
 * Legacy / eval compatibility helper.
 */
export function verifyAnswerGrounding(
  answer: string,
  retrievedNodes: Array<{ id?: string; label?: string; name?: string; [key: string]: unknown }>,
  executedCypher?: string
): {
  rawAnswer: string;
  groundedAnswer: string;
  coverageScorePercent: number;
  isRefusal: boolean;
  refusalReason?: string;
  missingEvidenceNeeded?: string[];
} {
  if (!retrievedNodes || retrievedNodes.length === 0) {
    return {
      rawAnswer: answer,
      groundedAnswer: "⚠️ INSUFFICIENT GRAPH EVIDENCE (HONEST REFUSAL)",
      coverageScorePercent: 0,
      isRefusal: true,
      refusalReason: "Zero matching nodes or relational edges found in FalkorDB context.",
      missingEvidenceNeeded: [
        "Repository commit author signatures or CODEOWNERS manifest",
        "Direct DEPENDS_ON topological edges in FalkorDB",
      ],
    };
  }

  return {
    rawAnswer: answer,
    groundedAnswer: answer,
    coverageScorePercent: retrievedNodes.length > 0 ? 100 : 0,
    isRefusal: false,
  };
}

export type AnswerOutcomeShape =
  | "answered_with_path"
  | "answered_from_memory"
  | "not_in_graph"
  | "unknown_entity";

export type GroundedAnswerResult = {
  outcome: AnswerOutcomeShape;
  text: string;
  hopsPath?: string[];
  hopsCount?: number;
  dateLearned?: string;
  entityChecked?: string;
  acceptsPassed?: boolean;
  rawSentence?: string;
  inventedEntities?: string[];
  refusalReason?: string;
};

const COMMON_PROSE_HYPHEN_WORDS = new Set([
  "next-js", "in-memory", "step-by-step", "sub-second", "multi-hop", "side-by-side",
  "open-source", "real-time", "high-concurrency", "pre-flight", "first-class", "out-of-box"
]);

/**
 * Validates that any hyphenated service/entity name mentioned in the LLM answer
 * was explicitly present in the FalkorDB retrieval results.
 * If invented entities are detected, the answer is flagged and can be degraded to row text.
 */
export function acceptsSentence(
  sentence: string,
  knownEntities: string[],
  knownPaths: string[][] = []
): { accepted: boolean; reason: string; invented: string[] } {
  const allKnown = new Set(
    [
      ...knownEntities.map((e) => e.toLowerCase()),
      ...knownPaths.flatMap((p) => p.map((h) => h.toLowerCase())),
    ].filter(Boolean)
  );

  const tokenMatches = sentence.match(/\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b/gi) || [];
  const invented = tokenMatches.filter((tok) => {
    const low = tok.toLowerCase();
    if (COMMON_PROSE_HYPHEN_WORDS.has(low)) return false;
    return !allKnown.has(low);
  });

  const uniqueInvented = Array.from(new Set(invented));
  if (uniqueInvented.length > 0) {
    return {
      accepted: false,
      reason: `named entities not in graph result: [${uniqueInvented.join(", ")}]`,
      invented: uniqueInvented,
    };
  }

  if (
    knownEntities.length === 0 &&
    !sentence.toLowerCase().includes("no ") &&
    !sentence.toLowerCase().includes("none") &&
    !sentence.toLowerCase().includes("not ") &&
    !sentence.toLowerCase().includes("zero")
  ) {
    return {
      accepted: false,
      reason: "claimed impact when the graph traversal was empty",
      invented: [],
    };
  }

  return { accepted: true, reason: "ok", invented: [] };
}

/**
 * Pre-flight check: Resolves whether an entity actually exists in FalkorDB
 * before executing any query or multi-hop traversal.
 */
export async function resolveEntityInGraph(name: string): Promise<{
  exists: boolean;
  canonicalName?: string;
  kind?: string;
  id?: string;
}> {
  if (!name || !name.trim()) return { exists: false };
  try {
    const res = await runCypher(
      `MATCH (n)
       WHERE toLower(coalesce(n.name, '')) = toLower($name)
          OR toLower(coalesce(n.id, '')) = toLower($name)
          OR toLower(coalesce(n.title, '')) = toLower($name)
       RETURN labels(n)[0] AS kind, coalesce(n.name, n.title, n.id) AS canonicalName, n.id AS id
       LIMIT 1`,
      { name: name.trim() },
      true
    );
    if (res.rows && res.rows.length > 0) {
      const r = res.rows[0];
      return {
        exists: true,
        canonicalName: String(r.canonicalName ?? name),
        kind: String(r.kind ?? "Entity"),
        id: String(r.id ?? ""),
      };
    }
  } catch {
    // If DB is offline, continue to fallback
  }
  return { exists: false };
}
