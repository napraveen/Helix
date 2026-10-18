import { NextResponse } from "next/server";
import { runFalkorAlgorithm, ALGORITHM_DEFINITIONS, type AlgorithmType } from "@/lib/graph/algorithms";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const algo = (searchParams.get("algo") as AlgorithmType) || "pagerank";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const result = await runFalkorAlgorithm(algo, { from, to });
  return NextResponse.json({
    ok: true,
    result,
    availableAlgorithms: Object.keys(ALGORITHM_DEFINITIONS),
  });
}
