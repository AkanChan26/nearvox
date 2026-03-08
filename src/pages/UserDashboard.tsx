import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare, LogOut, ChevronRight,
  Terminal, TrendingUp, Hash, Plus,
  Megaphone, Mail, Settings, Ticket, FileText, Bell, LayoutGrid,
} from "lucide-react";
import { CreateTopicDialog } from "@/components/CreateTopicDialog";
import { TOPIC_CATEGORIES } from "@/lib/categories";
import { ProfileAvatar } from "@/components/Avatars";


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

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background relative terminal-grid terminal-flicker">
      <div className="fixed inset-0 scanline z-[1] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Terminal Header */}
        <div className="flex items-start justify-between mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Terminal className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
              <p className="text-2xl sm:text-3xl text-foreground glow-text tracking-[0.3em]">NEARVOX</p>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground tracking-[0.5em] ml-7 sm:ml-9">ANONYMOUS NETWORK</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <ProfileAvatar avatarId={(profile as any)?.avatar} size={40} />
            <div className="text-right">
              <p className="text-sm sm:text-base text-foreground glow-text font-bold tracking-wider truncate max-w-[120px] sm:max-w-none">
                {profile?.anonymous_name || profile?.username || "..."}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground tracking-wider truncate max-w-[140px] sm:max-w-none">
                {profile?.location || "SET REGION"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors p-2 border border-border hover:border-destructive min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Grid */}
        <div className="mb-6 sm:mb-8">
          <p className="text-[10px] sm:text-xs text-muted-foreground tracking-[0.3em] mb-4 sm:mb-5">
            &gt; NAVIGATE — SELECT MODULE
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {TOPIC_CATEGORIES.filter((cat) => cat.value !== "random").map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => navigate(`/user/topics?category=${cat.value}`)}
                  className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">[{cat.cmd}]</span>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">
                    {cat.label.toUpperCase()}
                  </p>
                </button>
              );
            })}
            <button
              onClick={() => navigate("/user/posts")}
              className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">[10]</span>
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
              </div>
              <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">
                ALL POSTS
              </p>
            </button>
          </div>
        </div>

        {/* Quick Access Row */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 mb-8 sm:mb-10">
          <button
            onClick={() => navigate("/user/notifications")}
            className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group relative"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
              {(unreadNotifs ?? 0) > 0 && (
                <span className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">NOTIFICATIONS</p>
            {(unreadNotifs ?? 0) > 0 && (
              <p className="text-[10px] sm:text-xs text-foreground mt-1.5">{unreadNotifs} unread</p>
            )}
          </button>
          <button
            onClick={() => navigate("/user/posts?mine=true")}
            className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">YOUR POSTS</p>
          </button>
          <button
            onClick={() => navigate("/user/announcements")}
            className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">ANNOUNCEMENTS</p>
            {announcements && announcements.length > 0 && (
              <p className="text-[10px] sm:text-xs text-foreground mt-1.5">{announcements.length} active</p>
            )}
          </button>
          <button
            onClick={() => navigate("/user/messages")}
            className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group relative"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
              {(unreadChatCount ?? 0) > 0 && (
                <span className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">MESSAGES</p>
            {(unreadChatCount ?? 0) > 0 && (
              <p className="text-[10px] sm:text-xs text-foreground mt-1.5">{unreadChatCount} unread</p>
            )}
          </button>
          <button
            onClick={() => navigate("/user/boards")}
            className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">BOARDS</p>
          </button>
          <button
            onClick={() => navigate("/user/invites")}
            className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">INVITES</p>
          </button>
          <button
            onClick={() => navigate("/user/settings")}
            className="text-left p-4 sm:p-5 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <p className="text-xs sm:text-sm text-foreground group-hover:glow-text tracking-wider leading-relaxed">SETTINGS</p>
          </button>
        </div>

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
          {/* Left Column */}
          <div className="space-y-5 sm:space-y-8">
            {/* Announcements Preview */}
            {announcements && announcements.length > 0 && (
              <div className="border border-admin-border bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--admin))]" />
                  <span className="text-xs sm:text-sm admin-text tracking-[0.3em]">SYSTEM ANNOUNCEMENTS</span>
                  <button onClick={() => navigate("/user/announcements")} className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground ml-auto">[VIEW ALL]</button>
                </div>
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((ann: any) => (
                    <div key={ann.id} className="admin-box px-4 py-3">
                      <p className="text-xs sm:text-sm admin-text font-bold leading-relaxed">{ann.title}</p>
                      <p className="text-xs text-secondary-foreground truncate mt-1 leading-relaxed">{ann.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {new Date(ann.created_at).toLocaleDateString()} · TARGET: {ann.target_location}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Section */}
            <div className="border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
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
                      className="w-full text-left text-xs sm:text-sm flex items-center gap-3 hover:bg-foreground/5 px-3 py-2.5 transition-none group"
                    >
                      <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-foreground shrink-0" />
                      <span className="text-foreground/80 group-hover:text-foreground truncate leading-relaxed">{topic.title}</span>
                      <span className="text-muted-foreground ml-auto shrink-0 flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        {topic.replies_count}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">NO TRENDING TOPICS YET</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Recent Activity */}
            <div className="border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-xs sm:text-sm text-muted-foreground tracking-[0.3em]">RECENT ACTIVITY</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">{timeStr}</span>
              </div>
              {recentTopics && recentTopics.length > 0 ? (
                <div className="space-y-1">
                  {recentTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => navigate(`/topic/${topic.id}`)}
                      className="w-full text-left text-xs sm:text-sm flex items-center gap-3 hover:bg-foreground/5 px-3 py-2.5 transition-none"
                    >
                      <span className="text-muted-foreground shrink-0 text-[10px] sm:text-xs">
                        [{new Date(topic.created_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}]
                      </span>
                      <span className={`truncate leading-relaxed ${topic.is_announcement ? "admin-text" : "text-foreground/70"}`}>
                        {topic.is_announcement ? "📢 " : ""}{topic.title}
                      </span>
                      <span className="text-muted-foreground ml-auto shrink-0 flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        {topic.replies_count}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground cursor-blink leading-relaxed">NO RECENT ACTIVITY</p>
              )}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground cursor-blink">user@nearvox:~$</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] sm:text-xs text-muted-foreground mt-6 tracking-wider text-center">
          // NEARVOX — ANONYMOUS COMMUNITY NETWORK
        </p>
      </div>

      {/* Floating + Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-40 h-14 w-14 flex items-center justify-center border border-foreground bg-background hover:bg-foreground hover:text-background transition-none glow-text"
      >
        <Plus className="h-6 w-6" />
      </button>

      {showCreate && <CreateTopicDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
