import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, MessageSquare, Eye, Clock, Send, FileIcon, ExternalLink,
  Heart, Flag, Trash2, Pencil, X, Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ProfileAvatar } from "@/components/Avatars";

function RichContent({ content }: { content: string }) {
  const parts = useMemo(() => {
    const attachmentSeparator = "\n\n---\nAttachments: ";
    const sepIndex = content.indexOf(attachmentSeparator);
    const mainContent = sepIndex >= 0 ? content.slice(0, sepIndex) : content;
    const attachmentsPart = sepIndex >= 0 ? content.slice(sepIndex + attachmentSeparator.length) : "";
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    const attachments: { label: string; url: string; isImage: boolean }[] = [];
    let match;
    while ((match = linkRegex.exec(attachmentsPart)) !== null) {
      const url = match[2];
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
      attachments.push({ label: match[1], url, isImage });
    }
    return { mainContent, attachments };
  }, [content]);

  return (
    <>
      <span>{parts.mainContent}</span>
      {parts.attachments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <p className="text-[10px] text-muted-foreground tracking-[0.2em]">ATTACHMENTS</p>
          {parts.attachments.map((att, i) =>
            att.isImage ? (
              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={att.url} alt={att.label} className="max-w-full max-h-80 border border-border rounded cursor-pointer hover:opacity-80 transition-opacity" />
              </a>
            ) : (
              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-foreground hover:text-primary border border-border px-3 py-2 w-fit">
                <FileIcon className="h-3.5 w-3.5 shrink-0" />
                {att.label}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            )
          )}
        </div>
      )}
    </>
  );
}

