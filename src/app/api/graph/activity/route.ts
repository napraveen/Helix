import { NextResponse } from "next/server";
import { getLiveActivityLog, fetchAndIngestRealGitHubCommit, recordLiveActivity } from "@/lib/graph/activity-stream";

export async function GET() {
  return NextResponse.json({
    events: getLiveActivityLog(),
    status: "ready",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string; repo?: string; customEvent?: any };
    
    if (body.action === "fetch_github") {
      const repo = body.repo || "vercel/next.js";
      const event = await fetchAndIngestRealGitHubCommit(repo);
      return NextResponse.json({ ok: true, event });
    }

    if (body.customEvent) {
      const event = recordLiveActivity(body.customEvent);
      return NextResponse.json({ ok: true, event });
    }

    // Default: fetch latest GitHub commit from vercel/next.js
    const event = await fetchAndIngestRealGitHubCommit(body.repo || "vercel/next.js");
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
