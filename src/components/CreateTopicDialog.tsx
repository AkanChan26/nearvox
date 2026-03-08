import { useState, useRef } from "react";
import { X, Paperclip, File as FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TOPIC_CATEGORIES } from "@/lib/categories";

interface Props {
  onClose: () => void;
  defaultCategory?: string;
}

export function CreateTopicDialog({ onClose, defaultCategory }: Props) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState(defaultCategory || "discussions");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) return;
    setLoading(true);

    // Upload attachments
    const attachments: string[] = [];
    for (const file of files) {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("post-attachments")
        .upload(path, file);
      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from("post-attachments")
          .getPublicUrl(path);
        attachments.push(urlData.publicUrl);
      }
    }

    // Create topic — attachments stored in content as links for now
    const fullContent = attachments.length > 0
      ? `${content.trim()}\n\n---\nAttachments: ${attachments.map((u, i) => `[File ${i + 1}](${u})`).join(", ")}`
      : content.trim();

    const { error } = await supabase.from("topics").insert({
      title: title.trim(),
      content: fullContent,
      location: location.trim() || null,
      user_id: user.id,
      is_announcement: isAdmin && isAnnouncement,
      is_pinned: isAdmin && isAnnouncement,
      category: category as any,
    });

    if (error) {
      toast.error("Failed to create topic");
    } else {
      toast.success("Topic created");
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
      queryClient.invalidateQueries({ queryKey: ["user-recent-topics"] });
      queryClient.invalidateQueries({ queryKey: ["trending-topics"] });
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 overflow-y-auto p-4">
      <div className="w-full max-w-lg border border-border bg-card p-4 my-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground tracking-[0.3em]">NEW TOPIC</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Category selector */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">&gt; CATEGORY:</p>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {TOPIC_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`text-left px-2 py-1.5 text-[10px] border transition-none flex items-center gap-1.5 ${
                      isSelected
                        ? "border-foreground bg-foreground/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-[9px] font-mono">[{cat.cmd}]</span>
                    <Icon className="h-2.5 w-2.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground mb-1">&gt; TITLE:</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground"
              required
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">&gt; DESCRIPTION:</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground resize-none"
              required
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">&gt; LOCATION (optional):</p>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mumbai, Pune..."
              className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Attachment */}
          <div>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} accept="image/*,.pdf,.doc,.docx,.txt" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-1.5 transition-none"
            >
              <Paperclip className="h-3 w-3" />
              ATTACH FILES
            </button>
            {files.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-foreground/70">
                    <FileIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive ml-auto">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                className="accent-[hsl(var(--admin))]"
              />
              POST AS SYSTEM ANNOUNCEMENT
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm text-foreground border border-foreground px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50"
          >
            {loading ? "[POSTING...]" : "[CREATE TOPIC]"}
          </button>
        </form>
      </div>
    </div>
  );
}
