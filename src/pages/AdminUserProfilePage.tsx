import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { formatDistanceToNow } from "date-fns";
import { TOPIC_CATEGORIES } from "@/lib/categories";
import { ProfileAvatar } from "@/components/Avatars";
import {
  User, MapPin, Ticket, Clock, Shield,
  ArrowLeft, UserCheck, MessageSquare, Heart, Eye,
  FileText, Hash, Tag, Flag, AlertTriangle,
} from "lucide-react";

export default function AdminUserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-user-profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId!).single();
      return data;
    },
    enabled: !!userId,
  });

  // Invite ticket used to join
  const { data: userTicket } = useQuery({
    queryKey: ["admin-user-ticket", userId],
    queryFn: async () => {
      const { data } = await supabase.from("invite_tickets").select("*").eq("used_by", userId!).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // Inviter profile
  const { data: inviterProfile } = useQuery({
    queryKey: ["admin-inviter-profile", profile?.invited_by],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username, anonymous_name, is_admin, user_id").eq("user_id", profile!.invited_by!).single();
      return data;
    },
    enabled: !!profile?.invited_by,
  });

  // User's invite tickets
  const { data: ownTickets } = useQuery({
    queryKey: ["admin-user-own-tickets", userId],
    queryFn: async () => {
      const { data } = await supabase.from("invite_tickets").select("*").eq("owner_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // User's posts
  const { data: userPosts } = useQuery({
    queryKey: ["admin-user-posts", userId],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // User's topics
  const { data: userTopics } = useQuery({
    queryKey: ["admin-user-topics", userId],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // User's post likes
  const { data: userPostLikes } = useQuery({
    queryKey: ["admin-user-post-likes", userId],
    queryFn: async () => {
      const { data } = await supabase.from("post_likes").select("post_id, created_at").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // User's topic likes
  const { data: userTopicLikes } = useQuery({
    queryKey: ["admin-user-topic-likes", userId],
    queryFn: async () => {
      const { data } = await supabase.from("topic_likes").select("topic_id, created_at").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // Liked post details
  const likedPostIds = userPostLikes?.map((l) => l.post_id) || [];
  const { data: likedPosts } = useQuery({
    queryKey: ["admin-liked-posts", likedPostIds],
    queryFn: async () => {
      if (likedPostIds.length === 0) return [];
      const { data } = await supabase.from("posts").select("id, content, created_at").in("id", likedPostIds);
      return data || [];
    },
    enabled: likedPostIds.length > 0,
  });

  // Liked topic details
  const likedTopicIds = userTopicLikes?.map((l) => l.topic_id) || [];
  const { data: likedTopics } = useQuery({
    queryKey: ["admin-liked-topics", likedTopicIds],
    queryFn: async () => {
      if (likedTopicIds.length === 0) return [];
      const { data } = await supabase.from("topics").select("id, title, created_at").in("id", likedTopicIds);
      return data || [];
    },
    enabled: likedTopicIds.length > 0,
  });

  // User's comments
  const { data: userComments } = useQuery({
    queryKey: ["admin-user-comments", userId],
    queryFn: async () => {
      const { data } = await supabase.from("post_comments").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // User's replies on topics
  const { data: userReplies } = useQuery({
    queryKey: ["admin-user-replies", userId],
    queryFn: async () => {
      const { data } = await supabase.from("replies").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // Reports filed by this user
  const { data: userReports } = useQuery({
    queryKey: ["admin-user-reports-filed", userId],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").eq("reporter_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // Reports against this user
  const { data: reportsAgainst } = useQuery({
    queryKey: ["admin-user-reports-against", userId],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").eq("reported_user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // Category breakdown for user's topics
  const categoryBreakdown = (userTopics || []).reduce<Record<string, number>>((acc, t) => {
    const cat = t.category || "discussions";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const inviterName = inviterProfile
    ? inviterProfile.is_admin
      ? `${inviterProfile.username} (ADMIN)`
      : inviterProfile.anonymous_name || inviterProfile.username
    : "DIRECT / UNKNOWN";

  const getCatLabel = (val: string) => TOPIC_CATEGORIES.find((c) => c.value === val)?.label || val;

  return (
    <AdminLayout>
      <PageHeader title="USER PROFILE" description="// DETAILED USER INFORMATION">
        <button
          onClick={() => navigate("/users")}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground border border-border px-2 py-1 hover:text-foreground hover:border-foreground transition-none"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK TO REGISTRY
        </button>
      </PageHeader>

      <div className="px-3 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground cursor-blink">LOADING PROFILE</p>
        ) : profile ? (
          <>
            {/* Identity Card */}
            <div className="terminal-box">
              <div className="terminal-header flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>IDENTITY</span>
                <span className={`ml-auto text-[9px] ${
                  profile.status === "active" ? "text-foreground" :
                  profile.status === "suspended" ? "text-warning" : "text-destructive"
                }`}>
                  [{profile.status?.toUpperCase()}]
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <ProfileAvatar avatarId={(profile as any).avatar} isAdmin={profile.is_admin} size={48} />
                <div>
                  <p className="text-foreground font-bold text-sm">{profile.anonymous_name || profile.username}</p>
                  <p className="text-[9px] text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground">USERNAME: </span>
                  <span className="text-foreground font-bold">@{profile.username}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">FULL NAME: </span>
                  <span className="text-foreground">{profile.name || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ANONYMOUS NAME: </span>
                  <span className="text-foreground">{profile.anonymous_name || "—"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">REGION: </span>
                  <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-foreground">{profile.location || "—"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">ROLE: </span>
                  <Shield className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className={profile.is_admin ? "admin-text font-bold" : "text-foreground"}>
                    {profile.is_admin ? "ADMIN" : "USER"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">JOINED: </span>
                  <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-foreground">
                    {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">INTERESTS: </span>
                  <span className="text-foreground">{profile.interests?.join(", ") || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">USER ID: </span>
                  <span className="text-foreground font-mono text-[9px] break-all">{profile.user_id}</span>
                </div>
              </div>
            </div>

            {/* Invitation Chain */}
            <div className="terminal-box">
              <div className="terminal-header flex items-center gap-2">
                <UserCheck className="h-3 w-3" />
                <span>INVITATION CHAIN</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">INVITED BY: </span>
                  <span className="text-foreground">{inviterName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">TICKET USED: </span>
                  <span className="text-foreground font-mono">{userTicket?.invite_code || "—"}</span>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="terminal-box">
              <div className="terminal-header">ACTIVITY OVERVIEW</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-[11px]">
                <div className="border border-border p-2">
                  <p className="text-muted-foreground text-[9px]">POSTS</p>
                  <p className="text-foreground font-bold text-lg">{userPosts?.length ?? 0}</p>
                </div>
                <div className="border border-border p-2">
                  <p className="text-muted-foreground text-[9px]">TOPICS</p>
                  <p className="text-foreground font-bold text-lg">{userTopics?.length ?? 0}</p>
                </div>
                <div className="border border-border p-2">
                  <p className="text-muted-foreground text-[9px]">LIKES GIVEN</p>
                  <p className="text-foreground font-bold text-lg">{(userPostLikes?.length ?? 0) + (userTopicLikes?.length ?? 0)}</p>
                </div>
                <div className="border border-border p-2">
                  <p className="text-muted-foreground text-[9px]">COMMENTS / REPLIES</p>
                  <p className="text-foreground font-bold text-lg">{(userComments?.length ?? 0) + (userReplies?.length ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            {Object.keys(categoryBreakdown).length > 0 && (
              <div className="terminal-box">
                <div className="terminal-header flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  <span>TOPIC CATEGORIES</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {Object.entries(categoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between border border-border px-2 py-1 text-[11px]">
                        <span className="text-foreground">{getCatLabel(cat).toUpperCase()}</span>
                        <span className="text-muted-foreground font-mono">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* User's Topics */}
            <div className="terminal-box">
              <div className="terminal-header flex items-center gap-2">
                <Hash className="h-3 w-3" />
                <span>TOPICS — {userTopics?.length ?? 0}</span>
              </div>
              {userTopics && userTopics.length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {userTopics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/admin/topic/${t.id}`)}
                      className="w-full text-left flex items-center gap-2 text-[11px] hover:bg-foreground/5 px-2 py-1.5 border border-border transition-none"
                    >
                      <Hash className="h-2.5 w-2.5 text-foreground shrink-0" />
                      <span className="text-foreground truncate flex-1">{t.title}</span>
                      {t.category && (
                        <span className="text-[9px] text-muted-foreground border border-border px-1">{getCatLabel(t.category || "").toUpperCase()}</span>
                      )}
                      <span className="text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <MessageSquare className="h-2.5 w-2.5" />{t.replies_count}
                      </span>
                      <span className="text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />{t.views_count}
                      </span>
                      <span className="text-muted-foreground text-[9px] shrink-0">
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">NO TOPICS</p>
              )}
            </div>

            {/* User's Posts */}
            <div className="terminal-box">
              <div className="terminal-header flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>POSTS — {userPosts?.length ?? 0}</span>
              </div>
              {userPosts && userPosts.length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {userPosts.map((p) => (
                    <div key={p.id} className="border border-border px-2 py-1.5 text-[11px]">
                      <p className="text-foreground whitespace-pre-wrap line-clamp-2">{p.content}</p>
                      <div className="flex items-center gap-3 mt-1 text-muted-foreground text-[9px]">
                        {p.location && <span className="flex items-center gap-0.5"><MapPin className="h-2 w-2" />{p.location}</span>}
                        <span className="flex items-center gap-0.5"><Heart className="h-2 w-2" />{p.likes_count}</span>
                        <span className="flex items-center gap-0.5"><MessageSquare className="h-2 w-2" />{p.comments_count}</span>
                        <span className="ml-auto">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">NO POSTS</p>
              )}
            </div>

            {/* Liked Content */}
            <div className="terminal-box">
              <div className="terminal-header flex items-center gap-2">
                <Heart className="h-3 w-3" />
                <span>LIKED CONTENT — {(likedPostIds.length) + (likedTopicIds.length)}</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {likedTopics && likedTopics.length > 0 && likedTopics.map((t) => (
                  <button
                    key={`t-${t.id}`}
                    onClick={() => navigate(`/admin/topic/${t.id}`)}
                    className="w-full text-left flex items-center gap-2 text-[11px] hover:bg-foreground/5 px-2 py-1 border border-border transition-none"
                  >
                    <Hash className="h-2.5 w-2.5 text-foreground shrink-0" />
                    <span className="text-foreground truncate">{t.title}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto">TOPIC</span>
                  </button>
                ))}
                {likedPosts && likedPosts.length > 0 && likedPosts.map((p) => (
                  <div key={`p-${p.id}`} className="flex items-center gap-2 text-[11px] px-2 py-1 border border-border">
                    <FileText className="h-2.5 w-2.5 text-foreground shrink-0" />
                    <span className="text-foreground truncate">{p.content.slice(0, 60)}{p.content.length > 60 ? "..." : ""}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto shrink-0">POST</span>
                  </div>
                ))}
                {(!likedPosts || likedPosts.length === 0) && (!likedTopics || likedTopics.length === 0) && (
                  <p className="text-[11px] text-muted-foreground">NO LIKED CONTENT</p>
                )}
              </div>
            </div>

            {/* Reports */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Reports filed by user */}
              <div className="terminal-box">
                <div className="terminal-header flex items-center gap-2">
                  <Flag className="h-3 w-3" />
                  <span>REPORTS FILED — {userReports?.length ?? 0}</span>
                </div>
                {userReports && userReports.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {userReports.map((r) => (
                      <div key={r.id} className="border border-border px-2 py-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{r.report_type.toUpperCase()}</span>
                          <span className={`text-[9px] ${r.severity === "critical" ? "text-destructive" : r.severity === "high" ? "text-warning" : "text-muted-foreground"}`}>
                            [{r.severity.toUpperCase()}]
                          </span>
                          <span className={`text-[9px] ml-auto ${r.status === "pending" ? "text-warning" : r.status === "resolved" ? "text-foreground" : "text-muted-foreground"}`}>
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[10px] truncate">{r.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">NONE</p>
                )}
              </div>

              {/* Reports against user */}
              <div className="terminal-box">
                <div className="terminal-header flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  <span>REPORTS AGAINST — {reportsAgainst?.length ?? 0}</span>
                </div>
                {reportsAgainst && reportsAgainst.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {reportsAgainst.map((r) => (
                      <div key={r.id} className="border border-border px-2 py-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] ${r.severity === "critical" ? "text-destructive" : r.severity === "high" ? "text-warning" : "text-muted-foreground"}`}>
                            [{r.severity.toUpperCase()}]
                          </span>
                          <span className={`text-[9px] ml-auto ${r.status === "pending" ? "text-warning" : r.status === "resolved" ? "text-foreground" : "text-muted-foreground"}`}>
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[10px] truncate">{r.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">NONE</p>
                )}
              </div>
            </div>

            {/* Invite Tickets */}
            <div className="terminal-box">
              <div className="terminal-header flex items-center gap-2">
                <Ticket className="h-3 w-3" />
                <span>INVITE TICKETS — {ownTickets?.length ?? 0}</span>
              </div>
              {ownTickets && ownTickets.length > 0 ? (
                <div className="space-y-1">
                  {ownTickets.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 text-[11px] border border-border px-2 py-1">
                      <span className="text-foreground font-mono">{t.invite_code}</span>
                      <span className={`text-[9px] ${t.is_used ? "text-muted-foreground" : "text-foreground"}`}>
                        {t.is_used ? "USED" : "AVAILABLE"}
                      </span>
                      {t.used_at && (
                        <span className="text-muted-foreground text-[9px] ml-auto">
                          used {formatDistanceToNow(new Date(t.used_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">NO TICKETS</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">USER NOT FOUND</p>
        )}
      </div>
    </AdminLayout>
  );
}