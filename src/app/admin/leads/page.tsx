import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEAD_STATUS_OPTIONS } from "@/lib/constants";
import { Eye, ChevronLeft, ChevronRight, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 20;

const URGENCY_OPTIONS = [
  { value: "urgent", label: "Urgent" },
  { value: "soon", label: "Soon" },
  { value: "not_urgent", label: "Normal" },
] as const;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const currentPage = Number(params.page) || 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const search = params.search?.trim() || "";
  const status = LEAD_STATUS_OPTIONS.some((s) => s.value === params.status)
    ? (params.status as string)
    : "";
  const urgency = URGENCY_OPTIONS.some((u) => u.value === params.urgency)
    ? (params.urgency as string)
    : "";
  const hasFilters = Boolean(search || status || urgency);

  let query = supabase
    .from("leads")
    .select("*, preferred_center:centers(name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (urgency) {
    query = query.eq("urgency", urgency);
  }

  const { data: leads, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  // Build a URL preserving current filters. Changing a filter resets the page.
  const buildUrl = (next: { page?: number; status?: string; urgency?: string }) => {
    const p = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextUrgency = next.urgency ?? urgency;
    const nextPage = next.page ?? 1;
    if (nextPage > 1) p.set("page", String(nextPage));
    if (search) p.set("search", search);
    if (nextStatus) p.set("status", nextStatus);
    if (nextUrgency) p.set("urgency", nextUrgency);
    const qs = p.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  };

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 ${
      active
        ? "gradient-primary text-white"
        : "bg-surface-container-lowest text-muted-foreground ghost-border hover:text-foreground"
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <Button variant="outline" size="sm" asChild className="rounded-full">
          <a href="/api/admin/leads/export" download>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </a>
        </Button>
      </div>

      {/* Search */}
      <form action="/admin/leads" className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        {status && <input type="hidden" name="status" value={status} />}
        {urgency && <input type="hidden" name="urgency" value={urgency} />}
        <Input
          name="search"
          defaultValue={search}
          placeholder="Search by name or email..."
          className="pl-9 bg-surface-container-lowest border-0 rounded-xl ghost-border"
        />
      </form>

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1 w-14">
          Status
        </span>
        <Link href={buildUrl({ status: "" })} className={chipClass(!status)}>
          All
        </Link>
        {LEAD_STATUS_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={buildUrl({ status: opt.value })}
            className={chipClass(status === opt.value)}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Urgency filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1 w-14">
          Urgency
        </span>
        <Link href={buildUrl({ urgency: "" })} className={chipClass(!urgency)}>
          All
        </Link>
        {URGENCY_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={buildUrl({ urgency: opt.value })}
            className={chipClass(urgency === opt.value)}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preferred Center</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(leads || []).map((lead) => {
              const statusConfig = LEAD_STATUS_OPTIONS.find(
                (s) => s.value === lead.status
              );
              return (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {lead.email}
                  </TableCell>
                  <TableCell>
                    {lead.urgency === "urgent" ? (
                      <Badge variant="destructive">Urgent</Badge>
                    ) : lead.urgency === "soon" ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Soon
                      </Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusConfig?.color}>
                      {statusConfig?.label || lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {(lead.preferred_center as { name: string } | null)?.name || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/leads/${lead.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!leads || leads.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  {hasFilters ? (
                    <>
                      No leads match these filters.{" "}
                      <Link href="/admin/leads" className="text-primary underline underline-offset-2">
                        Clear filters
                      </Link>
                    </>
                  ) : (
                    "No leads yet."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages} ({count} total)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
              <Link href={buildUrl({ page: currentPage - 1 })}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild disabled={currentPage >= totalPages}>
              <Link href={buildUrl({ page: currentPage + 1 })}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
