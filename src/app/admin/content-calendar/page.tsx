"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarDays, CheckCircle, Clock, PenTool, SkipForward, Filter,
} from "lucide-react";

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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "bg-blue-100 text-blue-800" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800" },
  writing: { label: "Writing", color: "bg-amber-100 text-amber-800" },
  written: { label: "Written", color: "bg-violet-100 text-violet-800" },
  skipped: { label: "Skipped", color: "bg-gray-100 text-gray-600" },
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

export default function ContentCalendarPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("");
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadCalendar();
  }, []);

  async function loadCalendar() {
    const supabase = createClient();
    const { data } = await supabase
      .from("content_calendar")
      .select("*")
      .order("planned_date", { ascending: true })
      .order("created_at", { ascending: true });
    setEntries((data || []) as CalendarEntry[]);
    setLoading(false);
  }

  async function approveMonth(yearMonth: string) {
    setApproving(true);
    const res = await fetch(`/api/agents/content-planner?action=approve&month=${yearMonth}`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Approved ${data.approved} topics for ${yearMonth}`);
      loadCalendar();
    } else {
      toast.error("Failed to approve");
    }
    setApproving(false);
  }

  async function skipEntry(id: string) {
    const supabase = createClient();
    await supabase.from("content_calendar").update({ status: "skipped" }).eq("id", id);
    toast.success("Topic skipped");
    loadCalendar();
  }

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;

  // Group by month
  const months = new Map<string, CalendarEntry[]>();
  entries.forEach((e) => {
    const ym = e.planned_date.slice(0, 7);
    if (!months.has(ym)) months.set(ym, []);
    months.get(ym)!.push(e);
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Stats
  const planned = entries.filter((e) => e.status === "planned").length;
  const approved = entries.filter((e) => e.status === "approved").length;
  const written = entries.filter((e) => e.status === "written").length;
  const total = entries.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-headline-lg font-semibold text-foreground">Content Calendar</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Editorial calendar planned by the Content Planner agent. Approve topics to start content creation.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">Total Topics</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-blue-700">{planned}</p>
          <p className="text-xs text-muted-foreground">Planned</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-emerald-700">{approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-violet-700">{written}</p>
          <p className="text-xs text-muted-foreground">Written</p>
        </div>
      </div>

      {/* Calendar by month */}
      {Array.from(months.entries()).map(([ym, monthEntries]) => {
        const [year, month] = ym.split("-").map(Number);
        const label = `${monthNames[month - 1]} ${year}`;
        const hasPlanned = monthEntries.some((e) => e.status === "planned");

        // Group by date
        const byDate = new Map<string, CalendarEntry[]>();
        monthEntries.forEach((e) => {
          if (!byDate.has(e.planned_date)) byDate.set(e.planned_date, []);
          byDate.get(e.planned_date)!.push(e);
        });

        return (
          <div key={ym} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{label}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{monthEntries.length} topics</span>
                {hasPlanned && (
                  <Button
                    size="sm"
                    className="rounded-full gradient-primary text-white text-xs"
                    onClick={() => approveMonth(ym)}
                    disabled={approving}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {approving ? "Approving..." : "Approve All"}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {Array.from(byDate.entries()).map(([date, dayEntries]) => {
                const dayOfWeek = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
                const dayNum = new Date(date + "T00:00:00").getDate();

                return (
                  <div key={date} className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
                    <div className="flex">
                      {/* Date column */}
                      <div className="w-20 shrink-0 bg-primary/5 flex flex-col items-center justify-center p-3">
                        <span className="text-[10px] uppercase text-muted-foreground font-medium">{dayOfWeek}</span>
                        <span className="text-xl font-semibold text-primary">{dayNum}</span>
                      </div>

                      {/* Topics */}
                      <div className="flex-1 p-3 space-y-2">
                        {dayEntries.map((entry) => {
                          const statusInfo = STATUS_CONFIG[entry.status] || STATUS_CONFIG.planned;
                          const catColor = CATEGORY_COLORS[entry.category] || "bg-gray-50 text-gray-700";

                          return (
                            <div key={entry.id} className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{entry.topic}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${catColor}`}>
                                    {entry.category.replace(/-/g, " ")}
                                  </span>
                                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${statusInfo.color}`}>
                                    {statusInfo.label}
                                  </span>
                                </div>
                                {entry.brief && (
                                  <p className="text-xs text-muted-foreground mt-1">{entry.brief}</p>
                                )}
                              </div>
                              {entry.status === "approved" && (
                                <button
                                  onClick={() => skipEntry(entry.id)}
                                  className="text-xs text-muted-foreground hover:text-foreground shrink-0 mt-1"
                                  title="Skip this topic"
                                >
                                  <SkipForward className="h-3 w-3" />
                                </button>
                              )}
                              {entry.status === "written" && entry.page_id && (
                                <a
                                  href={`/admin/content/${entry.page_id}`}
                                  className="text-xs text-primary hover:text-primary/80 shrink-0 mt-1"
                                >
                                  <PenTool className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {entries.length === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-ambient text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No content calendar yet. Enable the Content Planner agent to generate one.</p>
        </div>
      )}
    </div>
  );
}
