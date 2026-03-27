import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Eye, FileText, BookOpen, Clock, CheckCircle, Layers } from "lucide-react";

export default async function AdminContentPage() {
  const supabase = await createClient();

  const { data: pages } = await supabase
    .from("pages")
    .select("*, author_center:centers(name)")
    .order("updated_at", { ascending: false });

  const blogs = (pages || []).filter((p) => p.page_type === "blog");
  const staticPages = (pages || []).filter((p) => p.page_type !== "blog");

  const drafts = blogs.filter((p) => p.status === "draft");
  const approved = blogs.filter((p) => p.status === "approved");
  const published = blogs.filter((p) => p.status === "published");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg font-semibold text-foreground">Content Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage articles, resources, and static pages
          </p>
        </div>
        <Button className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
          <Link href="/admin/content/new">
            <Plus className="mr-2 h-4 w-4" />
            New Content
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-foreground">{blogs.length}</p>
          <p className="text-xs text-muted-foreground">Total Articles</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-amber-700">{drafts.length}</p>
          <p className="text-xs text-muted-foreground">Drafts</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-blue-700">{approved.length}</p>
          <p className="text-xs text-muted-foreground">In Pool</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-ambient text-center">
          <p className="text-2xl font-semibold text-emerald-700">{published.length}</p>
          <p className="text-xs text-muted-foreground">Published</p>
        </div>
      </div>

      {/* Publishing Pool — Approved articles waiting to be published */}
      {approved.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Publishing Pool ({approved.length})
            </h2>
            <span className="text-[10px] text-muted-foreground ml-2">
              ~{approved.length} day{approved.length !== 1 ? "s" : ""} of content &middot; Scheduler publishes 1/day
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-6 py-3 font-medium w-8">#</th>
                  <th className="text-left px-6 py-3 font-medium">Title</th>
                  <th className="text-left px-6 py-3 font-medium">Tags</th>
                  <th className="text-left px-6 py-3 font-medium">Author</th>
                  <th className="text-left px-6 py-3 font-medium">Est. Publish</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((page, i) => {
                  const centerAuthor = page.author_center as { name: string } | null;
                  const tags = (page.tags as string[]) || [];
                  // Estimate publish date: today + (i+1) days, skip weekends
                  const estDate = getEstimatedPublishDate(i);
                  return (
                    <tr key={page.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200">
                      <td className="px-6 py-4 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground">{page.title}</p>
                        <p className="text-[10px] text-muted-foreground">/blog/{page.slug}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {page.author_type === "partner" && centerAuthor ? (
                          <span className="text-xs text-emerald-700">{centerAuthor.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Rehab-Atlas</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-blue-700">
                          <Clock className="h-3 w-3" />
                          {estDate}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/content/${page.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drafts — Need review & approval */}
      {drafts.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Drafts — Awaiting Approval ({drafts.length})
            </h2>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-6 py-3 font-medium">Title</th>
                  <th className="text-left px-6 py-3 font-medium">Tags</th>
                  <th className="text-left px-6 py-3 font-medium">Author</th>
                  <th className="text-left px-6 py-3 font-medium">Created</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((page) => {
                  const centerAuthor = page.author_center as { name: string } | null;
                  const tags = (page.tags as string[]) || [];
                  return (
                    <tr key={page.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground">{page.title}</p>
                        <p className="text-[10px] text-muted-foreground">/blog/{page.slug}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {page.author_type === "partner" && centerAuthor ? (
                          <span className="text-xs text-emerald-700">{centerAuthor.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Rehab-Atlas</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {page.created_at
                          ? new Date(page.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/content/${page.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Pencil className="h-3 w-3" />
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Published Articles */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Published ({published.length})
          </h2>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-6 py-3 font-medium">Title</th>
                <th className="text-left px-6 py-3 font-medium">Tags</th>
                <th className="text-left px-6 py-3 font-medium">Author</th>
                <th className="text-left px-6 py-3 font-medium">Published</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {published.map((page) => {
                const centerAuthor = page.author_center as { name: string } | null;
                const tags = (page.tags as string[]) || [];
                return (
                  <tr key={page.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{page.title}</p>
                      <p className="text-[10px] text-muted-foreground">/blog/{page.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {page.author_type === "partner" && centerAuthor ? (
                        <span className="text-xs text-emerald-700">{centerAuthor.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Rehab-Atlas</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {page.published_at
                        ? new Date(page.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-1">
                      <Link
                        href={`/admin/content/${page.id}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-300"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/blog/${page.slug}`}
                        target="_blank"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {published.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No published articles yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Static Pages Section */}
      {staticPages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Static &amp; Legal Pages ({staticPages.length})
            </h2>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-6 py-3 font-medium">Title</th>
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staticPages.map((page) => (
                  <tr key={page.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{page.title}</p>
                      <p className="text-[10px] text-muted-foreground">/pages/{page.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground capitalize">{page.page_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${page.status === "published" ? "text-emerald-600" : "text-amber-600"}`}>
                        {page.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/content/${page.id}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-300"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Estimate the publish date for an article in the pool.
 * The scheduler publishes 1 article per day, so position in queue = days from now.
 */
function getEstimatedPublishDate(position: number): string {
  const date = new Date();
  let daysAdded = 0;
  while (daysAdded <= position) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    // Scheduler runs daily including weekends, but skip if you want weekday-only
    daysAdded++;
  }
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
