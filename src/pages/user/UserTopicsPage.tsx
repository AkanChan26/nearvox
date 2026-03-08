import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserLayout } from "@/components/UserLayout";
import { PageHeader } from "@/components/PageHeader";
import { MessageSquare, Eye, Clock, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CreateTopicDialog } from "@/components/CreateTopicDialog";
import { TOPIC_CATEGORIES, getCategoryLabel, getCategoryIcon } from "@/lib/categories";
import { useAuth } from "@/contexts/AuthContext";

export default function UserTopicsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const baseTopicsPath = isAdmin && location.pathname.startsWith("/admin") ? "/admin/topics" : "/user/topics";
  const topicPathPrefix = isAdmin && location.pathname.startsWith("/admin") ? "/admin/topic" : "/topic";
  const categoryFilter = searchParams.get("category") || "";
  const regionFilter = searchParams.get("region") !== "off";
  const [showCreate, setShowCreate] = useState(false);

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

  // Helper: check if location matches user's region
  const isNearby = (itemLocation: string | null | undefined): boolean => {
    if (!userLocation || !itemLocation) return true;
    const norm = (s: string) => s.toLowerCase().trim();
    const userParts = norm(userLocation).split(/[,\s]+/);
    const itemParts = norm(itemLocation).split(/[,\s]+/);
    return userParts.some((part) => itemParts.some((ip) => ip.includes(part) || part.includes(ip)));
  };

  const { data: topics, isLoading } = useQuery({
    queryKey: ["user-topics", categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("topics")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("is_announcement", { ascending: false })
        .order("last_activity_at", { ascending: false });
      if (categoryFilter) {
        query = query.eq("category", categoryFilter as any);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const filteredTopics = useMemo(() => {
    if (!topics) return [];
    if (!regionFilter || !userLocation) return topics;
    return topics.filter((t) => isNearby(t.location));
  }, [topics, regionFilter, userLocation]);

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

  const activeCategoryLabel = categoryFilter
    ? getCategoryLabel(categoryFilter)
    : "ALL TOPICS";

  return (
    <UserLayout>
      <PageHeader title="TOPICS" description={`${activeCategoryLabel.toUpperCase()}${regionFilter && userLocation ? ` — NEAR ${userLocation.toUpperCase()}` : " — GLOBAL"}`}>
        <div className="flex items-center gap-2">
          {userLocation && (
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                if (regionFilter) newParams.set("region", "off");
                else newParams.delete("region");
                setSearchParams(newParams);
              }}
              className={`text-[10px] border px-2 py-1 transition-none ${
                regionFilter
                  ? "text-foreground border-foreground"
                  : "text-muted-foreground border-border hover:text-foreground hover:border-foreground"
              }`}
            >
              {regionFilter ? "[📍 NEARBY]" : "[🌐 GLOBAL]"}
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none"
          >
            <Plus className="h-3 w-3" />
            NEW TOPIC
          </button>
        </div>
      </PageHeader>

      <div className="px-4 py-4">
        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-1 mb-4">
          <button
            onClick={() => navigate(baseTopicsPath)}
            className={`text-[9px] px-2 py-1 border transition-none ${
              !categoryFilter
                ? "border-foreground text-foreground bg-foreground/10"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            ALL
          </button>
          {TOPIC_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => navigate(`${baseTopicsPath}?category=${cat.value}`)}
              className={`text-[9px] px-2 py-1 border transition-none ${
                categoryFilter === cat.value
                  ? "border-foreground text-foreground bg-foreground/10"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {cat.label.split(" & ")[0].toUpperCase()}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-4">
          {filteredTopics.length} THREADS
        </p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">SCANNING NETWORK</p>
        ) : filteredTopics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredTopics.map((topic, index) => {
              const isAdmin = isCreatorAdmin(topic.user_id);
              const isAnnouncement = topic.is_announcement;
              const CatIcon = getCategoryIcon((topic as any).category || "discussions");

              return (
                <button
                  key={topic.id}
                  onClick={() => navigate(`${topicPathPrefix}/${topic.id}`)}
                  className={`text-left p-3 border transition-none group flex flex-col gap-1.5 ${
                    isAnnouncement || isAdmin
                      ? "admin-box border-[hsl(var(--admin-border))]" + (isAnnouncement ? " col-span-1 md:col-span-2" : "")
                      : "border-border hover:border-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  {isAnnouncement && (
                    <p className="text-[9px] admin-text tracking-[0.3em]">◆ SYSTEM ANNOUNCEMENT</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">[{String(index + 1).padStart(2, "0")}]</span>
                    <CatIcon className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-xs tracking-wider ${isAnnouncement || isAdmin ? "admin-text glow-admin font-bold" : "text-foreground"}`}>
                      {topic.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] ${isAdmin ? "admin-text glow-admin" : "text-muted-foreground"}`}>
                      {getCreatorName(topic.user_id)}
                      {isAdmin && <span className="admin-badge ml-1">ADMIN</span>}
                    </span>
                    <span className="text-[9px] text-muted-foreground border border-border px-1">
                      {getCategoryLabel((topic as any).category || "discussions")}
                    </span>
                  </div>
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

      {showCreate && <CreateTopicDialog onClose={() => setShowCreate(false)} defaultCategory={categoryFilter || undefined} />}
    </UserLayout>
  );
}
