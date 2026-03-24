"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Image, Upload } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export default function PartnerPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [centerId, setCenterId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [newAlt, setNewAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", user.id)
        .single();
      if (!profile?.center_id) return;
      setCenterId(profile.center_id);

      const { data } = await supabase
        .from("center_photos")
        .select("*")
        .eq("center_id", profile.center_id)
        .order("sort_order");
      setPhotos((data || []) as Photo[]);
      setLoading(false);
    }
    load();
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile || !centerId || !userId) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("center_id", centerId);
      formData.append("alt_text", newAlt || "");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await res.json();

      // Submit as edit request instead of direct insert (partner flow)
      const supabase = createClient();
      const { error } = await supabase.from("center_edit_requests").insert({
        center_id: centerId,
        submitted_by: userId,
        changes: { add_photo: { url, alt_text: newAlt || null } },
      });

      if (error) {
        toast.error("Failed to submit: " + error.message);
      } else {
        toast.success("Photo submitted for review");
        setSelectedFile(null);
        setPreviewUrl(null);
        setNewAlt("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }

    setUploading(false);
  }

  async function handleRequestRemove(photoId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("center_edit_requests").insert({
      center_id: centerId,
      submitted_by: userId,
      changes: { remove_photo: photoId },
    });
    if (error) {
      toast.error("Failed to submit removal request");
    } else {
      toast.success("Photo removal submitted for review");
    }
  }

  if (loading) return <div className="animate-pulse h-64 bg-surface-container rounded-2xl" />;

  return (
    <div className="max-w-3xl">
      <h1 className="text-headline-lg font-semibold text-foreground mb-2">Photos</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Manage your facility photos. All changes require admin approval.
      </p>

      {/* Current Photos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-surface-container">
            <img src={photo.url} alt={photo.alt_text || "Facility photo"} className="w-full h-full object-cover" />
            {photo.is_primary && (
              <span className="absolute top-2 left-2 text-[9px] uppercase tracking-wider bg-primary text-white rounded-full px-2 py-0.5">
                Primary
              </span>
            )}
            <button
              onClick={() => handleRequestRemove(photo.id)}
              className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-12 text-muted-foreground">
            <Image className="h-10 w-10 mb-3" />
            <p className="text-sm">No photos yet</p>
          </div>
        )}
      </div>

      {/* Upload New Photo */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Upload New Photo
        </h2>
        <div className="space-y-4">
          {/* File upload area */}
          <div>
            <Label className="text-xs text-muted-foreground">Photo File</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200 py-8 ${
                selectedFile
                  ? "border-primary/40 bg-primary/5"
                  : "border-surface-container-high hover:border-primary/30 hover:bg-surface-container-low"
              }`}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {selectedFile ? selectedFile.name : "Click to select a photo"}
              </p>
              <p className="text-xs text-muted-foreground/60">JPG, PNG, WebP up to 10MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="rounded-xl overflow-hidden aspect-video bg-surface-container max-w-xs">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Alt text */}
          <div>
            <Label className="text-xs text-muted-foreground">Alt Text (optional)</Label>
            <Input
              value={newAlt}
              onChange={(e) => setNewAlt(e.target.value)}
              placeholder="Describe the photo..."
              className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Submit Photo for Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
