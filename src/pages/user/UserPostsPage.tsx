import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  MessageSquare, Heart, Clock, MapPin, Plus, Trash2,
  Image, FileText, Paperclip, X, Eye, Flag, Send,
  ChevronDown, ChevronUp, Edit2, Hash, Tag, Search, CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { TOPIC_CATEGORIES } from "@/lib/categories";
import { ProfileAvatar } from "@/components/Avatars";

type UnifiedItem = {
  id: string;
  type: "post" | "topic";
  content: string;
  title?: string;
  category?: string;
  user_id: string;
  created_at: string;
  location?: string | null;
  is_pinned: boolean;
  is_announcement: boolean;
  likes_count: number;
  comments_count: number;
  replies_count?: number;
  views_count?: number;
  attachments: string[];
};

export default function UserPostsPage() {
  const { user, isAdmin: userIsAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMine = searchParams.get("mine") === "true";
  const regionFilter = searchParams.get("region") !== "off"; // default ON
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [expandedCommentThreads, setExpandedCommentThreads] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [reportingPost, setReportingPost] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Fetch user profile for region filtering
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-region", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("location").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const userLocation = myProfile?.location || "";

  // Fetch posts
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["user-posts-feed", isMine, user?.id],
    queryFn: async () => {
      let query = supabase.from("posts").select("*").order("created_at", { ascending: false });
      if (isMine && user) query = query.eq("user_id", user.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch topics
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["user-topics-feed", isMine, user?.id],
    queryFn: async () => {
      let query = supabase.from("topics").select("*").order("created_at", { ascending: false });
      if (isMine && user) query = query.eq("user_id", user.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = postsLoading || topicsLoading;

  // Helper: check if location matches user's region
  const isNearby = (itemLocation: string | null | undefined): boolean => {
    if (!userLocation || !itemLocation) return true;
    const norm = (s: string) => s.toLowerCase().trim();
    const userParts = norm(userLocation).split(/[,\s]+/);
    const itemParts = norm(itemLocation).split(/[,\s]+/);
    return userParts.some((part) => itemParts.some((ip) => ip.includes(part) || part.includes(ip)));
  };

  // Creators - fetch based on raw posts/topics user_ids
  const creatorIds = useMemo(() => {
    const postIds = (posts || []).map((p) => p.user_id);
    const topicIds = (topics || []).map((t) => t.user_id);
    return [...new Set([...postIds, ...topicIds])];
  }, [posts, topics]);

  const { data: creators } = useQuery({
    queryKey: ["post-creators", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, anonymous_name, is_admin, username, avatar").in("user_id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });

  const getCreatorName = useCallback((userId: string) => {
    const creator = creators?.find((c) => c.user_id === userId);
    if (!creator) return "Unknown";
    if (creator.is_admin) return creator.username || "ADMIN";
    return creator.anonymous_name || "Anonymous";
  }, [creators]);

  // Merge into unified list
  const unified: UnifiedItem[] = useMemo(() => {
    const postItems: UnifiedItem[] = (posts || []).map((p) => ({
      id: p.id,
      type: "post" as const,
      content: p.content,
      user_id: p.user_id,
      created_at: p.created_at,
      location: p.location,
      is_pinned: p.is_pinned,
      is_announcement: p.is_announcement,
      likes_count: p.likes_count,
      comments_count: p.comments_count,
      attachments: (p.attachments as string[]) || [],
    }));
    const topicItems: UnifiedItem[] = (topics || []).map((t) => ({
      id: t.id,
      type: "topic" as const,
      content: t.content,
      title: t.title,
      category: t.category || undefined,
      user_id: t.user_id,
      created_at: t.created_at,
      location: t.location,
      is_pinned: t.is_pinned,
      is_announcement: t.is_announcement,
      likes_count: (t as any).likes_count ?? 0,
      comments_count: 0,
      replies_count: t.replies_count,
      views_count: t.views_count,
      attachments: [],
    }));
    let all = [...postItems, ...topicItems];
    
    // Apply region filter when not viewing own posts and filter is on
    if (!isMine && regionFilter && userLocation) {
      all = all.filter((item) => isNearby(item.location));
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      all = all.filter((item) => {
        const creatorName = getCreatorName(item.user_id).toLowerCase();
        return (
          item.content.toLowerCase().includes(q) ||
          (item.title || "").toLowerCase().includes(q) ||
          creatorName.includes(q) ||
          (item.location || "").toLowerCase().includes(q)
        );
      });
    }

    return all.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [posts, topics, isMine, regionFilter, userLocation, searchQuery, getCreatorName]);

  // Likes (posts)
  const { data: myLikes } = useQuery({
    queryKey: ["my-likes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("post_likes").select("post_id").eq("user_id", user!.id);
      return new Set(data?.map((l: any) => l.post_id) || []);
    },
    enabled: !!user,
  });

  // Likes (topics)
  const { data: myTopicLikes } = useQuery({
    queryKey: ["my-topic-likes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("topic_likes").select("topic_id").eq("user_id", user!.id);
      return new Set(data?.map((l: any) => l.topic_id) || []);
    },
    enabled: !!user,
  });

  // Read posts tracking
  const { data: readPosts } = useQuery({
    queryKey: ["read-posts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("read_posts").select("item_id").eq("user_id", user!.id);
      return new Set((data || []).map((r: any) => r.item_id));
    },
    enabled: !!user,
  });

  const markAsRead = async (itemId: string, itemType: string) => {
    if (!user || readPosts?.has(itemId)) return;
    await supabase.from("read_posts").insert({ user_id: user.id, item_id: itemId, item_type: itemType }).select();
    queryClient.invalidateQueries({ queryKey: ["read-posts"] });
  };

  const markAllPostsRead = async () => {
    if (!user || !unified.length) return;
    const unread = unified.filter((item) => !readPosts?.has(item.id));
    if (unread.length === 0) { toast.info("All caught up!"); return; }
    const rows = unread.map((item) => ({ user_id: user.id, item_id: item.id, item_type: item.type }));
    const { error } = await supabase.from("read_posts").upsert(rows, { onConflict: "user_id,item_id" });
    if (error) toast.error("Failed");
    else { toast.success("All marked as read"); queryClient.invalidateQueries({ queryKey: ["read-posts"] }); }
  };

  // My pending reports
  const { data: myReports } = useQuery({
    queryKey: ["my-reports-posts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("id, reported_post_id, reported_user_id, report_type, reason").eq("reporter_id", user!.id).eq("status", "pending");
      return data || [];
    },
    enabled: !!user,
  });

  // Comments for expanded post
  const { data: comments } = useQuery({
    queryKey: ["post-comments", expandedComments],
    queryFn: async () => {
      if (!expandedComments) return [];
      const { data } = await supabase.from("post_comments").select("*").eq("post_id", expandedComments).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!expandedComments,
  });

  const commentUserIds = [...new Set(comments?.map((c: any) => c.user_id) || [])];
  const { data: commentUsers } = useQuery({
    queryKey: ["comment-users", commentUserIds],
    queryFn: async () => {
      if (commentUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, anonymous_name, is_admin, username").in("user_id", commentUserIds);
      return data || [];
    },
    enabled: commentUserIds.length > 0,
  });

  const isCreatorAdmin = (userId: string) => creators?.find((c) => c.user_id === userId)?.is_admin || false;
  const getCreatorAvatar = (userId: string) => (creators?.find((c) => c.user_id === userId) as any)?.avatar || "user-1";

  const getCommentUserName = (userId: string) => {
    const u = commentUsers?.find((c) => c.user_id === userId);
    if (!u) return "Unknown";
    if (u.is_admin) return u.username || "ADMIN";
    return u.anonymous_name || "Anonymous";
  };

  const getCategoryLabel = (cat?: string) => {
    if (!cat) return null;
    return TOPIC_CATEGORIES.find((c) => c.value === cat);
  };

  // ── ACTIONS ──

  const handleLike = async (postId: string) => {
    if (!user) return;
    const isLiked = myLikes?.has(postId);
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ["my-likes"] });
    queryClient.invalidateQueries({ queryKey: ["user-posts-feed"] });
  };

  const handleTopicLike = async (topicId: string) => {
    if (!user) return;
    const isLiked = myTopicLikes?.has(topicId);
    if (isLiked) {
      await supabase.from("topic_likes").delete().eq("topic_id", topicId).eq("user_id", user.id);
    } else {
      await supabase.from("topic_likes").insert({ topic_id: topicId, user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ["my-topic-likes"] });
    queryClient.invalidateQueries({ queryKey: ["user-topics-feed"] });
  };

  const handleDelete = async (item: UnifiedItem) => {
    if (item.type === "post") {
      if (item.attachments.length > 0) {
        await supabase.storage.from("post-attachments").remove(item.attachments);
      }
      const { error } = await supabase.from("posts").delete().eq("id", item.id);
      if (error) toast.error("Failed to delete");
      else { toast.success("Post deleted"); queryClient.invalidateQueries({ queryKey: ["user-posts-feed"] }); }
    } else {
      const { error } = await supabase.from("topics").delete().eq("id", item.id);
      if (error) toast.error("Failed to delete topic");
      else { toast.success("Topic deleted"); queryClient.invalidateQueries({ queryKey: ["user-topics-feed"] }); }
    }
  };

  const handleUpdate = async (item: UnifiedItem) => {
    if (!editContent.trim()) return;
    if (item.type === "post") {
      const { error } = await supabase.from("posts").update({ content: editContent.trim() }).eq("id", item.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Post updated"); queryClient.invalidateQueries({ queryKey: ["user-posts-feed"] }); }
    } else {
      const { error } = await supabase.from("topics").update({ content: editContent.trim() }).eq("id", item.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Topic updated"); queryClient.invalidateQueries({ queryKey: ["user-topics-feed"] }); }
    }
    setEditingPost(null);
    setEditContent("");
  };

  const handleReport = async (itemId: string, itemType: "post" | "topic" = "post") => {
    if (!user || !reportReason.trim()) return;
    const item = unified.find((u) => u.id === itemId);
    const dbReportType = itemType === "post" ? "post" : "message";
    const reasonWithRef = itemType === "topic"
      ? `${reportReason.trim()} [topic:${itemId}]`
      : reportReason.trim();
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_post_id: itemType === "post" ? itemId : null,
      reported_user_id: item?.user_id || null,
      report_type: dbReportType,
      reason: reasonWithRef,
    });
    if (error) { toast.error("Failed to report"); console.error(error); }
    else {
      toast.success("Report submitted — admin notified");
      setReportingPost(null);
      setReportReason("");
      queryClient.invalidateQueries({ queryKey: ["my-reports-posts"] });
    }
  };

  const handleUndoReport = async (reportId: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) { toast.error("Failed to undo report"); }
    else { toast.success("Report withdrawn"); queryClient.invalidateQueries({ queryKey: ["my-reports-posts"] }); }
  };

  const handleComment = async (postId: string) => {
    if (!user || !commentText.trim()) return;
    setPostingComment(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: commentText.trim(),
    });
    if (error) toast.error("Failed to comment");
    else {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["user-posts-feed"] });
    }
    setPostingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (error) toast.error("Failed");
    else {
      queryClient.invalidateQueries({ queryKey: ["post-comments"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts-feed"] });
    }
  };

  const handlePost = async () => {
    if (!user || !newContent.trim()) return;
    setPosting(true);
    let attachmentPaths: string[] = [];
    if (selectedFiles.length > 0) {
      setUploading(true);
      for (const file of selectedFiles) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("post-attachments").upload(path, file);
        if (!error) attachmentPaths.push(path);
      }
      setUploading(false);
    }
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: newContent.trim(),
      location: newLocation.trim() || null,
      attachments: attachmentPaths,
    });
    if (error) {
      toast.error("Failed to post");
    } else {
      toast.success("Posted!");
      await supabase.from("activity_logs").insert({ user_id: user.id, action: "post_created", details: { content_preview: newContent.trim().slice(0, 50) } });
      setNewContent(""); setNewLocation(""); setSelectedFiles([]); setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["user-posts-feed"] });
    }
    setPosting(false);
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("post-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const isImageFile = (path: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);

  const Layout = isAdminRoute ? AdminLayout : UserLayout;
  const topicPrefix = isAdminRoute ? "/admin/topic" : "/topic";

  return (
    <Layout>
      <PageHeader title={isMine ? "YOUR POSTS" : "ALL POSTS"} description={isMine ? "ALL YOUR POSTS & TOPICS" : `COMMUNITY FEED${regionFilter && userLocation ? ` — NEAR ${userLocation.toUpperCase()}` : " — GLOBAL"}`}>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {!isMine && userLocation && (
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                if (regionFilter) newParams.set("region", "off");
                else newParams.delete("region");
                setSearchParams(newParams);
              }}
              className={`text-[9px] sm:text-[10px] border px-1.5 sm:px-2 py-1 transition-none ${
                regionFilter
                  ? "text-foreground border-foreground"
                  : "text-muted-foreground border-border hover:text-foreground hover:border-foreground"
              }`}
            >
              {regionFilter ? "[📍 NEARBY]" : "[🌐 GLOBAL]"}
            </button>
          )}
          <button
            onClick={() => setSearchParams(isMine ? {} : { mine: "true" })}
            className="text-[9px] sm:text-[10px] text-muted-foreground border border-border px-1.5 sm:px-2 py-1 hover:text-foreground hover:border-foreground transition-none"
          >
            {isMine ? "[ALL]" : "[MINE]"}
          </button>
          <button
            onClick={markAllPostsRead}
            className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground border border-border px-1.5 sm:px-2 py-1 hover:text-foreground hover:border-foreground transition-none"
          >
            <CheckCheck className="h-3 w-3" />
            <span className="hidden sm:inline">MARK READ</span>
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 text-[9px] sm:text-[10px] text-foreground border border-foreground px-1.5 sm:px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">NEW POST</span>
            <span className="sm:hidden">NEW</span>
          </button>
        </div>
      </PageHeader>

      <div className="px-3 sm:px-4 py-4">
        {/* Search */}
        <div className="relative mb-3 sm:mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, username, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border pl-8 pr-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 tracking-wider"
          />
        </div>
        {/* Create Post Form */}
        {showCreate && (
          <div className="terminal-box mb-4">
            <div className="terminal-header">CREATE POST</div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground resize-none mb-2"
            />
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Location (optional)"
              className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground placeholder:text-muted-foreground mb-2"
            />
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-1">
                <Paperclip className="h-3 w-3" /> ATTACH FILES
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); setSelectedFiles((prev) => [...prev, ...files]); }} />
              <span className="text-[9px] text-muted-foreground">{selectedFiles.length > 0 ? `${selectedFiles.length} file(s)` : "Images, PDFs, docs"}</span>
            </div>
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] text-foreground border border-border px-2 py-0.5">
                    {f.type.startsWith("image/") ? <Image className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                    <span className="max-w-[100px] truncate">{f.name}</span>
                    <button onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-destructive"><X className="h-2.5 w-2.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handlePost} disabled={posting || !newContent.trim()} className="text-sm text-foreground border border-foreground px-4 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-30">
              {uploading ? "[UPLOADING...]" : posting ? "[POSTING...]" : "[POST]"}
            </button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-4">
          {unified.length} ITEMS
        </p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">LOADING FEED</p>
        ) : unified.length > 0 ? (
          <div className="space-y-2">
            {unified.map((item) => {
              const isAdmin = isCreatorAdmin(item.user_id);
              const isOwner = item.user_id === user?.id;
              const isLiked = item.type === "post" ? myLikes?.has(item.id) : false;
              const isCommentsOpen = expandedComments === item.id;
              const commentsExpanded = !!expandedCommentThreads[item.id];
              const visibleComments = commentsExpanded ? (comments || []) : (comments || []).slice(0, 3);
              const hiddenCommentsCount = Math.max((comments?.length || 0) - 3, 0);
              const catInfo = getCategoryLabel(item.category);

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`p-3 border transition-none ${
                    item.is_announcement || isCreatorAdmin(item.user_id)
                      ? "admin-box border-[hsl(var(--admin-border))]"
                      : item.is_pinned
                      ? "border-foreground/20 bg-foreground/5"
                      : "border-border"
                  }`}
                >
                  {/* Type badge */}
                  <div className="flex items-center gap-2 mb-1">
                    {item.type === "topic" ? (
                      <span className="text-[9px] text-muted-foreground tracking-wider flex items-center gap-1">
                        <Hash className="h-2.5 w-2.5" /> TOPIC
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground tracking-wider flex items-center gap-1">
                        <FileText className="h-2.5 w-2.5" /> POST
                      </span>
                    )}
                    {catInfo && (
                      <span className="text-[9px] text-foreground/70 tracking-wider flex items-center gap-0.5 border border-border px-1.5 py-0.5">
                        <Tag className="h-2 w-2" />
                        {catInfo.label.toUpperCase()}
                      </span>
                    )}
                    {item.is_announcement && (
                      <span className="text-[9px] admin-text tracking-[0.3em]">◆ ANNOUNCEMENT</span>
                    )}
                    {item.is_pinned && !item.is_announcement && (
                      <span className="text-[9px] text-foreground tracking-[0.3em]">📌 PINNED</span>
                    )}
                  </div>

                  {/* Title for topics */}
                  {item.title && (
                    <button
                      onClick={() => navigate(`${topicPrefix}/${item.id}`)}
                      className={`text-xs font-bold mb-1 hover:underline text-left block tracking-wider ${isCreatorAdmin(item.user_id) ? "admin-text glow-admin" : "text-foreground"}`}
                    >
                      {item.title}
                    </button>
                  )}

                  {/* Content or Edit form */}
                  {editingPost === item.id ? (
                    <div className="mb-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-foreground resize-none mb-1"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(item)} disabled={!editContent.trim()} className="text-[10px] text-foreground border border-foreground px-2 py-0.5 hover:bg-foreground hover:text-primary-foreground disabled:opacity-30">[SAVE]</button>
                        <button onClick={() => { setEditingPost(null); setEditContent(""); }} className="text-[10px] text-muted-foreground border border-border px-2 py-0.5 hover:text-foreground">[CANCEL]</button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm mb-2 whitespace-pre-wrap ${isCreatorAdmin(item.user_id) ? "admin-text-accent" : "text-foreground"}`}>{item.content}</p>
                  )}

                  {/* Attachments (posts only) */}
                  {item.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {item.attachments.map((path, i) => {
                        const url = getPublicUrl(path);
                        if (isImageFile(path)) {
                          return (
                            <button key={i} onClick={() => setPreviewUrl(url)} className="relative group border border-border overflow-hidden w-24 h-24">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                <Eye className="h-4 w-4 text-foreground" />
                              </div>
                            </button>
                          );
                        }
                        return (
                          <div key={i} className="flex items-center gap-1 text-[10px] text-foreground border border-border px-2 py-1">
                            <FileText className="h-3 w-3" />
                            <span className="max-w-[120px] truncate">{path.split("/").pop()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground mb-1 flex-wrap">
                    <ProfileAvatar avatarId={getCreatorAvatar(item.user_id)} isAdmin={isAdmin} size={18} />
                    <span className={isAdmin ? "admin-text glow-admin" : ""}>
                      {getCreatorName(item.user_id)}
                      {isAdmin && <span className="admin-badge ml-1">ADMIN</span>}
                    </span>
                    {item.location && (
                      <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{item.location}</span>
                    )}
                    {item.type === "topic" && (
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />{item.views_count ?? 0}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Action bar */}
                  <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground pt-1 border-t border-border flex-wrap">
                    {/* Like */}
                    {item.type === "post" ? (
                      <button
                        onClick={() => handleLike(item.id)}
                        className={`flex items-center gap-0.5 transition-none ${isLiked ? "text-destructive" : "hover:text-foreground"}`}
                      >
                        <Heart className={`h-2.5 w-2.5 ${isLiked ? "fill-current" : ""}`} />
                        {item.likes_count}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleTopicLike(item.id)}
                        className={`flex items-center gap-0.5 transition-none ${myTopicLikes?.has(item.id) ? "text-destructive" : "hover:text-foreground"}`}
                      >
                        <Heart className={`h-2.5 w-2.5 ${myTopicLikes?.has(item.id) ? "fill-current" : ""}`} />
                        {item.likes_count}
                      </button>
                    )}

                    {/* Comments (posts) / Replies (topics) */}
                    {item.type === "post" ? (
                      <button
                        onClick={() => setExpandedComments(isCommentsOpen ? null : item.id)}
                        className="flex items-center gap-0.5 hover:text-foreground"
                      >
                        <MessageSquare className="h-2.5 w-2.5" />
                        {item.comments_count}
                        {isCommentsOpen ? <ChevronUp className="h-2 w-2" /> : <ChevronDown className="h-2 w-2" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`${topicPrefix}/${item.id}`)}
                        className="flex items-center gap-0.5 hover:text-foreground"
                      >
                        <MessageSquare className="h-2.5 w-2.5" />
                        {item.replies_count ?? 0} replies
                      </button>
                    )}

                    {/* View topic */}
                    {item.type === "topic" && (
                      <button
                        onClick={() => navigate(`${topicPrefix}/${item.id}`)}
                        className="flex items-center gap-0.5 hover:text-foreground"
                      >
                        <Eye className="h-2.5 w-2.5" />
                        VIEW
                      </button>
                    )}

                    {/* Report (any post/topic — not own) */}
                    {!isOwner && (() => {
                      const existingReport = myReports?.find((r) => {
                        if (item.type === "post") return r.reported_post_id === item.id;
                        return r.report_type === "message" && r.reason?.includes(`[topic:${item.id}]`);
                      });
                      return existingReport ? (
                        <button onClick={() => handleUndoReport(existingReport.id)} className="flex items-center gap-0.5 text-warning" title="Undo Report">
                          <Flag className="h-2.5 w-2.5 fill-current" /> <span className="hidden sm:inline">UNDO</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setReportingPost(reportingPost === item.id ? null : item.id)}
                          className="flex items-center gap-0.5 hover:text-warning"
                          title="Report"
                        >
                          <Flag className="h-2.5 w-2.5" /> <span className="hidden sm:inline">REPORT</span>
                        </button>
                      );
                    })()}

                    {/* Edit (own) */}
                    {(isOwner || userIsAdmin) && (
                      <button
                        onClick={() => { setEditingPost(item.id); setEditContent(item.content); }}
                        className="flex items-center gap-0.5 hover:text-foreground"
                        title="Edit"
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">EDIT</span>
                      </button>
                    )}

                    {/* Delete (own) */}
                    {(isOwner || userIsAdmin) && (
                      <button
                        onClick={() => handleDelete(item)}
                        className="flex items-center gap-0.5 text-destructive hover:underline ml-auto"
                        title="Delete"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">DELETE</span>
                      </button>
                    )}
                  </div>

                  {/* Report form */}
                  {reportingPost === item.id && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground mb-1">&gt; REPORT REASON:</p>
                      <div className="flex gap-2">
                        <input
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          placeholder="Why are you reporting this?"
                          className="flex-1 bg-input border border-border text-foreground text-[11px] px-2 py-1 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={() => handleReport(item.id, item.type)}
                          disabled={!reportReason.trim()}
                          className="text-[10px] text-warning border border-warning px-2 py-0.5 hover:bg-warning hover:text-background disabled:opacity-30"
                        >
                          [SUBMIT]
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comments section (posts only) */}
                  {isCommentsOpen && item.type === "post" && (
                    <div className="mt-2 pt-2 border-t border-border">
                      {comments && comments.length > 0 ? (
                        <div className="space-y-1.5 mb-2">
                          {visibleComments.map((c: any) => (
                            <div key={c.id} className="flex items-start gap-2 text-[11px]">
                              <span className="text-foreground shrink-0 font-bold">{getCommentUserName(c.user_id)}</span>
                              <span className="text-secondary-foreground flex-1">{c.content}</span>
                              <span className="text-muted-foreground text-[9px] shrink-0">
                                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                              </span>
                              {c.user_id === user?.id && (
                                <button onClick={() => handleDeleteComment(c.id)} className="text-destructive shrink-0">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {hiddenCommentsCount > 0 && (
                            <button
                              onClick={() => setExpandedCommentThreads((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="text-[10px] text-muted-foreground hover:text-foreground tracking-wider"
                            >
                              {commentsExpanded ? "SHOW LESS" : `EXPAND COMMENTS (+${hiddenCommentsCount})`}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mb-2">No comments yet</p>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 bg-input border border-border text-foreground text-[11px] px-2 py-1 focus:outline-none focus:border-foreground placeholder:text-muted-foreground"
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(item.id); } }}
                        />
                        <button
                          onClick={() => handleComment(item.id)}
                          disabled={postingComment || !commentText.trim()}
                          className="text-foreground border border-foreground px-2 py-0.5 hover:bg-foreground hover:text-primary-foreground disabled:opacity-30"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="terminal-box text-center py-8">
            <p className="text-xs text-muted-foreground mb-2">NO POSTS OR TOPICS YET</p>
            <p className="text-[10px] text-muted-foreground">Create a post or start a topic in any category</p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-2xl max-h-[80vh] p-2">
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-2 -right-2 text-foreground border border-foreground bg-background p-1">
              <X className="h-4 w-4" />
            </button>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[75vh] object-contain border border-border" onContextMenu={(e) => e.preventDefault()} draggable={false} />
            <p className="text-[9px] text-muted-foreground text-center mt-2">VIEW ONLY — DOWNLOAD DISABLED</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
