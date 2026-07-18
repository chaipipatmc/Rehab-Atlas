import { requireEnv } from "@/lib/env";
import { extractMeetingLink, isAllDay, listEvents, type GcalEvent } from "@/lib/google";
import { pushFlex, pushText } from "@/lib/line";
import { bangkokDayRange, fmtDate, fmtTime } from "@/lib/time";

export const maxDuration = 60;

const TEAL = "#45636b";
const MUTED = "#8a9ba1";

function eventRow(ev: GcalEvent): Record<string, unknown> {
  const link = extractMeetingLink(ev);
  const allDay = isAllDay(ev);
  const time = allDay
    ? "ทั้งวัน"
    : `${fmtTime(new Date(ev.start!.dateTime!))}${
        ev.end?.dateTime ? `–${fmtTime(new Date(ev.end.dateTime))}` : ""
      }`;

  const detail: Record<string, unknown>[] = [
    {
      type: "text",
      text: ev.summary ?? "(ไม่มีชื่อ)",
      weight: "bold",
      size: "sm",
      wrap: true,
      color: "#333333",
    },
  ];
  if (ev.location) {
    detail.push({ type: "text", text: `📍 ${ev.location}`, size: "xs", color: MUTED, wrap: true });
  }
  if (link) {
    detail.push({
      type: "text",
      text: "🔗 เข้าประชุม",
      size: "xs",
      color: TEAL,
      action: { type: "uri", label: "Join", uri: link },
    });
  }

  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    margin: "md",
    contents: [
      {
        type: "text",
        text: time,
        size: "xs",
        color: TEAL,
        weight: "bold",
        flex: 3,
      },
      { type: "box", layout: "vertical", flex: 7, contents: detail },
    ],
  };
}

function buildBrief(dateLabel: string, events: GcalEvent[]): Record<string, unknown> {
  const rows = events.slice(0, 10).map(eventRow);
  if (events.length > 10) {
    rows.push({
      type: "text",
      text: `…และอีก ${events.length - 10} รายการ`,
      size: "xs",
      color: MUTED,
      margin: "md",
    });
  }
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: TEAL,
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
      contents: rows,
    },
  };
}

function authorized(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${requireEnv("CRON_SECRET")}`;
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
