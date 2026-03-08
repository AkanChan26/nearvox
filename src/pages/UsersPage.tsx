import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Ticket, Copy, Check, X, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) query = query.ilike("username", `%${search}%`);
      if (user?.id) query = query.neq("user_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch invite ticket info for all users
  const { data: allTickets } = useQuery({
    queryKey: ["admin-all-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch inviter profiles for users who were invited
  const inviterIds = [...new Set(users?.map((u) => u.invited_by).filter(Boolean) || [])];
  const { data: inviters } = useQuery({
    queryKey: ["inviter-profiles", inviterIds],
    queryFn: async () => {
      if (inviterIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, anonymous_name, is_admin")
        .in("user_id", inviterIds as string[]);
      return data || [];
    },
    enabled: inviterIds.length > 0,
  });

  // Admin's tickets
  const { data: tickets, refetch: refetchTickets } = useQuery({
    queryKey: ["admin-tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_tickets")
        .select("*")
        .eq("owner_id", user!.id)
        .eq("is_used", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Activity logs
  const { data: activityLogs } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

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

  const handleStatusChange = async (userId: string, newStatus: "active" | "suspended" | "banned") => {
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("user_id", userId);
    if (error) toast.error("Failed to update user status");
    else {
      toast.success(`User ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  };

  const generateTicket = async () => {
    if (!user) return;
    setGenerating(true);
    const { error } = await supabase.from("invite_tickets").insert({ owner_id: user.id }).select().single();
    if (error) toast.error("Failed to generate ticket");
    else { toast.success("Invite ticket generated"); refetchTickets(); }
    setGenerating(false);
  };

  const copyTicketLink = (code: string) => {
    const link = `${window.location.origin}/join?code=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <AdminLayout>
      <PageHeader title="USER REGISTRY" description="// MANAGE AND MONITOR USER ACCOUNTS">
        <input
          placeholder="> SEARCH USER..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs px-3 py-2 focus:outline-none focus:border-foreground"
        />
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* Invite Ticket Generator */}
        <div className="terminal-box">
          <div className="terminal-header flex items-center justify-between">
            <span>INVITE TICKETS — {tickets?.length ?? 0} AVAILABLE</span>
            <button
              onClick={generateTicket}
              disabled={generating}
              className="flex items-center gap-1.5 text-[10px] text-foreground border border-foreground px-2 py-1 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50 tracking-normal"
            >
              <Ticket className="h-3 w-3" />
              {generating ? "GENERATING..." : "[+ GENERATE TICKET]"}
            </button>
          </div>
          {tickets && tickets.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between border border-border p-2">
                  <span className="text-xs text-foreground font-mono tracking-wider">{ticket.invite_code}</span>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => copyTicketLink(ticket.invite_code)} className="text-muted-foreground hover:text-foreground">
                      {copiedCode === ticket.invite_code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={async () => {
                        const { error } = await supabase.from("invite_tickets").delete().eq("id", ticket.id);
                        if (error) toast.error("Failed to delete ticket");
                        else { toast.success("Ticket deleted"); refetchTickets(); }
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">NO UNUSED TICKETS — GENERATE ONE ABOVE</p>
          )}
        </div>

        {/* User List */}
        <div className="terminal-box">
          <div className="terminal-header">REGISTERED USERS — {users?.length ?? 0} RECORDS</div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : users && users.length > 0 ? (
            <div className="space-y-1">
              {users.map((u) => (
                <div key={u.id} className="border border-border">
                  <div className="flex items-center text-xs py-2 px-2 hover:bg-muted/50 transition-none">
                    <span className="w-20 text-muted-foreground text-[10px]">{u.id.slice(0, 8)}</span>
                    <span className={`flex-1 ${u.is_admin ? "admin-text glow-admin font-bold" : "text-foreground"}`}>
                      {u.username}
                      {u.is_admin && <span className="admin-badge ml-1">ADMIN</span>}
                    </span>
                    <span className="w-20 text-muted-foreground text-[10px]">{u.location || "—"}</span>
                    <span className={`w-20 text-[10px] ${
                      u.status === "active" ? "text-foreground" :
                      u.status === "suspended" ? "text-warning" : "text-destructive"
                    }`}>{u.status?.toUpperCase()}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/users/${u.user_id}`)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        title="View profile"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleStatusChange(u.user_id, "suspended")} className="text-[10px] text-warning hover:underline">[SUS]</button>
                      <button onClick={() => handleStatusChange(u.user_id, "banned")} className="text-[10px] text-destructive hover:underline">[BAN]</button>
                      {u.status !== "active" && (
                        <button onClick={() => handleStatusChange(u.user_id, "active")} className="text-[10px] text-foreground hover:underline">[ACTIVATE]</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO USERS FOUND</p>
          )}
        </div>

        {/* Recent Activity Logs */}
        <div className="terminal-box">
          <div className="terminal-header">USER ACTIVITY LOG</div>
          {activityLogs && activityLogs.length > 0 ? (
            <div className="space-y-0.5">
              {activityLogs.map((log: any) => {
                const logUser = users?.find((u) => u.user_id === log.user_id);
                return (
                  <div key={log.id} className="text-[11px] flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">
                      [{new Date(log.created_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}]
                    </span>
                    <span className="text-foreground">
                      <span className="text-foreground/70">{logUser?.anonymous_name || log.user_id.slice(0, 8)}</span>
                      {" → "}
                      {log.action.replace(/_/g, " ").toUpperCase()}
                      {log.details?.content_preview && ` — "${log.details.content_preview}"`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground cursor-blink">NO ACTIVITY LOGGED</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
