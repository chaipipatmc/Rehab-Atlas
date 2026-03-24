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
import { Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const currentPage = Number(params.page) || 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const search = params.search?.trim() || "";

  let query = supabase
    .from("leads")
    .select("*, preferred_center:centers(name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: leads, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  const buildPageUrl = (page: number) => {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (search) p.set("search", search);
    const qs = p.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Leads</h1>

      {/* Search */}
      <form action="/admin/leads" className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="Search by name or email..."
          className="pl-9 bg-surface-container-lowest border-0 rounded-xl ghost-border"
        />
      </form>

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
                  No leads yet.
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
              <Link href={buildPageUrl(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild disabled={currentPage >= totalPages}>
              <Link href={buildPageUrl(currentPage + 1)}>
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
