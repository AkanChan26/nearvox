import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, FileText, ShoppingBag,
  AlertTriangle, Megaphone, BarChart3, Settings, LogOut, ChevronRight,
  Shield, Terminal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const adminSections = [
  { title: "SYSTEM DASHBOARD", desc: "Real-time platform monitoring & system stats", url: "/admin/dashboard", icon: LayoutDashboard, cmd: "01" },
  { title: "USER REGISTRY", desc: "Manage and monitor user accounts", url: "/users", icon: Users, cmd: "02" },
  { title: "POSTS", desc: "Content moderation & post management", url: "/posts", icon: FileText, cmd: "03" },
  { title: "MARKETPLACE", desc: "Listing verification & marketplace oversight", url: "/marketplace", icon: ShoppingBag, cmd: "04" },
  { title: "REPORTS", desc: "User reports, flagged content & investigations", url: "/reports", icon: AlertTriangle, cmd: "05" },
  { title: "ANNOUNCEMENTS", desc: "System announcements & broadcast messages", url: "/announcements", icon: Megaphone, cmd: "06" },
  { title: "ANALYTICS", desc: "Platform metrics & data analysis", url: "/analytics", icon: BarChart3, cmd: "07" },
  { title: "SETTINGS", desc: "System configuration & preferences", url: "/settings", icon: Settings, cmd: "08" },
];

const Index = () => {
  const { adminUsername, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profileCount } = useQuery({
    queryKey: ["profiles-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: postCount } = useQuery({
    queryKey: ["posts-count"],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: pendingReports } = useQuery({
    queryKey: ["pending-reports"],
    queryFn: async () => {
      const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: topicCount } = useQuery({
    queryKey: ["topics-count"],
    queryFn: async () => {
      const { count } = await supabase.from("topics").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Recent activity log
  const { data: recentTopics } = useQuery({
    queryKey: ["recent-activity-topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, title, created_at, is_announcement")
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const { data: recentProfiles } = useQuery({
    queryKey: ["recent-activity-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, anonymous_name, created_at, invited_by, location")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: recentPosts } = useQuery({
    queryKey: ["recent-activity-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, content, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  // Get inviter names
  const inviterIds = [...new Set(recentProfiles?.map(p => p.invited_by).filter(Boolean) || [])];
  const postUserIds = [...new Set(recentPosts?.map(p => p.user_id) || [])];
  const allLookupIds = [...new Set([...inviterIds, ...postUserIds])];

  const { data: lookupProfiles } = useQuery({
    queryKey: ["lookup-profiles", allLookupIds],
    queryFn: async () => {
      if (allLookupIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name, is_admin")
        .in("user_id", allLookupIds as string[]);
      return data || [];
    },
    enabled: allLookupIds.length > 0,
  });

  const getLookupName = (userId: string) => {
    const p = lookupProfiles?.find(p => p.user_id === userId);
    if (!p) return userId.slice(0, 8);
    return p.is_admin ? p.username : p.anonymous_name || p.username;
  };

  // Build activity log
  const activityLog = [
    ...(recentProfiles?.map((p) => ({
      time: new Date(p.created_at),
      text: `User "${p.anonymous_name || p.username}" registered${p.invited_by ? ` (invited by ${getLookupName(p.invited_by)})` : ""} — ${p.location || "Unknown region"}`,
      type: "user" as const,
    })) || []),
    ...(recentTopics?.map((t) => ({
      time: new Date(t.created_at),
      text: t.is_announcement ? `Admin announcement: "${t.title}"` : `New topic: "${t.title}"`,
      type: t.is_announcement ? "admin" as const : "topic" as const,
    })) || []),
    ...(recentPosts?.map((p) => ({
      time: new Date(p.created_at),
      text: `${getLookupName(p.user_id)} posted: "${p.content.slice(0, 40)}${p.content.length > 40 ? "..." : ""}"`,
      type: "topic" as const,
    })) || []),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 8);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  return (
    <AdminLayout showBack={false}>
      <div className="min-h-screen terminal-grid terminal-flicker">
        <div className="max-w-4xl mx-auto px-4 py-6">

          {/* Terminal Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="h-5 w-5 text-foreground" />
                <p className="text-2xl text-foreground glow-text tracking-[0.3em]">NEARVOX</p>
              </div>
              <p className="text-[10px] text-muted-foreground tracking-[0.5em] ml-7">ADMIN TERMINAL v1.0</p>
              <p className="text-[10px] text-muted-foreground tracking-wider ml-7 mt-1">
                SECURE COMMAND CONSOLE — {now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }).toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <Shield className="h-3 w-3 text-[hsl(var(--admin))]" />
                  <p className="text-sm admin-text glow-admin font-bold tracking-wider">{adminUsername || "USER"}</p>
                  {isAdmin && <span className="admin-badge">ADMIN</span>}
                </div>
                <p className="text-[10px] text-muted-foreground tracking-wider">ROOT ACCESS GRANTED</p>
              </div>
              <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors p-1 border border-border hover:border-destructive">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* System Status Panel */}
          <div className="border border-border bg-card p-3 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
              <span className="text-[10px] text-muted-foreground tracking-[0.3em]">SYSTEM STATUS</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-1">
              <div className="text-[10px]">
                <span className="text-muted-foreground">STATUS: </span>
                <span className="text-foreground glow-text">ONLINE</span>
              </div>
              <div className="text-[10px]">
                <span className="text-muted-foreground">SESSION: </span>
                <span className="text-foreground">ACTIVE</span>
              </div>
              <div className="text-[10px]">
                <span className="text-muted-foreground">USERS: </span>
                <span className="text-foreground">{profileCount ?? "..."}</span>
              </div>
              <div className="text-[10px]">
                <span className="text-muted-foreground">TOPICS: </span>
                <span className="text-foreground">{topicCount ?? "..."}</span>
              </div>
              <div className="text-[10px]">
                <span className="text-muted-foreground">POSTS: </span>
                <span className="text-foreground">{postCount ?? "..."}</span>
              </div>
              <div className="text-[10px]">
                <span className="text-muted-foreground">REPORTS: </span>
                <span className={`${(pendingReports ?? 0) > 0 ? "text-warning" : "text-foreground"}`}>
                  {pendingReports ?? 0} PENDING
                </span>
              </div>
            </div>
          </div>

          {/* Command Menu */}
          <div className="mb-6">
            <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-3">
              &gt; COMMAND MENU — SELECT MODULE
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {adminSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.url}
                    onClick={() => navigate(section.url)}
                    className="text-left p-3 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-muted-foreground font-mono">[{section.cmd}]</span>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <p className="text-xs text-foreground group-hover:glow-text tracking-wider leading-tight">{section.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed">{section.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Log */}
          <div className="border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-muted-foreground tracking-[0.3em]">SYSTEM LOG</span>
              <span className="text-[9px] text-muted-foreground ml-auto">{timeStr}</span>
            </div>
            {activityLog.length > 0 ? (
              <div className="space-y-0.5">
                {activityLog.map((entry, i) => {
                  const entryTime = entry.time.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={i} className="text-[11px] flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0">[{entryTime}]</span>
                      <span className={
                        entry.type === "admin" ? "admin-text" :
                        entry.type === "user" ? "text-foreground" : "text-foreground/70"
                      }>
                        {entry.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground cursor-blink">AWAITING ACTIVITY</p>
            )}
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground cursor-blink">root@nearvox:~$</p>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground mt-4 tracking-wider text-center">
            // NEARVOX ADMIN CONSOLE — UNAUTHORIZED ACCESS PROHIBITED
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Index;
