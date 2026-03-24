"use client";

import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Image as ImageIcon,
  Minus, Eye, Pencil, Columns2, Code, Upload, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** Folder path for image uploads (e.g., "partner/centerId" or "content") */
  uploadFolder?: string;
}

interface ToolbarAction {
  icon: typeof Bold;
  label: string;
  action: (text: string, selStart: number, selEnd: number) => { text: string; cursor: number };
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    icon: Heading1,
    label: "Heading 1",
    action: (text, start, end) => wrapLine(text, start, end, "# "),
  },
  {
    icon: Heading2,
    label: "Heading 2",
    action: (text, start, end) => wrapLine(text, start, end, "## "),
  },
  {
    icon: Heading3,
    label: "Heading 3",
    action: (text, start, end) => wrapLine(text, start, end, "### "),
  },
  { icon: Minus, label: "divider", action: () => ({ text: "", cursor: 0 }) },
  {
    icon: Bold,
    label: "Bold",
    action: (text, start, end) => wrapSelection(text, start, end, "**", "**"),
  },
  {
    icon: Italic,
    label: "Italic",
    action: (text, start, end) => wrapSelection(text, start, end, "*", "*"),
  },
  {
    icon: Code,
    label: "Code",
    action: (text, start, end) => wrapSelection(text, start, end, "`", "`"),
  },
  { icon: Minus, label: "divider", action: () => ({ text: "", cursor: 0 }) },
  {
    icon: List,
    label: "Bullet List",
    action: (text, start, end) => wrapLine(text, start, end, "- "),
  },
  {
    icon: ListOrdered,
    label: "Numbered List",
    action: (text, start, end) => wrapLine(text, start, end, "1. "),
  },
  {
    icon: Quote,
    label: "Blockquote",
    action: (text, start, end) => wrapLine(text, start, end, "> "),
  },
  { icon: Minus, label: "divider", action: () => ({ text: "", cursor: 0 }) },
  {
    icon: Link2,
    label: "Link",
    action: (text, start, end) => {
      const selected = text.slice(start, end) || "link text";
      const before = text.slice(0, start);
      const after = text.slice(end);
      const insert = `[${selected}](url)`;
      return { text: before + insert + after, cursor: start + selected.length + 3 };
    },
  },
  {
    icon: ImageIcon,
    label: "Image",
    action: (text, start, end) => {
      const before = text.slice(0, start);
      const after = text.slice(end);
      const insert = `![alt text](image-url)`;
      return { text: before + insert + after, cursor: start + 2 };
    },
  },
  {
    icon: Minus,
    label: "Horizontal Rule",
    action: (text, start) => {
      const before = text.slice(0, start);
      const after = text.slice(start);
      const needsNewline = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
      const insert = `${needsNewline}\n---\n\n`;
      return { text: before + insert + after, cursor: start + insert.length };
    },
  },
];

function wrapSelection(text: string, start: number, end: number, prefix: string, suffix: string) {
  const selected = text.slice(start, end) || "text";
  const before = text.slice(0, start);
  const after = text.slice(end);
  const wrapped = `${prefix}${selected}${suffix}`;
  return { text: before + wrapped + after, cursor: start + prefix.length + selected.length };
}

