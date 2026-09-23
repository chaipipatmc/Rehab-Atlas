/**
 * Daily owner brief: one LINE Flex card every morning (08:00 Bangkok) with
 * assessments, leads, partner replies and page views for the previous Bangkok
 * calendar day, 7-day totals, and a "needs action" footer.
 *
 * Page views come from the internal `center_analytics` table (profile views on
 * center pages). Vercel Web Analytics is not enabled on the project, so
 * site-wide views are not available yet. Swap the page-view query when it is.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { BASE_URL } from "@/lib/site";

const TEAL = "#45636b";
const TEAL_SOFT = "#e9eff0";
const INK = "#1f2a2d";
const MUTED = "#7b8a8e";
const WARN = "#b45309";
const OK = "#16a34a";
const HAIRLINE = "#eef1f1";

export type BriefMetrics = {
  dateLabel: string; // e.g. "Tue 23 Sep 2026"
  ymd: string; // Bangkok YYYY-MM-DD of the day being reported
  assessments: { started: number; completed: number; started7d: number };
  leads: { total: number; urgent: number; total7d: number; backlogNew: number };
  replies: {
    total: number;
    total7d: number;
    items: { center: string; sentiment: string | null }[];
  };
  pageViews: { views: number; inquiryClicks: number; views7d: number };
  pendingEdits: number;
};

// Bangkok day window ---------------------------------------------------------

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** [start, end) in UTC for the Bangkok calendar day `daysAgo` days before today. */
export function bangkokDayWindow(daysAgo: number, now = new Date()): { start: Date; end: Date; ymd: string } {
  const bkk = new Date(now.getTime() + BKK_OFFSET_MS);
  const startBkk = Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate() - daysAgo);
  return {
    start: new Date(startBkk - BKK_OFFSET_MS),
    end: new Date(startBkk + DAY_MS - BKK_OFFSET_MS),
    ymd: new Date(startBkk).toISOString().slice(0, 10),
  };
}

function formatDateLabel(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Data -----------------------------------------------------------------------

type Range = { s: string; e: string };
type Filter = { col: string; value: string | boolean };

export async function collectBriefMetrics(now = new Date()): Promise<BriefMetrics> {
  const admin = createAdminClient();
  const day = bangkokDayWindow(1, now); // yesterday (Bangkok)
  const week = bangkokDayWindow(7, now);
  const dayR: Range = { s: day.start.toISOString(), e: day.end.toISOString() };
  const weekR: Range = { s: week.start.toISOString(), e: day.end.toISOString() };

  async function count(table: string, col: string, range: Range, filter?: Filter): Promise<number> {
    let q = admin.from(table).select("id", { count: "exact", head: true }).gte(col, range.s).lt(col, range.e);
    if (filter) q = q.eq(filter.col, filter.value);
    const { count: n, error } = await q;
    if (error) console.error(`daily-brief count ${table} failed:`, error.message);
    return n ?? 0;
  }

  const inbound: Filter = { col: "direction", value: "inbound" };

  const [
    assessStarted,
    assessCompleted,
    assessStarted7d,
    leadsTotal,
    leadsUrgent,
    leadsTotal7d,
    repliesTotal,
    repliesTotal7d,
  ] = await Promise.all([
    count("assessments", "created_at", dayR),
    count("assessments", "created_at", dayR, { col: "completed", value: true }),
    count("assessments", "created_at", weekR),
    count("leads", "created_at", dayR),
    count("leads", "created_at", dayR, { col: "urgency", value: "urgent" }),
    count("leads", "created_at", weekR),
    count("outreach_emails", "sent_at", dayR, inbound),
    count("outreach_emails", "sent_at", weekR, inbound),
  ]);

  // Partner replies yesterday: center name + sentiment (max 3)
  const { data: replyRows } = await admin
    .from("outreach_emails")
    .select("from_email, outreach_pipeline(response_sentiment, centers(name))")
    .eq("direction", "inbound")
    .gte("sent_at", dayR.s)
    .lt("sent_at", dayR.e)
    .order("sent_at", { ascending: false })
    .limit(3);

  type ReplyJoin = { response_sentiment: string | null; centers: { name: string } | null } | null;
  const items = (replyRows ?? []).map((r) => {
    const p = r.outreach_pipeline as unknown as ReplyJoin;
    return {
      center: p?.centers?.name || String(r.from_email || "Unknown"),
      sentiment: p?.response_sentiment ?? null,
    };
  });

  // Page views (internal center analytics, keyed by calendar date)
  const [{ data: pvDay }, { data: pvWeek }] = await Promise.all([
    admin.from("center_analytics").select("profile_views, inquiry_clicks").eq("event_date", day.ymd),
    admin.from("center_analytics").select("profile_views").gte("event_date", week.ymd).lte("event_date", day.ymd),
  ]);
  type PvRow = { profile_views?: number | null; inquiry_clicks?: number | null };
  const sumViews = (rows: PvRow[] | null) => (rows ?? []).reduce((a, r) => a + (r.profile_views ?? 0), 0);
  const inquiryClicks = ((pvDay ?? []) as PvRow[]).reduce((a, r) => a + (r.inquiry_clicks ?? 0), 0);

  // Needs action
  const [{ count: backlogNew }, { count: pendingEdits }] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("center_edit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    dateLabel: formatDateLabel(day.ymd),
    ymd: day.ymd,
    assessments: { started: assessStarted, completed: assessCompleted, started7d: assessStarted7d },
    leads: { total: leadsTotal, urgent: leadsUrgent, total7d: leadsTotal7d, backlogNew: backlogNew ?? 0 },
    replies: { total: repliesTotal, total7d: repliesTotal7d, items },
    pageViews: { views: sumViews(pvDay as PvRow[]), inquiryClicks, views7d: sumViews(pvWeek as PvRow[]) },
    pendingEdits: pendingEdits ?? 0,
  };
}

// Flex card ------------------------------------------------------------------

type Flex = Record<string, unknown>;

function metricRow(opts: { icon: string; label: string; value: number; sub: string; highlight?: boolean }): Flex {
  return {
    type: "box",
    layout: "horizontal",
    margin: "lg",
    alignItems: "center",
    contents: [
      {
        type: "box",
        layout: "vertical",
        width: "40px",
        height: "40px",
        backgroundColor: TEAL_SOFT,
        cornerRadius: "20px",
        justifyContent: "center",
        alignItems: "center",
        contents: [{ type: "text", text: opts.icon, size: "md", align: "center" }],
      },
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        margin: "md",
        contents: [
          { type: "text", text: opts.label, size: "sm", color: INK, weight: "bold" },
          { type: "text", text: opts.sub, size: "xs", color: MUTED, wrap: true, margin: "xs" },
        ],
      },
      {
        type: "text",
        text: String(opts.value),
        size: "xxl",
        weight: "bold",
        color: opts.highlight && opts.value > 0 ? WARN : TEAL,
        align: "end",
        flex: 0,
        gravity: "center",
      },
    ],
  };
}

