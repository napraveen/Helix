import { NextResponse } from "next/server";
import { getFalkorStatus } from "@/lib/falkor/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const falkor = await getFalkorStatus();

  return NextResponse.json(
    {
      ok: falkor.isLive,
      mode: falkor.isLive ? "LIVE_FALKORDB" : "FALKORDB_DISCONNECTED_REQUIRED",
      falkordb: falkor,
      gemini: Boolean(process.env.GEMINI_API_KEY),
      githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
      actionsMode: process.env.HELIX_ACTIONS_MODE ?? "dryrun",
      writeRepo: process.env.GITHUB_WRITE_REPO ?? "none",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}
