import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { formatDistanceToNow } from "date-fns";
import {
  User, Mail, MapPin, Ticket, Clock, Shield,
  ArrowLeft, UserCheck,
} from "lucide-react";

export default function AdminUserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-user-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  // Get the user's email from auth via a lookup of their invite ticket
  const { data: userTicket } = useQuery({
    queryKey: ["admin-user-ticket", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_tickets")
        .select("*")
        .eq("used_by", userId!)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // Get inviter profile
  const { data: inviterProfile } = useQuery({
    queryKey: ["admin-inviter-profile", profile?.invited_by],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, anonymous_name, is_admin, user_id")
        .eq("user_id", profile!.invited_by!)
        .single();
      return data;
    },
    enabled: !!profile?.invited_by,
  });

  // User's own invite tickets
  const { data: ownTickets } = useQuery({
    queryKey: ["admin-user-own-tickets", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_tickets")
        .select("*")
        .eq("owner_id", userId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // User's posts count
  const { data: postCount } = useQuery({
    queryKey: ["admin-user-post-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!);
      return count || 0;
    },
    enabled: !!userId,
  });

  // User's topics count
  const { data: topicCount } = useQuery({
    queryKey: ["admin-user-topic-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("topics")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!);
      return count || 0;
    },
    enabled: !!userId,
  });

  const inviterName = inviterProfile
    ? inviterProfile.is_admin
      ? `${inviterProfile.username} (ADMIN)`
      : inviterProfile.anonymous_name || inviterProfile.username
    : "DIRECT / UNKNOWN";

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

      <div className="p-6 space-y-4">
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
              <div className="grid grid-cols-2 gap-3 text-[11px]">
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
                  <span className="text-muted-foreground">USER ID: </span>
                  <span className="text-foreground font-mono text-[9px]">{profile.user_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">INTERESTS: </span>
                  <span className="text-foreground">{profile.interests?.join(", ") || "—"}</span>
                </div>
              </div>
            </div>

            {/* Invitation Info */}
            <div className="terminal-box">
              <div className="terminal-header flex items-center gap-2">
                <UserCheck className="h-3 w-3" />
                <span>INVITATION CHAIN</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground">INVITED BY: </span>
                  <span className="text-foreground">{inviterName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">TICKET USED: </span>
                  <span className="text-foreground font-mono">
                    {userTicket?.invite_code || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="terminal-box">
              <div className="terminal-header">ACTIVITY STATS</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground">POSTS: </span>
                  <span className="text-foreground font-bold">{postCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">TOPICS: </span>
                  <span className="text-foreground font-bold">{topicCount}</span>
                </div>
              </div>
            </div>

            {/* User's Invite Tickets */}
            <div className="terminal-box">
              <div className="terminal-header flex items-center gap-2">
                <Ticket className="h-3 w-3" />
                <span>USER'S INVITE TICKETS — {ownTickets?.length ?? 0}</span>
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