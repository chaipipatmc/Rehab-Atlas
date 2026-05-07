"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  PenTool,
  Search,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalendarEntry {
  id: string;
  planned_date: string;
  topic: string;
  category: string;
  brief: string | null;
  keywords: string[] | null;
  status: string;
  page_id: string | null;
}

type StatusFilter = "all" | "planned" | "approved" | "writing" | "written" | "skipped";

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; pill: string; dot: string }> = {
  planned: { label: "Planned", pill: "bg-blue-50 text-blue-700", dot: "bg-blue-400" },
  approved: { label: "Approved", pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  writing: { label: "Writing", pill: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  written: { label: "Written", pill: "bg-violet-50 text-violet-700", dot: "bg-violet-400" },
  skipped: { label: "Skipped", pill: "bg-gray-100 text-gray-500", dot: "bg-gray-300" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "addiction-types": "bg-red-50 text-red-700",
  "treatment-types": "bg-blue-50 text-blue-700",
  "mental-health": "bg-purple-50 text-purple-700",
  "recovery-guides": "bg-emerald-50 text-emerald-700",
  "practical-guides": "bg-amber-50 text-amber-700",
  "international-treatment": "bg-sky-50 text-sky-700",
  "family-support": "bg-pink-50 text-pink-700",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function dayMeta(date: string) {
  const d = new Date(date + "T00:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    day: d.getDate(),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContentCalendarPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadCalendar();
  }, []);

  async function loadCalendar() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("content_calendar")
      .select("*")
      .order("planned_date", { ascending: true })
      .order("created_at", { ascending: true });
    setEntries((data || []) as CalendarEntry[]);
    setLoading(false);
  }

  // ─── Derived data ────────────────────────────────────────────────────────

  const monthEntries = useMemo(
    () => entries.filter((e) => e.planned_date.slice(0, 7) === yearMonth),
    [entries, yearMonth]
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.planned_date.slice(0, 7)));
    return Array.from(set).sort();
  }, [entries]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    monthEntries.forEach((e) => set.add(e.category));
    return Array.from(set).sort();
  }, [monthEntries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthEntries.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (q) {
        const haystack = `${e.topic} ${e.brief || ""} ${(e.keywords || []).join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [monthEntries, statusFilter, categoryFilter, search]);

  const counts = useMemo(() => {
    const c = { total: 0, planned: 0, approved: 0, writing: 0, written: 0, skipped: 0 };
    monthEntries.forEach((e) => {
      c.total++;
      if (e.status in c) c[e.status as keyof typeof c]++;
    });
    return c;
  }, [monthEntries]);

  const writtenPct = counts.total > 0 ? Math.round((counts.written / counts.total) * 100) : 0;

  // ─── Selection management ─────────────────────────────────────────────────

  const filteredSelectable = filteredEntries.filter((e) => e.status === "planned" || e.status === "approved");
  const allFilteredSelected =
    filteredSelectable.length > 0 && filteredSelectable.every((e) => selected.has(e.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredSelectable.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredSelectable.forEach((e) => next.add(e.id));
        return next;
      });
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  async function updateStatuses(ids: string[], status: "approved" | "skipped" | "planned") {
    if (ids.length === 0) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("content_calendar")
      .update({ status })
      .in("id", ids);
    setBusy(false);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    const verb = status === "approved" ? "Approved" : status === "skipped" ? "Skipped" : "Reset";
    toast.success(`${verb} ${ids.length} ${ids.length === 1 ? "topic" : "topics"}`);
    clearSelection();
    loadCalendar();
  }

  async function approveAllPlanned() {
    const ids = monthEntries.filter((e) => e.status === "planned").map((e) => e.id);
    if (ids.length === 0) {
      toast.info("No planned topics to approve");
      return;
    }
    await updateStatuses(ids, "approved");
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;
  }

  const today = todayISO();
  const isCurrentMonth = yearMonth === currentYearMonth();
  const hasPlanned = counts.planned > 0;
  const selectedCount = selected.size;

  // Group filtered entries by date for week-aware rendering
  const byDate = new Map<string, CalendarEntry[]>();
  filteredEntries.forEach((e) => {
    if (!byDate.has(e.planned_date)) byDate.set(e.planned_date, []);
    byDate.get(e.planned_date)!.push(e);
  });
  const dateKeys = Array.from(byDate.keys()).sort();

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-headline-lg font-semibold text-foreground">Content Calendar</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Editorial calendar planned by AI. Approve topics in bulk or one at a time, then the Content Creator agent writes them.
        </p>
      </div>

      {/* ─── Month switcher + progress ─── */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 ghost-border border-0"
              disabled={availableMonths.length > 0 && shiftMonth(yearMonth, -1) < availableMonths[0]}
              onClick={() => setYearMonth(shiftMonth(yearMonth, -1))}
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 min-w-[180px] text-center">
              <p className="text-lg font-semibold text-foreground leading-tight">{monthLabel(yearMonth)}</p>
              <p className="text-[11px] text-muted-foreground">
                {counts.total} {counts.total === 1 ? "topic" : "topics"}
                {isCurrentMonth && <span className="ml-1.5 text-primary">· current</span>}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 ghost-border border-0"
              onClick={() => setYearMonth(shiftMonth(yearMonth, 1))}
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentMonth && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs rounded-full"
                onClick={() => setYearMonth(currentYearMonth())}
              >
                Jump to today
              </Button>
            )}
          </div>

          {hasPlanned && (
            <Button
              size="sm"
              className="rounded-full gradient-primary text-white text-xs"
              onClick={approveAllPlanned}
              disabled={busy}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approve all {counts.planned} planned
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {counts.total > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Month progress</span>
              <span className="text-foreground tabular-nums">
                {counts.written}/{counts.total} written · {writtenPct}%
              </span>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-violet-400/80 rounded-full transition-all"
                style={{ width: `${writtenPct}%` }}
              />
            </div>
            {/* Status legend dots */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-muted-foreground">
              {counts.planned > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  {counts.planned} planned
                </span>
              )}
              {counts.approved > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {counts.approved} approved
                </span>
              )}
              {counts.writing > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {counts.writing} writing
                </span>
              )}
              {counts.written > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  {counts.written} written
                </span>
              )}
              {counts.skipped > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  {counts.skipped} skipped
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Filter bar ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 bg-surface-container-low rounded-full p-1">
          {(["all", "planned", "approved", "writing", "written", "skipped"] as StatusFilter[]).map((s) => {
            const active = statusFilter === s;
            const label = s === "all" ? "All" : STATUS_CONFIG[s]?.label || s;
            const count = s === "all" ? counts.total : counts[s as keyof typeof counts];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search topics, briefs, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-full ghost-border text-xs"
          />
        </div>

        {/* Category filter */}
        {allCategories.length > 1 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-surface-container-lowest rounded-full px-3 py-1.5 ghost-border text-foreground"
          >
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c.replace(/-/g, " ")}</option>
            ))}
          </select>
        )}
      </div>

      {/* ─── Bulk action bar (sticky when items selected) ─── */}
      {selectedCount > 0 && (
        <div className="sticky top-2 z-10 mb-3 bg-foreground text-background rounded-full shadow-ambient-lg px-4 py-2 flex items-center gap-3">
          <span className="text-xs font-medium">
            {selectedCount} {selectedCount === 1 ? "topic" : "topics"} selected
          </span>
          <div className="h-3 w-px bg-background/20" />
          <button
            onClick={() => updateStatuses(Array.from(selected), "approved")}
            disabled={busy}
            className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <CheckCircle2 className="h-3 w-3" />
            Approve selected
          </button>
          <button
            onClick={() => updateStatuses(Array.from(selected), "skipped")}
            disabled={busy}
            className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <SkipForward className="h-3 w-3" />
            Skip selected
          </button>
          <button
            onClick={clearSelection}
            className="ml-auto text-xs flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
            title="Clear selection"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ─── Topics list ─── */}
      {filteredEntries.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-ambient text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            {monthEntries.length === 0
              ? `No content planned for ${monthLabel(yearMonth)}`
              : "No topics match your filters"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {monthEntries.length === 0
              ? "Enable the Content Planner agent or trigger it manually from /admin/agents."
              : "Try clearing the search or status filter."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          {/* Header row with select-all */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-container-low text-[11px] uppercase tracking-wider text-muted-foreground">
            {filteredSelectable.length > 0 ? (
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all selectable topics in view"
              />
            ) : (
              <div className="w-4 h-4" />
            )}
            <span>
              Showing {filteredEntries.length} of {monthEntries.length} topics
              {filteredSelectable.length > 0 && ` · ${filteredSelectable.length} selectable`}
            </span>
          </div>

          {/* Topic rows grouped by date */}
          <div className="divide-y divide-surface-container-low">
            {dateKeys.map((date) => {
              const dayEntries = byDate.get(date)!;
              const meta = dayMeta(date);
              const isToday = date === today;
              const isPast = date < today;

              return (
                <div
                  key={date}
                  className={`flex ${isToday ? "bg-primary/5" : ""}`}
                >
                  {/* Date column */}
                  <div className={`w-20 shrink-0 flex flex-col items-center justify-center py-4 ${
                    isToday ? "border-l-2 border-primary" : ""
                  }`}>
                    <span className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">
                      {meta.weekday}
                    </span>
                    <span className={`text-2xl font-semibold tabular-nums ${
                      isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"
                    }`}>
                      {meta.day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] uppercase tracking-wider text-primary font-medium mt-0.5">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Topics for this day */}
                  <div className="flex-1 py-2">
                    {dayEntries.map((entry) => {
                      const status = STATUS_CONFIG[entry.status] || STATUS_CONFIG.planned;
                      const catColor = CATEGORY_COLORS[entry.category] || "bg-gray-50 text-gray-700";
                      const isSelected = selected.has(entry.id);
                      const isExpanded = expanded.has(entry.id);
                      const isSelectable = entry.status === "planned" || entry.status === "approved";

                      return (
                        <div
                          key={entry.id}
                          className={`group px-4 py-2.5 rounded-xl mx-1 transition-colors ${
                            isSelected ? "bg-primary/10" : "hover:bg-surface-container-low/60"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <div className="pt-0.5">
                              {isSelectable ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleOne(entry.id)}
                                  aria-label={`Select ${entry.topic}`}
                                />
                              ) : (
                                <div className="w-4 h-4" />
                              )}
                            </div>

                            {/* Topic body */}
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => toggleExpand(entry.id)}
                                className="text-left w-full"
                              >
                                <p className="text-sm font-medium text-foreground leading-snug">
                                  {entry.topic}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${catColor}`}>
                                    {entry.category.replace(/-/g, " ")}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 ${status.pill}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                    {status.label}
                                  </span>
                                  {entry.brief && (
                                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                                      {isExpanded ? (
                                        <ChevronUp className="h-3 w-3" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3" />
                                      )}
                                      Brief
                                    </span>
                                  )}
                                </div>
                              </button>

                              {/* Expanded brief + keywords */}
                              {isExpanded && (
                                <div className="mt-3 pl-3 border-l-2 border-surface-container space-y-2">
                                  {entry.brief && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      {entry.brief}
                                    </p>
                                  )}
                                  {entry.keywords && entry.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {entry.keywords.map((k) => (
                                        <span
                                          key={k}
                                          className="text-[9px] uppercase tracking-wider bg-surface-container-high text-muted-foreground rounded-full px-2 py-0.5"
                                        >
                                          {k}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Per-row actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {entry.status === "planned" && (
                                <button
                                  onClick={() => updateStatuses([entry.id], "approved")}
                                  disabled={busy}
                                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-full text-emerald-700 hover:bg-emerald-50"
                                  title="Approve"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Approve
                                </button>
                              )}
                              {(entry.status === "planned" || entry.status === "approved") && (
                                <button
                                  onClick={() => updateStatuses([entry.id], "skipped")}
                                  disabled={busy}
                                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-full text-muted-foreground hover:bg-surface-container hover:text-foreground"
                                  title="Skip"
                                >
                                  <SkipForward className="h-3 w-3" />
                                  Skip
                                </button>
                              )}
                              {entry.status === "skipped" && (
                                <button
                                  onClick={() => updateStatuses([entry.id], "planned")}
                                  disabled={busy}
                                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-full text-muted-foreground hover:bg-surface-container hover:text-foreground"
                                  title="Restore to planned"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Restore
                                </button>
                              )}
                              {entry.status === "writing" && (
                                <span className="text-[11px] flex items-center gap-1 px-2 py-1 text-amber-600">
                                  <Clock className="h-3 w-3 animate-pulse" />
                                  In progress
                                </span>
                              )}
                              {entry.status === "written" && entry.page_id && (
                                <a
                                  href={`/admin/content/${entry.page_id}`}
                                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-full text-primary hover:bg-primary/10"
                                  title="Open draft"
                                >
                                  <PenTool className="h-3 w-3" />
                                  Draft
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
