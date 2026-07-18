export const TZ = "Asia/Bangkok";

/** "2026-07-18" for a Date, in Bangkok time. */
export function bangkokYmd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Midnight-to-midnight range for a Bangkok calendar day. */
export function bangkokDayRange(offsetDays = 0): { start: Date; end: Date } {
  const base = new Date(Date.now() + offsetDays * 86400_000);
  const ymd = bangkokYmd(base);
  const start = new Date(`${ymd}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 86400_000);
  return { start, end };
}

/** "14:30" in Bangkok time. */
export function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** "Sat 18 Jul 2026" in Bangkok time. */
export function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Full current date-time context string for the agent prompt. */
export function nowBangkokContext(): string {
  const now = new Date();
  const full = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return `${full} (Asia/Bangkok, UTC+7)`;
}
