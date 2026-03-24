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
import { Save, ArrowLeft, Eye, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";


export default function AdminContentEditPage() {
  const params = useParams();
  const router = useRouter();
  const [page, setPage] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


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
          {page.status !== "published" && (
            <Button
              onClick={handlePublish}
              disabled={saving}
              className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
            >
              <Eye className="mr-2 h-4 w-4" />
              Publish
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
