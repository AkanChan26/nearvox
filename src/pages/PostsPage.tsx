import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Image, FileText, Eye, Heart, Pencil, Check, X, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function PostsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [expandedCommentThreads, setExpandedCommentThreads] = useState<Record<string, boolean>>({});

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const creatorIds = [...new Set(posts?.map((p) => p.user_id) || [])];
  const { data: creators } = useQuery({
    queryKey: ["admin-post-creators", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name, is_admin")
        .in("user_id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });

  const { data: myLikes } = useQuery({
    queryKey: ["admin-my-likes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("post_likes").select("post_id").eq("user_id", user!.id);
      return new Set(data?.map((l) => l.post_id) || []);
    },
    enabled: !!user,
  });

  const { data: expandedComments } = useQuery({
    queryKey: ["admin-post-comments", expandedCommentsPostId],
    queryFn: async () => {
      if (!expandedCommentsPostId) return [];
      const { data } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", expandedCommentsPostId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!expandedCommentsPostId,
  });

  const commentUserIds = [...new Set((expandedComments || []).map((c: any) => c.user_id))];
  const { data: commentUsers } = useQuery({
    queryKey: ["admin-comment-users", commentUserIds],
    queryFn: async () => {
      if (commentUserIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name, is_admin")
        .in("user_id", commentUserIds);
      return data || [];
    },
    enabled: commentUserIds.length > 0,
  });

  const getCreatorInfo = (userId: string) => {
    const creator = creators?.find((c) => c.user_id === userId);
    return {
      name: creator?.is_admin ? creator.username : creator?.anonymous_name || creator?.username || "Unknown",
      isAdmin: creator?.is_admin || false,
    };
  };

  const getCommentUserName = (userId: string) => {
    const profile = commentUsers?.find((c) => c.user_id === userId);
    if (!profile) return "Unknown";
    return profile.is_admin ? profile.username || "ADMIN" : profile.anonymous_name || profile.username || "User";
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    const isLiked = myLikes?.has(postId);
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-my-likes"] });
    queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
  };

  const handleDelete = async (postId: string, attachments?: string[]) => {
    if (attachments && attachments.length > 0) {
      await supabase.storage.from("post-attachments").remove(attachments);
    }
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) toast.error("Failed to delete post");
    else {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    }
  };

  const handlePin = async (postId: string, currentlyPinned: boolean) => {
    const { error } = await supabase.from("posts").update({ is_pinned: !currentlyPinned }).eq("id", postId);
    if (error) toast.error("Failed to update");
    else {
      toast.success(currentlyPinned ? "Unpinned" : "Pinned");
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    }
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    const { error } = await supabase.from("posts").update({ content: editContent.trim() }).eq("id", postId);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Post updated");
      setEditingId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("post-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const isImage = (path: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);

  const timeSince = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <AdminLayout>
      <PageHeader title="POST MONITOR" description="// CONTENT MODERATION CONSOLE" />

      <div className="p-6">
        <div className="terminal-box">
          <div className="terminal-header">POST FEED — {posts?.length ?? 0} ENTRIES</div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : posts && posts.length > 0 ? (
            posts.map((post: any) => {
              const { name, isAdmin } = getCreatorInfo(post.user_id);
              const attachments = post.attachments as string[] || [];
              const isLiked = myLikes?.has(post.id);
              const isEditing = editingId === post.id;
              const isCommentsOpen = expandedCommentsPostId === post.id;
              const commentsForPost = isCommentsOpen ? (expandedComments || []) : [];
              const commentsExpanded = !!expandedCommentThreads[post.id];
              const visibleComments = commentsExpanded ? commentsForPost : commentsForPost.slice(0, 3);
              const hiddenCommentsCount = Math.max(commentsForPost.length - 3, 0);

              return (
                <div
                  key={post.id}
                  className={`py-3 border-b last:border-0 ${
                    isAdmin ? "admin-box my-2 px-3 py-4 border-b-0" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                    <span>{post.id.slice(0, 8)}</span>
                    <span>|</span>
                    <span className={isAdmin ? "admin-text glow-admin font-bold" : "text-foreground"}>
                      {name}
                    </span>
                    {isAdmin && <span className="admin-badge">ADMIN</span>}
                    {post.is_pinned && <span className="text-foreground">[PINNED]</span>}
                    {post.is_announcement && <span className="text-foreground">[ANNOUNCEMENT]</span>}
                    <span>|</span>
                    <span>{post.location || "GLOBAL"}</span>
                    <span className="ml-auto">{timeSince(post.created_at)}</span>
                  </div>
                  {isAdmin && post.is_announcement && (
                    <p className="text-[10px] admin-text tracking-[0.3em] uppercase mb-1.5">SYSTEM ANNOUNCEMENT</p>
                  )}

                  {isEditing ? (
                    <div className="mb-1.5 pl-2 border-l border-foreground space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full bg-input border border-border text-foreground text-xs px-3 py-2 focus:outline-none focus:border-foreground resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditingId(null); setEditContent(""); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                          <X className="h-2.5 w-2.5" /> [CANCEL]
                        </button>
                        <button onClick={() => handleSaveEdit(post.id)} className="text-[10px] text-foreground hover:underline flex items-center gap-1">
                          <Check className="h-2.5 w-2.5" /> [SAVE]
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-xs mb-1.5 pl-2 border-l ${
                      isAdmin ? "border-admin-border admin-text/80" : "border-border text-secondary-foreground"
                    }`}>{post.content}</p>
                  )}

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5 ml-2">
                      {attachments.map((path: string, i: number) => {
                        const url = getPublicUrl(path);
                        if (isImage(path)) {
                          return (
                            <button key={i} onClick={() => setPreviewUrl(url)} className="border border-border w-16 h-16 overflow-hidden group relative">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                <Eye className="h-3 w-3 text-foreground" />
                              </div>
                            </button>
                          );
                        }
                        return (
                          <div key={i} className="flex items-center gap-1 text-[9px] text-muted-foreground border border-border px-1.5 py-0.5">
                            <FileText className="h-2.5 w-2.5" />
                            {path.split("/").pop()}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[10px]">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1 transition-none ${isLiked ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Heart className={`h-3 w-3 ${isLiked ? "fill-current" : ""}`} />
                      {post.likes_count}
                    </button>
                    <button
                      onClick={() => setExpandedCommentsPostId(isCommentsOpen ? null : post.id)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {post.comments_count}
                      {isCommentsOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                    </button>
                    {attachments.length > 0 && <span className="text-muted-foreground">FILES:{attachments.length}</span>}
                    <span className="ml-auto space-x-2">
                      <button onClick={() => { setEditingId(post.id); setEditContent(post.content); }} className={`hover:underline ${isAdmin ? "admin-text" : "text-foreground"}`}>
                        [EDIT]
                      </button>
                      <button onClick={() => handlePin(post.id, post.is_pinned)} className={`hover:underline ${isAdmin ? "admin-text" : "text-foreground"}`}>
                        [{post.is_pinned ? "UNPIN" : "PIN"}]
                      </button>
                      <button onClick={() => handleDelete(post.id, attachments)} className="text-destructive hover:underline">[DELETE]</button>
                    </span>
                  </div>

                  {isCommentsOpen && (
                    <div className="mt-2 border-t border-border pt-2 space-y-1.5">
                      {commentsForPost.length > 0 ? (
                        <>
                          {visibleComments.map((comment: any) => (
                            <div key={comment.id} className="text-[10px] text-muted-foreground flex gap-2">
                              <span className="text-foreground font-bold shrink-0">{getCommentUserName(comment.user_id)}</span>
                              <span className="flex-1 text-secondary-foreground">{comment.content}</span>
                              <span className="text-[9px] text-muted-foreground shrink-0">{timeSince(comment.created_at)}</span>
                            </div>
                          ))}
                          {hiddenCommentsCount > 0 && (
                            <button
                              onClick={() => setExpandedCommentThreads((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                              className="text-[10px] text-muted-foreground hover:text-foreground tracking-wider"
                            >
                              {commentsExpanded ? "SHOW LESS" : `EXPAND COMMENTS (+${hiddenCommentsCount})`}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">NO COMMENTS YET</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO POSTS FOUND</p>
          )}
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-2xl max-h-[80vh] p-2">
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[75vh] object-contain border border-border" />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

