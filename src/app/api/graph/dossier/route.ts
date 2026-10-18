import { NextResponse } from "next/server";
import { getDossier, setLivePrDossier, SAMPLE_DOSSIERS, LIVE_PR_DOSSIER, DEFAULT_LIVE_PR_DOSSIER, DecisionDossier } from "@/lib/graph/dossier";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "live-pr-triage";

  const active = getDossier(id);
  const livePrTitle = (LIVE_PR_DOSSIER || DEFAULT_LIVE_PR_DOSSIER).title;

  const catalog = [
    { id: "live-pr-triage", label: `🧬 ${livePrTitle}` },
    { id: "gov-monorepo-001", label: "🏛️ ADR-001: Strict Turbopack & Monorepo Boundaries" },
    { id: "gov-security-002", label: "🔒 SEC-002: Zero-Trust GitHub Actions & Cryptographic Release Signing" },
  ];

  return NextResponse.json({
    ok: true,
    activeDossier: active,
    catalog,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { dossier: DecisionDossier };
    if (!body.dossier) {
      return NextResponse.json({ ok: false, error: "Missing dossier payload" }, { status: 400 });
    }
    setLivePrDossier(body.dossier);
    return NextResponse.json({ ok: true, savedId: body.dossier.decisionId });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
