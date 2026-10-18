import { NextResponse } from "next/server";
import crypto from "crypto";
import { runCypher } from "@/lib/falkor/run";

// Replay protection: delivery ID cache with 10-minute TTL
const PROCESSED_DELIVERIES = new Map<string, number>();

// Freshness watermarking per repository
export const REPO_FRESHNESS_WATERMARKS = new Map<string, { lastSynced: string; lastEvent: string }>();

function cleanOldDeliveries() {
  const cutoff = Date.now() - 600000;
  for (const [id, ts] of PROCESSED_DELIVERIES.entries()) {
    if (ts < cutoff) PROCESSED_DELIVERIES.delete(id);
  }
}

/**
 * Validates GitHub HMAC-SHA256 signature
 */
function verifySignature(payload: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  cleanOldDeliveries();

  const deliveryId = req.headers.get("x-github-delivery") || `del-${Date.now()}`;
  const signature = req.headers.get("x-hub-signature-256");
  const eventType = req.headers.get("x-github-event") || "ping";

  // Replay check
  if (PROCESSED_DELIVERIES.has(deliveryId)) {
    return NextResponse.json(
      { ok: true, status: "ALREADY_PROCESSED", delivery: deliveryId },
      { status: 200 }
    );
  }
  PROCESSED_DELIVERIES.set(deliveryId, Date.now());

  // Raw body for signature check
  const rawBody = await req.text();
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "helix-webhook-secret-graphhacks-2026";

  const isValid = verifySignature(rawBody, signature, secret);
  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid HMAC-SHA256 webhook signature" },
      { status: 401 }
    );
  }

  let payload: any = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // Handle Ping event
  if (eventType === "ping") {
    return NextResponse.json({
      ok: true,
      message: "Helix Webhook listener verified. Ready for live events.",
      zen: payload.zen,
    });
  }

  const repoFullName = payload.repository?.full_name || "unknown-repo";
  const now = new Date().toISOString();
  REPO_FRESHNESS_WATERMARKS.set(repoFullName, {
    lastSynced: now,
    lastEvent: `${eventType}.${payload.action || "created"}`,
  });

  // Async graph ingestion into FalkorDB
  const isIssue = eventType === "issues" && payload.issue;
  const isPR = eventType === "pull_request" && payload.pull_request;

  if (isIssue) {
    const issue = payload.issue;
    const authorLogin = issue.user?.login || "anonymous";
    const authorId = `person-${authorLogin.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const issueId = `issue-${issue.number}`;

    const cypher = `MERGE (r:Repo {name: '${repoFullName}'})
MERGE (p:Person {name: '${authorLogin}'})
ON CREATE SET p.id = '${authorId}', p.login = '${authorLogin}'
MERGE (i:Issue {id: '${issueId}'})
SET i.number = ${issue.number},
    i.title = '${(issue.title || "").replace(/'/g, "\\'")}',
    i.state = '${issue.state}',
    i.url = '${issue.html_url}',
    i.createdAt = '${issue.created_at}',
    i.updatedAt = '${now}',
    i.freshnessSyncedAt = '${now}'
MERGE (p)-[:OPENED]->(i)
MERGE (i)-[:PART_OF]->(r)
RETURN i.number, i.title`;

    try {
      await runCypher(cypher, {}, false);
    } catch (err) {
      console.warn("Webhook Cypher mutation notice:", err);
    }
  } else if (isPR) {
    const pr = payload.pull_request;
    const authorLogin = pr.user?.login || "anonymous";
    const authorId = `person-${authorLogin.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const prId = `pr-${pr.number}`;

    const cypher = `MERGE (r:Repo {name: '${repoFullName}'})
MERGE (p:Person {name: '${authorLogin}'})
ON CREATE SET p.id = '${authorId}', p.login = '${authorLogin}'
MERGE (pr:PullRequest {id: '${prId}'})
SET pr.number = ${pr.number},
    pr.title = '${(pr.title || "").replace(/'/g, "\\'")}',
    pr.state = '${pr.state}',
    pr.url = '${pr.html_url}',
    pr.updatedAt = '${now}',
    pr.freshnessSyncedAt = '${now}'
MERGE (p)-[:AUTHORED]->(pr)
MERGE (pr)-[:PART_OF]->(r)
RETURN pr.number, pr.title`;

    try {
      await runCypher(cypher, {}, false);
    } catch (err) {
      console.warn("Webhook Cypher mutation notice:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    delivery: deliveryId,
    eventType,
    action: payload.action,
    repo: repoFullName,
    syncedAt: now,
  });
}

export async function GET() {
  const watermarks = Array.from(REPO_FRESHNESS_WATERMARKS.entries()).map(([repo, data]) => ({
    repo,
    lastSynced: data.lastSynced,
    lastEvent: data.lastEvent,
  }));

  return NextResponse.json({
    ok: true,
    webhookConfigured: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
    writeRepo: process.env.GITHUB_WRITE_REPO || "Not set",
    freshnessWatermarks: watermarks,
  });
}
