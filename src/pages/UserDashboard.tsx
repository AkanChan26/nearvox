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
import { TOPIC_CATEGORIES, getCategoryColor } from "@/lib/categories";
import { ProfileAvatar } from "@/components/Avatars";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: trendingTopics } = useQuery({
    queryKey: ["trending-topics", profile?.location],
    queryFn: async () => {
      let query = supabase.from("topics").select("id, title, replies_count, views_count, category, location").order("replies_count", { ascending: false }).limit(5);
      if (profile?.location) query = query.ilike("location", `%${profile.location}%`);
      const { data } = await query;
      if (!data || data.length === 0) {
        const { data: globalData } = await supabase.from("topics").select("id, title, replies_count, views_count, category, location").order("replies_count", { ascending: false }).limit(5);
        return globalData || [];
      }
      return data;
    },
    enabled: !!profile,
  });

  const { data: announcements } = useQuery({
    queryKey: ["user-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: unreadChatCount } = useQuery({
    queryKey: ["unread-chat-count", user?.id],
    queryFn: async () => {
      const { data: memberships } = await supabase.from("conversation_members").select("conversation_id, last_read_at").eq("user_id", user!.id);
      if (!memberships || memberships.length === 0) return 0;
      let unreadCount = 0;
      for (const mem of memberships) {
        const query = supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("conversation_id", mem.conversation_id).neq("sender_id", user!.id).is("deleted_at", null);
        if (mem.last_read_at) query.gt("created_at", mem.last_read_at);
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
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: recentTopics } = useQuery({
    queryKey: ["user-recent-topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id, title, created_at, is_announcement, replies_count, category").order("last_activity_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: topicCount } = useQuery({
    queryKey: ["total-topic-count"],
    queryFn: async () => {
      const { count } = await supabase.from("topics").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: userCount } = useQuery({
    queryKey: ["total-user-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  const allCommunityModules = [
    ...TOPIC_CATEGORIES.map(c => ({
      cmd: c.cmd, label: c.label.toUpperCase(), icon: c.icon,
      path: `/user/topics?category=${c.value}`,
    })),
    { cmd: "10", label: "ALL POSTS", icon: MessageSquare, path: "/user/posts" },
  ];

  const personalModules = [
    { label: "NOTIFS", icon: Bell, path: "/user/notifications", badge: (unreadNotifs ?? 0) > 0 ? `${unreadNotifs}` : undefined, pulse: (unreadNotifs ?? 0) > 0 },
    { label: "POSTS", icon: FileText, path: "/user/posts?mine=true" },
    { label: "ANNOUNCE", icon: Megaphone, path: "/user/announcements", badge: announcements && announcements.length > 0 ? `${announcements.length}` : undefined },
    { label: "MESSAGES", icon: Mail, path: "/user/messages", badge: (unreadChatCount ?? 0) > 0 ? `${unreadChatCount}` : undefined, pulse: (unreadChatCount ?? 0) > 0 },
    { label: "BOARDS", icon: LayoutGrid, path: "/user/boards" },
    { label: "INVITES", icon: Ticket, path: "/user/invites" },
    { label: "SETTINGS", icon: Settings, path: "/user/settings" },
  ];

  return (
    <div className="min-h-screen bg-background relative terminal-grid">
      <div className="fixed inset-0 scanline z-[1] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 sm:py-6 pb-24">
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-5 sm:mb-7">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            <div>
              <h1 className="text-sm sm:text-lg text-foreground glow-text tracking-[0.3em] font-bold leading-none">NEARVOX</h1>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground tracking-[0.4em] mt-0.5">ANONYMOUS NETWORK</p>
            </div>
            <div className="hidden sm:flex items-center gap-3 ml-4 pl-4 border-l border-border">
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60 tracking-wider">
                <Wifi className="h-2.5 w-2.5 text-foreground" />
                <span className="text-foreground/50">{userCount ?? "—"}</span> NODES
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60 tracking-wider">
                <Activity className="h-2.5 w-2.5 text-foreground" />
                <span className="text-foreground/50">{topicCount ?? "—"}</span> THREADS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ProfileAvatar avatarId={(profile as any)?.avatar} size={32} />
            <div className="text-right">
              <p className="text-[10px] sm:text-[11px] text-foreground glow-text font-bold tracking-wider truncate max-w-[90px] sm:max-w-none leading-none">
                {profile?.anonymous_name || profile?.username || "..."}
              </p>
              <p className="text-[8px] text-muted-foreground tracking-wider mt-1 truncate max-w-[90px] sm:max-w-none">
                {profile?.location || "SET REGION"}
              </p>
            </div>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive p-1.5 border border-border hover:border-destructive min-h-[32px] min-w-[32px] flex items-center justify-center">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── COMMUNITY MODULES — 5 per row, fixed height ── */}
        <section className="mb-5 sm:mb-7">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.3em] mb-3 sm:mb-4 flex items-center gap-1.5">
            <span className="text-foreground">&gt;</span> COMMUNITY MODULES
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-4">
            {allCommunityModules.map((mod) => {
              const Icon = mod.icon;
              const catValue = TOPIC_CATEGORIES.find(c => c.cmd === mod.cmd)?.value || "";
              const clr = catValue ? getCategoryColor(catValue) : "145 80% 56%";
              return (
                <button
                  key={mod.cmd}
                  onClick={() => navigate(mod.path)}
                  className="text-left p-3 sm:p-4 h-[80px] sm:h-[100px] border bg-card transition-all duration-150 group flex flex-col justify-between"
                  style={{
                    borderColor: `hsl(${clr} / 0.18)`,
                    boxShadow: `inset 0 0 20px hsl(${clr} / 0.03)`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `hsl(${clr} / 0.45)`;
                    e.currentTarget.style.boxShadow = `0 0 15px hsl(${clr} / 0.1), inset 0 0 20px hsl(${clr} / 0.05)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `hsl(${clr} / 0.18)`;
                    e.currentTarget.style.boxShadow = `inset 0 0 20px hsl(${clr} / 0.03)`;
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-muted-foreground/50 font-mono">[{mod.cmd}]</span>
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-colors" style={{ color: `hsl(${clr})` }} />
                  </div>
                  <p className="text-[8px] sm:text-[9px] tracking-wider leading-tight" style={{ color: `hsl(${clr})`, textShadow: `0 0 8px hsl(${clr} / 0.35)` }}>
                    {mod.label}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── PERSONAL MODULES ── */}
        <section className="mb-5 sm:mb-7">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.3em] mb-3 sm:mb-4 flex items-center gap-1.5">
            <span className="text-foreground">&gt;</span> PERSONAL
          </p>
           <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-3">
            {personalModules.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="text-left p-2.5 sm:p-3 h-[65px] sm:h-[75px] border border-border bg-card hover:border-foreground/30 hover:bg-foreground/[0.03] hover:shadow-[0_0_10px_hsl(var(--foreground)/0.04)] transition-all duration-150 group relative flex flex-col justify-between"
                >
                  <div className="flex items-center gap-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {item.pulse && (
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                    )}
                    {item.badge && (
                      <span className="text-[10px] text-foreground/60 ml-auto">{item.badge}</span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-foreground group-hover:glow-text tracking-wider leading-tight">
                    {item.label}
                  </p>
                </button>
              );
            })}
            {/* Fill empty grid cells so last row aligns */}
            {personalModules.length % 4 !== 0 && Array.from({ length: 4 - (personalModules.length % 4) }).map((_, i) => (
              <div key={`spacer-${i}`} className="h-[65px] sm:hidden" />
            ))}
          </div>
        </section>

        {/* ── INFO PANELS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
          {/* Announcements */}
          {announcements && announcements.length > 0 && (
            <div className="border border-[hsl(var(--admin-border))] bg-card p-3.5 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="h-3 w-3 text-[hsl(var(--admin))]" />
                <span className="text-[9px] sm:text-[10px] admin-text tracking-[0.3em]">ANNOUNCEMENTS</span>
                <button onClick={() => navigate("/user/announcements")} className="text-[8px] text-muted-foreground hover:text-foreground ml-auto tracking-wider">[ALL]</button>
              </div>
              <div className="space-y-2">
                {announcements.slice(0, 2).map((ann: any) => (
                  <div key={ann.id} className="admin-box px-3 py-2.5">
                    <p className="text-[9px] sm:text-[10px] admin-text font-bold leading-relaxed">{ann.title}</p>
                    <p className="text-[8px] sm:text-[9px] text-secondary-foreground truncate mt-1">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending */}
          <div className="border border-border bg-card p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3 w-3 text-foreground" />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.3em]">
                TRENDING IN {(profile?.location || "GLOBAL").toUpperCase()}
              </span>
            </div>
            {trendingTopics && trendingTopics.length > 0 ? (
              <div className="space-y-0.5">
                {trendingTopics.map((topic: any) => (
                  <button
                    key={topic.id}
                    onClick={() => navigate(`/topic/${topic.id}`)}
                    className="w-full text-left flex items-center gap-2 hover:bg-foreground/5 px-2 py-1.5 transition-colors group"
                  >
                    <Hash className="h-2.5 w-2.5 text-foreground/40 shrink-0" />
                    <span className="text-[9px] sm:text-[10px] text-foreground/80 group-hover:text-foreground truncate flex-1">{topic.title}</span>
                    <span className="text-muted-foreground shrink-0 flex items-center gap-1 text-[8px]">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {topic.replies_count}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-muted-foreground">NO TRENDING TOPICS YET</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="border border-border bg-card p-3.5 sm:p-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-3 w-3 text-foreground" />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.3em]">RECENT ACTIVITY</span>
              <span className="text-[8px] text-muted-foreground ml-auto">{timeStr}</span>
            </div>
            {recentTopics && recentTopics.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                {recentTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => navigate(`/topic/${topic.id}`)}
                    className="w-full text-left flex items-center gap-2 hover:bg-foreground/5 px-2 py-1.5 transition-colors group"
                  >
                    <span className="text-muted-foreground shrink-0 text-[8px] font-mono">
                      [{new Date(topic.created_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}]
                    </span>
                    <span className={`text-[9px] sm:text-[10px] truncate flex-1 ${topic.is_announcement ? "admin-text" : "text-foreground/70"}`}>
                      {topic.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 flex items-center gap-1 text-[8px]">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {topic.replies_count}
                      <ChevronRight className="h-2.5 w-2.5" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-muted-foreground cursor-blink">NO RECENT ACTIVITY</p>
            )}
          </div>
        </div>

        <p className="text-[8px] text-muted-foreground/30 mt-6 tracking-[0.3em] text-center">
          // NEARVOX — ANONYMOUS COMMUNITY NETWORK
        </p>
      </div>

      {/* Floating + Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-8 right-5 sm:bottom-10 sm:right-8 z-40 h-12 w-12 flex items-center justify-center border border-foreground bg-background hover:bg-foreground hover:text-background transition-none glow-text shadow-[0_0_15px_hsl(var(--foreground)/0.1)]"
      >
        <Plus className="h-5 w-5" />
      </button>

      {showCreate && <CreateTopicDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
