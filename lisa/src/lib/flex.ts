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

export function eventDayStart(ev: GcalEvent): Date {
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
  if (shown.length === 0) {
    rows.push({ type: "text", text: "ไม่มีนัดหมายค่ะ 🎉", size: "sm", color: MUTED, margin: "lg" });
  }
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

/** One bubble per day, horizontally swipeable — for multi-day schedule requests (e.g. a week).
 *  Days with no events still get a bubble, so the owner can browse day by day. */
export function buildWeekCarousel(days: { label: string; events: GcalEvent[] }[]): Record<string, unknown> {
  return {
    type: "carousel",
    contents: days.map((d) =>
      buildScheduleCard({
        header: "Lisa · Schedule",
        title: d.label,
        subtitle: d.events.length > 0 ? `${d.events.length} นัดหมาย` : "ไม่มีนัดหมาย",
        events: d.events,
      })
    ),
  };
}

/** Confirm/Cancel card for a staged outbound invitation the owner asked Lisa to send. */
export function buildInviteConfirmCard(
  pendingId: string,
  ev: GcalEvent,
  attendees: { name: string; email: string }[]
): Record<string, unknown> {
  const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
  const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
  const time = start
    ? `${fmtThaiDay(start)} · ${fmtTime(start)}${end ? ` – ${fmtTime(end)}` : ""}`
    : `${ev.start?.date ?? ""} (ทั้งวัน)`;
  const title = ev.summary ?? "(ไม่มีชื่อ)";
  const link = extractMeetingLink(ev);

  const body: Record<string, unknown>[] = [
    { type: "text", text: time, weight: "bold", size: "sm", color: OLIVE },
    { type: "text", text: title, size: "md", weight: "bold", wrap: true, color: "#333333", margin: "sm" },
  ];
  if (ev.location) {
    body.push({ type: "text", text: `📍 ${shortLocation(ev.location)}`, size: "xs", color: MUTED, wrap: true, margin: "sm" });
  }
  if (link) {
    body.push({ type: "text", text: "🔗 มีลิงก์ประชุมออนไลน์", size: "xs", color: OLIVE, margin: "xs" });
  }
  body.push({ type: "separator", margin: "lg", color: "#EEEEE8" });
  body.push({ type: "text", text: "ผู้ถูกเชิญ", size: "xs", weight: "bold", color: MUTED, margin: "lg" });
  attendees.forEach((a) => {
    body.push({
      type: "text",
      text: `• ${a.name} (${a.email})`,
      size: "xs",
      color: "#333333",
      wrap: true,
      margin: "xs",
    });
  });

  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: OLIVE,
      paddingAll: "16px",
      contents: [
        { type: "text", text: "Lisa · Send Invitation", color: "#ffffffcc", size: "xs" },
        { type: "text", text: "ยืนยันส่งคำเชิญ?", color: "#ffffff", size: "lg", weight: "bold", margin: "xs" },
      ],
    },
    body: { type: "box", layout: "vertical", paddingAll: "16px", contents: body },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "md",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: OLIVE,
          height: "sm",
          action: {
            type: "postback",
            label: "ยืนยัน ✓",
            data: `send_invite:confirm:${pendingId}`,
            displayText: "ยืนยันส่งคำเชิญ",
          },
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "postback",
            label: "ยกเลิก ✕",
            data: `send_invite:cancel:${pendingId}`,
            displayText: "ยกเลิกคำเชิญ",
          },
        },
      ],
    },
  };
}

/** Invitation card with Accept/Decline postback buttons and a conflict summary. */
export function buildInviteCard(ev: GcalEvent, conflicts: GcalEvent[]): Record<string, unknown> {
  const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
  const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
  const time = start
    ? `${fmtThaiDay(start)} · ${fmtTime(start)}${end ? ` – ${fmtTime(end)}` : ""}`
    : `${ev.start?.date ?? ""} (ทั้งวัน)`;
  const organizer = ev.organizer?.displayName || ev.organizer?.email || "(ไม่ระบุ)";
  const link = extractMeetingLink(ev);
  const title = ev.summary ?? "(ไม่มีชื่อ)";

  const body: Record<string, unknown>[] = [
    { type: "text", text: time, weight: "bold", size: "sm", color: OLIVE },
    { type: "text", text: title, size: "md", weight: "bold", wrap: true, color: "#333333", margin: "sm" },
    { type: "text", text: `👤 ${organizer}`, size: "xs", color: MUTED, wrap: true, margin: "sm" },
  ];
  if (ev.location) {
    body.push({ type: "text", text: `📍 ${shortLocation(ev.location)}`, size: "xs", color: MUTED, wrap: true, margin: "xs" });
  }
  if (link) {
    body.push({ type: "text", text: "🔗 มีลิงก์ประชุมออนไลน์", size: "xs", color: OLIVE, margin: "xs" });
  }

  body.push({ type: "separator", margin: "lg", color: "#EEEEE8" });
  if (conflicts.length === 0) {
    body.push({ type: "text", text: "✅ ไม่ชนกับนัดเดิมในตาราง", size: "xs", color: "#3E7A45", margin: "lg" });
  } else {
    body.push({ type: "text", text: "⚠️ ชนกับนัดเดิม:", size: "xs", weight: "bold", color: "#B3261E", margin: "lg" });
    conflicts.slice(0, 4).forEach((c) => {
      const cs = c.start?.dateTime ? fmtTime(new Date(c.start.dateTime)) : "ทั้งวัน";
      const ce = c.end?.dateTime ? `–${fmtTime(new Date(c.end.dateTime))}` : "";
      body.push({
        type: "text",
        text: `• ${cs}${ce} ${c.summary ?? "(ไม่มีชื่อ)"}`,
        size: "xs",
        color: "#B3261E",
        wrap: true,
        margin: "xs",
      });
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
        { type: "text", text: "Lisa · Invitation", color: "#ffffffcc", size: "xs" },
        { type: "text", text: "คำเชิญประชุมใหม่", color: "#ffffff", size: "lg", weight: "bold", margin: "xs" },
      ],
    },
    body: { type: "box", layout: "vertical", paddingAll: "16px", contents: body },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "md",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: OLIVE,
          height: "sm",
          action: {
            type: "postback",
            label: "รับนัด ✓",
            data: `invite:accepted:${ev.id}`,
            displayText: `รับนัด: ${title}`.slice(0, 250),
          },
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "postback",
            label: "ไม่รับ ✕",
            data: `invite:declined:${ev.id}`,
            displayText: `ไม่รับนัด: ${title}`.slice(0, 250),
          },
        },
      ],
    },
  };
}
