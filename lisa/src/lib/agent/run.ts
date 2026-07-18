import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, requireEnv } from "../env";
import { db } from "../supabase";
import { buildSystemPrompt } from "./prompt";
import { TOOLS, executeTool } from "./tools";

const MAX_TURNS = 10;
const HISTORY_LIMIT = 30;
const HISTORY_WINDOW_HOURS = 48;

async function loadHistory(): Promise<Anthropic.MessageParam[]> {
  const since = new Date(Date.now() - HISTORY_WINDOW_HOURS * 3600_000).toISOString();
  const { data } = await db()
    .from("lisa_messages")
    .select("role, content")
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  const rows = (data ?? []).reverse();
  // Anthropic requires alternating-ish roles starting with user; merge consecutive same-role turns.
  const merged: Anthropic.MessageParam[] = [];
  for (const row of rows) {
    const role = row.role === "assistant" ? "assistant" : "user";
    const last = merged[merged.length - 1];
    if (last && last.role === role) {
      last.content = `${last.content}\n\n${row.content}`;
    } else {
      merged.push({ role, content: row.content });
    }
  }
  while (merged.length > 0 && merged[0].role === "assistant") merged.shift();
  return merged;
}

async function saveMessage(role: "user" | "assistant", content: string): Promise<void> {
  await db().from("lisa_messages").insert({ role, content });
}

async function loadLocations(): Promise<{ alias: string; full_name: string }[]> {
  const { data } = await db().from("lisa_locations").select("alias, full_name").limit(50);
  return data ?? [];
}

/** Run Lisa's agent loop for one incoming LINE message; returns the reply text. */
export async function runLisaAgent(userText: string): Promise<string> {
  const client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  const [history, locations] = await Promise.all([loadHistory(), loadLocations()]);
  const system = buildSystemPrompt(locations);

  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: userText }];
  const pushState = { count: 0 };
  let finalText = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system,
      tools: TOOLS,
      messages,
    });

    // Log token usage for the weekly cost summary (best-effort)
    try {
      const { error } = await db().from("lisa_usage").insert({
        model: response.model ?? CLAUDE_MODEL,
        input_tokens: response.usage?.input_tokens ?? 0,
        output_tokens: response.usage?.output_tokens ?? 0,
        cache_creation_tokens: response.usage?.cache_creation_input_tokens ?? 0,
        cache_read_tokens: response.usage?.cache_read_input_tokens ?? 0,
      });
      if (error) console.error("usage log failed:", error.message);
    } catch (err) {
      console.error("usage log failed:", err);
    }

    const textParts = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text);
    if (textParts.length > 0) finalText = textParts.join("\n");

    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    messages.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const result = await executeTool(tu.name, tu.input, { latestUserText: userText, pushState });
      results.push({ type: "tool_result", tool_use_id: tu.id, content: result });
    }
    messages.push({ role: "user", content: results });
  }

  // Tools may have already pushed messages (schedule card / forward summary) —
  // an empty final text is fine in that case; only fall back when nothing went out.
  if (!finalText && pushState.count === 0) {
    finalText = "ขอโทษค่ะ Lisa ประมวลผลไม่สำเร็จ ลองพิมพ์อีกครั้งได้ไหมคะ 🙏";
  }

  await saveMessage("user", userText);
  await saveMessage("assistant", finalText || "(ส่งการ์ด/ข้อความสรุปให้เรียบร้อยแล้ว)");
  return finalText;
}