export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin: currentUserIsAdmin } = useAuth();
  const queryClient = useQueryClient();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const secondaryNavPath = isAdminRoute ? "/admin/topics" : "/user/boards";
  const secondaryNavLabel = isAdminRoute ? "TOPICS" : "BOARDS";
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<"topic" | "reply">("topic");
  const [reportReason, setReportReason] = useState("");

  // Increment view count
  useEffect(() => {
    if (id) {
      supabase.rpc("increment_topic_views" as any, { topic_id: id }).then(() => {});
    }
  }, [id]);

  const { data: topic } = useQuery({
    queryKey: ["topic", id],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: replies } = useQuery({
    queryKey: ["topic-replies", id],
    queryFn: async () => {
      const { data } = await supabase.from("replies").select("*").eq("topic_id", id!).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  // Topic likes
  const { data: myTopicLike } = useQuery({
    queryKey: ["my-topic-like", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("topic_likes").select("id").eq("topic_id", id!).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  // My reports on this topic/replies (to show undo)
  const { data: myReports } = useQuery({
    queryKey: ["my-reports-topic", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("id, report_type, reported_user_id, reported_post_id, reason").eq("reporter_id", user!.id).eq("status", "pending");
      return data || [];
    },
    enabled: !!user,
  });

  // Reply likes
  const replyIds = replies?.map((r) => r.id) || [];
  const { data: myReplyLikes } = useQuery({
    queryKey: ["my-reply-likes", replyIds],
    queryFn: async () => {
      if (!replyIds.length || !user) return [];
      const { data } = await supabase.from("reply_likes" as any).select("id, reply_id").eq("user_id", user.id).in("reply_id", replyIds);
      return (data as unknown as { id: string; reply_id: string }[]) || [];
    },
    enabled: replyIds.length > 0 && !!user,
  });

  // Reply like counts
  const { data: replyLikeCounts } = useQuery({
    queryKey: ["reply-like-counts", replyIds],
    queryFn: async () => {
      if (!replyIds.length) return {};
      const { data } = await supabase.from("reply_likes" as any).select("reply_id").in("reply_id", replyIds);
      const counts: Record<string, number> = {};
      (data || []).forEach((d: any) => { counts[d.reply_id] = (counts[d.reply_id] || 0) + 1; });
      return counts;
    },
    enabled: replyIds.length > 0,
  });

  // Profiles
  const allUserIds = [...(topic ? [topic.user_id] : []), ...(replies?.map((r) => r.user_id) || [])];
  const uniqueUserIds = [...new Set(allUserIds)];

  const { data: profiles } = useQuery({
    queryKey: ["topic-profiles", uniqueUserIds],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, anonymous_name, is_admin, username, avatar").in("user_id", uniqueUserIds);
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
  const isAdmin = (userId: string) => profiles?.find((p) => p.user_id === userId)?.is_admin || false;
  const getAvatar = (userId: string) => (profiles?.find((p) => p.user_id === userId) as any)?.avatar || "user-1";

  // Realtime replies
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`replies-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "replies", filter: `topic_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["topic-replies", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["topic", id] });
    queryClient.invalidateQueries({ queryKey: ["topic-replies", id] });
    queryClient.invalidateQueries({ queryKey: ["my-topic-like", id] });
    queryClient.invalidateQueries({ queryKey: ["my-reply-likes"] });
    queryClient.invalidateQueries({ queryKey: ["reply-like-counts"] });
    queryClient.invalidateQueries({ queryKey: ["my-reports-topic"] });
  };

  // --- Topic Like ---
  const handleTopicLike = async () => {
    if (!user || !id) return;
    if (myTopicLike) {
      await supabase.from("topic_likes").delete().eq("id", myTopicLike.id);
    } else {
      await supabase.from("topic_likes").insert({ topic_id: id, user_id: user.id });
    }
    invalidateAll();
  };

  // --- Reply Like ---
  const handleReplyLike = async (replyId: string) => {
    if (!user) return;
    const existing = myReplyLikes?.find((l) => l.reply_id === replyId);
    if (existing) {
      await supabase.from("reply_likes" as any).delete().eq("id", existing.id);
    } else {
      await supabase.from("reply_likes" as any).insert({ reply_id: replyId, user_id: user.id } as any);
    }
    invalidateAll();
  };

  // --- Reply ---
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("replies").insert({ topic_id: id!, user_id: user.id, content: replyContent.trim() });
    if (error) { toast.error("Failed to post reply"); } else { setReplyContent(""); invalidateAll(); }
    setSubmitting(false);
  };

  // --- Edit Reply ---
  const handleEditReply = async (replyId: string) => {
    if (!editContent.trim()) return;
    // We need UPDATE policy on replies - currently missing, we'll handle gracefully
    const { error } = await supabase.from("replies").update({ content: editContent.trim() } as any).eq("id", replyId);
    if (error) { toast.error("Failed to edit reply"); } else { toast.success("Reply updated"); setEditingReplyId(null); invalidateAll(); }
  };

  // --- Delete Reply ---
  const handleDeleteReply = async (replyId: string) => {
    const { error } = await supabase.from("replies").delete().eq("id", replyId);
    if (error) { toast.error("Failed to delete reply"); } else { toast.success("Reply deleted"); invalidateAll(); }
  };

  // --- Delete Topic ---
  const handleDeleteTopic = async () => {
    if (!id) return;
    const confirmed = window.confirm("Are you sure you want to delete this topic? This cannot be undone.");
    if (!confirmed) return;
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) { toast.error("Failed to delete topic"); } else { toast.success("Topic deleted"); navigate(-1); }
  };

  // --- Report ---
  const handleReport = async () => {
    if (!reportReason.trim() || !user || !reportingId) return;
    const dbReportType = reportType === "topic" ? "message" : "comment";
    const reasonWithRef = reportType === "topic"
      ? `${reportReason.trim()} [topic:${reportingId}]`
      : `${reportReason.trim()} [reply:${reportingId}]`;
    const payload: any = {
      reporter_id: user.id,
      reason: reasonWithRef,
      report_type: dbReportType,
      severity: "medium" as const,
    };
    if (reportType === "topic") {
      payload.reported_user_id = topic?.user_id;
    } else {
      const reply = replies?.find((r) => r.id === reportingId);
      if (reply) payload.reported_user_id = reply.user_id;
    }
    const { error } = await supabase.from("reports").insert(payload);
    if (error) { toast.error("Failed to submit report"); console.error(error); } else { toast.success("Report submitted — admin notified"); }
    setReportingId(null);
    setReportReason("");
    invalidateAll();
  };

  // --- Undo Report ---
  const handleUndoReport = async (reportId: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) { toast.error("Failed to undo report"); } else { toast.success("Report withdrawn"); }
    invalidateAll();
  };

  // Check if user already reported something - match by specific content ID embedded in reason
  const getMyReport = (targetId: string, type: string) => {
    const dbType = type === "topic" ? "message" : "comment";
    const refTag = type === "topic" ? `[topic:${targetId}]` : `[reply:${targetId}]`;
    return myReports?.find((r) => r.report_type === dbType && r.reason?.includes(refTag));
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
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-none p-1 -ml-1 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 sm:p-0 sm:ml-0">
            <ArrowLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">BACK</span>
          </button>
          <button
            onClick={() => navigate(secondaryNavPath)}
            className="text-[10px] text-muted-foreground hover:text-foreground tracking-wider min-h-[36px] px-2 sm:min-h-0 sm:px-0"
          >
            {secondaryNavLabel}
          </button>
          <div className="h-3 w-px bg-border" />
          <p className="text-foreground text-sm glow-text tracking-widest">NEARVOX</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Topic */}
        <div className={`p-4 border mb-6 ${topicIsAdmin || topic.is_announcement ? "admin-box border-[hsl(var(--admin-border))]" : "border-border"}`}>
          {topic.is_announcement && <p className="text-[9px] admin-text tracking-[0.3em] mb-2">◆ SYSTEM ANNOUNCEMENT</p>}
          <h1 className={`text-xs mb-2 tracking-wider ${topicIsAdmin || topic.is_announcement ? "admin-text glow-admin" : "text-foreground glow-text"}`}>{topic.title}</h1>
          <div className={`text-[11px] leading-relaxed mb-3 whitespace-pre-wrap ${topicIsAdmin ? "admin-text-accent" : "text-foreground/80"}`}>
            <RichContent content={topic.content} />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
            <ProfileAvatar avatarId={getAvatar(topic.user_id)} isAdmin={topicIsAdmin} size={22} />
            <span className={topicIsAdmin ? "admin-text glow-admin" : ""}>
              {getName(topic.user_id)}
              {topicIsAdmin && <span className="admin-badge ml-1">ADMIN</span>}
            </span>
            {topic.location && <span>📍 {topic.location}</span>}
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{topic.views_count}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}</span>
          </div>
          {/* Topic actions: like, report, delete */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <button onClick={handleTopicLike} className={`flex items-center gap-1 text-[10px] transition-none ${myTopicLike ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}>
              <Heart className={`h-3.5 w-3.5 ${myTopicLike ? "fill-red-500" : ""}`} />
              {topic.likes_count || 0}
            </button>
            {(() => {
              const existing = topic ? getMyReport(id!, "topic") : null;
              return existing ? (
                <button onClick={() => handleUndoReport(existing.id)} className="flex items-center gap-1 text-[10px] text-warning transition-none">
                  <Flag className="h-3.5 w-3.5 fill-warning" /> UNDO REPORT
                </button>
              ) : (
                <button onClick={() => { setReportingId(id!); setReportType("topic"); }} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-none">
                  <Flag className="h-3.5 w-3.5" /> REPORT
                </button>
              );
            })()}
            {(currentUserIsAdmin || topic.user_id === user?.id) && (
              <button onClick={handleDeleteTopic} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-none ml-auto">
                <Trash2 className="h-3.5 w-3.5" /> DELETE
              </button>
            )}
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
                const isOwn = reply.user_id === user?.id;
                const canDelete = isOwn || currentUserIsAdmin;
                const canEdit = isOwn;
                const liked = myReplyLikes?.find((l) => l.reply_id === reply.id);
                const likeCount = replyLikeCounts?.[reply.id] || 0;
                const isEditing = editingReplyId === reply.id;

                return (
                  <div key={reply.id} className={`p-3 border ${replyIsAdmin ? "admin-box border-[hsl(var(--admin-border))]" : "border-border"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <ProfileAvatar avatarId={getAvatar(reply.user_id)} isAdmin={replyIsAdmin} size={18} />
                        <span className={`text-[10px] font-bold ${replyIsAdmin ? "admin-text glow-admin" : "text-foreground"}`}>
                          {getName(reply.user_id)}
                          {replyIsAdmin && <span className="admin-badge ml-1">ADMIN</span>}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {/* Edit/Delete buttons */}
                      <div className="flex items-center gap-1">
                        {canEdit && !isEditing && (
                          <button onClick={() => { setEditingReplyId(reply.id); setEditContent(reply.content); }} className="text-muted-foreground hover:text-foreground p-1" title="Edit">
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteReply(reply.id)} className="text-muted-foreground hover:text-destructive p-1" title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full bg-input border border-border text-foreground text-[11px] px-3 py-2 focus:outline-none focus:border-foreground resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingReplyId(null)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 border border-border">
                            <X className="h-3 w-3" /> CANCEL
                          </button>
                          <button onClick={() => handleEditReply(reply.id)} className="text-[10px] text-foreground flex items-center gap-1 px-2 py-1 border border-foreground hover:bg-foreground hover:text-primary-foreground">
                            <Check className="h-3 w-3" /> SAVE
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${replyIsAdmin ? "admin-text-accent" : "text-foreground/80"}`}>{reply.content}</p>
                    )}

                    {/* Reply actions */}
                    <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-border/50">
                      <button onClick={() => handleReplyLike(reply.id)} className={`flex items-center gap-1 text-[10px] transition-none ${liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}>
                        <Heart className={`h-3 w-3 ${liked ? "fill-red-500" : ""}`} />
                        {likeCount}
                      </button>
                      {(() => {
                        const existingReport = getMyReport(reply.user_id, "reply");
                        return existingReport ? (
                          <button onClick={() => handleUndoReport(existingReport.id)} className="flex items-center gap-1 text-[10px] text-warning transition-none">
                            <Flag className="h-3 w-3 fill-warning" /> UNDO REPORT
                          </button>
                        ) : (
                          <button onClick={() => { setReportingId(reply.id); setReportType("reply"); }} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-none">
                            <Flag className="h-3 w-3" /> REPORT
                          </button>
                        );
                      })()}
                    </div>
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
            className="w-full bg-input border border-border text-foreground text-[11px] px-3 py-2 focus:outline-none focus:border-foreground resize-none placeholder:text-muted-foreground"
          />
          <div className="flex justify-end mt-2">
            <button type="submit" disabled={submitting || !replyContent.trim()} className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-30">
              <Send className="h-3 w-3" />
              {submitting ? "SENDING..." : "REPLY"}
            </button>
          </div>
        </form>
      </div>

      {/* Report Dialog */}
      {reportingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={() => setReportingId(null)}>
          <div className="border border-border bg-background p-4 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-foreground glow-text mb-3 tracking-wider">REPORT {reportType.toUpperCase()}</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe why you're reporting this..."
              rows={3}
              className="w-full bg-input border border-border text-foreground text-[11px] px-3 py-2 focus:outline-none focus:border-foreground resize-none placeholder:text-muted-foreground mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReportingId(null)} className="text-[10px] text-muted-foreground border border-border px-3 py-1.5 hover:text-foreground">CANCEL</button>
              <button onClick={handleReport} disabled={!reportReason.trim()} className="text-[10px] text-foreground border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground disabled:opacity-30">SUBMIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
