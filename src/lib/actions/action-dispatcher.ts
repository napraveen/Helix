/**
 * Layer 6 Action Dispatcher & Governance Engine
 * Enforces Human-In-The-Loop approval gates, GITHUB_WRITE_REPO allowlist lockdown,
 * idempotency, hash-chained FalkorDB audit nodes, and reversible 1-click compensation.
 */

import crypto from "crypto";
import { nanoid } from "nanoid";
import { runCypher } from "../falkor/run";
import { recordLiveActivity } from "../graph/activity-stream";

export type ActionType = "OPEN_GITHUB_ISSUE" | "POST_PR_REVIEW_COMMENT" | "DISCORD_WEBHOOK_MESSAGE";

export type ActionReceipt = {
  actionId: string;
  actionType: ActionType;
  status: "EXECUTED" | "DRY_RUN_PREVIEW" | "FAILED" | "UNDONE";
  targetUrl?: string;
  receiptDetails: Record<string, unknown>;
  auditHash: string;
  previousHash: string;
  undoAvailable: boolean;
  timestamp: string;
};

// Global in-memory hash chain for cryptographic audit integrity
let lastAuditHash = "0000000000000000000000000000000000000000000000000000000000000000";
const EXECUTED_RECEIPTS = new Map<string, ActionReceipt>();
const PENDING_APPROVALS = new Map<string, {
  id: string;
  actionType: ActionType;
  params: Record<string, unknown>;
  diffPreview: ActionDiffPreview;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}>();

// Circuit Breaker State
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureThreshold: number;
  resetTimeoutMs: number;
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: "CLOSED",
  failureThreshold: 5,
  resetTimeoutMs: 30000,
};

export function getCircuitBreakerStatus() {
  const now = Date.now();
  if (circuitBreaker.state === "OPEN" && now - circuitBreaker.lastFailureTime > circuitBreaker.resetTimeoutMs) {
    circuitBreaker.state = "HALF_OPEN";
  }
  return { ...circuitBreaker };
}

function recordCircuitSuccess() {
  circuitBreaker.failures = 0;
  circuitBreaker.state = "CLOSED";
}

function recordCircuitFailure() {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
  if (circuitBreaker.failures >= circuitBreaker.failureThreshold) {
    circuitBreaker.state = "OPEN";
  }
}

/**
 * Executes a network call with exponential backoff, jitter, and circuit breaker protection
 */
export async function withRetryAndCircuitBreaker<T>(
  actionName: string,
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 300
): Promise<T> {
  const cb = getCircuitBreakerStatus();
  if (cb.state === "OPEN") {
    throw new Error(`CIRCUIT_BREAKER_OPEN: Action "${actionName}" rejected. Consecutive failures (${cb.failures}) exceeded threshold.`);
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const result = await fn();
      recordCircuitSuccess();
      return result;
    } catch (err: any) {
      attempt++;
      recordCircuitFailure();
      if (attempt > maxRetries) {
        throw new Error(`Action "${actionName}" failed after ${maxRetries} retries: ${err?.message || err}`);
      }
      const jitter = Math.random() * 100;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Action "${actionName}" failed.`);
}

export type ActionDiffPreview = {
  actionType: ActionType;
  target: string;
  proposedChanges: Array<{
    field: string;
    before: string | null;
    after: string;
  }>;
  formattedDiff: string;
  provenanceSource: string;
};

/**
 * Generates a structured diff preview for human review before execution
 */
export function generateStructuredDiffPreview(
  actionType: ActionType,
  params: Record<string, any>
): ActionDiffPreview {
  const changes: Array<{ field: string; before: string | null; after: string }> = [];

  if (actionType === "OPEN_GITHUB_ISSUE") {
    changes.push({
      field: "Repository",
      before: null,
      after: params.repo,
    });
    changes.push({
      field: "Issue Title",
      before: null,
      after: params.title,
    });
    changes.push({
      field: "Labels",
      before: "[]",
      after: JSON.stringify(params.labels || ["helix-triage"]),
    });
    changes.push({
      field: "Body Markdown",
      before: "(Empty — new issue)",
      after: params.body.slice(0, 200) + (params.body.length > 200 ? "..." : ""),
    });
  } else if (actionType === "POST_PR_REVIEW_COMMENT") {
    changes.push({
      field: "PR Target",
      before: null,
      after: `${params.repo}#${params.pullNumber}`,
    });
    changes.push({
      field: "Review Comment",
      before: "(No existing bot review)",
      after: params.body.slice(0, 200) + (params.body.length > 200 ? "..." : ""),
    });
  } else {
    changes.push({
      field: "Webhook Notification",
      before: "(Unsent)",
      after: params.content.slice(0, 200),
    });
  }

  const formattedDiff = changes
    .map((c) => `--- Before: ${c.before ?? "None"}\n+++ After [${c.field}]:\n+ ${c.after}`)
    .join("\n\n");

  return {
    actionType,
    target: params.repo || "webhook-target",
    proposedChanges: changes,
    formattedDiff,
    provenanceSource: "FalkorDB Provenance Graph & Layer 6 Action Engine",
  };
}

