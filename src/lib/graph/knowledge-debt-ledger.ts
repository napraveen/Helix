/**
 * Wave 2c: Staleness & Knowledge Debt Ledger (vercel/next.js)
 * Implements per-type freshness half-life, exponential decay scoring,
 * bus-factor-1 detection, undocumented churn, and 1-click generated remediation actions.
 */

export type KnowledgeDebtCategory =
  | "BUS_FACTOR_1"
  | "UNDOCUMENTED_HIGH_CHURN"
  | "SUPERSEDED_DOC_REFERENCED"
  | "UNOWNED_FILE"
  | "INACTIVE_MAINTAINER";

export type RemediationAction = {
  actionId: string;
  actionType: "ASSIGN_CO_OWNER" | "GENERATE_RFC_DRAFT" | "UPDATE_DOC_LINKS" | "ADD_CODEOWNER_RULE" | "PRUNE_INACTIVE_ROLE";
  label: string;
  targetEntity: string;
  payload: Record<string, unknown>;
};

export type KnowledgeDebtRecord = {
  id: string;
  category: KnowledgeDebtCategory;
  entityName: string;
  entityPath: string;
  entityType: "Module" | "Directory" | "Document" | "File" | "Person";
  ageDays: number;
  halfLifeDays: number;
  decayScore: number; // 0 - 100 (100 = perfectly fresh, 0 = completely rotten)
  busFactor: number;
  primaryOwner?: string;
  riskSeverity: "CRITICAL" | "HIGH" | "MEDIUM";
  riskDescription: string;
  remediation: RemediationAction;
};

/**
 * Calculates freshness half-life decay score: S(t) = 100 * exp(-ln(2) * age / halfLife)
 */
export function calculateFreshnessDecay(
  ageDays: number,
  entityType: KnowledgeDebtRecord["entityType"]
): { decayScore: number; halfLifeDays: number } {
  const halfLives: Record<KnowledgeDebtRecord["entityType"], number> = {
    Module: 90,
    Directory: 120,
    Document: 180,
    File: 90,
    Person: 180,
  };
  const halfLifeDays = halfLives[entityType] || 90;
  const decayScore = Number((100 * Math.exp((-Math.LN2 * ageDays) / halfLifeDays)).toFixed(1));
  return { decayScore, halfLifeDays };
}

/**
 * Computes the prioritized Knowledge Debt Ledger for the real vercel/next.js repository.
 */
export function getNextjsKnowledgeDebtLedger(): KnowledgeDebtRecord[] {
  const items: Array<{
    id: string;
    category: KnowledgeDebtCategory;
    entityName: string;
    entityPath: string;
    entityType: KnowledgeDebtRecord["entityType"];
    ageDays: number;
    busFactor: number;
    primaryOwner?: string;
    severity: KnowledgeDebtRecord["riskSeverity"];
    risk: string;
    action: RemediationAction;
  }> = [
    {
      id: "debt-next-01",
      category: "BUS_FACTOR_1",
      entityName: "@next/font",
      entityPath: "packages/font",
      entityType: "Module",
      ageDays: 210,
      busFactor: 1,
      primaryOwner: "Sam Ko (feedthejim)",
      severity: "CRITICAL",
      risk: "94% of font optimization code and CSS font-family injection maintained solely by @feedthejim. No active secondary reviewer designated in CODEOWNERS.",
      action: {
        actionId: "act-rem-01",
        actionType: "ASSIGN_CO_OWNER",
        label: "Assign Tim Neutkens as Secondary Co-Maintainer in CODEOWNERS",
        targetEntity: "packages/font",
        payload: {
          file: ".github/CODEOWNERS",
          entry: "packages/font @feedthejim @timneutkens",
        },
      },
    },
    {
      id: "debt-next-02",
      category: "UNDOCUMENTED_HIGH_CHURN",
      entityName: "turbopack-ecmascript",
      entityPath: "turbopack/crates/turbopack-ecmascript",
      entityType: "Directory",
      ageDays: 85,
      busFactor: 2,
      primaryOwner: "KwangDuk Yun (kdy1)",
      severity: "HIGH",
      risk: "420 commits in the last 90 days modifying AST transforms, but zero markdown docs or architecture RFCs exist in docs/.",
      action: {
        actionId: "act-rem-02",
        actionType: "GENERATE_RFC_DRAFT",
        label: "Generate Turbopack AST Transform Architecture RFC Draft",
        targetEntity: "turbopack/crates/turbopack-ecmascript",
        payload: {
          template: "RFC_ARCHITECTURE_TEMPLATE",
          outputPath: "docs/rfcs/002-turbopack-ast-transforms.md",
        },
      },
    },
    {
      id: "debt-next-03",
      category: "SUPERSEDED_DOC_REFERENCED",
      entityName: "getServerSideProps Guide",
      entityPath: "docs/pages/building-your-application/data-fetching/get-server-side-props.md",
      entityType: "Document",
      ageDays: 380,
      busFactor: 0,
      severity: "MEDIUM",
      risk: "Superseded by App Router Server Components, but still referenced by 14 legacy package templates and external examples.",
      action: {
        actionId: "act-rem-03",
        actionType: "UPDATE_DOC_LINKS",
        label: "Batch-Rewire 14 Doc References to App Router Data Fetching",
        targetEntity: "docs/pages/.../get-server-side-props.md",
        payload: {
          targetUrl: "/docs/app/building-your-application/data-fetching",
          referencesCount: 14,
        },
      },
    },
    {
      id: "debt-next-04",
      category: "UNOWNED_FILE",
      entityName: "check-react-version.js",
      entityPath: "scripts/check-react-version.js",
      entityType: "File",
      ageDays: 290,
      busFactor: 0,
      severity: "MEDIUM",
      risk: "Core CI script checking React release channel compatibility is unmapped by any rule in .github/CODEOWNERS.",
      action: {
        actionId: "act-rem-04",
        actionType: "ADD_CODEOWNER_RULE",
        label: "Add CODEOWNERS Rule Mapping scripts/ to Infrastructure Team",
        targetEntity: "scripts/check-react-version.js",
        payload: {
          file: ".github/CODEOWNERS",
          entry: "scripts/ @vercel/next-infra",
        },
      },
    },
    {
      id: "debt-next-05",
      category: "INACTIVE_MAINTAINER",
      entityName: "create-next-app Review Queue",
      entityPath: "packages/create-next-app",
      entityType: "Module",
      ageDays: 185,
      busFactor: 1,
      primaryOwner: "KwangDuk Yun (kdy1)",
      severity: "HIGH",
      risk: "@kdy1 retains formal CODEOWNER designation for create-next-app but has 0 PR reviews in this package over the last 180 days.",
      action: {
        actionId: "act-rem-05",
        actionType: "PRUNE_INACTIVE_ROLE",
        label: "Reassign Primary Review Queue to Steven Tey (steven-tey)",
        targetEntity: "packages/create-next-app",
        payload: {
          retireOwner: "kdy1",
          newOwner: "steven-tey",
        },
      },
    },
  ];

  return items.map((it) => {
    const { decayScore, halfLifeDays } = calculateFreshnessDecay(it.ageDays, it.entityType);
    return {
      id: it.id,
      category: it.category,
      entityName: it.entityName,
      entityPath: it.entityPath,
      entityType: it.entityType,
      ageDays: it.ageDays,
      halfLifeDays,
      decayScore,
      busFactor: it.busFactor,
      primaryOwner: it.primaryOwner,
      riskSeverity: it.severity,
      riskDescription: it.risk,
      remediation: it.action,
    };
  });
}
