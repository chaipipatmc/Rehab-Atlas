import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Users, Building2, FileText, Search, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

/** Global admin search — backs the top-bar search box (previously decorative). */
export default async function AdminSearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = (q || "").trim();

  // Role guard (layout already guards, but this page also fires queries)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/admin");

  let leads: { id: string; name: string; email: string; status: string | null; created_at: string }[] = [];
  let centers: { id: string; name: string; slug: string; city: string | null; country: string | null; status: string | null }[] = [];
  let articles: { id: string; title: string; slug: string; status: string | null; page_type: string | null }[] = [];

  if (query.length >= 2) {
    const admin = createAdminClient();
    const like = `%${query}%`;
    const [leadsRes, centersRes, pagesRes] = await Promise.all([
      admin
        .from("leads")
        .select("id, name, email, status, created_at")
        .or(`name.ilike.${like},email.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(10),
      admin
        .from("centers")
        .select("id, name, slug, city, country, status")
        .ilike("name", like)
        .order("name")
        .limit(10),
      admin
        .from("pages")
        .select("id, title, slug, status, page_type")
        .ilike("title", like)
        .order("updated_at", { ascending: false })
        .limit(10),
    ]);
    leads = (leadsRes.data || []) as typeof leads;
    centers = (centersRes.data || []) as typeof centers;
    articles = (pagesRes.data || []) as typeof articles;
  }

  const total = leads.length + centers.length + articles.length;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-headline-lg font-semibold text-foreground">Search</h1>
        {query ? (
          <p className="text-sm text-muted-foreground mt-1">
            {total} result{total === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            Type at least 2 characters in the search bar above to search leads, centers, and content.
          </p>
        )}
      </div>

      {query && total === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-10 text-center shadow-ambient">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium">No matches found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Search covers lead names/emails, center names, and article titles.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {leads.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Leads</h2>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient divide-y divide-surface-container">
              {leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-container-low transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {lead.status && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{lead.status}</span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {centers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Centers</h2>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient divide-y divide-surface-container">
              {centers.map((center) => (
                <Link
                  key={center.id}
                  href={`/admin/centers/${center.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-container-low transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{center.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[center.city, center.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {center.status && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{center.status}</span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {articles.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Content</h2>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient divide-y divide-surface-container">
              {articles.map((page) => (
                <Link
                  key={page.id}
                  href={`/admin/content/${page.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-container-low transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{page.title}</p>
                    <p className="text-xs text-muted-foreground truncate">/{page.slug}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {page.status && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{page.status}</span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