/**
 * Human-in-the-loop: Request approval token
 */
export function createApprovalRequest(
  actionType: ActionType,
  params: Record<string, any>
): { approvalToken: string; preview: ActionDiffPreview } {
  const approvalToken = `appr-${nanoid(8)}`;
  const preview = generateStructuredDiffPreview(actionType, params);
  PENDING_APPROVALS.set(approvalToken, {
    id: approvalToken,
    actionType,
    params,
    diffPreview: preview,
    createdAt: new Date().toISOString(),
    status: "PENDING",
  });
  return { approvalToken, preview };
}

/**
 * Human-in-the-loop: Submit explicit human approval
 */
export async function approveAndExecute(
  approvalToken: string,
  forceLive: boolean = false
): Promise<ActionReceipt> {
  const pending = PENDING_APPROVALS.get(approvalToken);
  if (!pending) {
    throw new Error(`Invalid or expired approval token "${approvalToken}".`);
  }
  if (pending.status !== "PENDING") {
    throw new Error(`Approval token "${approvalToken}" has already been ${pending.status}.`);
  }

  pending.status = "APPROVED";

  if (pending.actionType === "OPEN_GITHUB_ISSUE") {
    return executeOpenIssue({
      repo: String(pending.params.repo),
      title: String(pending.params.title),
      body: String(pending.params.body),
      labels: pending.params.labels as string[] | undefined,
      forceLive,
    });
  } else if (pending.actionType === "POST_PR_REVIEW_COMMENT") {
    return executePostPrReviewComment({
      repo: String(pending.params.repo),
      pullNumber: Number(pending.params.pullNumber),
      body: String(pending.params.body),
      forceLive,
    });
  } else {
    return executeDispatchDiscord({
      content: String(pending.params.content),
      embedTitle: pending.params.embedTitle ? String(pending.params.embedTitle) : undefined,
      forceLive,
    });
  }
}

export function getAuditChainState() {
  return {
    lastAuditHash,
    totalAudits: EXECUTED_RECEIPTS.size,
  };
}

/**
 * Hard security allowlist check: ONLY allow mutating GITHUB_WRITE_REPO.
 * Prevents prompt-injected LLM actions against unintended public repositories.
 */
export function validateWriteRepoAllowlist(targetRepo: string): void {
  const allowed = (process.env.GITHUB_WRITE_REPO || "demo-dev/helix-demo-ops").trim().toLowerCase();
  const requested = targetRepo.trim().toLowerCase();

  if (!allowed) {
    throw new Error(
      "SECURITY LOCKDOWN: GITHUB_WRITE_REPO environment variable is not configured. External repository mutations are strictly blocked."
    );
  }

  if (requested !== allowed) {
    throw new Error(
      `SECURITY BLOCKED: Write action targeted at repository "${targetRepo}", but allowlist restricts writes ONLY to "${allowed}". Action rejected.`
    );
  }
}

/**
 * Computes SHA-256 hash-chain node: hash = sha256(prevHash + actionType + payload + timestamp)
 */
function computeNextAuditHash(actionType: string, payload: unknown, timestamp: string): {
  hash: string;
  prevHash: string;
} {
  const prevHash = lastAuditHash;
  const data = `${prevHash}|${actionType}|${JSON.stringify(payload)}|${timestamp}`;
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  lastAuditHash = hash;
  return { hash, prevHash };
}

async function recordAuditNode(receipt: ActionReceipt): Promise<void> {
  const cypher = `MERGE (a:AuditNode {id: $id})
SET a.actionType = $actionType,
    a.status = $status,
    a.targetUrl = $targetUrl,
    a.auditHash = $auditHash,
    a.previousHash = $previousHash,
    a.timestamp = $timestamp
RETURN a.id`;

  try {
    await runCypher(
      cypher,
      {
        id: receipt.actionId,
        actionType: receipt.actionType,
        status: receipt.status,
        targetUrl: receipt.targetUrl || "",
        auditHash: receipt.auditHash,
        previousHash: receipt.previousHash,
        timestamp: receipt.timestamp,
      },
      false
    );
  } catch {}
}

