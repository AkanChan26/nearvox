import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { Users, Heart, MessageSquare, Send, Trash2, Flag, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { ProfileAvatar } from "@/components/Avatars";
import { formatDistanceToNow } from "date-fns";

export default function UserBoardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const { data: board } = useQuery({
    queryKey: ["board", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("boards").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: isMember } = useQuery({
    queryKey: ["board-membership", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("board_members")
        .select("id")
        .eq("board_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const { data: posts } = useQuery({
    queryKey: ["board-posts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_posts")
        .select("*")
        .eq("board_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch profiles for each post
      const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, anonymous_name, username, avatar").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((p: any) => ({ ...p, profile: profileMap[p.user_id] }));
    },
    enabled: !!id,
  });

  const { data: myLikes } = useQuery({
    queryKey: ["board-post-likes", id, user?.id],
    queryFn: async () => {
      const postIds = (posts || []).map((p: any) => p.id);
      if (postIds.length === 0) return new Set();
      const { data } = await supabase
        .from("board_post_likes")
        .select("post_id")
        .eq("user_id", user!.id)
        .in("post_id", postIds);
      return new Set((data || []).map((l: any) => l.post_id));
    },
    enabled: !!user && !!posts,
  });

  const joinBoard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("board_members").insert({ board_id: id!, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Joined board!");
      queryClient.invalidateQueries({ queryKey: ["board-membership", id] });
      queryClient.invalidateQueries({ queryKey: ["board", id] });
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("is_admin").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const deleteBoard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("boards").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Board deleted");
      navigate("/user/boards");
    },
    onError: () => toast.error("Failed to delete board"),
  });

  const leaveBoard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("board_members").delete().eq("board_id", id!).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Left board");
      queryClient.invalidateQueries({ queryKey: ["board-membership", id] });
      queryClient.invalidateQueries({ queryKey: ["board", id] });
    },
  });

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("board_posts").insert({
        board_id: id!,
        user_id: user!.id,
        content: newPost.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPost("");
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
      queryClient.invalidateQueries({ queryKey: ["board", id] });
    },
    onError: () => toast.error("Failed to post"),
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      const liked = myLikes?.has(postId);
      if (liked) {
        await supabase.from("board_post_likes").delete().eq("post_id", postId).eq("user_id", user!.id);
      } else {
        await supabase.from("board_post_likes").insert({ post_id: postId, user_id: user!.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
      queryClient.invalidateQueries({ queryKey: ["board-post-likes", id] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("board_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
    },
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user!.id,
        report_type: "board_post",
        reason: reportReason.trim(),
        reported_post_id: reportPostId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report submitted");
      setReportPostId(null);
      setReportReason("");
    },
    onError: () => toast.error("Failed to submit report"),
  });

  // Comments query factory - passed to PostCard
  const commentsQueryFn = async (postId: string) => {
    const { data } = await supabase
      .from("board_post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, anonymous_name, username, avatar").in("user_id", userIds.length ? userIds : ["none"]);
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
    return (data || []).map((c: any) => ({ ...c, profile: profileMap[c.user_id] }));
  };

  const addComment = useMutation({
    mutationFn: async (postId: string) => {
      const text = commentText[postId]?.trim();
      if (!text) return;
      const { error } = await supabase.from("board_post_comments").insert({
        post_id: postId,
        user_id: user!.id,
        content: text,
      });
      if (error) throw error;
    },
    onSuccess: (_, postId) => {
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["board-post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      await supabase.from("board_post_comments").delete().eq("id", commentId);
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ["board-post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
    },
  });

  if (!board) return <UserLayout><div className="p-6 text-muted-foreground text-sm">Loading...</div></UserLayout>;

  return (
    <UserLayout>
      {/* Board Header */}
      <div className="border-b border-border px-4 sm:px-6 py-5">
        <h1 className="text-lg sm:text-xl text-foreground glow-text tracking-wider font-bold">{board.name}</h1>
        {board.description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{board.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {board.members_count} members
          </span>
          <span className="text-xs text-muted-foreground">{board.posts_count} posts</span>
          <div className="ml-auto flex items-center gap-2">
            {(board.created_by === user?.id || profile?.is_admin) && (
              <button
                onClick={() => { if (confirm("Delete this board and all its posts?")) deleteBoard.mutate(); }}
                className="text-xs text-muted-foreground border border-border px-3 py-1.5 hover:text-destructive hover:border-destructive tracking-wider"
              >
                DELETE
              </button>
            )}
            {isMember ? (
              <button
                onClick={() => leaveBoard.mutate()}
                className="text-xs text-muted-foreground border border-border px-3 py-1.5 hover:text-destructive hover:border-destructive tracking-wider"
              >
                LEAVE
              </button>
            ) : (
              <button
                onClick={() => joinBoard.mutate()}
                className="text-xs text-background bg-foreground px-4 py-1.5 hover:bg-foreground/90 tracking-wider"
              >
                JOIN
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* New Post */}
        {isMember && (
          <div className="border border-border bg-card p-3 sm:p-4">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share something with this board..."
              rows={3}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 resize-none mb-2"
            />
            <div className="flex justify-end">
              <button
                onClick={() => createPost.mutate()}
                disabled={!newPost.trim() || createPost.isPending}
                className="flex items-center gap-1.5 text-xs text-background bg-foreground px-4 py-2 hover:bg-foreground/90 tracking-wider disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                POST
              </button>
            </div>
          </div>
        )}

        {!isMember && (
          <div className="border border-border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">Join this board to post</p>
          </div>
        )}

        {/* Posts Feed */}
        {posts && posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={myLikes?.has(post.id) || false}
                isOwner={post.user_id === user?.id}
                isAdmin={profile?.is_admin || false}
                onLike={() => toggleLike.mutate(post.id)}
                onDelete={() => deletePost.mutate(post.id)}
                onReport={() => setReportPostId(post.id)}
                showComments={showComments[post.id] || false}
                onToggleComments={() => setShowComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                commentText={commentText[post.id] || ""}
                onCommentChange={(text: string) => setCommentText((prev) => ({ ...prev, [post.id]: text }))}
                onAddComment={() => addComment.mutate(post.id)}
                commentsQueryFn={commentsQueryFn}
                onDeleteComment={(commentId: string) => deleteComment.mutate({ commentId, postId: post.id })}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No posts yet. Be the first to post!</p>
        )}
      </div>

      {/* Report Dialog */}
      {reportPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="border border-border bg-card p-5 w-full max-w-md">
            <h2 className="text-base text-foreground glow-text tracking-wider mb-3">REPORT POST</h2>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Why are you reporting this?"
              rows={3}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => { setReportPostId(null); setReportReason(""); }} className="flex-1 text-xs text-muted-foreground border border-border py-2 tracking-wider">CANCEL</button>
              <button onClick={() => submitReport.mutate()} disabled={!reportReason.trim()} className="flex-1 text-xs text-background bg-destructive py-2 tracking-wider disabled:opacity-50">REPORT</button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}

function PostCard({
  post, isLiked, isOwner, onLike, onDelete, onReport,
  showComments, onToggleComments, commentText, onCommentChange, onAddComment,
  commentsQueryFn, onDeleteComment, currentUserId,
}: any) {
  const { data: comments } = useQuery({
    queryKey: ["board-post-comments", post.id],
    queryFn: () => commentsQueryFn(post.id),
    enabled: showComments,
  });
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="border border-border bg-card p-4">
      {/* Author */}
      <div className="flex items-center gap-2.5 mb-3">
        <ProfileAvatar avatarId={post.profile?.avatar} size={32} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-bold tracking-wider truncate">
            {post.profile?.anonymous_name || post.profile?.username || "Unknown"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-muted-foreground hover:text-foreground min-h-[32px] min-w-[32px] flex items-center justify-center">
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full z-10 border border-border bg-card min-w-[120px]">
              {isOwner && (
                <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full text-left text-xs text-destructive px-3 py-2 hover:bg-foreground/5 flex items-center gap-2">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
              {!isOwner && (
                <button onClick={() => { onReport(); setShowMenu(false); }} className="w-full text-left text-xs text-muted-foreground px-3 py-2 hover:bg-foreground/5 flex items-center gap-2">
                  <Flag className="h-3 w-3" /> Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-3">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-border pt-2">
        <button onClick={onLike} className={`flex items-center gap-1.5 text-xs ${isLiked ? 'text-destructive' : 'text-muted-foreground'} hover:text-destructive`}>
          <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
          {post.likes_count > 0 && post.likes_count}
        </button>
        <button onClick={onToggleComments} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          {post.comments_count > 0 && post.comments_count}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 border-t border-border pt-3 space-y-2">
          {comments && comments.map((c: any) => (
            <div key={c.id} className="flex gap-2">
              <ProfileAvatar avatarId={c.profile?.avatar} size={24} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-foreground font-bold">{c.profile?.anonymous_name || "User"}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-foreground/80">{c.content}</p>
              </div>
              {c.user_id === currentUserId && (
                <button onClick={() => onDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAddComment()}
              placeholder="Add a comment..."
              className="flex-1 bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
            />
            <button onClick={onAddComment} disabled={!commentText?.trim()} className="text-xs text-foreground border border-border px-3 py-2 hover:bg-foreground/5 disabled:opacity-50">
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
