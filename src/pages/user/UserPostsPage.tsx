import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  MessageSquare, Heart, Clock, MapPin, Plus, Trash2,
  Image, FileText, Paperclip, X, Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function UserPostsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["user-posts-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch user's likes
  const { data: myLikes } = useQuery({
    queryKey: ["my-likes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user!.id);
      return new Set(data?.map((l: any) => l.post_id) || []);
    },
    enabled: !!user,
  });

  const creatorIds = [...new Set(posts?.map((p) => p.user_id) || [])];
  const { data: creators } = useQuery({
    queryKey: ["post-creators", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, anonymous_name, is_admin, username")
        .in("user_id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });

  const getCreatorName = (userId: string) => {
    const creator = creators?.find((c) => c.user_id === userId);
    if (!creator) return "Unknown";
    if (creator.is_admin) return creator.username || "ADMIN";
    return creator.anonymous_name || "Anonymous";
  };

  const isCreatorAdmin = (userId: string) => {
    return creators?.find((c) => c.user_id === userId)?.is_admin || false;
  };

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

  const handleDelete = async (postId: string, attachments?: string[]) => {
    // Delete attachments from storage
    if (attachments && attachments.length > 0) {
      await supabase.storage.from("post-attachments").remove(attachments);
    }
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["user-posts-feed"] });
    }
  };

  const handlePost = async () => {
    if (!user || !newContent.trim()) return;
    setPosting(true);

    let attachmentPaths: string[] = [];

    // Upload files
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
      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "post_created",
        details: { content_preview: newContent.trim().slice(0, 50) },
      });
      setNewContent("");
      setNewLocation("");
      setSelectedFiles([]);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["user-posts-feed"] });
    }
    setPosting(false);
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("post-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const isImage = (path: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);

  return (
    <UserLayout>
      <PageHeader title="POSTS" description="COMMUNITY POSTS & UPDATES">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none"
        >
          <Plus className="h-3 w-3" />
          NEW POST
        </button>
      </PageHeader>

      <div className="px-4 py-6">
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

            {/* File attachments */}
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-1"
              >
                <Paperclip className="h-3 w-3" />
                ATTACH FILES
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
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] text-foreground border border-border px-2 py-0.5">
                    {f.type.startsWith("image/") ? <Image className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                    <span className="max-w-[100px] truncate">{f.name}</span>
                    <button onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handlePost}
              disabled={posting || !newContent.trim()}
              className="text-sm text-foreground border border-foreground px-4 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-30"
            >
              {uploading ? "[UPLOADING...]" : posting ? "[POSTING...]" : "[POST]"}
            </button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-4">
          {posts?.length ?? 0} POSTS
        </p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">LOADING FEED</p>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map((post) => {
              const isAdmin = isCreatorAdmin(post.user_id);
              const isOwner = post.user_id === user?.id;
              const isLiked = myLikes?.has(post.id);
              const attachments = (post as any).attachments as string[] || [];

              return (
                <div
                  key={post.id}
                  className={`p-3 border transition-none ${
                    post.is_announcement
                      ? "admin-box border-[hsl(var(--admin-border))]"
                      : post.is_pinned
                      ? "border-foreground/20 bg-foreground/5"
                      : "border-border"
                  }`}
                >
                  {post.is_announcement && (
                    <p className="text-[9px] admin-text tracking-[0.3em] mb-1">◆ ANNOUNCEMENT</p>
                  )}
                  {post.is_pinned && !post.is_announcement && (
                    <p className="text-[9px] text-foreground tracking-[0.3em] mb-1">📌 PINNED</p>
                  )}
                  <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">{post.content}</p>

                  {/* Attachments display */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {attachments.map((path, i) => {
                        const url = getPublicUrl(path);
                        if (isImage(path)) {
                          return (
                            <button
                              key={i}
                              onClick={() => setPreviewUrl(url)}
                              className="relative group border border-border overflow-hidden w-24 h-24"
                            >
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
                            <span className="text-muted-foreground">(view only)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className={isAdmin ? "admin-text glow-admin" : ""}>
                      {getCreatorName(post.user_id)}
                      {isAdmin && <span className="admin-badge ml-1">ADMIN</span>}
                    </span>
                    {post.location && (
                      <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{post.location}</span>
                    )}

                    {/* Like button */}
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-0.5 transition-none ${isLiked ? "text-destructive" : "hover:text-foreground"}`}
                    >
                      <Heart className={`h-2.5 w-2.5 ${isLiked ? "fill-current" : ""}`} />
                      {post.likes_count}
                    </button>

                    <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{post.comments_count}</span>

                    <span className="flex items-center gap-0.5 ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>

                    {/* Delete button for owner */}
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(post.id, attachments)}
                        className="text-destructive hover:underline flex items-center gap-0.5"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        DEL
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="terminal-box text-center py-8">
            <p className="text-xs text-muted-foreground mb-2">NO POSTS YET</p>
            <p className="text-[10px] text-muted-foreground">Be the first to post something</p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[80vh] p-2">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-2 -right-2 text-foreground border border-foreground bg-background p-1"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[75vh] object-contain border border-border"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
            <p className="text-[9px] text-muted-foreground text-center mt-2">VIEW ONLY — DOWNLOAD DISABLED</p>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