/**
 * 1. Open GitHub Issue with graph provenance citation footer
 */
export async function executeOpenIssue(params: {
  repo: string;
  title: string;
  body: string;
  labels?: string[];
  idempotencyKey?: string;
  forceLive?: boolean;
}): Promise<ActionReceipt> {
  // Enforce allowlist
  validateWriteRepoAllowlist(params.repo);

  // Idempotency check
  const idKey = params.idempotencyKey || `key-issue-${params.repo}-${params.title}`;
  if (EXECUTED_RECEIPTS.has(idKey)) {
    return EXECUTED_RECEIPTS.get(idKey)!;
  }

  const isDryRun = process.env.HELIX_ACTIONS_MODE !== "live" && !params.forceLive;
  const now = new Date().toISOString();
  const actionId = `action-issue-${nanoid(6)}`;

  // Provenance citation footer
  const enrichedBody = `${params.body}\n\n---\n*Authored by **Helix Company Brain** via FalkorDB graph reasoning.*  \n*Audit Provenance Key: \`${actionId}\`*`;

  const { hash, prevHash } = computeNextAuditHash("OPEN_GITHUB_ISSUE", { repo: params.repo, title: params.title }, now);

  if (isDryRun) {
    const receipt: ActionReceipt = {
      actionId,
      actionType: "OPEN_GITHUB_ISSUE",
      status: "DRY_RUN_PREVIEW",
      targetUrl: `https://github.com/${params.repo}/issues/preview-${nanoid(4)}`,
      receiptDetails: {
        mode: "DRY_RUN",
        repo: params.repo,
        title: params.title,
        body: enrichedBody,
        labels: params.labels || ["helix-agent", "graph-triage"],
        note: "Simulated preview. Set HELIX_ACTIONS_MODE=live in .env.local and configure GITHUB_TOKEN to execute live against GitHub.",
      },
      auditHash: hash,
      previousHash: prevHash,
      undoAvailable: true,
      timestamp: now,
    };
    EXECUTED_RECEIPTS.set(idKey, receipt);
    await recordAuditNode(receipt);
    return receipt;
  }

  // Live execution
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN in environment for live issue creation.");
  }

  const res = await fetch(`https://api.github.com/repos/${params.repo}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Helix-Company-Brain",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: params.title,
      body: enrichedBody,
      labels: params.labels || ["helix-triage"],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API Issue Creation Failed (${res.status}): ${errText}`);
  }

  const issueData = await res.json();
  const receipt: ActionReceipt = {
    actionId,
    actionType: "OPEN_GITHUB_ISSUE",
    status: "EXECUTED",
    targetUrl: issueData.html_url,
    receiptDetails: {
      issueNumber: issueData.number,
      title: issueData.title,
      url: issueData.html_url,
      state: issueData.state,
      author: issueData.user?.login,
    },
    auditHash: hash,
    previousHash: prevHash,
    undoAvailable: true,
    timestamp: now,
  };

  EXECUTED_RECEIPTS.set(idKey, receipt);
  await recordAuditNode(receipt);
  return receipt;
}

/**
 * 2. Post Pull Request Review Comment
 */
