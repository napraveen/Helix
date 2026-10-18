import { NextResponse } from "next/server";
import { simulateEmployeeDeparture } from "@/lib/graph/simulator";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const person = searchParams.get("person") ?? "Leo Kim";
  try {
    const result = await simulateEmployeeDeparture(person);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { person?: string };
    const person = body.person ?? "Leo Kim";
    const result = await simulateEmployeeDeparture(person);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
