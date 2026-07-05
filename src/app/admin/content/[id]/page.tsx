"use client";

import { useEffect, useState, isValidElement, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowLeft, Eye, Trash2, ExternalLink, CheckCircle, X, Plus, MessageSquare, RotateCcw, ChevronDown, ChevronUp, Pencil, Files } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const SUGGESTED_TAGS = [
  "Addiction", "Substance Use", "Treatment", "Rehabilitation",
  "Mental Health", "Wellness", "Recovery", "Sobriety",
  "Guides", "Resources", "International", "Medical Tourism",
  "Family Support", "Relationships", "Relapse Prevention",
  "Detox", "Therapy", "Insurance", "Dual Diagnosis",
];

// Featured image marker: `![featured](url)` or `![featured](url "Alt text")` —
// same convention as the blog renderer (src/app/blog/[slug]/page.tsx).
function extractFeaturedImage(content: string): { url: string; alt: string | null } | null {
  const match = content.match(/!\[featured\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/);
  if (!match) return null;
  return { url: match[1], alt: match[2] || null };
}

function stripFeaturedImage(content: string): string {
  return content.replace(/!\[featured\]\([^\s)]+(?:\s+"[^"]*")?\)\n?\n?/, "");
}

// Flatten a React children tree to plain text so we can detect {{IMAGE_N}}
// placeholder paragraphs in the preview.
function flattenChildren(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenChildren).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenChildren(node.props.children);
  }
  return "";
}

// Simplified subset of the blog renderer's markdown components — enough for an
// admin to judge structure, headings, links, and images at a glance.
const previewMdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground leading-snug mt-0 mb-6 pb-4 border-b border-[#e0e4e6]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground leading-snug mt-10 mb-4 pl-4 border-l-4 border-[#45636b]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-serif text-lg md:text-xl font-semibold text-[#45636b] leading-snug mt-8 mb-3">
      {children}
    </h3>
  ),
  p: ({ children }) => {
    const text = flattenChildren(children).trim();
    const placeholder = text.match(/^\{\{IMAGE_(\d+)\}\}$/);
    if (placeholder) {
      return (
        <div className="my-6 rounded-xl border-2 border-dashed border-[#c5ced2] bg-surface-container-low/50 py-8 text-center text-xs text-muted-foreground">
          Inline image slot {placeholder[1]}
        </div>
      );
    }
    return (
      <p className="text-sm md:text-base text-[#5a6a70] leading-relaxed mb-4">
        {children}
      </p>
    );
  },
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-2 mb-5 text-sm md:text-base text-[#5a6a70]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-2 mb-5 text-sm md:text-base text-[#5a6a70]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-[#45636b] font-medium hover:underline underline-offset-4">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#45636b] bg-[#45636b]/5 rounded-r-xl py-3 px-5 my-6 not-italic text-foreground font-normal">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-[#e0e4e6] my-10" />,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ""} loading="lazy" decoding="async" className="rounded-xl shadow-md my-6 w-full" />
  ),
};


