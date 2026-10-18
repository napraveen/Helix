import { NextResponse } from "next/server";
import { graphOverview } from "@/lib/graph/tools";

export async function GET() {
  try {
    const data = await graphOverview();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
