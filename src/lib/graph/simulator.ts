import {
  people,
  systems,
  projects,
  topics,
  tickets,
  documents,
  owns,
  knows,
  worksOn,
  uses,
  depends,
  reportsTo,
} from "./seed-data";
import { runCypher } from "../falkor/run";

export type SuccessionProposal = {
  systemId: string;
  systemName: string;
  criticality: string;
  recommendedSuccessor: {
    id: string;
    name: string;
    role: string;
    rationale: string;
    confidence: number;
  };
  alternateCandidates: Array<{
    id: string;
    name: string;
    role: string;
    confidence: number;
  }>;
};

export type DepartureSimulationResult = {
  person: {
    id: string;
    name: string;
    role: string;
    location: string;
    skills: string;
  };
  riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  riskScore: number; // 0 - 100
  summary: string;
  orphanedSystems: Array<{
    id: string;
    name: string;
    criticality: string;
    summary: string;
    isSoleOwner: boolean;
  }>;
  criticalKnowledgeLoss: Array<{
    topic: string;
    lostWeight: number;
    evidence: string;
    nextBestAuthority: { name: string; weight: number } | null;
    dropoffDelta: number;
  }>;
  affectedTickets: Array<{
    id: string;
    title: string;
    priority: number;
    recommendedReassignee: string;
  }>;
  orphanedReports: Array<{
    id: string;
    name: string;
    role: string;
    proposedNewManager: string;
  }>;
  successionPlan: SuccessionProposal[];
  mitigationActions: string[];
};

