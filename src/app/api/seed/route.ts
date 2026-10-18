import { NextResponse } from "next/server";
import { resetAndSeed } from "@/lib/graph/seed";

export async function POST() {
  try {
    const result = await resetAndSeed();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