function wrapLine(text: string, start: number, _end: number, prefix: string) {
  // Find the start of the current line
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const before = text.slice(0, lineStart);
  const lineContent = text.slice(lineStart);

  // If line already has this prefix, remove it (toggle)
  if (lineContent.startsWith(prefix)) {
    const after = lineContent.slice(prefix.length);
    return { text: before + after, cursor: start - prefix.length };
  }

  // Remove other heading prefixes if adding a heading
  let cleaned = lineContent;
  if (prefix.startsWith("#")) {
    cleaned = lineContent.replace(/^#{1,6}\s/, "");
  }

  const needsNewline = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
  return {
    text: before + needsNewline + prefix + cleaned,
    cursor: lineStart + needsNewline.length + prefix.length + 1,
  };
}

export function MarkdownEditor({ value, onChange, placeholder, minHeight = "400px", uploadFolder = "content" }: MarkdownEditorProps) {
  const [view, setView] = useState<"edit" | "preview" | "split">("split");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Save cursor position so we can insert images at the right place
  // (clicking toolbar buttons steals focus from textarea)
  const cursorPosRef = useRef<number>(0);

  // Track cursor position on every selection change
  const saveCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      cursorPosRef.current = textarea.selectionStart;
    }
  }, []);

  // Handle image file upload and insert into content at cursor
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return; // 10MB max

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${uploadFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("center-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error || !data) {
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("center-photos").getPublicUrl(data.path);
      const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const markdown = `\n![${altText}](${urlData.publicUrl})\n`;

      // Insert at saved cursor position (not current, since textarea lost focus)
      const pos = cursorPosRef.current;
      const newText = value.slice(0, pos) + markdown + value.slice(pos);
      onChange(newText);

      // Move cursor after inserted image
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          const newPos = pos + markdown.length;
          textarea.focus();
          textarea.setSelectionRange(newPos, newPos);
          cursorPosRef.current = newPos;
        }
      });
    } catch {
      // silent fail
    }
    setUploading(false);
  }, [value, onChange, uploadFolder]);

  // Handle paste with images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageUpload(file);
        return;
      }
    }
  }, [handleImageUpload]);

  // Handle drag & drop images onto editor
  const handleDrop = useCallback((e: React.DragEvent) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      e.preventDefault();
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleAction = useCallback(
    (action: ToolbarAction["action"]) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const result = action(value, start, end);

      onChange(result.text);

      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.cursor, result.cursor);
      });
    },
    [value, onChange]
  );

  // Handle Tab key for indentation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = value.slice(0, start) + "  " + value.slice(end);
        onChange(newText);
        requestAnimationFrame(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        });
      }
    },
    [value, onChange]
  );

  return (
    <div className="rounded-2xl overflow-hidden ghost-border bg-surface-container-lowest">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 bg-surface-container-low border-b border-surface-container flex-wrap">
        {TOOLBAR_ACTIONS.map((action, i) => {
          if (action.label === "divider") {
            return <div key={i} className="w-px h-5 bg-surface-container mx-1" />;
          }
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => handleAction(action.action)}
              title={action.label}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        {/* Image Upload Button */}
        <div className="w-px h-5 bg-surface-container mx-1" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload image"
          className="h-8 rounded-lg flex items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="text-[10px] hidden sm:inline">{uploading ? "Uploading..." : "Image"}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
          className="hidden"
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggles */}
        <div className="flex items-center gap-0.5 bg-surface-container rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setView("edit")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors duration-200 ${
              view === "edit" ? "bg-surface-container-lowest text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pencil className="h-3 w-3" /> Write
          </button>
          <button
            type="button"
            onClick={() => setView("split")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors duration-200 ${
              view === "split" ? "bg-surface-container-lowest text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns2 className="h-3 w-3" /> Split
          </button>
          <button
            type="button"
            onClick={() => setView("preview")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors duration-200 ${
              view === "preview" ? "bg-surface-container-lowest text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className={`${view === "split" ? "grid grid-cols-2 divide-x divide-surface-container" : ""}`} style={{ minHeight }}>
        {/* Textarea */}
        {(view === "edit" || view === "split") && (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => { onChange(e.target.value); saveCursorPosition(); }}
              onKeyDown={handleKeyDown}
              onKeyUp={saveCursorPosition}
              onClick={saveCursorPosition}
              onSelect={saveCursorPosition}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              placeholder={placeholder || "Start writing your article...\n\nUse the toolbar above to format text, or write in Markdown.\nYou can also paste or drag images directly into the editor."}
              className="w-full h-full resize-none bg-transparent text-sm text-foreground p-4 outline-none font-mono leading-relaxed"
              style={{ minHeight }}
            />
          </div>
        )}

        {/* Preview */}
        {(view === "preview" || view === "split") && (
          <div className="overflow-y-auto p-6" style={{ minHeight }}>
            {value ? (
              <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-semibold font-serif text-foreground mt-6 mb-3">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold font-serif text-foreground mt-5 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold font-serif text-foreground mt-4 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-3">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-3">{children}</ol>,
                    li: ({ children }) => <li className="text-sm text-muted-foreground">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/30 pl-4 py-1 my-3 text-muted-foreground italic">{children}</blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">{children}</a>
                    ),
                    img: ({ src, alt }) => (
                      <img src={src} alt={alt || ""} className="rounded-xl max-w-full my-4" />
                    ),
                    hr: () => <hr className="my-6 border-surface-container" />,
                    code: ({ children }) => (
                      <code className="bg-surface-container-low px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                    ),
                  }}
                >
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Preview will appear here as you type...</p>
            )}
          </div>
        )}
      </div>

      {/* Word count */}
      <div className="px-4 py-2 bg-surface-container-low border-t border-surface-container flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          {value.split(/\s+/).filter(Boolean).length} words · {value.length} characters
        </p>
        <p className="text-[10px] text-muted-foreground">
          Place cursor where you want an image, then click Upload · Markdown supported
        </p>
      </div>
    </div>
  );
}
