import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { Users, Heart, MessageSquare, Send, Trash2, Flag, MoreVertical, Paperclip, Image, FileText, X, Eye, ThumbsDown, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { ProfileAvatar } from "@/components/Avatars";
import { formatDistanceToNow } from "date-fns";

const isImage = (path: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);

export default function UserBoardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [postTitle, setPostTitle] = useState("");
  const [newPost, setNewPost] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      setUploading(selectedFiles.length > 0);
      let attachmentPaths: string[] = [];

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const filePath = `board-posts/${id}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from("post-attachments").upload(filePath, file);
          if (!error) attachmentPaths.push(filePath);
        }
      }

      const { error } = await supabase.from("board_posts").insert({
        board_id: id!,
        user_id: user!.id,
        title: postTitle.trim() || null,
        content: newPost.trim(),
        attachments: attachmentPaths.length > 0 ? attachmentPaths : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPostTitle("");
      setNewPost("");
      setSelectedFiles([]);
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
      queryClient.invalidateQueries({ queryKey: ["board", id] });
    },
    onError: () => { toast.error("Failed to post"); setUploading(false); },
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
      const post = posts?.find((p: any) => p.id === postId);
      if (post?.attachments?.length > 0) {
        await supabase.storage.from("post-attachments").remove(post.attachments);
      }
      const { error } = await supabase.from("board_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
    },
  });

  const editPost = useMutation({
    mutationFn: async ({ postId, title, content }: { postId: string; title: string; content: string }) => {
      const { error } = await supabase.from("board_posts").update({ title: title.trim() || null, content: content.trim() }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post updated");
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
    },
    onError: () => toast.error("Failed to update post"),
  });

  const repost = useMutation({
    mutationFn: async (postId: string) => {
      const original = posts?.find((p: any) => p.id === postId);
      if (!original) return;
      const { error } = await supabase.from("board_posts").insert({
        board_id: id!,
        user_id: user!.id,
        title: original.title ? `RE: ${original.title}` : null,
        content: original.content,
        attachments: original.attachments || [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reposted!");
      queryClient.invalidateQueries({ queryKey: ["board-posts", id] });
      queryClient.invalidateQueries({ queryKey: ["board", id] });
    },
    onError: () => toast.error("Failed to repost"),
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

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from("post-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  if (!board) return <UserLayout><div className="p-6 text-muted-foreground text-sm">Loading...</div></UserLayout>;

  return (
    <UserLayout>
      {/* Board Header */}
      <div className="border-b border-border px-4 sm:px-6 py-3">
        <button
          onClick={() => navigate("/user/boards")}
          className="text-[10px] text-muted-foreground hover:text-foreground tracking-wider mb-2 flex items-center gap-1"
        >
          ← BOARDS
        </button>
        <h1 className="text-xs text-foreground glow-text tracking-[0.3em] font-bold">{board.name.toUpperCase()}</h1>
        {board.description && (
          <p className="text-[10px] text-muted-foreground mt-1 tracking-wider">{board.description.toUpperCase()}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-2.5 w-2.5" /> {board.members_count} members
          </span>
          <span className="text-[10px] text-muted-foreground">{board.posts_count} posts</span>
          <div className="ml-auto flex items-center gap-2">
            {(board.created_by === user?.id || profile?.is_admin) && (
              <button
                onClick={() => { if (confirm("Delete this board and all its posts?")) deleteBoard.mutate(); }}
                className="text-[10px] text-muted-foreground border border-border px-2 py-1 hover:text-destructive hover:border-destructive tracking-wider"
              >
                DELETE
              </button>
            )}
            {isMember ? (
              <button
                onClick={() => leaveBoard.mutate()}
                className="text-[10px] text-muted-foreground border border-border px-2 py-1 hover:text-destructive hover:border-destructive tracking-wider"
              >
                LEAVE
              </button>
            ) : (
              <button
                onClick={() => joinBoard.mutate()}
                className="text-[10px] text-background bg-foreground px-3 py-1 hover:bg-foreground/90 tracking-wider"
              >
                JOIN
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-3 space-y-3">
        {/* New Post Form */}
        {isMember && (
          <div className="border border-border p-3 space-y-2">
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Post title (optional)"
              className="w-full bg-background border border-border px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 tracking-wider"
            />
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share something with this board..."
              rows={3}
              className="w-full bg-background border border-border px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 resize-none tracking-wider"
            />
            {/* File attachments */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-0.5"
              >
                <Paperclip className="h-2.5 w-2.5" /> ATTACH
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedFiles((prev) => [...prev, ...files]);
                }}
              />
              <span className="text-[9px] text-muted-foreground">
                {selectedFiles.length > 0 ? `${selectedFiles.length} file(s)` : "Images, PDFs, docs"}
              </span>
            </div>
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] text-foreground border border-border px-2 py-0.5">
                    {f.type.startsWith("image/") ? <Image className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                    <span className="max-w-[100px] truncate">{f.name}</span>
                    <button onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-destructive"><X className="h-2.5 w-2.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => createPost.mutate()}
                disabled={!newPost.trim() || createPost.isPending}
                className="flex items-center gap-1 text-[10px] text-background bg-foreground px-3 py-1 hover:bg-foreground/90 tracking-wider disabled:opacity-50"
              >
                <Send className="h-2.5 w-2.5" />
                {uploading ? "UPLOADING..." : "POST"}
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
                isMember={isMember}
                onLike={() => toggleLike.mutate(post.id)}
                onDelete={() => deletePost.mutate(post.id)}
                onEdit={(title: string, content: string) => editPost.mutate({ postId: post.id, title, content })}
                onRepost={() => repost.mutate(post.id)}
                onReport={() => setReportPostId(post.id)}
                showComments={showComments[post.id] || false}
                onToggleComments={() => setShowComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                commentText={commentText[post.id] || ""}
                onCommentChange={(text: string) => setCommentText((prev) => ({ ...prev, [post.id]: text }))}
                onAddComment={() => addComment.mutate(post.id)}
                commentsQueryFn={commentsQueryFn}
                onDeleteComment={(commentId: string) => deleteComment.mutate({ commentId, postId: post.id })}
                currentUserId={user?.id}
                getFileUrl={getFileUrl}
                onPreview={(url: string) => setPreviewUrl(url)}
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

      {/* Image Preview */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-3xl max-h-[80vh]">
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-3 -right-3 text-foreground bg-card border border-border p-1 z-10">
              <X className="h-4 w-4" />
            </button>
            <img src={previewUrl} alt="" className="max-w-full max-h-[80vh] object-contain border border-border" />
          </div>
        </div>
      )}
    </UserLayout>
  );
}

function PostCard({
  post, isLiked, isOwner, isAdmin, isMember, onLike, onDelete, onEdit, onRepost, onReport,
  showComments, onToggleComments, commentText, onCommentChange, onAddComment,
  commentsQueryFn, onDeleteComment, currentUserId, getFileUrl, onPreview,
}: any) {
  const { data: comments } = useQuery({
    queryKey: ["board-post-comments", post.id],
    queryFn: () => commentsQueryFn(post.id),
    enabled: showComments,
  });
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content);
  const attachments: string[] = post.attachments || [];

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    onEdit(editTitle, editContent);
    setEditing(false);
  };

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
            <div className="absolute right-0 top-full z-10 border border-border bg-card min-w-[130px]">
              {isOwner && (
                <button onClick={() => { setEditing(true); setEditTitle(post.title || ""); setEditContent(post.content); setShowMenu(false); }}
                  className="w-full text-left text-xs text-foreground px-3 py-2 hover:bg-foreground/5 flex items-center gap-2">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              )}
              {isMember && (
                <button onClick={() => { onRepost(); setShowMenu(false); }}
                  className="w-full text-left text-xs text-foreground px-3 py-2 hover:bg-foreground/5 flex items-center gap-2">
                  <Copy className="h-3 w-3" /> Repost
                </button>
              )}
              {(isOwner || isAdmin) && (
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

      {editing ? (
        <div className="space-y-2 mb-3">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-[10px] text-muted-foreground border border-border px-3 py-1.5 tracking-wider">CANCEL</button>
            <button onClick={handleSaveEdit} disabled={!editContent.trim()} className="text-[10px] text-background bg-foreground px-3 py-1.5 tracking-wider disabled:opacity-50">SAVE</button>
          </div>
        </div>
      ) : (
        <>
          {/* Title */}
          {post.title && (
            <h3 className="text-xs sm:text-sm text-foreground font-bold tracking-wider mb-2 glow-text">{post.title}</h3>
          )}
          {/* Content */}
          <p className="text-xs text-foreground/90 whitespace-pre-wrap mb-3">{post.content}</p>
        </>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((path: string, i: number) => {
            const url = getFileUrl(path);
            if (isImage(path)) {
              return (
                <button key={i} onClick={() => onPreview(url)} className="border border-border w-20 h-20 overflow-hidden group relative">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <Eye className="h-3.5 w-3.5 text-foreground" />
                  </div>
                </button>
              );
            }
            return (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border px-2 py-1 hover:text-foreground">
                <FileText className="h-3 w-3" />
                {path.split("/").pop()}
              </a>
            );
          })}
        </div>
      )}

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
