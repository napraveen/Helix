import { NextResponse } from "next/server";
import { runAgent, type ChatTurn } from "@/lib/agent/loop";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    message?: string;
    sessionId?: string;
    history?: ChatTurn[];
  };
  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  try {
    const result = await runAgent({
      message: body.message.trim(),
      sessionId: body.sessionId ?? "devflow-demo",
      history: body.history ?? [],
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
