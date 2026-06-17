// Read-only AI assistant — server-side tool loop. Authenticates via the existing
// session (never trusts a client-sent role), fetches a single role-aware
// snapshot through getHomeData (so financial gating + RLS are inherited), runs
// the Anthropic tool-use loop against in-memory tools, and streams the final
// text back. No writes, no service-role key, no raw SQL.
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentProfile } from "@/lib/auth";
import { getHomeData } from "@/lib/queries";
import { key } from "@/lib/dates";
import { ASSISTANT_MODEL, MAX_TOKENS, MAX_TOOL_ITERATIONS } from "@/lib/assistant/model";
import { TOOL_DEFS, runTool, type ToolContext } from "@/lib/assistant/tools";
import { buildSystemPrompt } from "@/lib/assistant/system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientTurn = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  // 1) Authenticate server-side from the session. No profile → 401.
  const profile = await getCurrentProfile();
  if (!profile) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Assistant is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  // 2) Parse the conversation: prior turns + the new message.
  let body: { messages?: ClientTurn[]; message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  if (!message) {
    return Response.json({ error: "Empty message." }, { status: 400 });
  }
  const prior: Anthropic.MessageParam[] = (body.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content) }));

  // 3) One role-aware snapshot, bound to this caller's session.
  const data = await getHomeData();
  const todayKey = key(new Date());
  const ctx: ToolContext = { data, today: new Date(todayKey), todayKey };
  const system = buildSystemPrompt(data, todayKey);

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [
    ...prior,
    { role: "user", content: message },
  ];

  // 4) Bounded tool-use loop. Resolves tool calls server-side against the
  //    snapshot; stops at the first non-tool answer (or the iteration cap).
  let finalText = "";
  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const resp = await client.messages.create({
        model: ASSISTANT_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools: TOOL_DEFS,
        messages,
      });

      if (resp.stop_reason === "tool_use") {
        // Echo the assistant's tool_use turn, then answer each tool call.
        messages.push({ role: "assistant", content: resp.content });
        const results = resp.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map((b) => ({
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: JSON.stringify(runTool(b.name, b.input, ctx)),
          }));
        messages.push({ role: "user", content: results });
        continue;
      }

      finalText = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Assistant request failed.";
    return Response.json({ error: msg }, { status: 502 });
  }

  if (!finalText) {
    finalText =
      "I couldn't finish that — it needed more lookups than I'm allowed per question. Try narrowing it down.";
  }

  // 5) Stream the final text back (chunked so the client renders progressively).
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of finalText.split(/(\s+)/)) {
        if (part) controller.enqueue(encoder.encode(part));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
