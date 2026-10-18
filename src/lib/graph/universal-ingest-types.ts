export type IngestSourceType = "markdown_rfc" | "github_repo" | "slack_thread" | "jira_ticket";

export type IngestResult = {
  success: boolean;
  sourceType: IngestSourceType;
  title: string;
  cypherStatements: string[];
  nodesCreated: Array<{ label: string; name: string; id: string }>;
  edgesCreated: Array<{ from: string; to: string; rel: string }>;
  entitiesDetected: {
    people: string[];
    systems: string[];
    decisions: string[];
    incidents: string[];
    topics: string[];
  };
  provenanceHash: string;
  executionMs: number;
  // Optional convenience fields
  id?: string;
  kind?: string;
  author?: string;
  systems?: string[];
  decisions?: string[];
  supersedes?: string[];
  nodesCreatedCount?: number;
  edgesCreatedCount?: number;
  timeMs?: number;
  rawText?: string;
};

export type IngestTemplateKey = "stripeRfc" | "runnerIncident" | "devflowManifest";

export const SAMPLE_INGEST_TEMPLATES = {
  stripeRfc: `# RFC-031: Dual-Write Ledger Migration to Stripe
**Author:** @nora (Nora Berg)  
**Status:** PROPOSED  
**Supercedes:** ADR-014 (Legacy Billing Freeze)  
**Impacted Systems:** billing-ledger, payment-gateway, invoice-emitter  

## Background & Objective
Following INC-441 and the subsequent freeze of legacy billing in ADR-014, DevFlow requires an isolated, idempotent payment infrastructure. This RFC specifies a dual-write ledger gateway to Stripe with verifiable event reconciliation.

## System Topology & Dependencies
The \`payment-gateway\` will proxy all webhook transactions. If \`billing-ledger\` encounters a partitioned Kafka consumer, transactions queue in a Redis DLQ with 72-hour TTL. @owen and @jonah have reviewed the security posture.`,

  runnerIncident: `# INC-882: PR Runner Kernel Sandbox Latency Spike
**Author:** @leo (Leo Kim)  
**System:** pr-runner-engine, workflow-orchestrator  
**Clusters:** Europe-West, US-East  

## Summary
At 14:22 UTC, four runner pools triggered elevated queue times on pool 4 due to cgroup memory contention. Nora Berg assisted in analyzing telemetry queues. Recommended hotfix: upgrade micro-VM guest kernel isolation profile.`,

  devflowManifest: {
    repoName: "devflow/cloud-runner-core",
    description: "Core CI/CD workflow orchestration, micro-VM runner engine, and build pipeline monorepo",
    services: [
      {
        name: "workflow-orchestrator",
        maintainer: "Aisha Rahman",
        dependencies: ["event-bus", "auth-gateway", "redis-cache"],
      },
      {
        name: "billing-ledger",
        maintainer: "Nora Berg",
        dependencies: ["payment-gateway", "postgres-primary", "kafka-bus"],
      },
    ],
  },
  perceptionIncident: `# INC-882: PR Runner Kernel Sandbox Latency Spike
**Author:** @leo (Leo Kim)  
**System:** pr-runner-engine, workflow-orchestrator  
**Clusters:** Europe-West, US-East  

## Summary
At 14:22 UTC, four runner pools triggered elevated queue times on pool 4 due to cgroup memory contention. Nora Berg assisted in analyzing telemetry queues. Recommended hotfix: upgrade micro-VM guest kernel isolation profile.`,
  githubWarehouseManifest: {
    repoName: "devflow/cloud-runner-core",
    description: "Core CI/CD workflow orchestration, micro-VM runner engine, and build pipeline monorepo",
    services: [
      {
        name: "workflow-orchestrator",
        maintainer: "Aisha Rahman",
        dependencies: ["event-bus", "auth-gateway", "redis-cache"],
      },
      {
        name: "billing-ledger",
        maintainer: "Nora Berg",
        dependencies: ["payment-gateway", "postgres-primary", "kafka-bus"],
      },
    ],
  },
};
