import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { MessageSquare, Heart, Clock, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function UserPostsPage() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["user-posts-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("is_pinned", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: pinnedPosts } = useQuery({
    queryKey: ["user-pinned-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("is_pinned", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const creatorIds = [...new Set([
    ...(posts?.map((p) => p.user_id) || []),
    ...(pinnedPosts?.map((p) => p.user_id) || []),
  ])];

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

  const allPosts = [...(pinnedPosts || []), ...(posts || [])];

  return (
    <UserLayout>
      <PageHeader title="POSTS" description="COMMUNITY POSTS & UPDATES" />

      <div className="px-4 py-6">
        <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-4">
          {allPosts.length} POSTS
        </p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">LOADING FEED</p>
        ) : allPosts.length > 0 ? (
          <div className="space-y-2">
            {allPosts.map((post) => {
              const isAdmin = isCreatorAdmin(post.user_id);
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
                  <p className="text-sm text-foreground mb-2">{post.content}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className={isAdmin ? "admin-text glow-admin" : ""}>
                      {getCreatorName(post.user_id)}
                      {isAdmin && <span className="admin-badge ml-1">ADMIN</span>}
                    </span>
                    {post.location && (
                      <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{post.location}</span>
                    )}
                    <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{post.likes_count}</span>
                    <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{post.comments_count}</span>
                    <span className="flex items-center gap-0.5 ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="terminal-box text-center py-8">
            <p className="text-xs text-muted-foreground mb-2">NO POSTS YET</p>
            <p className="text-[10px] text-muted-foreground">Check back soon for community updates</p>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
