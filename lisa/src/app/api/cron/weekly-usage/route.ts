import { requireEnv } from "@/lib/env";
import { pushText } from "@/lib/line";
import { db } from "@/lib/supabase";
import { TZ } from "@/lib/time";

export const maxDuration = 60;

const THB_PER_USD = 36; // rough conversion for display only

/** USD per 1M tokens. Sonnet 5 has intro pricing ($2/$10) through 2026-08-31. */
function priceFor(model: string): { input: number; output: number } {
  if (model.includes("sonnet-5")) {
    const intro = Date.now() < Date.parse("2026-09-01T00:00:00Z");
    return intro ? { input: 2, output: 10 } : { input: 3, output: 15 };
  }
  if (model.includes("haiku")) return { input: 1, output: 5 };
  if (model.includes("opus")) return { input: 5, output: 25 };
  return { input: 3, output: 15 };
}

interface UsageRow {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
}

function summarize(rows: UsageRow[]) {
  let calls = 0;
  let input = 0;
  let output = 0;
  let costUsd = 0;
  for (const r of rows) {
    calls++;
    const p = priceFor(r.model);
    const inTok = r.input_tokens + r.cache_creation_tokens + r.cache_read_tokens;
    input += inTok;
    output += r.output_tokens;
    // cache writes bill ~1.25x input rate, cache reads ~0.1x
    costUsd +=
      (r.input_tokens / 1e6) * p.input +
      (r.cache_creation_tokens / 1e6) * p.input * 1.25 +
      (r.cache_read_tokens / 1e6) * p.input * 0.1 +
      (r.output_tokens / 1e6) * p.output;
  }
  return { calls, input, output, costUsd };
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtRangeLabel(start: Date, end: Date): string {
  const f = (d: Date) =>
    new Intl.DateTimeFormat("th-TH", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
  return `${f(start)} – ${f(end)}`;
}

function authorized(req: Request): boolean {
  const secret = requireEnv("CRON_SECRET");
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Manual trigger for testing: /api/cron/weekly-usage?key=<CRON_SECRET>
  return new URL(req.url).searchParams.get("key") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400_000);

  const [{ data: thisWeek }, { data: lastWeek }, { count: msgCount }] = await Promise.all([
    db()
      .from("lisa_usage")
      .select("model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens")
      .gte("created_at", weekAgo.toISOString()),
    db()
      .from("lisa_usage")
      .select("model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens")
      .gte("created_at", twoWeeksAgo.toISOString())
      .lt("created_at", weekAgo.toISOString()),
    db()
      .from("lisa_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())
      .eq("role", "user"),
  ]);

  const cur = summarize((thisWeek ?? []) as UsageRow[]);
  const prev = summarize((lastWeek ?? []) as UsageRow[]);

  const lines = [
    `📊 สรุปการใช้งาน Lisa ประจำสัปดาห์`,
    `(${fmtRangeLabel(weekAgo, now)})`,
    ``,
    `💬 ข้อความที่คุยกัน: ${fmtNum(msgCount ?? 0)} ข้อความ`,
    `🤖 เรียก Claude API: ${fmtNum(cur.calls)} ครั้ง`,
    `📥 Input: ${fmtNum(cur.input)} tokens`,
    `📤 Output: ${fmtNum(cur.output)} tokens`,
    ``,
    `💵 ค่าใช้จ่ายโดยประมาณ: $${cur.costUsd.toFixed(2)} (~฿${(cur.costUsd * THB_PER_USD).toFixed(0)})`,
  ];

  if (prev.calls > 0) {
    const diff = cur.costUsd - prev.costUsd;
    const pct = prev.costUsd > 0 ? Math.round((diff / prev.costUsd) * 100) : 0;
    lines.push(
      diff >= 0
        ? `📈 มากกว่าสัปดาห์ก่อน ${pct}% (สัปดาห์ก่อน $${prev.costUsd.toFixed(2)})`
        : `📉 น้อยกว่าสัปดาห์ก่อน ${Math.abs(pct)}% (สัปดาห์ก่อน $${prev.costUsd.toFixed(2)})`
    );
  }

  lines.push(
    ``,
    cur.costUsd < 1
      ? `ถือว่าใช้น้อยมากค่ะ สบายกระเป๋า 😊`
      : cur.costUsd < 5
        ? `อยู่ในระดับปกติค่ะ 👍`
        : `สัปดาห์นี้ใช้เยอะกว่าปกตินะคะ ⚠️`
  );

  await pushText(lines.join("\n"));
  return Response.json({ ok: true, ...cur });
}
