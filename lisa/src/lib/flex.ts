import { extractMeetingLink, isAllDay, shortLocation, type GcalEvent } from "./google";
import { fmtTime } from "./time";

export const OLIVE = "#6B7A3A";
const MUTED = "#8a9088";

function eventRow(ev: GcalEvent): Record<string, unknown> {
  const link = extractMeetingLink(ev);
  const time = isAllDay(ev)
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

  return { type: "box", layout: "vertical", margin: "lg", contents };
}

/** Olive schedule card shared by the daily brief cron and the agent's schedule answers. */
export function buildScheduleCard(opts: {
  header: string;
  title: string;
  subtitle: string;
  events: GcalEvent[];
}): Record<string, unknown> {
  const rows: Record<string, unknown>[] = [];
  opts.events.slice(0, 10).forEach((ev, i) => {
    if (i > 0) rows.push({ type: "separator", margin: "lg", color: "#EEEEE8" });
    rows.push(eventRow(ev));
  });
  if (opts.events.length > 10) {
    rows.push({
      type: "text",
      text: `…และอีก ${opts.events.length - 10} รายการ`,
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
        { type: "text", text: opts.header, color: "#ffffffcc", size: "xs" },
        {
          type: "text",
          text: opts.title,
          color: "#ffffff",
          size: "lg",
          weight: "bold",
          margin: "xs",
        },
        { type: "text", text: opts.subtitle, color: "#ffffffcc", size: "sm", margin: "xs" },
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
