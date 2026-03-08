import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Image, FileText, Eye } from "lucide-react";
import { useState } from "react";

export default function PostsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const getCreatorInfo = (userId: string) => {
    const creator = creators?.find((c) => c.user_id === userId);
    return {
      name: creator?.is_admin ? creator.username : creator?.anonymous_name || creator?.username || "Unknown",
      isAdmin: creator?.is_admin || false,
    };
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
                  <p className={`text-xs mb-1.5 pl-2 border-l ${
                    isAdmin ? "border-admin-border admin-text/80" : "border-border text-secondary-foreground"
                  }`}>{post.content}</p>

                  {/* Attachments */}
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
                    <span className="text-muted-foreground">LIKES:{post.likes_count}</span>
                    <span className="text-muted-foreground">COMMENTS:{post.comments_count}</span>
                    {attachments.length > 0 && <span className="text-muted-foreground">FILES:{attachments.length}</span>}
                    <span className="ml-auto space-x-2">
                      <button onClick={() => handlePin(post.id, post.is_pinned)} className={`hover:underline ${isAdmin ? "admin-text" : "text-foreground"}`}>
                        [{post.is_pinned ? "UNPIN" : "PIN"}]
                      </button>
                      <button onClick={() => handleDelete(post.id, attachments)} className="text-destructive hover:underline">[DELETE]</button>
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO POSTS FOUND</p>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
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
