"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { ImageUpload } from "@/components/admin/image-upload";
import { toast } from "sonner";
import {
  Send, ArrowLeft, BookOpen, CheckCircle, Clock,
  Pencil, Eye, EyeOff, Trash2, Save,
} from "lucide-react";
import Link from "next/link";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 100);
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  meta_description: string | null;
  created_at: string;
  published_at: string | null;
}

export default function PartnerBlogPage() {
  const [centerId, setCenterId] = useState("");
  const [centerName, setCenterName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Editor state
  const [mode, setMode] = useState<"list" | "new" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/partner-blog/list");
      if (!res.ok) return;
      const data = await res.json();
      setCenterId(data.center_id || "");
      setCenterName(data.center_name || "");
      setAuthorName(data.author_name || "");
      setPosts(data.articles || []);
    } catch {
      // silent
    }
    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setContent("");
    setMetaDesc("");
    setFeaturedImage("");
    setEditingId(null);
    setMode("list");
  }

  function startEdit(post: BlogPost) {
    setEditingId(post.id);
    setTitle(post.title);
    setMetaDesc(post.meta_description || "");

    // Extract featured image from content if embedded
    const imgMatch = post.content.match(/^!\[featured\]\(([^)]+)\)\n\n/);
    if (imgMatch) {
      setFeaturedImage(imgMatch[1]);
      setContent(post.content.replace(/^!\[featured\]\([^)]+\)\n\n/, ""));
    } else {
      setFeaturedImage("");
      setContent(post.content);
    }

    setMode("edit");
  }

  async function handleSubmit(asDraft = false) {
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }
    setSubmitting(true);

    const fullContent = featuredImage ? `![featured](${featuredImage})\n\n${content}` : content;

    try {
      if (editingId) {
        // Update existing via API
        const res = await fetch("/api/partner-blog/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            title,
            slug: slugify(title),
            content: fullContent,
            meta_description: metaDesc || null,
            status: "draft",
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update");
        }
        toast.success(asDraft ? "Draft saved" : "Changes submitted for review");
      } else {
        // Create new via API
        const res = await fetch("/api/partner-blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            slug: slugify(title),
            content: fullContent,
            meta_description: metaDesc,
            center_id: centerId,
            center_name: centerName,
            author_name: authorName,
            is_draft: asDraft,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to submit");
        }
        toast.success(asDraft ? "Draft saved" : "Article submitted for review");
      }

      resetForm();
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSubmitting(false);
  }

  async function unpublishArticle(post: BlogPost) {
    const res = await fetch("/api/partner-blog/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, status: "draft" }),
    });
    if (res.ok) {
      toast.success("Article unpublished");
      await loadData();
    } else {
      toast.error("Failed to unpublish");
    }
  }

  async function deletePost(post: BlogPost) {
    if (post.status === "published") {
      toast.error("Unpublish the article first before deleting.");
      return;
    }

    const res = await fetch(`/api/partner-blog/update?id=${post.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Draft deleted");
      await loadData();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to delete");
    }
  }

  if (loading) return <div className="animate-pulse h-64 bg-surface-container rounded-2xl" />;

  const publishedPosts = posts.filter((p) => p.status === "published");
  const draftPosts = posts.filter((p) => p.status !== "published");

  // ── Editor View (new or edit) ──
  if (mode === "new" || mode === "edit") {
    return (
      <div className="max-w-4xl">
        <button
          onClick={resetForm}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" /> Back to articles
        </button>

        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {mode === "edit" ? "Edit Article" : "New Article"}
            </h2>

            <div>
              <Label className="text-xs text-muted-foreground">Article Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Understanding CBT in Addiction Recovery"
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Summary (for SEO and previews)</Label>
              <Textarea
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                placeholder="Brief 1-2 sentence summary of the article..."
                rows={2}
                maxLength={160}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{metaDesc.length}/160 characters</p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Featured Image</Label>
              {featuredImage ? (
                <div className="mt-2 relative rounded-xl overflow-hidden aspect-video max-w-xs">
                  <img src={featuredImage} alt="Featured" className="w-full h-full object-cover" />
                  <button onClick={() => setFeaturedImage("")} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-destructive text-xs">&times;</button>
                </div>
              ) : (
                <ImageUpload onUpload={setFeaturedImage} folder={`partner/${centerId}`} className="mt-2 max-w-xs" />
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Content *</Label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              uploadFolder={`partner/${centerId}/blog`}
              placeholder="Start writing your article...

Use the toolbar to format text. Place your cursor where you want an image, then click Upload.
You can also paste or drag images directly into the editor.

Tips for approval:
• Write original, evidence-based content
• Include practical advice for readers
• Avoid promotional language about your center
• Aim for 500+ words"
              minHeight="450px"
            />
          </div>

          <div className="bg-primary/5 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Your article will be published as <strong>&ldquo;Written by {centerName}&rdquo;</strong> with a backlink to your center profile.
              Our editorial team reviews all submissions for accuracy and quality.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={submitting || !title}
              className="rounded-full ghost-border border-0"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitting || !title || !content}
              className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : mode === "edit" ? "Resubmit for Review" : "Submit for Review"}
            </Button>
            <Button variant="outline" onClick={resetForm} className="rounded-full ghost-border border-0">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg font-semibold text-foreground">My Articles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Write and manage your articles on Rehab-Atlas
          </p>
        </div>
        <Button
          onClick={() => setMode("new")}
          className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Write Article
        </Button>
      </div>

      {/* Published Articles */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden mb-6">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Published</h2>
          <span className="text-[10px] text-muted-foreground">{publishedPosts.length} articles</span>
        </div>
        {publishedPosts.length > 0 ? (
          <div className="divide-y divide-surface-container-low">
            {publishedPosts.map((post) => (
              <div key={post.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <Link href={`/blog/${post.slug}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">
                      {post.title}
                    </Link>
                    <p className="text-[10px] text-muted-foreground">
                      Published {post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/blog/${post.slug}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors" title="View">
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  <button onClick={() => startEdit(post)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => unpublishArticle(post)} className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors" title="Unpublish">
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No published articles yet.
          </div>
        )}
      </div>

      {/* Drafts & Pending */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Drafts & Pending Review</h2>
          <span className="text-[10px] text-muted-foreground">{draftPosts.length} items</span>
        </div>
        {draftPosts.length > 0 ? (
          <div className="divide-y divide-surface-container-low">
            {draftPosts.map((post) => (
              <div key={post.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      <span className="text-amber-600">Draft</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(post)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deletePost(post)} className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive/60 hover:text-destructive hover:bg-red-50 transition-colors" title="Delete draft">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No drafts. Click &ldquo;Write Article&rdquo; to get started.
          </div>
        )}
      </div>
    </div>
  );
}