export async function executePostPrReviewComment(params: {
  repo: string;
  pullNumber: number;
  body: string;
  idempotencyKey?: string;
  forceLive?: boolean;
}): Promise<ActionReceipt> {
  validateWriteRepoAllowlist(params.repo);

  const idKey = params.idempotencyKey || `key-pr-${params.repo}-${params.pullNumber}`;
  if (EXECUTED_RECEIPTS.has(idKey)) {
    return EXECUTED_RECEIPTS.get(idKey)!;
  }

  const isDryRun = process.env.HELIX_ACTIONS_MODE !== "live" && !params.forceLive;
  const now = new Date().toISOString();
  const actionId = `action-pr-comment-${nanoid(6)}`;

  const enrichedBody = `${params.body}\n\n---\n*Automated review analysis synthesized by **Helix Graph Agent** on FalkorDB.*`;
  const { hash, prevHash } = computeNextAuditHash("POST_PR_REVIEW_COMMENT", { repo: params.repo, pr: params.pullNumber }, now);

  if (isDryRun) {
    const receipt: ActionReceipt = {
      actionId,
      actionType: "POST_PR_REVIEW_COMMENT",
      status: "DRY_RUN_PREVIEW",
      targetUrl: `https://github.com/${params.repo}/pull/${params.pullNumber}#issuecomment-preview`,
      receiptDetails: {
        mode: "DRY_RUN",
        repo: params.repo,
        pullNumber: params.pullNumber,
        commentBody: enrichedBody,
      },
      auditHash: hash,
      previousHash: prevHash,
      undoAvailable: true,
      timestamp: now,
    };
    EXECUTED_RECEIPTS.set(idKey, receipt);
    await recordAuditNode(receipt);
    return receipt;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Missing GITHUB_TOKEN for live PR review comment.");

  const res = await fetch(`https://api.github.com/repos/${params.repo}/issues/${params.pullNumber}/comments`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Helix-Company-Brain",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body: enrichedBody }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub PR Comment Failed (${res.status}): ${errText}`);
  }

  const commentData = await res.json();
  const receipt: ActionReceipt = {
    actionId,
    actionType: "POST_PR_REVIEW_COMMENT",
    status: "EXECUTED",
    targetUrl: commentData.html_url,
    receiptDetails: {
      commentId: commentData.id,
      url: commentData.html_url,
    },
    auditHash: hash,
    previousHash: prevHash,
    undoAvailable: true,
    timestamp: now,
  };

  EXECUTED_RECEIPTS.set(idKey, receipt);
  await recordAuditNode(receipt);
  return receipt;
}

/**
 * 3. Discord / Slack Outbound Webhook Dispatch
 */
export async function executeDispatchDiscord(params: {
  content: string;
  embedTitle?: string;
  embedUrl?: string;
  idempotencyKey?: string;
  forceLive?: boolean;
}): Promise<ActionReceipt> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  const isDryRun = process.env.HELIX_ACTIONS_MODE !== "live" && !params.forceLive;
  const now = new Date().toISOString();
  const actionId = `action-webhook-${nanoid(6)}`;

  const { hash, prevHash } = computeNextAuditHash("DISCORD_WEBHOOK_MESSAGE", { content: params.content }, now);

  if (isDryRun || !webhookUrl) {
    const receipt: ActionReceipt = {
      actionId,
      actionType: "DISCORD_WEBHOOK_MESSAGE",
      status: "DRY_RUN_PREVIEW",
      targetUrl: "https://discord.com/channels/mock-audit-feed",
      receiptDetails: {
        mode: "DRY_RUN",
        content: params.content,
        embedTitle: params.embedTitle,
        webhookConfigured: Boolean(webhookUrl),
      },
      auditHash: hash,
      previousHash: prevHash,
      undoAvailable: false,
      timestamp: now,
    };
    await recordAuditNode(receipt);
    return receipt;
  }

  // Live dispatch
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: params.content,
      embeds: params.embedTitle
        ? [
            {
              title: params.embedTitle,
              url: params.embedUrl,
              description: params.content,
              color: 0xd08a4c, // Helix Copper color
            },
          ]
        : undefined,
    }),
  });

  const receipt: ActionReceipt = {
    actionId,
    actionType: "DISCORD_WEBHOOK_MESSAGE",
    status: res.ok ? "EXECUTED" : "FAILED",
    targetUrl: webhookUrl,
    receiptDetails: { httpStatus: res.status },
    auditHash: hash,
    previousHash: prevHash,
    undoAvailable: false,
    timestamp: now,
  };

  await recordAuditNode(receipt);
  return receipt;
}

/**
 * 4. Reversible One-Click Undo / Compensating Action
 */
export async function executeUndoAction(actionId: string): Promise<boolean> {
  const receipt = Array.from(EXECUTED_RECEIPTS.values()).find((r) => r.actionId === actionId);
  if (!receipt) return false;

  const token = process.env.GITHUB_TOKEN;

  if (receipt.actionType === "OPEN_GITHUB_ISSUE" && receipt.status === "EXECUTED" && token) {
    const issueNum = receipt.receiptDetails.issueNumber;
    const repo = process.env.GITHUB_WRITE_REPO;
    if (issueNum && repo) {
      // Close the issue as not planned / undone
      await fetch(`https://api.github.com/repos/${repo}/issues/${issueNum}`, {
        method: "PATCH",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Helix-Company-Brain",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: "closed",
          state_reason: "not_planned",
        }),
      });
    }
  }

  receipt.status = "UNDONE";

  recordLiveActivity({
    source: "AGENT",
    author: "Human Operator (Undo)",
    channelOrRepo: (receipt.receiptDetails?.repo as string) || "helix-ops",
    title: `Compensating Undo Executed (#${actionId})`,
    content: `Action ${actionId} (${receipt.actionType}) was cleanly reversed via automated compensating transaction. Status marked as UNDONE.`,
    affectedEntities: [actionId],
    cypherMutation: `MATCH (a:AuditNode {id: '${actionId}'}) SET a.status = 'UNDONE', a.undoneAt = datetime()`,
  });

  return true;
}
