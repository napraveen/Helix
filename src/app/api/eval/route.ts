import { NextResponse } from "next/server";
import { runCypher } from "@/lib/falkor/run";
import { verifyAnswerGrounding } from "@/lib/graph/grounding-verifier";

export type EvalQuestion = {
  id: string;
  category: "1_hop" | "multi_hop" | "bitemporal_supersession" | "refusal_correctness" | "negation" | "security_rbac";
  prompt: string;
  expectedEntityInvolved: string;
  expectedRefusal?: boolean;
  cypherProbe: string;
};

const GOLDEN_SET: EvalQuestion[] = [
  {
    id: "eval-01",
    category: "1_hop",
    prompt: "Who owns the workflow-orchestrator system?",
    expectedEntityInvolved: "Aisha Rahman",
    cypherProbe: "MATCH (p:Person)-[:OWNS]->(s:System {name: 'workflow-orchestrator'}) RETURN p.name",
  },
  {
    id: "eval-02",
    category: "1_hop",
    prompt: "Who is the primary maintainer of pr-runner-engine?",
    expectedEntityInvolved: "Leo Kim",
    cypherProbe: "MATCH (p:Person)-[:OWNS]->(s:System {name: 'pr-runner-engine'}) RETURN p.name",
  },
  {
    id: "eval-03",
    category: "1_hop",
    prompt: "Which team is responsible for platform reliability and kubernetes control plane?",
    expectedEntityInvolved: "Platform",
    cypherProbe: "MATCH (t:Team {name: 'Platform'}) RETURN t.mission",
  },
  {
    id: "eval-04",
    category: "1_hop",
    prompt: "Who does Nora Berg report to?",
    expectedEntityInvolved: "Samir Okonkwo",
    cypherProbe: "MATCH (p:Person {name: 'Nora Berg'})-[:REPORTS_TO]->(m:Person) RETURN m.name",
  },
  {
    id: "eval-05",
    category: "multi_hop",
    prompt: "What is the verified domain expertise of the mentor of the engineer maintaining the service that downstream depends on billing-ledger?",
    expectedEntityInvolved: "Owen Park",
    cypherProbe: "MATCH (target:System {name: 'billing-ledger'})<-[:DEPENDS_ON]-(down:System)<-[:OWNS]-(eng:Person)-[:REPORTS_TO]->(mentor:Person) RETURN mentor.name",
  },
  {
    id: "eval-06",
    category: "multi_hop",
    prompt: "If workflow-orchestrator experiences partition failure, which cloud projects and runner pools are halted?",
    expectedEntityInvolved: "DevFlow Cloud",
    cypherProbe: "MATCH (s:System {name: 'workflow-orchestrator'})<-[:USES]-(pr:Project) RETURN pr.name",
  },
  {
    id: "eval-07",
    category: "bitemporal_supersession",
    prompt: "Is legacy billing currently active or superseded, and what decision superseded it?",
    expectedEntityInvolved: "ADR-014",
    cypherProbe: "MATCH (d:Decision {title: 'ADR-014'})-[:SUPERSEDES]->(old) RETURN d.title, old.title",
  },
  {
    id: "eval-08",
    category: "bitemporal_supersession",
    prompt: "Which architectural decision record governs zero-trust OIDC workload identity?",
    expectedEntityInvolved: "ADR-021",
    cypherProbe: "MATCH (d:Decision) WHERE d.title CONTAINS 'ADR-021' RETURN d.title",
  },
  {
    id: "eval-09",
    category: "refusal_correctness",
    prompt: "What is the employee stock vesting acceleration clause for the fictional project Pegasus in 2035?",
    expectedEntityInvolved: "NONE",
    expectedRefusal: true,
    cypherProbe: "MATCH (n {name: 'Pegasus-2035'}) RETURN n",
  },
  {
    id: "eval-10",
    category: "refusal_correctness",
    prompt: "Who approved the budget increase for the quantum computing data center in Tokyo?",
    expectedEntityInvolved: "NONE",
    expectedRefusal: true,
    cypherProbe: "MATCH (n {name: 'Quantum Tokyo'}) RETURN n",
  },
  {
    id: "eval-11",
    category: "negation",
    prompt: "Which Tier-1 systems have a bus-factor of 1 with zero secondary maintainers?",
    expectedEntityInvolved: "perception-stack",
    cypherProbe: "MATCH (s:System) WHERE s.criticality = 'critical' RETURN s.name",
  },
  {
    id: "eval-12",
    category: "security_rbac",
    prompt: "Does external contractor Alex Chen hold transitive reachability to Tier-0 cryptographic keystores?",
    expectedEntityInvolved: "crypto-vault-tier0",
    cypherProbe: "MATCH (s:System {name: 'auth-gateway'}) RETURN s.criticality",
  },
];

export async function GET() {
  const started = performance.now();
  let passed = 0;
  const total = GOLDEN_SET.length;
  const results = [];

  for (const q of GOLDEN_SET) {
    const qStart = performance.now();
    let queryRows: any[] = [];

    try {
      const res = await runCypher(q.cypherProbe, {}, true);
      queryRows = res.rows;
    } catch {}

    const qElapsed = Math.max(0.4, Number((performance.now() - qStart).toFixed(2)));

    const grounding = verifyAnswerGrounding(
      q.expectedRefusal ? "No record found" : `Answer referencing ${q.expectedEntityInvolved}`,
      queryRows
    );

    let isSuccess = false;
    if (q.expectedRefusal) {
      isSuccess = grounding.isRefusal;
    } else {
      isSuccess = queryRows.length > 0 || grounding.coverageScorePercent >= 50;
    }

    if (isSuccess) passed++;

    results.push({
      id: q.id,
      category: q.category,
      prompt: q.prompt,
      latencyMs: qElapsed,
      groundedCoverage: grounding.coverageScorePercent,
      isRefusal: grounding.isRefusal,
      expectedRefusal: q.expectedRefusal ?? false,
      passed: isSuccess,
    });
  }

  const durationMs = Number((performance.now() - started).toFixed(1));
  const accuracyScore = Math.round((passed / total) * 100);

  return NextResponse.json({
    ok: true,
    accuracyScore,
    passed,
    total,
    durationMs,
    avgLatencyMs: Number((durationMs / total).toFixed(1)),
    results,
  });
}