export default function AdminContentEditPage() {
  const params = useParams();
  const router = useRouter();
  const [page, setPage] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [requestingRewrite, setRequestingRewrite] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");


  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pages")
        .select("*")
        .eq("id", params.id)
        .single();
      setPage(data as Record<string, unknown> | null);
      setLoading(false);
    }
    load();
  }, [params.id]);

  function update(key: string, value: unknown) {
    setPage((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!page) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("pages")
      .update({
        title: page.title,
        slug: page.slug,
        content: page.content,
        page_type: page.page_type,
        status: page.status,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        tags: page.tags || [],
        published_at: page.status === "published" && !page.published_at
          ? new Date().toISOString()
          : page.published_at,
      })
      .eq("id", params.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Saved");
      router.refresh();
    }
    setSaving(false);
  }

  async function handlePublish() {
    if (!page) return;
    update("status", "published");
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("pages")
      .update({
        status: "published",
        published_at: page.published_at || new Date().toISOString(),
      })
      .eq("id", params.id);

    if (error) {
      toast.error("Failed to publish");
    } else {
      toast.success("Published!");
      if (page.page_type === "blog" && page.slug) {
        fetch("/api/seo/indexnow-publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: page.slug }),
        }).catch(() => {});
      }
      router.refresh();
    }
    setSaving(false);
  }

  async function handleApprove() {
    if (!page) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("pages")
      .update({ status: "approved" })
      .eq("id", params.id);

    if (error) {
      toast.error("Failed to approve");
    } else {
      update("status", "approved");
      toast.success("Added to publishing pool! The scheduler will publish it at the optimal time.");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this content?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("pages").delete().eq("id", params.id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted");
      router.push("/admin/content");
    }
  }

  async function handleRequestRewrite() {
    if (!page || !feedbackText.trim()) {
      toast.error("Please write feedback before requesting a rewrite.");
      return;
    }
    setRequestingRewrite(true);

    const timestamp = new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const feedbackBlock = `> **Admin Feedback (${timestamp}):** ${feedbackText.trim()}\n\n`;
    const currentContent = (page.content as string) || "";
    // Prepend feedback to content so the content creator agent or editor can see it
    const updatedContent = feedbackBlock + currentContent.replace(/^(> \*\*Admin Feedback.*?\n\n)+/, "");

    const supabase = createClient();
    const { error } = await supabase
      .from("pages")
      .update({
        status: "draft",
        content: updatedContent,
      })
      .eq("id", params.id);

    if (error) {
      toast.error("Failed to request rewrite: " + error.message);
    } else {
      update("status", "draft");
      update("content", updatedContent);
      setFeedbackText("");
      setFeedbackOpen(false);
      toast.success("Rewrite requested — article set back to draft with feedback.");
      router.refresh();
    }
    setRequestingRewrite(false);
  }

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;
  if (!page) return <div className="text-muted-foreground">Content not found</div>;

  const previewUrl = page.page_type === "blog"
    ? `/blog/${page.slug}`
    : `/pages/${page.slug}`;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/content"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-container transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-headline-lg font-semibold text-foreground">Edit Content</h1>
            <span className={`text-[10px] uppercase tracking-wider font-medium ${
              page.status === "published" ? "text-emerald-600" : "text-amber-600"
            }`}>
              {page.status as string}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {page.status === "published" && (
            <Button variant="outline" size="sm" className="rounded-full ghost-border border-0" asChild>
              <Link href={previewUrl} target="_blank">
                <ExternalLink className="mr-1 h-3 w-3" />
                View
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full ghost-border border-0"
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          {page.status === "draft" && (
            <Button
              onClick={handleApprove}
              disabled={saving}
              className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve (Schedule)
            </Button>
          )}
          {page.status !== "published" && (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={saving}
              className="rounded-full ghost-border border-0"
            >
              <Eye className="mr-2 h-4 w-4" />
              Publish Now
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input
                value={(page.title as string) || ""}
                onChange={(e) => update("title", e.target.value)}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Slug</Label>
              <Input
                value={(page.slug as string) || ""}
                onChange={(e) => update("slug", e.target.value)}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={(page.page_type as string) || "blog"} onValueChange={(v) => update("page_type", v)}>
                <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Article</SelectItem>
                  <SelectItem value="static">Static Page</SelectItem>
                  <SelectItem value="legal">Legal Page</SelectItem>
                  <SelectItem value="faq">FAQ Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={(page.status as string) || "draft"} onValueChange={(v) => update("status", v)}>
                <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved (in pool)</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Dedup verdict (populated by the content-dedup agent, migration 026) */}
        {typeof page.dedup_status === "string" &&
          page.dedup_status !== "pending" &&
          Boolean(page.dedup_reasoning || page.dedup_closest_slug) && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-3">
            <div className="flex items-center gap-2">
              <Files className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Duplicate Check</h2>
              <span
                className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                  page.dedup_status === "flagged"
                    ? "bg-amber-100 text-amber-800"
                    : page.dedup_status === "overridden"
                      ? "bg-surface-container text-muted-foreground"
                      : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {page.dedup_status === "flagged"
                  ? "Possible duplicate"
                  : page.dedup_status === "overridden"
                    ? "Override"
                    : "Unique"}
              </span>
            </div>
            {typeof page.dedup_closest_slug === "string" && page.dedup_closest_slug && (
              <p className="text-xs text-muted-foreground">
                Closest article:{" "}
                <Link
                  href={`/blog/${page.dedup_closest_slug}`}
                  target="_blank"
                  className="text-primary hover:underline font-medium"
                >
                  /blog/{page.dedup_closest_slug}
                </Link>
              </p>
            )}
            {typeof page.dedup_reasoning === "string" && page.dedup_reasoning && (
              <p className="text-xs text-foreground leading-relaxed bg-surface-container-low rounded-xl px-4 py-3">
                {page.dedup_reasoning}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {page.dedup_checked_at
                ? `Checked ${new Date(page.dedup_checked_at as string).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}`
                : "Check time unknown"}
              {typeof page.dedup_retry_count === "number" && page.dedup_retry_count > 0
                ? ` · ${page.dedup_retry_count} rewrite ${page.dedup_retry_count === 1 ? "retry" : "retries"}`
                : ""}
            </p>
          </div>
        )}

        {/* Content Editor */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground block">Content</Label>
            <div className="flex items-center gap-0.5 rounded-full bg-surface-container-low p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 transition-colors duration-200 ${
                  viewMode === "edit"
                    ? "bg-surface-container-lowest text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 transition-colors duration-200 ${
                  viewMode === "preview"
                    ? "bg-surface-container-lowest text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>
          </div>
          {viewMode === "edit" ? (
            <MarkdownEditor
              value={(page.content as string) || ""}
              onChange={(v) => update("content", v)}
              uploadFolder="content"
              placeholder="Start writing your article here...

Use the toolbar to format text. Click the Upload button or paste/drag images directly into the editor."
              minHeight="450px"
            />
          ) : (
            (() => {
              const raw = (page.content as string) || "";
              const featured = extractFeaturedImage(raw);
              const body = stripFeaturedImage(raw);
              return (
                <div className="rounded-xl bg-surface-container-low/40 px-5 py-6 md:px-8 md:py-8">
                  {featured && (
                    <div className="relative w-full aspect-[2/1] max-h-[320px] rounded-2xl overflow-hidden mb-8">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featured.url}
                        alt={featured.alt || (page.title as string) || "Featured image"}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                      />
                    </div>
                  )}
                  {body.trim() ? (
                    <article>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={previewMdComponents}>
                        {body}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">Nothing to preview yet.</p>
                  )}
                </div>
              );
            })()
          )}
        </div>

        {/* Feedback / Request Rewrite */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <button
            onClick={() => setFeedbackOpen(!feedbackOpen)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-container-low/50 transition-colors duration-200"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Feedback / Request Rewrite</h2>
            </div>
            {feedbackOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {feedbackOpen && (
            <div className="px-6 pb-6 space-y-3">
              <p className="text-xs text-muted-foreground">
                Write feedback about what needs to change. Clicking &quot;Request Rewrite&quot; will set the article back to draft and prepend your feedback to the content.
              </p>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g. Make the introduction more engaging, add statistics about recovery rates, expand the section on holistic therapy..."
                className="bg-surface-container-low border-0 rounded-xl ghost-border"
                rows={3}
              />
              <Button
                onClick={handleRequestRewrite}
                disabled={requestingRewrite || !feedbackText.trim()}
                className="rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors duration-300"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {requestingRewrite ? "Requesting..." : "Request Rewrite"}
              </Button>
            </div>
          )}
        </div>

        {/* SEO */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">SEO</h2>
          <div>
            <Label className="text-xs text-muted-foreground">Meta Title</Label>
            <Input
              value={(page.meta_title as string) || ""}
              onChange={(e) => update("meta_title", e.target.value)}
              className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              maxLength={70}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Meta Description</Label>
            <Textarea
              value={(page.meta_description as string) || ""}
              onChange={(e) => update("meta_description", e.target.value)}
              className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              rows={2}
              maxLength={160}
            />
          </div>
        </div>

        {/* Tags */}
        {(page.page_type === "blog") && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {((page.tags as string[]) || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-3 py-1 bg-primary/10 text-primary"
                >
                  {tag}
                  <button
                    onClick={() => update("tags", ((page.tags as string[]) || []).filter((t) => t !== tag))}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                className="bg-surface-container-low border-0 rounded-xl ghost-border max-w-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTag.trim()) {
                    e.preventDefault();
                    const tags = (page.tags as string[]) || [];
                    if (!tags.includes(newTag.trim())) {
                      update("tags", [...tags, newTag.trim()]);
                    }
                    setNewTag("");
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="rounded-full ghost-border border-0"
                onClick={() => {
                  if (newTag.trim()) {
                    const tags = (page.tags as string[]) || [];
                    if (!tags.includes(newTag.trim())) {
                      update("tags", [...tags, newTag.trim()]);
                    }
                    setNewTag("");
                  }
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Suggested tags:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.filter((t) => !((page.tags as string[]) || []).includes(t)).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => update("tags", [...((page.tags as string[]) || []), tag])}
                    className="text-[10px] font-medium rounded-full px-2.5 py-1 bg-surface-container-low text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <Button
            variant="outline"
            className="rounded-full text-destructive hover:bg-destructive/5 ghost-border border-0"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Content
          </Button>
        </div>
      </div>
    </div>
  );
}