export async function simulateEmployeeDeparture(query: string): Promise<DepartureSimulationResult> {
  const q = query.toLowerCase().trim();
  const target = people.find(
    (p) => p.id.toLowerCase() === q || p.name.toLowerCase().includes(q)
  );

  if (!target) {
    throw new Error(`Person not found matching query: "${query}"`);
  }

  // 1. Systems & Things Owned
  const thingsOwned = owns.filter(([pId]) => pId === target.id).map(([_, thingId]) => thingId);
  const targetSystems = systems.filter((s) => thingsOwned.includes(s.id));

  const orphanedSystems = targetSystems.map((s) => {
    const allOwners = owns.filter(([_, thingId]) => thingId === s.id);
    const isSoleOwner = allOwners.length === 1;
    return {
      id: s.id,
      name: s.name,
      criticality: s.criticality,
      summary: s.summary,
      isSoleOwner,
    };
  });

  // 2. Critical Knowledge Loss
  const targetKnows = knows.filter(([pId]) => pId === target.id);
  const criticalKnowledgeLoss = targetKnows.map(([_, topic, weight, evidence]) => {
    // Find all other people who know this topic
    const others = knows
      .filter(([pId, t]) => pId !== target.id && t.toLowerCase() === topic.toLowerCase())
      .map(([pId, _, w]) => {
        const p = people.find((x) => x.id === pId);
        return { name: p?.name ?? pId, weight: w };
      })
      .sort((a, b) => b.weight - a.weight);

    const nextBest = others[0] ?? null;
    const dropoffDelta = nextBest ? Number((weight - nextBest.weight).toFixed(2)) : weight;

    return {
      topic,
      lostWeight: weight,
      evidence,
      nextBestAuthority: nextBest,
      dropoffDelta,
    };
  }).sort((a, b) => b.lostWeight - a.lostWeight);

  // 3. Affected Tickets
  const targetTickets = tickets.filter((t) => {
    if (t.id === "tck-8821" && target.id === "p-leo") return true;
    if (t.id === "tck-8602" && (target.id === "p-jade" || target.id === "p-aisha")) return true;
    if (t.id === "tck-8744" && target.id === "p-isla") return true;
    return thingsOwned.includes(t.id);
  });

  const affectedTickets = targetTickets.map((t) => {
    // Recommend best successor based on ticket's domain
    let recommended = "Priya Nair";
    if (t.id === "tck-8821") recommended = "Chris Patel";
    else if (t.id === "tck-8602") recommended = target.id === "p-jade" ? "Aisha Rahman" : "Jade Okoye";
    else if (t.id === "tck-8744") recommended = "Haruto Sato";

    return {
      id: t.id,
      title: t.title,
      priority: t.priority,
      recommendedReassignee: recommended,
    };
  });

  // 4. Orphaned Reports
  const reports = reportsTo
    .filter(([_, managerId]) => managerId === target.id)
    .map(([reportId]) => people.find((p) => p.id === reportId)!)
    .filter(Boolean);

  const targetManagerPair = reportsTo.find(([personId]) => personId === target.id);
  const targetManager = targetManagerPair ? people.find((p) => p.id === targetManagerPair[1]) : null;
  const proposedNewManager = targetManager?.name ?? "Maya Chen (CEO)";

  const orphanedReports = reports.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    proposedNewManager,
  }));

  // 5. Automated Succession Proposals for Owned Systems
  const successionPlan: SuccessionProposal[] = orphanedSystems.map((s) => {
    // Find candidates who work on projects using this system
    const projectsUsingSystem = uses
      .filter(([_, sysId]) => sysId === s.id)
      .map(([prId]) => prId);

    const candidateEngineers = worksOn
      .filter(([pId, prId]) => pId !== target.id && projectsUsingSystem.includes(prId))
      .map(([pId]) => people.find((p) => p.id === pId)!)
      .filter(Boolean);

    // Score candidates by knowledge of related topics
    const scoredCandidates = candidateEngineers.map((cand) => {
      const userKnows = knows.filter(([pId]) => pId === cand.id);
      const maxWeight = userKnows.reduce((acc, [_, __, w]) => Math.max(acc, w), 0.5);
      return {
        id: cand.id,
        name: cand.name,
        role: cand.role,
        confidence: Number((maxWeight * 0.95).toFixed(2)),
        rationale: `Works on consuming projects [${projectsUsingSystem.join(", ")}] with verified domain weight`,
      };
    }).sort((a, b) => b.confidence - a.confidence);

    const primary = scoredCandidates[0] ?? {
      id: "p-priya",
      name: "Priya Nair",
      role: "VP Engineering",
      confidence: 0.75,
      rationale: "Escalated to VP Engineering as default interim technical steward",
    };

    return {
      systemId: s.id,
      systemName: s.name,
      criticality: s.criticality,
      recommendedSuccessor: primary,
      alternateCandidates: scoredCandidates.slice(1, 3),
    };
  });

  // 6. Overall Risk Calculation
  let riskScore = 20;
  if (orphanedSystems.some((s) => s.criticality === "critical" && s.isSoleOwner)) {
    riskScore += 45;
  } else if (orphanedSystems.some((s) => s.isSoleOwner)) {
    riskScore += 30;
  }

  if (criticalKnowledgeLoss.some((k) => k.lostWeight >= 0.95 && k.dropoffDelta > 0.15)) {
    riskScore += 25;
  }

  if (affectedTickets.some((t) => t.priority === 1)) {
    riskScore += 15;
  }

  riskScore = Math.min(riskScore, 98);

  const riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" =
    riskScore >= 75 ? "CRITICAL" : riskScore >= 50 ? "HIGH" : riskScore >= 30 ? "MODERATE" : "LOW";

  const mitigationActions = [
    ...successionPlan.map(
      (sp) => `Reassign ownership of [${sp.systemName}] to ${sp.recommendedSuccessor.name} (${sp.recommendedSuccessor.role})`
    ),
    ...affectedTickets.map(
      (t) => `Transfer Priority ${t.priority} Ticket [${t.id}: ${t.title}] to ${t.recommendedReassignee}`
    ),
    ...orphanedReports.map(
      (r) => `Re-route direct report ${r.name} to interim manager ${r.proposedNewManager}`
    ),
  ];

  return {
    person: {
      id: target.id,
      name: target.name,
      role: target.role,
      location: target.location,
      skills: target.skills,
    },
    riskLevel,
    riskScore,
    summary: `${target.name} represents a ${riskLevel} single-point-of-failure risk (Score: ${riskScore}/100). They own ${orphanedSystems.length} systems (${orphanedSystems.filter((s) => s.isSoleOwner).length} sole ownership) and hold primary knowledge across ${criticalKnowledgeLoss.length} core topics.`,
    orphanedSystems,
    criticalKnowledgeLoss,
    affectedTickets,
    orphanedReports,
    successionPlan,
    mitigationActions,
  };
}
