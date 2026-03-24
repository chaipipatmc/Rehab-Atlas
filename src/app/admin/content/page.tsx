import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Eye, FileText, BookOpen } from "lucide-react";

export default async function AdminContentPage() {
  const supabase = await createClient();

  const { data: pages } = await supabase
    .from("pages")
    .select("*, author_center:centers(name)")
    .order("updated_at", { ascending: false });

  const blogs = (pages || []).filter((p) => p.page_type === "blog");
  const staticPages = (pages || []).filter((p) => p.page_type !== "blog");

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

      {/* Blog / Articles Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Articles ({blogs.length})
          </h2>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-6 py-3 font-medium">Title</th>
                <th className="text-left px-6 py-3 font-medium">Author</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Published</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((page) => {
                const centerAuthor = page.author_center as { name: string } | null;
                return (
                <tr key={page.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">{page.title}</p>
                    <p className="text-[10px] text-muted-foreground">/blog/{page.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    {page.author_type === "partner" && centerAuthor ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                        {centerAuthor.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Rehab-Atlas</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      page.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {page.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {page.published_at
                      ? new Date(page.published_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-1">
                    <Link
                      href={`/admin/content/${page.id}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    {page.status === "published" && (
                      <Link
                        href={`/blog/${page.slug}`}
                        target="_blank"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </td>
                </tr>
              );
              })}
              {blogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No articles yet. Click &quot;New Content&quot; to create your first article.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Static Pages Section */}
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
              {staticPages.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No static pages yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
