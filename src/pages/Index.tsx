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
  Paperclip, Users, AlertTriangle, Megaphone, BarChart3,
  Settings, TrendingUp, Hash, MessageSquare,
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

  const adminQuickCards = [
    { label: "USERS", icon: Users, hint: `${profileCount ?? 0} registered`, path: "/users" },
    { label: "REPORTS", icon: AlertTriangle, hint: `${pendingReports ?? 0} pending`, path: "/reports" },
    { label: "ANNOUNCEMENTS", icon: Megaphone, hint: `${announcements?.length ?? 0} records`, path: "/announcements" },
    { label: "ANALYTICS", icon: BarChart3, hint: "metrics", path: "/analytics" },
    { label: "SETTINGS", icon: Settings, hint: "admin config", path: "/settings" },
    { label: "INVITES", icon: Ticket, hint: `${adminTickets?.length ?? 0} available`, path: "#invites" },
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

  const [showInvites, setShowInvites] = useState(false);

  return (
    <AdminLayout showBack={false}>
      <div className="min-h-screen terminal-grid terminal-flicker">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

          {/* ── HEADER ── */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="h-5 w-5 text-foreground" />
                <p className="text-2xl text-foreground glow-text tracking-[0.3em]">NEARVOX</p>
              </div>
              <p className="text-[10px] text-muted-foreground tracking-[0.5em] ml-7">ADMIN TERMINAL</p>
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

          {/* ── CATEGORY CARDS (same as user panel) ── */}
          <div>
            <p className="text-[10px] text-muted-foreground tracking-[0.3em] mb-3">
              &gt; NAVIGATE — SELECT MODULE
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
              {TOPIC_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = categoryBreakdown?.[cat.value] || 0;
                return (
                  <button
                    key={cat.value}
                    onClick={() => navigate(`/user/topics?category=${cat.value}`)}
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
            </div>
          </div>

          {/* ── ADMIN QUICK ACCESS CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
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
          )}

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
                    onClick={() => navigate(`/topic/${topic.id}`)}
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
