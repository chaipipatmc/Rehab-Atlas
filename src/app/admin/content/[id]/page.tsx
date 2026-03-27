"use client";

import { useEffect, useState } from "react";
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
import { Save, ArrowLeft, Eye, Trash2, ExternalLink, CheckCircle, X, Plus } from "lucide-react";
import Link from "next/link";

const SUGGESTED_TAGS = [
  "Addiction", "Substance Use", "Treatment", "Rehabilitation",
  "Mental Health", "Wellness", "Recovery", "Sobriety",
  "Guides", "Resources", "International", "Medical Tourism",
  "Family Support", "Relationships", "Relapse Prevention",
  "Detox", "Therapy", "Insurance", "Dual Diagnosis",
];


export default function AdminContentEditPage() {
  const params = useParams();
  const router = useRouter();
  const [page, setPage] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");


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

        {/* Content Editor */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <Label className="text-xs text-muted-foreground mb-2 block">Content</Label>
          <MarkdownEditor
            value={(page.content as string) || ""}
            onChange={(v) => update("content", v)}
            uploadFolder="content"
            placeholder="Start writing your article here...

Use the toolbar to format text. Click the Upload button or paste/drag images directly into the editor."
            minHeight="450px"
          />
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
