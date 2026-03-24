"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Save, ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { ImageUpload } from "@/components/admin/image-upload";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 100);
}

const CATEGORIES = [
  "Addiction & Recovery",
  "Treatment Methods",
  "Recovery Stories",
  "Mental Health",
  "Family Support",
  "Relapse Prevention",
  "Substance Guides",
  "Insurance & Costs",
  "News & Updates",
];

export default function AdminContentNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState({
    title: "",
    slug: "",
    content: "",
    page_type: "blog" as string,
    status: "draft" as string,
    meta_title: "",
    meta_description: "",
    featured_image: "",
    category: "",
  });

  function update(key: string, value: string) {
    setPage((prev) => ({ ...prev, [key]: value }));
    if (key === "title") {
      setPage((prev) => ({ ...prev, title: value, slug: slugify(value) }));
    }
  }

  async function handleSave(publish = false) {
    if (!page.title) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);

    const status = publish ? "published" : page.status;
    const published_at = publish ? new Date().toISOString() : null;

    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: page.title,
          slug: page.slug || slugify(page.title),
          content: page.content,
          page_type: page.page_type,
          status,
          meta_title: page.meta_title || page.title,
          meta_description: page.meta_description,
          published_at,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create content");
      toast.success(publish ? "Published!" : "Draft saved");
      router.push(`/admin/content/${data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create content");
      setSaving(false);
    }
  }

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
          <h1 className="text-headline-lg font-semibold text-foreground">New Content</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-full ghost-border border-0"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
          >
            <Eye className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Title *</Label>
              <Input
                value={page.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Understanding Alcohol Addiction: A Complete Guide"
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Slug (auto-generated)</Label>
              <Input
                value={page.slug}
                onChange={(e) => update("slug", e.target.value)}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Content Type</Label>
              <Select value={page.page_type} onValueChange={(v) => update("page_type", v)}>
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
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={page.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <Label className="text-xs text-muted-foreground mb-2 block">Content</Label>
          <MarkdownEditor
            value={page.content}
            onChange={(v) => update("content", v)}
            uploadFolder="content"
            placeholder="Start writing your article here...

Use the toolbar to format text. Click the Upload button or paste/drag images directly into the editor."
            minHeight="450px"
          />
        </div>

        {/* SEO */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            SEO & Meta
          </h2>
          <div>
            <Label className="text-xs text-muted-foreground">Meta Title (for search engines)</Label>
            <Input
              value={page.meta_title}
              onChange={(e) => update("meta_title", e.target.value)}
              placeholder="Leave blank to use article title"
              className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              maxLength={70}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{page.meta_title.length}/70 characters</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Meta Description</Label>
            <Textarea
              value={page.meta_description}
              onChange={(e) => update("meta_description", e.target.value)}
              placeholder="Brief description for search results..."
              className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              rows={2}
              maxLength={160}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{page.meta_description.length}/160 characters</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Featured Image</Label>
            {page.featured_image ? (
              <div className="mt-2 relative rounded-xl overflow-hidden aspect-video max-w-sm">
                <img src={page.featured_image} alt="Featured" className="w-full h-full object-cover" />
                <button
                  onClick={() => update("featured_image", "")}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-destructive transition-colors text-xs"
                >
                  &times;
                </button>
              </div>
            ) : (
              <ImageUpload
                onUpload={(url) => update("featured_image", url)}
                folder="content"
                className="mt-2 max-w-sm"
              />
            )}
            <div className="mt-2">
              <Input
                value={page.featured_image}
                onChange={(e) => update("featured_image", e.target.value)}
                placeholder="Or paste image URL..."
                className="bg-surface-container-low border-0 rounded-xl ghost-border text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