const separator: Flex = { type: "separator", margin: "lg", color: HAIRLINE };

function sentimentDot(s: string | null): string {
  if (s === "positive") return "🟢";
  if (s === "negative") return "🔴";
  if (s === "question") return "🟡";
  return "⚪";
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function buildDailyBriefCard(m: BriefMetrics): Flex {
  const rows: Flex[] = [
    metricRow({
      icon: "🧭",
      label: "Assessments",
      value: m.assessments.started,
      sub: `${m.assessments.completed} completed with email · ${m.assessments.started7d} in 7 days`,
    }),
    separator,
    metricRow({
      icon: "📩",
      label: "Leads",
      value: m.leads.total,
      sub: (m.leads.urgent > 0 ? `${m.leads.urgent} urgent · ` : "") + `${m.leads.total7d} in 7 days`,
      highlight: m.leads.urgent > 0,
    }),
    separator,
    metricRow({
      icon: "🤝",
      label: "Partner replies",
      value: m.replies.total,
      sub:
        m.replies.items.length > 0
          ? m.replies.items.map((r) => `${sentimentDot(r.sentiment)} ${r.center}`).join("  ")
          : `${m.replies.total7d} in 7 days`,
      highlight: m.replies.total > 0,
    }),
    separator,
    metricRow({
      icon: "👀",
      label: "Center page views",
      value: m.pageViews.views,
      sub: `${m.pageViews.inquiryClicks} inquiry clicks · ${m.pageViews.views7d} in 7 days`,
    }),
  ];

  const actions: string[] = [];
  if (m.leads.backlogNew > 0) actions.push(`${plural(m.leads.backlogNew, "lead", "leads")} not yet forwarded`);
  if (m.pendingEdits > 0) actions.push(`${plural(m.pendingEdits, "partner edit", "partner edits")} awaiting approval`);
  if (m.replies.total > 0) actions.push(`${plural(m.replies.total, "partner reply", "partner replies")} to answer`);

  const actionLines: Flex[] = actions.length
    ? actions.map((a) => ({ type: "text", text: `• ${a}`, size: "xs", color: INK, wrap: true, margin: "xs" }))
    : [{ type: "text", text: "Nothing waiting on you today.", size: "xs", color: MUTED, margin: "xs" }];

  const footerContents: Flex[] = [
    {
      type: "box",
      layout: "vertical",
      backgroundColor: actions.length ? "#fff7ed" : "#f0fdf4",
      cornerRadius: "8px",
      paddingAll: "10px",
      contents: [
        {
          type: "text",
          text: actions.length ? "Needs your attention" : "Inbox clear",
          size: "xs",
          weight: "bold",
          color: actions.length ? WARN : OK,
        },
        ...actionLines,
      ],
    },
    {
      type: "button",
      style: "primary",
      color: TEAL,
      height: "sm",
      margin: "md",
      action: { type: "uri", label: "Open admin dashboard", uri: `${BASE_URL}/admin` },
    },
  ];

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: TEAL,
      paddingAll: "16px",
      contents: [
        { type: "text", text: "REHAB-ATLAS · DAILY BRIEF", color: "#ffffffb3", size: "xxs", weight: "bold" },
        { type: "text", text: m.dateLabel, color: "#ffffff", size: "lg", weight: "bold", margin: "xs" },
        { type: "text", text: "Yesterday at a glance", color: "#ffffffb3", size: "xs", margin: "xs" },
      ],
    },
    body: { type: "box", layout: "vertical", paddingAll: "16px", paddingTop: "4px", contents: rows },
    footer: { type: "box", layout: "vertical", paddingAll: "16px", paddingTop: "0px", contents: footerContents },
  };
}

export function buildDailyBriefAltText(m: BriefMetrics): string {
  return `Rehab-Atlas ${m.dateLabel}: ${m.assessments.started} assessments, ${m.leads.total} leads, ${m.replies.total} partner replies, ${m.pageViews.views} page views`;
}
