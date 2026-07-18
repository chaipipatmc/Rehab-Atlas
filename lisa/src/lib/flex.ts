import { extractMeetingLink, isAllDay, shortLocation, type GcalEvent } from "./google";
import { bangkokYmd, fmtThaiDay, fmtTime } from "./time";

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

function eventDayStart(ev: GcalEvent): Date {
  if (ev.start?.dateTime) return new Date(ev.start.dateTime);
  return new Date(`${ev.start?.date}T00:00:00+07:00`);
}

function dayHeaderRow(d: Date): Record<string, unknown> {
  return {
    type: "box",
    layout: "vertical",
    margin: "xl",
    backgroundColor: "#EFF1E3",
    cornerRadius: "6px",
    paddingAll: "6px",
    paddingStart: "10px",
    contents: [
      { type: "text", text: fmtThaiDay(d), size: "xs", weight: "bold", color: OLIVE },
    ],
  };
}

const MAX_EVENTS = 20;

/** Olive schedule card shared by the daily brief cron and the agent's schedule answers.
 *  When events span more than one day, a day header is inserted before each day's block. */
export function buildScheduleCard(opts: {
  header: string;
  title: string;
  subtitle: string;
  events: GcalEvent[];
}): Record<string, unknown> {
  const shown = opts.events.slice(0, MAX_EVENTS);
  const multiDay = new Set(shown.map((ev) => bangkokYmd(eventDayStart(ev)))).size > 1;

  const rows: Record<string, unknown>[] = [];
  let prevDay = "";
  shown.forEach((ev, i) => {
    const day = bangkokYmd(eventDayStart(ev));
    if (multiDay && day !== prevDay) {
      rows.push(dayHeaderRow(eventDayStart(ev)));
    } else if (i > 0) {
      rows.push({ type: "separator", margin: "lg", color: "#EEEEE8" });
    }
    rows.push(eventRow(ev));
    prevDay = day;
  });
  if (opts.events.length > MAX_EVENTS) {
    rows.push({
      type: "text",
      text: `…และอีก ${opts.events.length - MAX_EVENTS} รายการ`,
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
