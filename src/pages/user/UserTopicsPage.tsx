import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { MessageSquare, Eye, Clock, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CreateTopicDialog } from "@/components/CreateTopicDialog";

export default function UserTopicsPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data: topics, isLoading } = useQuery({
    queryKey: ["user-topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("is_announcement", { ascending: false })
        .order("last_activity_at", { ascending: false });
      return data || [];
    },
  });

  const creatorIds = [...new Set(topics?.map((t) => t.user_id) || [])];
  const { data: creators } = useQuery({
    queryKey: ["topic-creators", creatorIds],
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

  return (
    <UserLayout>
      <PageHeader title="TOPICS" description="BROWSE & JOIN NEARBY DISCUSSIONS">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none"
        >
          <Plus className="h-3 w-3" />
          NEW TOPIC
        </button>
      </PageHeader>

      <div className="px-4 py-6">
        <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-4">
          {topics?.length ?? 0} ACTIVE THREADS
        </p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">SCANNING NETWORK</p>
        ) : topics && topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {topics.map((topic, index) => {
              const isAdmin = isCreatorAdmin(topic.user_id);
              const isAnnouncement = topic.is_announcement;

              return (
                <button
                  key={topic.id}
                  onClick={() => navigate(`/topic/${topic.id}`)}
                  className={`text-left p-3 border transition-none group flex flex-col gap-1.5 ${
                    isAnnouncement
                      ? "admin-box border-[hsl(var(--admin-border))] col-span-1 md:col-span-2"
                      : "border-border hover:border-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  {isAnnouncement && (
                    <p className="text-[9px] admin-text tracking-[0.3em]">◆ SYSTEM ANNOUNCEMENT</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">[{String(index + 1).padStart(2, "0")}]</span>
                    <span className={`text-sm ${isAnnouncement ? "admin-text font-bold" : "text-foreground"}`}>
                      {topic.title}
                    </span>
                  </div>
                  <span className={`text-[10px] ${isAdmin ? "admin-text glow-admin" : "text-muted-foreground"}`}>
                    {getCreatorName(topic.user_id)}
                    {isAdmin && <span className="admin-badge ml-1">ADMIN</span>}
                  </span>
                  {topic.location && (
                    <span className="text-[10px] text-muted-foreground">📍 {topic.location}</span>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{topic.replies_count}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{topic.views_count}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(topic.last_activity_at), { addSuffix: true })}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="terminal-box text-center py-8">
            <p className="text-xs text-muted-foreground mb-2">NO TOPICS FOUND</p>
            <p className="text-[10px] text-muted-foreground">Be the first to start a discussion</p>
          </div>
        )}
      </div>

      {showCreate && <CreateTopicDialog onClose={() => setShowCreate(false)} />}
    </UserLayout>
  );
}
