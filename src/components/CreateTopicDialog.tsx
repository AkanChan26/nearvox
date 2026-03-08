import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

export function CreateTopicDialog({ onClose }: Props) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) return;
    setLoading(true);

    const { error } = await supabase.from("topics").insert({
      title: title.trim(),
      content: content.trim(),
      location: location.trim() || null,
      user_id: user.id,
      is_announcement: isAdmin && isAnnouncement,
      is_pinned: isAdmin && isAnnouncement,
    });

    if (error) {
      toast.error("Failed to create topic");
    } else {
      toast.success("Topic created");
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80">
      <div className="w-full max-w-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground tracking-[0.3em]">NEW TOPIC</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
            <p className="text-[10px] text-muted-foreground mb-1">&gt; MESSAGE:</p>
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
