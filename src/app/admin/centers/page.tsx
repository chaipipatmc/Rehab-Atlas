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

function calcCompleteness(c: Record<string, unknown>): number {
  const checks = [
    !!c.name, !!(c.description && (c.description as string).length > 50), !!c.short_description,
    !!c.country, !!c.city, !!c.address, !!c.phone, !!c.email, !!c.website_url,
    !!((c.treatment_focus as string[])?.length), !!((c.conditions as string[])?.length),
    !!((c.services as string[])?.length), !!((c.treatment_methods as string[])?.length),
    !!c.setting_type, !!c.program_length, !!((c.languages as string[])?.length),
    !!c.pricing_text, !!((c.accreditation as string[])?.length),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

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
  const profileFilter = params.profile || "all"; // all, low (0-39), medium (40-79), high (80-100)

  // Fetch distinct countries for filter dropdown
  const { data: countryRows } = await supabase
    .from("centers")
    .select("country")
    .not("country", "is", null)
    .order("country");
  const countries = [...new Set((countryRows || []).map((r) => r.country).filter(Boolean))] as string[];

  let query = supabase
    .from("centers")
    .select("id, name, slug, city, country, status, verified_profile, trusted_partner, referral_eligible, is_unclaimed, description, short_description, phone, email, website_url, address, treatment_focus, conditions, services, treatment_methods, setting_type, program_length, languages, pricing_text, accreditation", { count: "exact" })
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
  } else if (claimFilter === "verified") {
    query = query.eq("verified_profile", true).or("is_unclaimed.is.null,is_unclaimed.eq.false");
  } else if (claimFilter === "pending") {
    query = query.or("verified_profile.is.null,verified_profile.eq.false").or("is_unclaimed.is.null,is_unclaimed.eq.false");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let centers: any[] = [];
  let count: number | null = 0;

  if (profileFilter !== "all") {
    // Profile completeness is calculated, so fetch all matching rows and filter
    const { data: allCenters } = await query;
    const filtered = (allCenters || []).filter((c) => {
      const pct = calcCompleteness(c as Record<string, unknown>);
      if (profileFilter === "low") return pct < 40;
      if (profileFilter === "medium") return pct >= 40 && pct < 80;
      if (profileFilter === "high") return pct >= 80;
      return true;
    });
    count = filtered.length;
    centers = filtered.slice(offset, offset + PAGE_SIZE);
  } else {
    const result = await query.range(offset, offset + PAGE_SIZE - 1);
    centers = result.data || [];
    count = result.count;
  }

  // Fetch pipeline stages for these centers
  const centerIds = centers.map((c) => c.id);
  const pipelineMap = new Map<string, string>();
  if (centerIds.length > 0) {
    const { data: pipelines } = await supabase
      .from("outreach_pipeline")
      .select("center_id, stage")
      .in("center_id", centerIds);
    (pipelines || []).forEach((p) => pipelineMap.set(p.center_id, p.stage as string));
  }

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  const buildPageUrl = (page: number, overrides?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (search) p.set("search", search);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (countryFilter !== "all") p.set("country", countryFilter);
    if (claimFilter !== "all") p.set("claim", claimFilter);
    if (profileFilter !== "all") p.set("profile", profileFilter);
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
          {([
            { value: "all", label: "All" },
            { value: "unclaimed", label: "Unclaimed" },
            { value: "verified", label: "Verified" },
            { value: "pending", label: "Pending" },
          ] as const).map((c) => (
            <Button
              key={c.value}
              variant={claimFilter === c.value ? "default" : "outline"}
              size="sm"
              asChild
              className="rounded-full text-xs h-8"
            >
              <Link href={buildPageUrl(1, { claim: c.value, page: "" })}>
                {c.label}
              </Link>
            </Button>
          ))}
        </div>

        {/* Profile Completeness Filter */}
        <div className="flex items-center gap-1.5">
          {([
            { value: "all", label: "All %" },
            { value: "low", label: "< 40%" },
            { value: "medium", label: "40-79%" },
            { value: "high", label: "80%+" },
          ] as const).map((p) => (
            <Button
              key={p.value}
              variant={profileFilter === p.value ? "default" : "outline"}
              size="sm"
              asChild
              className="rounded-full text-xs h-8"
            >
              <Link href={buildPageUrl(1, { profile: p.value, page: "" })}>
                {p.label}
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
              <TableHead>Profile</TableHead>
              <TableHead>Outreach</TableHead>
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
                  {(() => {
                    const pct = calcCompleteness(center as unknown as Record<string, unknown>);
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${pct >= 80 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-500"}`}>{pct}%</span>
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    const stage = pipelineMap.get(center.id);
                    if (!stage) return <span className="text-xs text-muted-foreground">—</span>;
                    const stageStyles: Record<string, string> = {
                      new: "bg-gray-100 text-gray-600",
                      researching: "bg-blue-50 text-blue-600",
                      research_complete: "bg-blue-50 text-blue-600",
                      outreach_drafted: "bg-amber-50 text-amber-700",
                      outreach_sent: "bg-sky-50 text-sky-700",
                      followed_up: "bg-sky-50 text-sky-700",
                      responded: "bg-emerald-50 text-emerald-700",
                      negotiating: "bg-amber-50 text-amber-700",
                      terms_agreed: "bg-emerald-50 text-emerald-700",
                      agreement_drafted: "bg-violet-50 text-violet-700",
                      agreement_sent: "bg-violet-50 text-violet-700",
                      active: "bg-emerald-100 text-emerald-800",
                      declined: "bg-red-50 text-red-600",
                      stalled: "bg-gray-100 text-gray-500",
                    };
                    const label = stage.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                    return (
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${stageStyles[stage] || "bg-gray-100 text-gray-600"}`}>
                        {label}
                      </span>
                    );
                  })()}
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
