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
} from "lucide-react";
import { TOPIC_CATEGORIES } from "@/lib/categories";

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
      const { data } = await supabase.from("topics").select("id, title, created_at, is_announcement").order("created_at", { ascending: false }).limit(5);
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
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
    setCopiedCode(code);
    toast.success("Copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Build activity log
  const activityLog = [
    ...(recentProfiles?.map((p) => ({
      time: new Date(p.created_at),
      text: `User "${p.anonymous_name || p.username}" registered${p.invited_by ? ` (inv: ${getInviterName(p.invited_by)})` : ""} — ${p.location || "Unknown region"}`,
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
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  const adminQuickCards = [
    { label: "USERS", icon: Users, hint: `${profileCount ?? 0} registered`, path: "/users" },
    { label: "REPORTS", icon: AlertTriangle, hint: `${pendingReports ?? 0} pending`, path: "/reports" },
    { label: "ANNOUNCEMENTS", icon: Megaphone, hint: `${announcements?.length ?? 0} records`, path: "/announcements" },
    { label: "ANALYTICS", icon: BarChart3, hint: "metrics", path: "/analytics" },
    { label: "SETTINGS", icon: Settings, hint: "admin config", path: "/settings" },
    { label: "INVITES", icon: Ticket, hint: `${adminTickets?.length ?? 0} available`, path: "#invites" },
  ];

  return (
    <AdminLayout showBack={false}>
      <div className="min-h-screen terminal-grid terminal-flicker">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

          {/* ── HEADER ── */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                <p className="text-xl sm:text-2xl text-foreground glow-text tracking-[0.3em]">NEARVOX</p>
              </div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.5em] ml-6 sm:ml-7">ADMIN TERMINAL</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <Shield className="h-3 w-3 text-[hsl(var(--admin))]" />
                  <p className="text-xs sm:text-sm admin-text glow-admin font-bold tracking-wider truncate max-w-[80px] sm:max-w-none">{adminUsername || "USER"}</p>
                  {isAdmin && <span className="admin-badge hidden sm:inline">ADMIN</span>}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-wider hidden sm:block">ROOT ACCESS GRANTED</p>
              </div>
              <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors p-1 border border-border hover:border-destructive min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── CATEGORY CARDS ── */}
          <div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.3em] mb-2 sm:mb-3">
              &gt; NAVIGATE — SELECT MODULE
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 sm:gap-1.5">
              {TOPIC_CATEGORIES.filter((cat) => cat.value !== "random").map((cat) => {
                const Icon = cat.icon;
                const count = categoryBreakdown?.[cat.value] || 0;
                return (
                  <button
                    key={cat.value}
                    onClick={() => navigate(`/admin/topics?category=${cat.value}`)}
                    className="text-left p-3 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] text-muted-foreground font-mono">[{cat.cmd}]</span>
                      <Icon className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <p className="text-[10px] text-foreground group-hover:glow-text tracking-wider leading-tight">
                      {cat.label.toUpperCase()}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{count} topics</p>
                  </button>
                );
              })}
              <button
                onClick={() => navigate("/admin/all-posts")}
                className="text-left p-3 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] text-muted-foreground font-mono">[10]</span>
                  <MessageSquare className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                </div>
                <p className="text-[10px] text-foreground group-hover:glow-text tracking-wider leading-tight">
                  ALL POSTS
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{(postCount ?? 0) + (topicCount ?? 0)} total</p>
              </button>
            </div>
          </div>

          {/* ── ADMIN QUICK ACCESS CARDS ── */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-1 sm:gap-1.5">
            {adminQuickCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  onClick={() => {
                    if (card.path === "#invites") {
                      setShowInvites(!showInvites);
                    } else {
                      navigate(card.path);
                    }
                  }}
                  className="text-left p-3 border border-border bg-card hover:border-foreground/40 hover:bg-foreground/5 transition-none group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <p className="text-[10px] text-foreground group-hover:glow-text tracking-wider">{card.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{card.hint}</p>
                </button>
              );
            })}
          </div>

          {/* ── INVITE TICKETS (inline, toggled) ── */}
          {showInvites && (
            <div className="border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground tracking-[0.3em]">INVITE TICKETS — {adminTickets?.length ?? 0} AVAILABLE</span>
                <button onClick={generateTicket} disabled={generating} className="flex items-center gap-1 text-[10px] text-foreground border border-foreground px-2 py-0.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50">
                  <Ticket className="h-3 w-3" />{generating ? "..." : "[+ NEW]"}
                </button>
              </div>
              {adminTickets && adminTickets.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 sm:gap-1.5">
                  {adminTickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border border-border px-2 py-1">
                      <span className="text-[10px] text-foreground font-mono">{t.invite_code}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => copyTicketLink(t.invite_code)} className="text-muted-foreground hover:text-foreground">
                          {copiedCode === t.invite_code ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                        </button>
                        <button onClick={async () => { await supabase.from("invite_tickets").delete().eq("id", t.id); refetchTickets(); }} className="text-muted-foreground hover:text-destructive">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SYSTEM STATUS ── */}
          <div className="border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
              <span className="text-[10px] text-muted-foreground tracking-[0.3em]">SYSTEM STATUS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-1">
              <div className="text-[10px]"><span className="text-muted-foreground">STATUS: </span><span className="text-foreground glow-text">ONLINE</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">USERS: </span><span className="text-foreground">{profileCount ?? "..."}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">TOPICS: </span><span className="text-foreground">{topicCount ?? "..."}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">POSTS: </span><span className="text-foreground">{postCount ?? "..."}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">LISTINGS: </span><span className="text-foreground">{listingCount ?? "..."}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">REPORTS: </span><span className={`${(pendingReports ?? 0) > 0 ? "text-warning" : "text-foreground"}`}>{pendingReports ?? 0} PENDING</span></div>
            </div>
          </div>

          {/* ── TRENDING ── */}
          <div className="border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3 w-3 text-foreground" />
              <span className="text-[10px] text-muted-foreground tracking-[0.3em]">TRENDING IN GLOBAL</span>
            </div>
            {recentTopics && recentTopics.length > 0 ? (
              <div className="space-y-0.5">
                {recentTopics.map((topic: any) => (
                  <button
                    key={topic.id}
                    onClick={() => navigate(`/admin/topic/${topic.id}`)}
                    className="w-full text-left text-[11px] flex items-center gap-2 hover:bg-foreground/5 px-1 py-1 transition-none group"
                  >
                    <Hash className="h-2.5 w-2.5 text-foreground shrink-0" />
                    <span className="text-foreground/80 group-hover:text-foreground truncate">{topic.title}</span>
                    <span className="text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {topic.is_announcement ? "ANN" : "0"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">NO TOPICS YET</p>
            )}
          </div>

          {/* ── SYSTEM LOG ── */}
          <div className="border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-muted-foreground tracking-[0.3em]">RECENT ACTIVITY</span>
              <span className="text-[9px] text-muted-foreground ml-auto">{timeStr}</span>
            </div>
            {activityLog.length > 0 ? (
              <div className="space-y-0.5">
                {activityLog.map((entry, i) => (
                  <div key={i} className="text-[11px] flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">[{entry.time.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}]</span>
                    <span className={entry.type === "admin" ? "admin-text" : entry.type === "user" ? "text-foreground" : "text-foreground/70"}>{entry.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground cursor-blink">AWAITING ACTIVITY</p>
            )}
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground cursor-blink">root@nearvox:~$</p>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground tracking-wider text-center pb-4">
            // NEARVOX ADMIN CONSOLE — UNAUTHORIZED ACCESS PROHIBITED
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Index;
