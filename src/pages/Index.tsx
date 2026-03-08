import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LogOut, ChevronDown, ChevronUp, Shield, Terminal,
  Ticket, Copy, Check, X, Eye, Image, FileText,
  Paperclip,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TOPIC_CATEGORIES } from "@/lib/categories";

const Index = () => {
  const { adminUsername, isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Section collapse state
  const [sections, setSections] = useState({
    users: true,
    posts: true,
    marketplace: false,
    reports: true,
    announcements: false,
    settings: false,
  });
  const toggle = (key: keyof typeof sections) => setSections((s) => ({ ...s, [key]: !s[key] }));

  // Users state
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Announcements state
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annTarget, setAnnTarget] = useState("GLOBAL");

  // Settings state
  const [adminHandle, setAdminHandle] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Post preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  // Category breakdown
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

  // Users
  const { data: users } = useQuery({
    queryKey: ["admin-users", userSearch],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (userSearch) query = query.ilike("username", `%${userSearch}%`);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: allTickets } = useQuery({
    queryKey: ["admin-all-tickets"],
    queryFn: async () => {
      const { data } = await supabase.from("invite_tickets").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const inviterIds = [...new Set(users?.map((u) => u.invited_by).filter(Boolean) || [])];
  const { data: inviters } = useQuery({
    queryKey: ["inviter-profiles", inviterIds],
    queryFn: async () => {
      if (inviterIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, username, anonymous_name, is_admin").in("user_id", inviterIds as string[]);
      return data || [];
    },
    enabled: inviterIds.length > 0,
  });

  const { data: adminTickets, refetch: refetchTickets } = useQuery({
    queryKey: ["admin-tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("invite_tickets").select("*").eq("owner_id", user!.id).eq("is_used", false).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Posts
  const { data: posts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const creatorIds = [...new Set(posts?.map((p) => p.user_id) || [])];
  const { data: creators } = useQuery({
    queryKey: ["admin-post-creators", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, username, anonymous_name, is_admin").in("user_id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });

  // Marketplace
  const { data: listings } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data } = await supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const listingUserIds = [...new Set(listings?.map((l) => l.user_id) || [])];
  const { data: listingSellers } = useQuery({
    queryKey: ["listing-sellers", listingUserIds],
    queryFn: async () => {
      if (listingUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, username, anonymous_name").in("user_id", listingUserIds);
      return data || [];
    },
    enabled: listingUserIds.length > 0,
  });

  // Reports
  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Announcements
  const { data: announcements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Admin profile for settings
  const { data: adminProfile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      if (data && !adminHandle) setAdminHandle(data.username);
      return data;
    },
    enabled: !!user,
  });

  // System log
  const { data: recentTopics } = useQuery({
    queryKey: ["recent-activity-topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id, title, created_at, is_announcement").order("created_at", { ascending: false }).limit(3);
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

  const getInviterName = (invitedBy: string | null) => {
    if (!invitedBy) return "DIRECT / UNKNOWN";
    const inviter = inviters?.find((i) => i.user_id === invitedBy);
    if (!inviter) return invitedBy.slice(0, 8);
    return inviter.is_admin ? `${inviter.username} (ADMIN)` : inviter.anonymous_name || inviter.username;
  };

  const getTicketUsedBy = (userId: string) => {
    const ticket = allTickets?.find((t) => t.used_by === userId);
    return ticket ? ticket.invite_code : null;
  };

  const getCreatorInfo = (userId: string) => {
    const creator = creators?.find((c) => c.user_id === userId);
    return {
      name: creator?.is_admin ? creator.username : creator?.anonymous_name || creator?.username || "Unknown",
      isAdmin: creator?.is_admin || false,
    };
  };

  const getSellerName = (userId: string) => {
    const s = listingSellers?.find((s) => s.user_id === userId);
    return s?.username || s?.anonymous_name || "?";
  };

  const getLookupName = (userId: string) => {
    const p = recentProfiles?.find((p) => p.user_id === userId);
    if (!p) return userId.slice(0, 8);
    return p.anonymous_name || p.username;
  };

  const timeSince = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const isImage = (path: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("post-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  // ── ACTIONS ──

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const handleStatusChange = async (userId: string, newStatus: "active" | "suspended" | "banned") => {
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("user_id", userId);
    if (error) toast.error("Failed"); else { toast.success(`User ${newStatus}`); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); }
  };

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

  const handleDeletePost = async (postId: string, attachments?: string[]) => {
    if (attachments?.length) await supabase.storage.from("post-attachments").remove(attachments);
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) toast.error("Failed"); else { toast.success("Post deleted"); queryClient.invalidateQueries({ queryKey: ["admin-posts"] }); }
  };

  const handlePinPost = async (postId: string, pinned: boolean) => {
    const { error } = await supabase.from("posts").update({ is_pinned: !pinned }).eq("id", postId);
    if (error) toast.error("Failed"); else { toast.success(pinned ? "Unpinned" : "Pinned"); queryClient.invalidateQueries({ queryKey: ["admin-posts"] }); }
  };

  const handleListingStatus = async (id: string, status: "active" | "removed") => {
    const { error } = await supabase.from("marketplace_listings").update({ status }).eq("id", id);
    if (error) toast.error("Failed"); else { toast.success(status === "active" ? "Approved" : "Removed"); queryClient.invalidateQueries({ queryKey: ["admin-listings"] }); }
  };

  const handleReportStatus = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) toast.error("Failed"); else { toast.success(`Report ${status}`); queryClient.invalidateQueries({ queryKey: ["admin-reports"] }); }
  };

  const handleAnnSubmit = async () => {
    if (!annTitle || !annContent || !user) return;
    const { error } = await supabase.from("announcements").insert({ admin_id: user.id, title: annTitle, content: annContent, target_location: annTarget });
    if (error) toast.error("Failed"); else {
      toast.success("Broadcast sent"); setAnnTitle(""); setAnnContent(""); setAnnTarget("GLOBAL"); setShowAnnForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    }
  };

  const handleRevokeAnn = async (id: string) => {
    const { error } = await supabase.from("announcements").update({ is_active: false }).eq("id", id);
    if (error) toast.error("Failed"); else { toast.success("Revoked"); queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }); }
  };

  const handleSaveSettings = async () => {
    if (!user || !adminHandle) return;
    setSavingSettings(true);
    const { error } = await supabase.from("profiles").update({ username: adminHandle }).eq("user_id", user.id);
    if (error) toast.error("Failed"); else { toast.success("Saved"); queryClient.invalidateQueries({ queryKey: ["admin-profile"] }); }
    setSavingSettings(false);
  };

  // Build activity log
  const activityLog = [
    ...(recentProfiles?.map((p) => ({
      time: new Date(p.created_at),
      text: `User "${p.anonymous_name || p.username}" registered${p.invited_by ? ` (invited by ${getInviterName(p.invited_by)})` : ""} — ${p.location || "Unknown region"}`,
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

  const adminModules = [
    { label: "USERS", hint: `${profileCount ?? 0} total`, path: "/users" },
    { label: "POSTS", hint: `${postCount ?? 0} total`, path: "/posts" },
    { label: "MARKETPLACE", hint: `${listingCount ?? 0} listings`, path: "/marketplace" },
    { label: "REPORTS", hint: `${pendingReports ?? 0} pending`, path: "/reports" },
    { label: "ANNOUNCEMENTS", hint: `${announcements?.length ?? 0} records`, path: "/announcements" },
    { label: "ANALYTICS", hint: "metrics", path: "/analytics" },
    { label: "SETTINGS", hint: "admin config", path: "/settings" },
  ];

  // Section header component
  const SectionHeader = ({ title, count, sectionKey }: { title: string; count?: number; sectionKey: keyof typeof sections }) => (
    <button
      onClick={() => toggle(sectionKey)}
      className="w-full flex items-center justify-between text-left terminal-header mb-0"
    >
      <span>{title}{count !== undefined ? ` — ${count}` : ""}</span>
      {sections[sectionKey] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  );

  return (
    <AdminLayout showBack={false}>
      <div className="min-h-screen terminal-grid terminal-flicker">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

          {/* ── HEADER ── */}
          <div className="flex items-start justify-between">
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

          {/* ── MODULE CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {adminModules.map((module) => (
              <button
                key={module.label}
                onClick={() => navigate(module.path)}
                className="text-left border border-border bg-card p-3 hover:border-foreground/40 hover:bg-foreground/5 transition-none"
              >
                <p className="text-[9px] text-muted-foreground tracking-[0.3em]">[ OPEN MODULE ]</p>
                <p className="text-xs text-foreground tracking-wider mt-1">{module.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{module.hint}</p>
              </button>
            ))}
          </div>

          {/* ── SYSTEM STATUS ── */}
          <div className="border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
              <span className="text-[10px] text-muted-foreground tracking-[0.3em]">SYSTEM STATUS</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-1">
              <div className="text-[10px]"><span className="text-muted-foreground">STATUS: </span><span className="text-foreground glow-text">ONLINE</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">USERS: </span><span className="text-foreground">{profileCount ?? "..."}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">TOPICS: </span><span className="text-foreground">{topicCount ?? "..."}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">POSTS: </span><span className="text-foreground">{postCount ?? "..."}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">LISTINGS: </span><span className="text-foreground">{listingCount ?? "..."}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">REPORTS: </span><span className={`${(pendingReports ?? 0) > 0 ? "text-warning" : "text-foreground"}`}>{pendingReports ?? 0} PENDING</span></div>
            </div>
          </div>

          {/* ── CATEGORY BREAKDOWN ── */}
          <div className="border border-border bg-card p-3">
            <div className="text-[10px] text-muted-foreground tracking-[0.3em] mb-2">TOPIC CATEGORIES</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-1">
              {TOPIC_CATEGORIES.map((cat) => {
                const count = categoryBreakdown?.[cat.value] || 0;
                const CatIcon = cat.icon;
                return (
                  <div key={cat.value} className="flex items-center gap-1.5 text-[10px] py-0.5">
                    <CatIcon className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-muted-foreground truncate">{cat.label.split(" & ")[0]}</span>
                    <span className="text-foreground ml-auto">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── INVITE TICKETS ── */}
          <div className="border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground tracking-[0.3em]">INVITE TICKETS — {adminTickets?.length ?? 0} AVAILABLE</span>
              <button onClick={generateTicket} disabled={generating} className="flex items-center gap-1 text-[10px] text-foreground border border-foreground px-2 py-0.5 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50">
                <Ticket className="h-3 w-3" />{generating ? "..." : "[+ NEW]"}
              </button>
            </div>
            {adminTickets && adminTickets.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
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

          {/* ── USER REGISTRY ── */}
          <div className="terminal-box">
            <SectionHeader title="USER REGISTRY" count={users?.length ?? 0} sectionKey="users" />
            {sections.users && (
              <div className="mt-2">
                <input placeholder="> SEARCH USER..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full md:w-56 bg-input border border-border text-foreground placeholder:text-muted-foreground text-[10px] px-2 py-1.5 focus:outline-none focus:border-foreground mb-2" />
                {users && users.length > 0 ? (
                  <div className="space-y-0.5">
                    {users.map((u) => {
                      const isExpanded = expandedUser === u.user_id;
                      const ticketCode = getTicketUsedBy(u.user_id);
                      return (
                        <div key={u.id} className="border border-border">
                          <div className="flex items-center text-[10px] py-1.5 px-2 hover:bg-muted/50 transition-none gap-2">
                            <span className="text-muted-foreground w-14 shrink-0">{u.id.slice(0, 8)}</span>
                            <span className={`flex-1 truncate ${u.is_admin ? "admin-text glow-admin font-bold" : "text-foreground"}`}>
                              {u.username}{u.is_admin && <span className="admin-badge ml-1">ADMIN</span>}
                            </span>
                            <span className="text-muted-foreground w-16 shrink-0 truncate">{u.location || "—"}</span>
                            <span className={`w-14 shrink-0 ${u.status === "active" ? "text-foreground" : u.status === "suspended" ? "text-warning" : "text-destructive"}`}>{u.status?.toUpperCase()}</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => setExpandedUser(isExpanded ? null : u.user_id)} className="text-muted-foreground hover:text-foreground p-0.5">
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                              {!u.is_admin && (
                                <>
                                  <button onClick={() => handleStatusChange(u.user_id, "suspended")} className="text-warning hover:underline">[SUS]</button>
                                  <button onClick={() => handleStatusChange(u.user_id, "banned")} className="text-destructive hover:underline">[BAN]</button>
                                  {u.status !== "active" && <button onClick={() => handleStatusChange(u.user_id, "active")} className="text-foreground hover:underline">[ACT]</button>}
                                </>
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-border bg-muted/20 px-3 py-2">
                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                <div><span className="text-muted-foreground">NAME: </span><span className="text-foreground">{u.name || "—"}</span></div>
                                <div><span className="text-muted-foreground">ANON: </span><span className="text-foreground">{u.anonymous_name || "—"}</span></div>
                                <div><span className="text-muted-foreground">REGION: </span><span className="text-foreground">{u.location || "—"}</span></div>
                                <div><span className="text-muted-foreground">JOINED: </span><span className="text-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</span></div>
                                <div><span className="text-muted-foreground">INVITED BY: </span><span className="text-foreground">{getInviterName(u.invited_by)}</span></div>
                                <div><span className="text-muted-foreground">TICKET: </span><span className="text-foreground font-mono">{ticketCode || "—"}</span></div>
                                <div><span className="text-muted-foreground">INTERESTS: </span><span className="text-foreground">{u.interests?.join(", ") || "—"}</span></div>
                                <div><span className="text-muted-foreground">ID: </span><span className="text-foreground font-mono text-[9px]">{u.user_id}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-[10px] text-muted-foreground">NO USERS FOUND</p>}
              </div>
            )}
          </div>

          {/* ── POSTS ── */}
          <div className="terminal-box">
            <SectionHeader title="POST MONITOR" count={posts?.length ?? 0} sectionKey="posts" />
            {sections.posts && (
              <div className="mt-2">
                {posts && posts.length > 0 ? posts.map((post) => {
                  const { name, isAdmin: isPostAdmin } = getCreatorInfo(post.user_id);
                  const attachments = (post.attachments as string[]) || [];
                  return (
                    <div key={post.id} className={`py-2 border-b last:border-0 ${isPostAdmin ? "admin-box my-1 px-2 py-3 border-b-0" : "border-border"}`}>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                        <span>{post.id.slice(0, 8)}</span>
                        <span className={isPostAdmin ? "admin-text glow-admin font-bold" : "text-foreground"}>{name}</span>
                        {isPostAdmin && <span className="admin-badge">ADMIN</span>}
                        {post.is_pinned && <span className="text-foreground">[📌]</span>}
                        <span className="ml-auto">{timeSince(post.created_at)}</span>
                      </div>
                      <p className={`text-[11px] mb-1 pl-2 border-l ${isPostAdmin ? "border-admin-border admin-text/80" : "border-border text-secondary-foreground"}`}>
                        {post.content.length > 120 ? post.content.slice(0, 120) + "..." : post.content}
                      </p>
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1 ml-2">
                          {attachments.map((path, i) => {
                            const url = getPublicUrl(path);
                            return isImage(path) ? (
                              <button key={i} onClick={() => setPreviewUrl(url)} className="border border-border w-10 h-10 overflow-hidden">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <span key={i} className="flex items-center gap-1 text-[9px] text-muted-foreground border border-border px-1 py-0.5">
                                <FileText className="h-2 w-2" />{path.split("/").pop()?.slice(0, 15)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-muted-foreground">♥{post.likes_count}</span>
                        {attachments.length > 0 && <span className="text-muted-foreground">📎{attachments.length}</span>}
                        <span className="ml-auto space-x-2">
                          <button onClick={() => handlePinPost(post.id, post.is_pinned)} className="text-foreground hover:underline">[{post.is_pinned ? "UNPIN" : "PIN"}]</button>
                          <button onClick={() => handleDeletePost(post.id, attachments)} className="text-destructive hover:underline">[DEL]</button>
                        </span>
                      </div>
                    </div>
                  );
                }) : <p className="text-[10px] text-muted-foreground">NO POSTS</p>}
              </div>
            )}
          </div>

          {/* ── MARKETPLACE ── */}
          <div className="terminal-box">
            <SectionHeader title="MARKETPLACE" count={listings?.length ?? 0} sectionKey="marketplace" />
            {sections.marketplace && (
              <div className="mt-2">
                {listings && listings.length > 0 ? listings.map((l) => (
                  <div key={l.id} className={`flex items-center text-[10px] py-1.5 border-b border-border last:border-0 gap-2 ${l.status === "flagged" ? "bg-warning/5" : ""}`}>
                    <span className="text-muted-foreground w-14">{l.id.slice(0, 8)}</span>
                    <span className="flex-1 text-foreground truncate">{l.title}</span>
                    <span className="text-muted-foreground w-20 truncate">{getSellerName(l.user_id)}</span>
                    <span className="text-foreground w-16">{l.price}</span>
                    <span className={`w-16 ${l.status === "active" ? "text-foreground" : l.status === "pending" ? "text-warning" : "text-destructive"}`}>{l.status?.toUpperCase()}</span>
                    <span className="space-x-1 shrink-0">
                      <button onClick={() => handleListingStatus(l.id, "active")} className="text-foreground hover:underline">[OK]</button>
                      <button onClick={() => handleListingStatus(l.id, "removed")} className="text-destructive hover:underline">[DEL]</button>
                    </span>
                  </div>
                )) : <p className="text-[10px] text-muted-foreground">NO LISTINGS</p>}
              </div>
            )}
          </div>

          {/* ── REPORTS ── */}
          <div className="terminal-box">
            <SectionHeader title={`REPORTS — ${(pendingReports ?? 0)} PENDING`} sectionKey="reports" />
            {sections.reports && (
              <div className="mt-2">
                {reports && reports.length > 0 ? reports.map((r) => (
                  <div key={r.id} className={`py-2 border-b border-border last:border-0 ${r.severity === "critical" ? "bg-destructive/5" : ""}`}>
                    <div className="flex items-center gap-2 text-[10px] mb-1">
                      <span className="text-muted-foreground">{r.id.slice(0, 8)}</span>
                      <span className="text-foreground">[{r.report_type?.toUpperCase()}]</span>
                      <span className={r.severity === "critical" ? "text-destructive" : r.severity === "high" ? "text-warning" : "text-muted-foreground"}>
                        SEV:{r.severity?.toUpperCase()}
                      </span>
                      <span className={`ml-auto ${r.status === "pending" ? "text-warning" : r.status === "reviewing" ? "text-foreground" : "text-muted-foreground"}`}>{r.status?.toUpperCase()}</span>
                    </div>
                    <p className="text-[11px] text-secondary-foreground pl-2 border-l border-border mb-1">{r.reason}</p>
                    {r.status !== "resolved" && r.status !== "dismissed" && (
                      <div className="flex gap-2 text-[10px]">
                        <button onClick={() => handleReportStatus(r.id, "reviewing")} className="text-foreground hover:underline">[REVIEW]</button>
                        <button onClick={() => handleReportStatus(r.id, "dismissed")} className="text-foreground hover:underline">[DISMISS]</button>
                        <button onClick={() => handleReportStatus(r.id, "resolved")} className="text-foreground hover:underline">[RESOLVE]</button>
                      </div>
                    )}
                  </div>
                )) : <p className="text-[10px] text-muted-foreground">NO REPORTS</p>}
              </div>
            )}
          </div>

          {/* ── ANNOUNCEMENTS ── */}
          <div className="terminal-box">
            <div className="flex items-center justify-between">
              <SectionHeader title="BROADCASTS" count={announcements?.length ?? 0} sectionKey="announcements" />
            </div>
            {sections.announcements && (
              <div className="mt-2">
                <button onClick={() => setShowAnnForm(!showAnnForm)} className="text-[10px] admin-text border border-admin-border px-2 py-1 hover:bg-[hsl(var(--admin))] hover:text-background transition-none mb-2">
                  [+ NEW BROADCAST]
                </button>
                {showAnnForm && (
                  <div className="admin-box p-3 mb-2">
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] admin-text mb-0.5">&gt; TITLE:</p>
                        <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="bg-input border-admin-border text-foreground text-[11px] h-7" />
                      </div>
                      <div>
                        <p className="text-[10px] admin-text mb-0.5">&gt; MESSAGE:</p>
                        <Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} className="bg-input border-admin-border text-foreground text-[11px] min-h-16 resize-none" />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] admin-text mb-0.5">&gt; TARGET:</p>
                          <Input value={annTarget} onChange={(e) => setAnnTarget(e.target.value)} className="bg-input border-admin-border text-foreground text-[11px] h-7 w-32" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowAnnForm(false)} className="text-[10px] text-muted-foreground hover:text-foreground">[CANCEL]</button>
                          <button onClick={handleAnnSubmit} className="text-[10px] admin-text border border-admin-border px-2 py-0.5 hover:bg-[hsl(var(--admin))] hover:text-background">[TRANSMIT]</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {announcements && announcements.length > 0 ? announcements.map((ann: any) => (
                  <div key={ann.id} className={`admin-box p-3 my-1 ${!ann.is_active ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-2 text-[10px] mb-1">
                      <span className="text-muted-foreground">{ann.id.slice(0, 8)}</span>
                      <span className={ann.is_active ? "admin-text" : "text-muted-foreground"}>{ann.is_active ? "ACTIVE" : "REVOKED"}</span>
                      <span className="text-muted-foreground">TARGET:{ann.target_location}</span>
                      <span className="ml-auto text-muted-foreground">{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] admin-text font-bold">{ann.title}</p>
                    <p className="text-[11px] text-secondary-foreground pl-2 border-l border-admin-border mt-0.5">{ann.content}</p>
                    {ann.is_active && (
                      <div className="text-right mt-1">
                        <button onClick={() => handleRevokeAnn(ann.id)} className="text-[10px] text-destructive hover:underline">[REVOKE]</button>
                      </div>
                    )}
                  </div>
                )) : <p className="text-[10px] text-muted-foreground">NO BROADCASTS</p>}
              </div>
            )}
          </div>

          {/* ── SETTINGS ── */}
          <div className="terminal-box">
            <SectionHeader title="CONFIGURATION" sectionKey="settings" />
            {sections.settings && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground w-28">ADMIN HANDLE:</span>
                  <input value={adminHandle} onChange={(e) => setAdminHandle(e.target.value)}
                    className="flex-1 bg-input border border-border text-foreground text-[11px] px-2 py-1 focus:outline-none focus:border-foreground" />
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground w-28">ADMIN EMAIL:</span>
                  <span className="text-foreground text-[11px]">{user?.email || "—"}</span>
                </div>
                <button onClick={handleSaveSettings} disabled={savingSettings}
                  className="text-[10px] text-foreground border border-foreground px-3 py-1 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50">
                  {savingSettings ? "[SAVING...]" : "[SAVE]"}
                </button>
              </div>
            )}
          </div>

          {/* ── SYSTEM LOG ── */}
          <div className="border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-muted-foreground tracking-[0.3em]">SYSTEM LOG</span>
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

      {/* Image Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-[75vh] object-contain border border-border" />
        </div>
      )}
    </AdminLayout>
  );
};

export default Index;
