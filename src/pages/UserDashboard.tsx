import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare, LogOut, ChevronRight,
  Terminal, TrendingUp, Hash, Plus,
  Megaphone, Mail, Settings, Ticket, FileText, Bell, LayoutGrid,
  Activity, Wifi,
} from "lucide-react";
import { CreateTopicDialog } from "@/components/CreateTopicDialog";
import { TOPIC_CATEGORIES } from "@/lib/categories";
import { ProfileAvatar } from "@/components/Avatars";

const MODULE_DESCRIPTIONS: Record<string, string> = {
  job_hunting: "Find work or hire locally",
  promotions: "Promote your business",
  discussions: "Talk about anything",
  confessions: "Share anonymously",
  local_help: "Help your community",
  marketplace: "Buy & sell locally",
  events: "Discover local events",
  alerts: "Safety & area warnings",
  ideas: "Share your next big idea",
};

export default function UserDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: trendingTopics } = useQuery({
    queryKey: ["trending-topics", profile?.location],
    queryFn: async () => {
      let query = supabase
        .from("topics")
        .select("id, title, replies_count, views_count, category, location")
        .order("replies_count", { ascending: false })
        .limit(5);
      if (profile?.location) {
        query = query.ilike("location", `%${profile.location}%`);
      }
      const { data } = await query;
      if (!data || data.length === 0) {
        const { data: globalData } = await supabase
          .from("topics")
          .select("id, title, replies_count, views_count, category, location")
          .order("replies_count", { ascending: false })
          .limit(5);
        return globalData || [];
      }
      return data;
    },
    enabled: !!profile,
  });

  const { data: announcements } = useQuery({
    queryKey: ["user-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: unreadChatCount } = useQuery({
    queryKey: ["unread-chat-count", user?.id],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user!.id);
      if (!memberships || memberships.length === 0) return 0;
      let unreadCount = 0;
      for (const mem of memberships) {
        const query = supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", mem.conversation_id)
          .neq("sender_id", user!.id)
          .is("deleted_at", null);
        if (mem.last_read_at) {
          query.gt("created_at", mem.last_read_at);
        }
        const { count } = await query;
        if (count && count > 0) unreadCount += count;
      }
      return unreadCount;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: unreadNotifs } = useQuery({
    queryKey: ["unread-notification-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: recentTopics } = useQuery({
    queryKey: ["user-recent-topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, title, created_at, is_announcement, replies_count, category")
        .order("last_activity_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: topicCount } = useQuery({
    queryKey: ["total-topic-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("topics")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: userCount } = useQuery({
    queryKey: ["total-user-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  const primaryCats = TOPIC_CATEGORIES.filter((c) => ["job_hunting", "promotions", "discussions", "confessions", "local_help"].includes(c.value));
  const secondaryCats = TOPIC_CATEGORIES.filter((c) => ["marketplace", "events", "alerts", "ideas"].includes(c.value));

  return (
    <div className="min-h-screen bg-background relative terminal-grid terminal-flicker">
      <div className="fixed inset-0 scanline z-[1] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-8 sm:mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Terminal className="h-5 w-5 sm:h-7 sm:w-7 text-foreground" />
              <h1 className="text-lg sm:text-2xl text-foreground glow-text tracking-[0.35em] font-bold">NEARVOX</h1>
            </div>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground tracking-[0.6em] ml-8 sm:ml-10">ANONYMOUS NETWORK</p>
            {/* Status line */}
            <div className="flex items-center gap-4 mt-3 sm:mt-4 ml-8 sm:ml-10">
              <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground/60 tracking-wider">
                <Wifi className="h-2.5 w-2.5 text-foreground" />
                <span className="text-foreground/50">{userCount ?? "—"}</span> NODES
              </span>
              <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground/60 tracking-wider">
                <Activity className="h-2.5 w-2.5 text-foreground" />
                <span className="text-foreground/50">{topicCount ?? "—"}</span> THREADS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <ProfileAvatar avatarId={(profile as any)?.avatar} size={44} />
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground/50 tracking-[0.2em] mb-0.5">USER</p>
              <p className="text-[11px] sm:text-sm text-foreground glow-text font-bold tracking-wider truncate max-w-[120px] sm:max-w-none leading-relaxed">
                {profile?.anonymous_name || profile?.username || "..."}
              </p>
              <p className="text-[9px] text-muted-foreground/50 tracking-[0.2em] mt-1.5 mb-0.5">SECTOR</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground tracking-wider truncate max-w-[140px] sm:max-w-none">
                {profile?.location || "SET REGION"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors p-2.5 border border-border hover:border-destructive min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── PRIMARY MODULES ── */}
        <div className="mb-8 sm:mb-10">
          <p className="text-[10px] sm:text-xs text-muted-foreground tracking-[0.3em] mb-5 sm:mb-6 flex items-center gap-2">
            <span className="text-foreground">&gt;</span> NETWORK MODULES — PRIMARY
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
            {primaryCats.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => navigate(`/user/topics?category=${cat.value}`)}
                  className="text-left p-3.5 sm:p-4 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 hover:shadow-[0_0_20px_hsl(145_80%_56%/0.06)] transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] text-muted-foreground/60 font-mono">[{cat.cmd}]</span>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-foreground group-hover:glow-text tracking-wider leading-relaxed mb-1">
                    {cat.label.toUpperCase()}
                  </p>
                  <p className="text-[8px] sm:text-[9px] text-muted-foreground/50 leading-relaxed tracking-wide">
                    {MODULE_DESCRIPTIONS[cat.value]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECONDARY MODULES ── */}
        <div className="mb-8 sm:mb-10">
          <p className="text-[10px] sm:text-xs text-muted-foreground tracking-[0.3em] mb-5 sm:mb-6 flex items-center gap-2">
            <span className="text-foreground">&gt;</span> NETWORK MODULES — SECONDARY
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
            {secondaryCats.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => navigate(`/user/topics?category=${cat.value}`)}
                  className="text-left p-3 sm:p-3.5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 hover:shadow-[0_0_20px_hsl(145_80%_56%/0.06)] transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] text-muted-foreground/60 font-mono">[{cat.cmd}]</span>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-foreground group-hover:glow-text tracking-wider leading-relaxed mb-1">
                    {cat.label.toUpperCase()}
                  </p>
                  <p className="text-[8px] text-muted-foreground/50 leading-relaxed tracking-wide">
                    {MODULE_DESCRIPTIONS[cat.value]}
                  </p>
                </button>
              );
            })}
            <button
              onClick={() => navigate("/user/posts")}
              className="text-left p-3 sm:p-3.5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 hover:shadow-[0_0_20px_hsl(145_80%_56%/0.06)] transition-all duration-150 group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] text-muted-foreground/60 font-mono">[10]</span>
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <p className="text-[9px] sm:text-[10px] text-foreground group-hover:glow-text tracking-wider leading-relaxed mb-1">
                ALL POSTS
              </p>
              <p className="text-[8px] text-muted-foreground/50 leading-relaxed tracking-wide">
                Browse everything
              </p>
            </button>
          </div>
        </div>

        {/* ── PERSONAL CONTROL MODULES ── */}
        <div className="mb-10 sm:mb-14">
          <p className="text-[10px] sm:text-xs text-muted-foreground tracking-[0.3em] mb-5 sm:mb-6 flex items-center gap-2">
            <span className="text-foreground">&gt;</span> PERSONAL CONTROLS
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            {[
              { label: "NOTIFICATIONS", icon: Bell, path: "/user/notifications", badge: (unreadNotifs ?? 0) > 0 ? `${unreadNotifs} new` : undefined, pulse: (unreadNotifs ?? 0) > 0 },
              { label: "YOUR POSTS", icon: FileText, path: "/user/posts?mine=true" },
              { label: "ANNOUNCE", icon: Megaphone, path: "/user/announcements", badge: announcements && announcements.length > 0 ? `${announcements.length} active` : undefined },
              { label: "MESSAGES", icon: Mail, path: "/user/messages", badge: (unreadChatCount ?? 0) > 0 ? `${unreadChatCount} unread` : undefined, pulse: (unreadChatCount ?? 0) > 0 },
              { label: "BOARDS", icon: LayoutGrid, path: "/user/boards" },
              { label: "INVITES", icon: Ticket, path: "/user/invites" },
              { label: "SETTINGS", icon: Settings, path: "/user/settings" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="text-left p-3.5 sm:p-4 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 hover:shadow-[0_0_15px_hsl(145_80%_56%/0.05)] transition-all duration-150 group relative"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {item.pulse && (
                      <span className="h-2 w-2 rounded-full bg-foreground animate-pulse shadow-[0_0_6px_hsl(145_80%_56%/0.5)]" />
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-foreground group-hover:glow-text tracking-wider leading-relaxed">
                    {item.label}
                  </p>
                  {item.badge && (
                    <p className="text-[9px] text-foreground/60 mt-1.5 tracking-wide">{item.badge}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── INFO PANELS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
          {/* Left Column */}
          <div className="space-y-5 sm:space-y-8">
            {/* Announcements */}
            {announcements && announcements.length > 0 && (
              <div className="border border-[hsl(var(--admin-border))] bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <Megaphone className="h-4 w-4 text-[hsl(var(--admin))]" />
                  <span className="text-xs sm:text-sm admin-text tracking-[0.3em]">SYSTEM ANNOUNCEMENTS</span>
                  <button onClick={() => navigate("/user/announcements")} className="text-[10px] text-muted-foreground hover:text-foreground ml-auto tracking-wider">[VIEW ALL]</button>
                </div>
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((ann: any) => (
                    <div key={ann.id} className="admin-box px-4 py-3.5">
                      <p className="text-xs sm:text-sm admin-text font-bold leading-relaxed">{ann.title}</p>
                      <p className="text-[10px] sm:text-xs text-secondary-foreground truncate mt-1.5 leading-relaxed">{ann.content}</p>
                      <p className="text-[9px] text-muted-foreground mt-2">
                        {new Date(ann.created_at).toLocaleDateString()} · TARGET: {ann.target_location}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending */}
            <div className="border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <TrendingUp className="h-4 w-4 text-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground tracking-[0.3em]">
                  TRENDING IN {(profile?.location || "GLOBAL").toUpperCase()}
                </span>
              </div>
              {trendingTopics && trendingTopics.length > 0 ? (
                <div className="space-y-1">
                  {trendingTopics.map((topic: any) => (
                    <button
                      key={topic.id}
                      onClick={() => navigate(`/topic/${topic.id}`)}
                      className="w-full text-left flex items-center gap-3 hover:bg-foreground/5 px-3 py-3 transition-none group"
                    >
                      <Hash className="h-3.5 w-3.5 text-foreground shrink-0" />
                      <span className="text-xs sm:text-sm text-foreground/80 group-hover:text-foreground truncate leading-relaxed">{topic.title}</span>
                      <span className="text-muted-foreground ml-auto shrink-0 flex items-center gap-1.5 text-[10px]">
                        <MessageSquare className="h-3 w-3" />
                        {topic.replies_count}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">NO TRENDING TOPICS YET</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div className="border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-xs sm:text-sm text-muted-foreground tracking-[0.3em]">RECENT ACTIVITY</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{timeStr}</span>
              </div>
              {recentTopics && recentTopics.length > 0 ? (
                <div className="space-y-1">
                  {recentTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => navigate(`/topic/${topic.id}`)}
                      className="w-full text-left flex items-center gap-3 hover:bg-foreground/5 px-3 py-3 transition-none"
                    >
                      <span className="text-muted-foreground shrink-0 text-[10px]">
                        [{new Date(topic.created_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}]
                      </span>
                      <span className={`text-xs sm:text-sm truncate leading-relaxed ${topic.is_announcement ? "admin-text" : "text-foreground/70"}`}>
                        {topic.is_announcement ? "📢 " : ""}{topic.title}
                      </span>
                      <span className="text-muted-foreground ml-auto shrink-0 flex items-center gap-1.5 text-[10px]">
                        <MessageSquare className="h-3 w-3" />
                        {topic.replies_count}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground cursor-blink leading-relaxed">NO RECENT ACTIVITY</p>
              )}
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-[10px] text-muted-foreground/50 cursor-blink tracking-wider">user@nearvox:~$</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[9px] text-muted-foreground/40 mt-8 tracking-[0.3em] text-center">
          // NEARVOX — ANONYMOUS COMMUNITY NETWORK
        </p>
      </div>

      {/* Floating + Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-40 h-14 w-14 flex items-center justify-center border border-foreground bg-background hover:bg-foreground hover:text-background transition-none glow-text shadow-[0_0_20px_hsl(145_80%_56%/0.1)]"
      >
        <Plus className="h-6 w-6" />
      </button>

      {showCreate && <CreateTopicDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
