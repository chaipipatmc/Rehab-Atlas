import { requireEnv } from "@/lib/env";
import { buildScheduleCard } from "@/lib/flex";
import { listEvents } from "@/lib/google";
import { pushFlex, pushText } from "@/lib/line";
import { bangkokDayRange, fmtDate } from "@/lib/time";

export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = requireEnv("CRON_SECRET");
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Manual trigger for testing: /api/cron/daily-brief?key=<CRON_SECRET>
  return new URL(req.url).searchParams.get("key") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });

  try {
    const { start, end } = bangkokDayRange();
    const events = await listEvents({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    });
    const dateLabel = fmtDate(start);

    if (events.length === 0) {
      await pushText(`🌤 อรุณสวัสดิ์ค่ะ วันนี้ (${dateLabel}) ไม่มีนัดหมายในปฏิทินค่ะ 🎉`);
      return Response.json({ ok: true, events: 0 });
    }

    await pushFlex(
      `สรุปนัดหมายวันนี้ ${events.length} รายการ`,
      buildScheduleCard({
        header: "Lisa · Daily Brief",
        title: dateLabel,
        subtitle: `${events.length} นัดหมายวันนี้`,
        events,
      })
    );
    return Response.json({ ok: true, events: events.length });
  } catch (err) {
    // getAccessToken() already pushes a throttled LINE alert on auth failures —
    // just log here and return 200 so a dead token doesn't pile up as 500s every day.
    console.error("daily-brief cron failed:", err);
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
