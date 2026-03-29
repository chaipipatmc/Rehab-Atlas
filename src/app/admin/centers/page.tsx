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
import { Plus, Pencil, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { CountrySelect } from "@/components/admin/country-select";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminCentersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const currentPage = Number(params.page) || 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const search = params.search?.trim() || "";
  const statusFilter = params.status || "all";
  const countryFilter = params.country || "all";
  const claimFilter = params.claim || "all";

  // Fetch distinct countries for filter dropdown
  const { data: countryRows } = await supabase
    .from("centers")
    .select("country")
    .not("country", "is", null)
    .order("country");
  const countries = [...new Set((countryRows || []).map((r) => r.country).filter(Boolean))] as string[];

  let query = supabase
    .from("centers")
    .select("id, name, slug, city, country, status, verified_profile, trusted_partner, referral_eligible, is_unclaimed", { count: "exact" })
    .order("name");

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`);
  }

  if (statusFilter === "draft") {
    query = query.eq("status", "draft");
  } else if (statusFilter === "published") {
    query = query.eq("status", "published");
  }

  if (countryFilter !== "all") {
    query = query.eq("country", countryFilter);
  }

  if (claimFilter === "unclaimed") {
    query = query.eq("is_unclaimed", true);
  } else if (claimFilter === "claimed") {
    query = query.or("is_unclaimed.is.null,is_unclaimed.eq.false");
  }

  const { data: centers, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  const buildPageUrl = (page: number, overrides?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (search) p.set("search", search);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (countryFilter !== "all") p.set("country", countryFilter);
    if (claimFilter !== "all") p.set("claim", claimFilter);
    if (overrides) {
      for (const [k, v] of Object.entries(overrides)) {
        if (v === "all" || v === "") {
          p.delete(k);
        } else {
          p.set(k, v);
        }
      }
    }
    const qs = p.toString();
    return `/admin/centers${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Centers</h1>
        <Button asChild>
          <Link href="/admin/centers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Center
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {/* Search */}
        <form action="/admin/centers" className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="hidden" name="status" value={statusFilter} />
          <input type="hidden" name="country" value={countryFilter} />
          <input type="hidden" name="claim" value={claimFilter} />
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search by name, city, country..."
            className="pl-9 bg-surface-container-lowest border-0 rounded-xl ghost-border"
          />
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          {(["all", "draft", "published"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              asChild
              className="rounded-full text-xs h-8"
            >
              <Link href={buildPageUrl(1, { status: s, page: "" })}>
                {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            </Button>
          ))}
        </div>

        {/* Claim Filter */}
        <div className="flex items-center gap-1.5">
          {(["all", "unclaimed", "claimed"] as const).map((c) => (
            <Button
              key={c}
              variant={claimFilter === c ? "default" : "outline"}
              size="sm"
              asChild
              className="rounded-full text-xs h-8"
            >
              <Link href={buildPageUrl(1, { claim: c, page: "" })}>
                {c === "all" ? "All Claims" : c.charAt(0).toUpperCase() + c.slice(1)}
              </Link>
            </Button>
          ))}
        </div>

        {/* Country Filter */}
        {countries.length > 0 && (
          <CountrySelect countries={countries} currentValue={countryFilter} />
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Badges</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(centers || []).map((center) => (
              <TableRow key={center.id}>
                <TableCell className="font-medium">{center.name}</TableCell>
                <TableCell className="text-sm text-slate-500">
                  {[center.city, center.country].filter(Boolean).join(", ")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      center.status === "published" ? "default" : "secondary"
                    }
                  >
                    {center.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {center.is_unclaimed && (
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">Unclaimed</Badge>
                    )}
                    {center.verified_profile && (
                      <Badge variant="outline" className="text-xs">V</Badge>
                    )}
                    {center.trusted_partner && (
                      <Badge variant="outline" className="text-xs text-emerald-700">TP</Badge>
                    )}
                    {center.referral_eligible && (
                      <Badge variant="outline" className="text-xs text-blue-700">RE</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <PublishToggle id={center.id} type="center" currentStatus={center.status} />
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/centers/${center.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
