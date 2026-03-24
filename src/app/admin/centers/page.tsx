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

  let query = supabase
    .from("centers")
    .select("id, name, slug, city, country, status, verified_profile, trusted_partner, referral_eligible", { count: "exact" })
    .order("name");

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`);
  }

  const { data: centers, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  const buildPageUrl = (page: number) => {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (search) p.set("search", search);
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

      {/* Search */}
      <form action="/admin/centers" className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="Search centers by name, city, country..."
          className="pl-9 bg-surface-container-lowest border-0 rounded-xl ghost-border"
        />
      </form>

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
                  <div className="flex gap-1">
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
