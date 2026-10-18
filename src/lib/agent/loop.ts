import { GoogleGenAI } from "@google/genai";
import { toolHandlers } from "../graph/tools";
import { SYSTEM_PROMPT, TOOL_DECLARATIONS } from "./declarations";
import { graphOnlyAnswer } from "./fallback";
import { acceptsSentence, type AnswerOutcomeShape } from "../graph/grounding-verifier";

export type ChatTurn = { role: "user" | "assistant"; content: string };

const MODEL_FALLBACKS = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-1.5-flash",
].filter(Boolean) as string[];

function extractFunctionCalls(response: {
  functionCalls?: Array<{ name?: string; args?: Record<string, unknown>; id?: string }>;
  candidates?: Array<{ content?: { parts?: Array<{ functionCall?: { name?: string; args?: Record<string, unknown>; id?: string } }> } }>;
}) {
  if (response.functionCalls?.length) return response.functionCalls;
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.functionCall)
    .filter((fc): fc is NonNullable<typeof fc> => Boolean(fc?.name));
}

export async function runAgent(args: {
  message: string;
  sessionId: string;
  history?: ChatTurn[];
}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return graphOnlyAnswer(args.message, args.sessionId);
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const contents: Array<Record<string, unknown>> = [];
  for (const turn of args.history ?? []) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    });
  }
  contents.push({ role: "user", parts: [{ text: args.message }] });

  const traces = [];
  const specialists = new Set<string>(["Helix"]);
  let modelUsed = MODEL_FALLBACKS[0];
  let text = "";
  let primaryOutcome: AnswerOutcomeShape = "answered_with_path";
  let hopsPath: string[] | undefined;
  let hopsCount: number | undefined;
  let dateLearned: string | undefined;
  let entityChecked: string | undefined;
  const retrievedEntities: string[] = [];

  try {
    for (let step = 0; step < 6; step++) {
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      let lastError: unknown;
      for (const model of MODEL_FALLBACKS) {
        try {
          response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.2,
              tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
            },
          });
          modelUsed = model;
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!response) throw lastError ?? new Error("Gemini failed");

      const calls = extractFunctionCalls(response);
      const modelParts = response.candidates?.[0]?.content?.parts;
      if (modelParts) {
        contents.push({ role: "model", parts: modelParts });
      }

      if (!calls.length) {
        text = response.text ?? "";
        break;
      }

      const fnParts = [];
      for (const call of calls) {
        const name = call.name ?? "";
        const handler = toolHandlers[name];
        const toolArgs = (call.args ?? {}) as Record<string, unknown>;
        if (name === "remember" && !toolArgs.sessionId) toolArgs.sessionId = args.sessionId;
        if (name === "recall_memory" && !toolArgs.sessionId) toolArgs.sessionId = args.sessionId;
        if (!handler) {
          fnParts.push({
            functionResponse: {
              id: call.id,
              name,
              response: { error: `Unknown tool ${name}` },
            },
          });
          continue;
        }
        const out = await handler(toolArgs);
        traces.push(...out.traces);
        specialists.add(out.agent);
        if (out.outcome) primaryOutcome = out.outcome;
        if (out.hopsPath) hopsPath = out.hopsPath;
        if (out.hopsCount !== undefined) hopsCount = out.hopsCount;
        if (out.dateLearned) dateLearned = out.dateLearned;
        if (out.entityChecked) entityChecked = out.entityChecked;
        if (Array.isArray(out.data)) {
          for (const item of out.data) {
            if (item && typeof item === "object") {
              if (item.name) retrievedEntities.push(String(item.name));
              if (item.system) retrievedEntities.push(String(item.system));
              if (item.title) retrievedEntities.push(String(item.title));
            }
          }
        }
        fnParts.push({
          functionResponse: {
            id: call.id,
            name,
            response: { output: out.data, agent: out.agent },
          },
        });
      }
      contents.push({ role: "user", parts: fnParts });
    }
  } catch (error) {
    if (
      String(error).includes("FalkorDB is unreachable") ||
      String(error).includes("FalkorDBConnectionError") ||
      String(error).includes("ECONNREFUSED")
    ) {
      return {
        text:
          `### 🔴 FalkorDB Disconnected: Live Graph Context Required\n\n` +
          `Unable to reach FalkorDB on \`127.0.0.1:6379\`.\n\n` +
          `> *"Build an agent whose context lives in a graph, and make the graph shape what the agent does rather than sit beside it."* — WeMakeDevs & FalkorDB Guide\n\n` +
          `The agent cannot reason without its live graph database. Mock answering is disallowed to ensure all answers are 100% graph-grounded.\n\n` +
          `**Start FalkorDB to enable graph reasoning:**\n` +
          `\`\`\`bash\n` +
          `docker compose up -d\n` +
          `# or: docker run -p 6379:6379 falkordb/falkordb\n` +
          `\`\`\``,
        traces: [],
        model: "falkordb-disconnected",
        specialists: ["Helix"],
        outcome: "unknown_entity" as AnswerOutcomeShape,
      };
    }
    const fallback = await graphOnlyAnswer(args.message, args.sessionId);
    return {
      ...fallback,
      text: `${fallback.text}\n\n(Gemini unavailable: ${String(error).slice(0, 240)})`,
    };
  }

  if (!text) {
    const fallback = await graphOnlyAnswer(args.message, args.sessionId);
    return { ...fallback, model: modelUsed };
  }

  // Blog Technique 5: accepts() grounding validator
  const acceptsCheck = acceptsSentence(text, retrievedEntities, hopsPath ? [hopsPath] : []);
  if (!acceptsCheck.accepted && acceptsCheck.invented.length > 0) {
    text = `${text}\n\n*⚠️ Grounding Notice: Model cited unindexed entities [${acceptsCheck.invented.join(", ")}] not present in graph query results.*`;
  }

  try {
    await toolHandlers.remember({
      sessionId: args.sessionId,
      content: `Q: ${args.message.slice(0, 180)} | A: ${text.slice(0, 280)}`,
      kind: "episodic",
    });
  } catch {
    // memory write is best-effort
  }

  return {
    text,
    traces,
    model: modelUsed,
    specialists: [...specialists],
    outcome: primaryOutcome,
    hopsPath,
    hopsCount,
    dateLearned,
    entityChecked,
    acceptsPassed: acceptsCheck.accepted,
  };
}
