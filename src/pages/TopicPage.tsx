import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, MessageSquare, Eye, Clock, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Increment view count
  useEffect(() => {
    if (id) {
      supabase.rpc("increment_topic_views" as any, { topic_id: id }).then(() => {});
    }
  }, [id]);

  const { data: topic } = useQuery({
    queryKey: ["topic", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("*")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: replies } = useQuery({
    queryKey: ["topic-replies", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("replies")
        .select("*")
        .eq("topic_id", id!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  // Get all user profiles for this topic
  const allUserIds = [
    ...(topic ? [topic.user_id] : []),
    ...(replies?.map((r) => r.user_id) || []),
  ];
  const uniqueUserIds = [...new Set(allUserIds)];

  const { data: profiles } = useQuery({
    queryKey: ["topic-profiles", uniqueUserIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, anonymous_name, is_admin, username")
        .in("user_id", uniqueUserIds);
      return data || [];
    },
    enabled: uniqueUserIds.length > 0,
  });

  const getName = (userId: string) => {
    const profile = profiles?.find((p) => p.user_id === userId);
    if (!profile) return "Unknown";
    if (profile.is_admin) return profile.username || "ADMIN";
    return profile.anonymous_name || "Anonymous";
  };

  const isAdmin = (userId: string) => {
    return profiles?.find((p) => p.user_id === userId)?.is_admin || false;
  };

  // Realtime replies
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`replies-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "replies", filter: `topic_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["topic-replies", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("replies").insert({
      topic_id: id!,
      user_id: user.id,
      content: replyContent.trim(),
    });

    if (error) {
      toast.error("Failed to post reply");
    } else {
      setReplyContent("");
      queryClient.invalidateQueries({ queryKey: ["topic-replies", id] });
      queryClient.invalidateQueries({ queryKey: ["topic", id] });
    }
    setSubmitting(false);
  };

  if (!topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xs text-muted-foreground cursor-blink">LOADING TOPIC</p>
      </div>
    );
  }

  const topicIsAdmin = isAdmin(topic.user_id);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 scanline z-50 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            BACK
          </button>
          <div className="h-3 w-px bg-border" />
          <p className="text-foreground text-sm glow-text tracking-widest">NEARVOX</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Topic */}
        <div className={`p-4 border mb-6 ${topic.is_announcement ? "admin-box border-[hsl(var(--admin-border))]" : "border-border"}`}>
          {topic.is_announcement && (
            <p className="text-[9px] admin-text tracking-[0.3em] mb-2">◆ SYSTEM ANNOUNCEMENT</p>
          )}
          <h1 className={`text-lg mb-2 ${topic.is_announcement ? "admin-text glow-admin" : "text-foreground glow-text"}`}>
            {topic.title}
          </h1>
          <div className="text-sm text-foreground/80 leading-relaxed mb-3 whitespace-pre-wrap">
            <RichContent content={topic.content} />
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className={topicIsAdmin ? "admin-text glow-admin" : ""}>
              {getName(topic.user_id)}
              {topicIsAdmin && <span className="admin-badge ml-1">ADMIN</span>}
            </span>
            {topic.location && <span>📍 {topic.location}</span>}
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{topic.views_count}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Replies */}
        <div className="mb-6">
          <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-3">
            <MessageSquare className="h-3 w-3 inline mr-1" />
            REPLIES — {replies?.length ?? 0}
          </p>

          {replies && replies.length > 0 ? (
            <div className="space-y-1">
              {replies.map((reply) => {
                const replyIsAdmin = isAdmin(reply.user_id);
                return (
                  <div
                    key={reply.id}
                    className={`p-3 border ${replyIsAdmin ? "admin-box border-[hsl(var(--admin-border))]" : "border-border"}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold ${replyIsAdmin ? "admin-text glow-admin" : "text-foreground"}`}>
                        {getName(reply.user_id)}
                        {replyIsAdmin && <span className="admin-badge ml-1">ADMIN</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">NO REPLIES YET — BE THE FIRST</p>
          )}
        </div>

        {/* Reply form */}
        <form onSubmit={handleReply} className="border border-border p-3">
          <p className="text-[10px] text-muted-foreground mb-2">&gt; POST ANONYMOUS REPLY:</p>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Type your reply..."
            rows={3}
            className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground resize-none placeholder:text-muted-foreground"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting || !replyContent.trim()}
              className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-30"
            >
              <Send className="h-3 w-3" />
              {submitting ? "SENDING..." : "REPLY"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
