import { requireEnv } from "@/lib/env";
import {
  extractMeetingLink,
  isAllDay,
  listEvents,
  shortLocation,
  type GcalEvent,
} from "@/lib/google";
import { pushFlex, pushText } from "@/lib/line";
import { bangkokDayRange, fmtDate, fmtTime } from "@/lib/time";

export const maxDuration = 60;

const OLIVE = "#6B7A3A";
const MUTED = "#8a9088";

function eventRow(ev: GcalEvent): Record<string, unknown> {
  const link = extractMeetingLink(ev);
  const allDay = isAllDay(ev);
  const time = allDay
    ? "ทั้งวัน"
    : `${fmtTime(new Date(ev.start!.dateTime!))}${
        ev.end?.dateTime ? ` – ${fmtTime(new Date(ev.end.dateTime))}` : ""
      }`;

  const contents: Record<string, unknown>[] = [
    { type: "text", text: time, weight: "bold", size: "sm", color: OLIVE },
    {
      type: "text",
      text: ev.summary ?? "(ไม่มีชื่อ)",
      size: "sm",
      wrap: true,
      color: "#333333",
      margin: "xs",
    },
  ];
  if (ev.location) {
    contents.push({
      type: "text",
      text: `📍 ${shortLocation(ev.location)}`,
      size: "xs",
      color: MUTED,
      wrap: true,
      margin: "xs",
    });
  }
  if (link) {
    contents.push({
      type: "text",
      text: "🔗 เข้าประชุม",
      size: "xs",
      color: OLIVE,
      margin: "xs",
      action: { type: "uri", label: "Join", uri: link },
    });
  }

  return {
    type: "box",
    layout: "vertical",
    margin: "lg",
    contents,
  };
}

function buildBrief(dateLabel: string, events: GcalEvent[]): Record<string, unknown> {
  const rows: Record<string, unknown>[] = [];
  events.slice(0, 10).forEach((ev, i) => {
    if (i > 0) rows.push({ type: "separator", margin: "lg", color: "#EEEEE8" });
    rows.push(eventRow(ev));
  });
  if (events.length > 10) {
    rows.push({
      type: "text",
      text: `…และอีก ${events.length - 10} รายการ`,
      size: "xs",
      color: MUTED,
      margin: "lg",
    });
  }
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: OLIVE,
      paddingAll: "16px",
      contents: [
        { type: "text", text: "Lisa · Daily Brief", color: "#ffffffcc", size: "xs" },
        {
          type: "text",
          text: dateLabel,
          color: "#ffffff",
          size: "lg",
          weight: "bold",
          margin: "xs",
        },
        {
          type: "text",
          text: `${events.length} นัดหมายวันนี้`,
          color: "#ffffffcc",
          size: "sm",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      paddingTop: "6px",
      contents: rows,
    },
  };
}

function authorized(req: Request): boolean {
  const secret = requireEnv("CRON_SECRET");
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Manual trigger for testing: /api/cron/daily-brief?key=<CRON_SECRET>
  return new URL(req.url).searchParams.get("key") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });

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

  await pushFlex(`สรุปนัดหมายวันนี้ ${events.length} รายการ`, buildBrief(dateLabel, events));
  return Response.json({ ok: true, events: events.length });
}
