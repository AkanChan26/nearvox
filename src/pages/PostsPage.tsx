import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PostsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, author:profiles!posts_user_id_fkey(username, is_admin)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (postId: string) => {
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
              const isAdmin = post.author?.is_admin;
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
                      {post.author?.username || "Unknown"}
                    </span>
                    {isAdmin && <span className="admin-badge">ADMIN</span>}
                    {post.is_pinned && <span className={isAdmin ? "admin-text text-[9px]" : "text-foreground"}>[PINNED]</span>}
                    {post.is_announcement && <span className={isAdmin ? "admin-text text-[9px]" : "text-foreground"}>[ANNOUNCEMENT]</span>}
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
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="text-muted-foreground">LIKES:{post.likes_count}</span>
                    <span className="text-muted-foreground">COMMENTS:{post.comments_count}</span>
                    <span className="ml-auto space-x-2">
                      <button onClick={() => handlePin(post.id, post.is_pinned)} className={`hover:underline ${isAdmin ? "admin-text" : "text-foreground"}`}>[{post.is_pinned ? "UNPIN" : "PIN"}]</button>
                      <button onClick={() => handleDelete(post.id)} className="text-destructive hover:underline">[DELETE]</button>
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
    </AdminLayout>
  );
}
