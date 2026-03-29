"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2, Star, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  folder?: string;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

export function ImageUpload({
  onUpload,
  folder = "centers",
  maxSizeMB = 5,
  accept = "image/jpeg,image/png,image/webp",
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError("");

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error: uploadError } = await supabase.storage
      .from("center-photos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setError("Upload failed: " + uploadError.message);
      setUploading(false);
      setPreview(null);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("center-photos")
      .getPublicUrl(data.path);

    setUploading(false);
    onUpload(urlData.publicUrl);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-surface-container-high bg-surface-container-low hover:border-primary/30 hover:bg-surface-container"
        } ${preview ? "p-2" : "p-8"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Upload preview"
              className="w-full aspect-video object-cover rounded-lg"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
            {!uploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreview(null);
                }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center mb-3">
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-foreground font-medium">
              Drop image here or click to browse
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              JPG, PNG, WebP up to {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}

interface MultiImageUploadProps {
  images: Array<{ url: string; alt_text?: string }>;
  onChange: (images: Array<{ url: string; alt_text?: string }>) => void;
  folder?: string;
  maxImages?: number;
}

export function MultiImageUpload({
  images,
  onChange,
  folder = "centers",
  maxImages = 10,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    const supabase = createClient();
    const newImages = [...images];

    for (const file of Array.from(files)) {
      if (newImages.length >= maxImages) break;
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) continue;

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("center-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from("center-photos")
          .getPublicUrl(data.path);
        newImages.push({ url: urlData.publicUrl, alt_text: file.name.replace(/\.[^/.]+$/, "") });
      }
    }

    onChange(newImages);
    setUploading(false);
  }

  function removeImage(index: number) {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  }

  function setPrimary(index: number) {
    if (index === 0) return;
    const updated = [...images];
    const [item] = updated.splice(index, 1);
    updated.unshift(item);
    onChange(updated);
  }

  function moveImage(index: number, direction: "left" | "right") {
    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    const updated = [...images];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  }

  return (
    <div>
      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {images.map((img, i) => (
          <div key={i} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-surface-container">
            <img src={img.url} alt={img.alt_text || ""} className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(i)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
            >
              <X className="h-3 w-3" />
            </button>
            <button
              onClick={() => setPrimary(i)}
              title={i === 0 ? "Primary photo" : "Set as primary"}
              className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                i === 0
                  ? "bg-primary text-white"
                  : "bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white"
              }`}
            >
              <Star className={`h-3 w-3 ${i === 0 ? "fill-current" : ""}`} />
            </button>
            {/* Move left/right buttons */}
            <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {i > 0 && (
                <button
                  onClick={() => moveImage(i, "left")}
                  className="w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  title="Move left"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
              )}
              {i < images.length - 1 && (
                <button
                  onClick={() => moveImage(i, "right")}
                  className="w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  title="Move right"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
            {i === 0 && (
              <span className="absolute bottom-2 left-2 text-[9px] uppercase tracking-wider bg-primary text-white rounded-full px-2 py-0.5">
                Primary
              </span>
            )}
          </div>
        ))}

        {/* Upload Button */}
        {images.length < maxImages && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-surface-container-high bg-surface-container-low hover:border-primary/30 hover:bg-surface-container transition-all duration-300 flex flex-col items-center justify-center gap-2"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      <p className="text-[10px] text-muted-foreground">
        {images.length}/{maxImages} photos. Click the star icon to set a photo as primary.
      </p>
    </div>
  );
}
