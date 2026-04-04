import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LogOut, Shield, Terminal,
  Ticket, Copy, Check, X,
  Users, AlertTriangle, Megaphone, BarChart3,
  Settings, TrendingUp, Hash, MessageSquare,
  Activity, Wifi, LayoutGrid,
} from "lucide-react";
import { TOPIC_CATEGORIES, getCategoryColor, getCategoryLabel } from "@/lib/categories";

const MODULE_DESCRIPTIONS: Record<string, string> = {
  job_hunting: "Find work or hire locally",
  promotions: "Promote products & services",
  discussions: "General community talk",
  confessions: "Anonymous confessions",
  local_help: "Request or offer help nearby",
  marketplace: "Buy & sell locally",
  events: "Community events & meetups",
  alerts: "Safety alerts & warnings",
  ideas: "Pitch ideas & startups",
};

const Index = () => {
  const { adminUsername, isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();

  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showInvites, setShowInvites] = useState(false);

  // ── DATA QUERIES ──

  const { data: profileCount } = useQuery({
    queryKey: ["profiles-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
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

  const { data: listingCount } = useQuery({
    queryKey: ["listings-count"],
    queryFn: async () => {
      const { count } = await supabase.from("marketplace_listings").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: categoryBreakdown } = useQuery({
    queryKey: ["category-breakdown"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("category");
      const counts: Record<string, number> = {};
      data?.forEach((t: any) => {
        const cat = t.category || "discussions";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: adminTickets, refetch: refetchTickets } = useQuery({
    queryKey: ["admin-tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("invite_tickets").select("*").eq("owner_id", user!.id).eq("is_used", false).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: announcements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: recentTopics } = useQuery({
    queryKey: ["recent-activity-topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id, title, created_at, is_announcement, category").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: recentProfiles } = useQuery({
    queryKey: ["recent-activity-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, anonymous_name, created_at, invited_by, location, user_id").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: recentPosts } = useQuery({
    queryKey: ["recent-activity-posts"],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("id, content, created_at, user_id").order("created_at", { ascending: false }).limit(3);
      return data || [];
    },
  });

  // Today's stats for analytics preview
  const { data: todayStats } = useQuery({
    queryKey: ["today-stats"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const iso = todayStart.toISOString();
      const [postsRes, topicsRes, usersRes] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", iso),
        supabase.from("topics").select("*", { count: "exact", head: true }).gte("created_at", iso),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", iso),
      ]);
      return {
        postsToday: postsRes.count || 0,
        topicsToday: topicsRes.count || 0,
        usersToday: usersRes.count || 0,
      };
    },
  });

  // ── HELPERS ──

  const getLookupName = (userId: string) => {
    const p = recentProfiles?.find((p) => p.user_id === userId);
    if (!p) return userId.slice(0, 8);
    return p.anonymous_name || p.username;
  };

  const getInviterName = (invitedBy: string | null) => {
    if (!invitedBy) return "";
    const p = recentProfiles?.find((pr) => pr.user_id === invitedBy);
    return p ? (p.anonymous_name || p.username) : invitedBy.slice(0, 8);
  };

  // ── ACTIONS ──

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const generateTicket = async () => {
    if (!user) return;
    setGenerating(true);
    const { error } = await supabase.from("invite_tickets").insert({ owner_id: user.id }).select().single();
    if (error) toast.error("Failed"); else { toast.success("Ticket generated"); refetchTickets(); }
    setGenerating(false);
  };

  const copyTicketLink = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Build activity log with user_id for tappable links
  const activityLog = [
    ...(recentProfiles?.map((p) => ({
      time: new Date(p.created_at),
      text: `User "${p.anonymous_name || p.username}" registered${p.invited_by ? ` (inv: ${getInviterName(p.invited_by)})` : ""} — ${p.location || "Unknown region"}`,
      type: "user" as const,
      userId: p.user_id,
    })) || []),
    ...(recentTopics?.map((t) => ({
      time: new Date(t.created_at),
      text: t.is_announcement ? `Admin announcement: "${t.title}"` : `New topic: "${t.title}"`,
      type: t.is_announcement ? "admin" as const : "topic" as const,
      userId: null as string | null,
    })) || []),
    ...(recentPosts?.map((p) => ({
      time: new Date(p.created_at),
      text: `${getLookupName(p.user_id)} posted: "${p.content.slice(0, 40)}${p.content.length > 40 ? "..." : ""}"`,
      type: "topic" as const,
      userId: p.user_id,
    })) || []),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  const primaryCategories = TOPIC_CATEGORIES.filter(c => ["job_hunting", "promotions", "discussions", "confessions", "local_help"].includes(c.value));
  const secondaryCategories = TOPIC_CATEGORIES.filter(c => ["marketplace", "events", "alerts", "ideas"].includes(c.value));

  const inviteCount = adminTickets?.length ?? 0;
  const reportCount = pendingReports ?? 0;

  const adminTools = [
    { label: "USERS", icon: Users, hint: `${profileCount ?? 0} registered`, path: "/users" },
    { label: "REPORTS", icon: AlertTriangle, hint: `${reportCount} pending`, path: "/reports", alert: reportCount > 0, badge: reportCount > 0 ? reportCount : null },
    { label: "ANNOUNCEMENTS", icon: Megaphone, hint: `${announcements?.length ?? 0} records`, path: "/announcements" },
    { label: "ANALYTICS", icon: BarChart3, hint: `${todayStats?.postsToday ?? 0} posts today · ${todayStats?.usersToday ?? 0} new users`, path: "/analytics" },
    { label: "SETTINGS", icon: Settings, hint: "system config", path: "/settings" },
    { label: "INVITES", icon: Ticket, hint: `${inviteCount} available`, path: "#invites", warn: inviteCount === 0 },
  ];

  const stats = [
    { label: "STATUS", value: "ONLINE", glow: true },
    { label: "USERS", value: profileCount ?? "..." },
    { label: "TOPICS", value: topicCount ?? "..." },
    { label: "POSTS", value: postCount ?? "..." },
    { label: "LISTINGS", value: listingCount ?? "..." },
    { label: "REPORTS", value: `${pendingReports ?? 0}`, warn: (pendingReports ?? 0) > 0 },
  ];

  return (
    <AdminLayout showBack={false}>
      <div className="min-h-screen terminal-grid">
        <div className="max-w-4xl mx-auto px-3 sm:px-5 py-5 sm:py-8 space-y-5 sm:space-y-6">

          {/* ── HEADER ── */}
          <header className="border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <Terminal className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                  <h1 className="text-lg sm:text-2xl text-foreground glow-text tracking-[0.3em]">NEARVOX</h1>
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.5em] ml-[30px] sm:ml-[34px]">ADMIN TERMINAL v2.0</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <Shield className="h-3.5 w-3.5 text-[hsl(var(--admin))]" />
                    <span className="text-sm sm:text-base admin-text glow-admin font-bold tracking-wider">{adminUsername || "USER"}</span>
                    {isAdmin && <span className="admin-badge text-[8px]">ADMIN</span>}
                  </div>
                  <div className="text-[9px] text-muted-foreground tracking-wider space-y-0.5 hidden sm:block">
                    <p>ACCESS LEVEL: <span className="text-foreground">ROOT</span></p>
                    <p>STATUS: <span className="text-foreground glow-text flex items-center gap-1 inline-flex"><Wifi className="h-2.5 w-2.5" />ONLINE</span></p>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors p-2 border border-border hover:border-destructive min-h-[40px] min-w-[40px] flex items-center justify-center">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          {/* ── SYSTEM STATUS BAR ── */}
          <div className="border border-border bg-card p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
              </span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground tracking-[0.3em]">SYSTEM STATUS</span>
              <span className="text-[9px] text-muted-foreground ml-auto">{timeStr}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center sm:text-left">
                  <p className="text-[9px] text-muted-foreground tracking-wider mb-0.5">{s.label}</p>
                  <p className={`text-xs sm:text-sm font-bold ${s.glow ? "text-foreground glow-text" : s.warn ? "text-[hsl(var(--warning))]" : "text-foreground"}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── PRIMARY COMMUNITY MODULES ── */}
          <section>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.3em] mb-3 sm:mb-4 flex items-center gap-2">
              <Activity className="h-3 w-3" />
              PRIMARY MODULES
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {primaryCategories.map((cat) => {
                const Icon = cat.icon;
                const count = categoryBreakdown?.[cat.value] || 0;
                const clr = getCategoryColor(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => navigate(`/admin/topics?category=${cat.value}`)}
                    className="text-left p-4 sm:p-5 border bg-card transition-all duration-200 group"
                    style={{
                      borderColor: `hsl(${clr} / 0.2)`,
                      boxShadow: `inset 0 0 30px hsl(${clr} / 0.03)`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `hsl(${clr} / 0.5)`;
                      e.currentTarget.style.boxShadow = `0 0 20px hsl(${clr} / 0.12), inset 0 0 30px hsl(${clr} / 0.05)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `hsl(${clr} / 0.2)`;
                      e.currentTarget.style.boxShadow = `inset 0 0 30px hsl(${clr} / 0.03)`;
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] text-muted-foreground font-mono">[{cat.cmd}]</span>
                      <Icon className="h-4 w-4 transition-colors" style={{ color: `hsl(${clr})` }} />
                    </div>
                    <p className="text-[11px] sm:text-xs tracking-wider leading-tight mb-1.5" style={{ color: `hsl(${clr})`, textShadow: `0 0 10px hsl(${clr} / 0.4)` }}>
                      {cat.label.toUpperCase()}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed mb-2">
                      {MODULE_DESCRIPTIONS[cat.value]}
                    </p>
                    <p className="text-[9px] text-foreground/60">{count} {count === 1 ? "topic" : "topics"}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── SECONDARY COMMUNITY MODULES ── */}
          <section>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.3em] mb-3 sm:mb-4">
              &gt; SECONDARY MODULES
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {secondaryCategories.map((cat) => {
                const Icon = cat.icon;
                const count = categoryBreakdown?.[cat.value] || 0;
                const clr = getCategoryColor(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => navigate(`/admin/topics?category=${cat.value}`)}
                    className="text-left p-4 sm:p-5 border bg-card transition-all duration-200 group"
                    style={{
                      borderColor: `hsl(${clr} / 0.2)`,
                      boxShadow: `inset 0 0 30px hsl(${clr} / 0.03)`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `hsl(${clr} / 0.5)`;
                      e.currentTarget.style.boxShadow = `0 0 20px hsl(${clr} / 0.12), inset 0 0 30px hsl(${clr} / 0.05)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `hsl(${clr} / 0.2)`;
                      e.currentTarget.style.boxShadow = `inset 0 0 30px hsl(${clr} / 0.03)`;
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] text-muted-foreground font-mono">[{cat.cmd}]</span>
                      <Icon className="h-4 w-4 transition-colors" style={{ color: `hsl(${clr})` }} />
                    </div>
                    <p className="text-[11px] sm:text-xs tracking-wider leading-tight mb-1.5" style={{ color: `hsl(${clr})`, textShadow: `0 0 10px hsl(${clr} / 0.4)` }}>
                      {cat.label.toUpperCase()}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed mb-2">
                      {MODULE_DESCRIPTIONS[cat.value]}
                    </p>
                    <p className="text-[9px] text-foreground/60">{count} {count === 1 ? "topic" : "topics"}</p>
                  </button>
                );
              })}
              <button
                onClick={() => navigate("/admin/all-posts")}
                className="text-left p-4 sm:p-5 border bg-card transition-all duration-200 group"
                style={{ borderColor: `hsl(145 80% 56% / 0.2)`, boxShadow: `inset 0 0 30px hsl(145 80% 56% / 0.03)` }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `hsl(145 80% 56% / 0.5)`; e.currentTarget.style.boxShadow = `0 0 20px hsl(145 80% 56% / 0.12)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = `hsl(145 80% 56% / 0.2)`; e.currentTarget.style.boxShadow = `inset 0 0 30px hsl(145 80% 56% / 0.03)`; }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] text-muted-foreground font-mono">[10]</span>
                  <MessageSquare className="h-4 w-4 text-foreground" />
                </div>
                <p className="text-[11px] sm:text-xs text-foreground glow-text tracking-wider leading-tight mb-1.5">
                  ALL POSTS
                </p>
                <p className="text-[9px] text-muted-foreground leading-relaxed mb-2">Browse all community posts</p>
                <p className="text-[9px] text-foreground/60">{(postCount ?? 0) + (topicCount ?? 0)} total</p>
              </button>
              <button
                onClick={() => navigate("/admin/boards")}
                className="text-left p-4 sm:p-5 border bg-card transition-all duration-200 group"
                style={{ borderColor: `hsl(199 91% 56% / 0.2)`, boxShadow: `inset 0 0 30px hsl(199 91% 56% / 0.03)` }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `hsl(199 91% 56% / 0.5)`; e.currentTarget.style.boxShadow = `0 0 20px hsl(199 91% 56% / 0.12)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = `hsl(199 91% 56% / 0.2)`; e.currentTarget.style.boxShadow = `inset 0 0 30px hsl(199 91% 56% / 0.03)`; }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] text-muted-foreground font-mono">[11]</span>
                  <LayoutGrid className="h-4 w-4" style={{ color: `hsl(199 91% 56%)` }} />
                </div>
                <p className="text-[11px] sm:text-xs tracking-wider leading-tight mb-1.5" style={{ color: `hsl(199 91% 56%)`, textShadow: `0 0 10px hsl(199 91% 56% / 0.4)` }}>
                  BOARDS
                </p>
                <p className="text-[9px] text-muted-foreground leading-relaxed mb-2">Community boards</p>
                <p className="text-[9px] text-foreground/60">view boards</p>
              </button>
            </div>
          </section>

          {/* ── MODERATION & ADMIN TOOLS ── */}
          <section>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.3em] mb-3 sm:mb-4 flex items-center gap-2">
              <Shield className="h-3 w-3 text-[hsl(var(--admin))]" />
              <span className="admin-text">MODERATION & ADMIN TOOLS</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {adminTools.map((card) => {
                const Icon = card.icon;
                const isWarn = card.warn;
                const isAlert = card.alert;
                return (
                  <button
                    key={card.label}
                    onClick={() => {
                      if (card.path === "#invites") setShowInvites(!showInvites);
                      else navigate(card.path);
                    }}
                    className={`text-left p-4 sm:p-5 border bg-card transition-all duration-200 group relative ${
                      isWarn
                        ? "border-[hsl(25_90%_55%/0.5)] hover:border-[hsl(25_90%_55%/0.8)] hover:shadow-[0_0_15px_hsl(25_90%_55%/0.15)]"
                        : isAlert
                        ? "border-[hsl(var(--warning)/0.4)] hover:border-[hsl(var(--warning)/0.7)] hover:shadow-[0_0_15px_hsl(var(--warning)/0.1)]"
                        : "border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin)/0.4)] hover:shadow-[0_0_15px_hsl(var(--admin)/0.08)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 transition-colors ${
                        isWarn ? "text-[hsl(25_90%_55%)]" :
                        isAlert ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--admin)/0.6)] group-hover:text-[hsl(var(--admin))]"
                      }`} />
                      {isAlert && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--warning))] opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(var(--warning))]" />
                        </span>
                      )}
                      {/* Red badge for reports */}
                      {card.badge && (
                        <span className="ml-auto bg-destructive text-destructive-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] sm:text-xs tracking-wider mb-1 ${
                      isWarn ? "text-[hsl(25_90%_55%)]" :
                      isAlert ? "text-[hsl(var(--warning))]" : "admin-text group-hover:glow-admin"
                    }`}>
                      {card.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{card.hint}</p>
                    {isWarn && (
                      <p className="text-[8px] text-[hsl(25_90%_55%)] mt-1 tracking-wider">⚠ NO INVITES LEFT</p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── INVITE TICKETS (toggled) ── */}
          {showInvites && (
            <div className="border border-[hsl(var(--admin-border))] bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-muted-foreground tracking-[0.3em]">INVITE TICKETS — {adminTickets?.length ?? 0} AVAILABLE</span>
                <button onClick={generateTicket} disabled={generating} className="flex items-center gap-1.5 text-[10px] admin-text border border-[hsl(var(--admin-border))] px-3 py-1 hover:bg-[hsl(var(--admin)/0.1)] transition-colors disabled:opacity-50">
                  <Ticket className="h-3 w-3" />{generating ? "..." : "[+ NEW]"}
                </button>
              </div>
              {adminTickets && adminTickets.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {adminTickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border border-border px-3 py-2">
                      <span className="text-[10px] text-foreground font-mono">{t.invite_code}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => copyTicketLink(t.invite_code)} className="text-muted-foreground hover:text-foreground p-1">
                          {copiedCode === t.invite_code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                        <button onClick={async () => { await supabase.from("invite_tickets").delete().eq("id", t.id); refetchTickets(); }} className="text-muted-foreground hover:text-destructive p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TRENDING + SYSTEM LOG ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-foreground" />
                <span className="text-[10px] sm:text-[11px] text-muted-foreground tracking-[0.3em]">TRENDING IN GLOBAL</span>
              </div>
              {recentTopics && recentTopics.length > 0 ? (
                <div className="space-y-1">
                  {recentTopics.map((topic: any) => (
                    <button
                      key={topic.id}
                      onClick={() => navigate(`/admin/topic/${topic.id}`)}
                      className="w-full text-left text-[11px] flex items-center gap-2.5 hover:bg-foreground/5 px-2 py-2 transition-colors group rounded-sm"
                    >
                      <Hash className="h-3 w-3 text-foreground/40 group-hover:text-foreground shrink-0 transition-colors" />
                      <span className="text-foreground/80 group-hover:text-foreground truncate flex-1">{topic.title}</span>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {getCategoryLabel(topic.category || "discussions").toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">NO TOPICS YET</p>
              )}
            </div>

            {/* ── SYSTEM LOG ── */}
            <div className="border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-3.5 w-3.5 text-foreground" />
                <span className="text-[10px] sm:text-[11px] text-muted-foreground tracking-[0.3em]">SYSTEM LOG</span>
                <span className="text-[9px] text-muted-foreground ml-auto">{timeStr}</span>
              </div>
              {activityLog.length > 0 ? (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {activityLog.map((entry, i) => (
                    <button
                      key={i}
                      onClick={() => entry.userId ? navigate(`/users/${entry.userId}`) : undefined}
                      className={`text-[10px] sm:text-[11px] flex items-start gap-2 w-full text-left ${entry.userId ? "hover:bg-foreground/5 cursor-pointer" : "cursor-default"} px-1 py-0.5 rounded-sm transition-colors`}
                    >
                      <span className="text-muted-foreground shrink-0 font-mono">[{entry.time.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}]</span>
                      <span className={entry.type === "admin" ? "admin-text" : entry.type === "user" ? "text-foreground" : "text-foreground/70"}>{entry.text}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground cursor-blink">AWAITING ACTIVITY</p>
              )}
              <div className="mt-3 pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  root@nearvox:~$ <span className="inline-block w-[6px] h-[12px] bg-foreground animate-pulse ml-0.5 align-middle" />
                </p>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground tracking-wider text-center pb-6">
            // NEARVOX ADMIN CONSOLE v2.0 — UNAUTHORIZED ACCESS PROHIBITED
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Index;
