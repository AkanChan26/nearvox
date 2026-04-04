import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Ticket, Copy, Check, X, Eye, Trash2 } from "lucide-react";
import { runAdminDeleteAccount, runAdminModeration, type AdminModerationAction } from "@/lib/adminModeration";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [moderatingKey, setModeratingKey] = useState<string | null>(null);
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

  const handleModerationAction = async (userId: string, action: AdminModerationAction) => {
    const key = `${action}:${userId}`;
    setModeratingKey(key);

    try {
      await runAdminModeration(userId, action);
      const label =
        action === "suspend"
          ? "User suspended"
          : action === "unsuspend"
            ? "User unsuspended"
            : action === "block"
              ? "User blocked"
              : "User unblocked";

      toast.success(label);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-profile", userId] });
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user status");
    } finally {
      setModeratingKey(null);
    }
  };

  const handleDeleteAccount = async (userId: string) => {
    if (!confirm("⚠ DELETE THIS ACCOUNT PERMANENTLY? This cannot be undone.")) return;
    setDeletingUser(userId);
    try {
      await runAdminDeleteAccount(userId);
      toast.success("Account deleted permanently");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete account");
    } finally {
      setDeletingUser(null);
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

  const getShareOrigin = () => {
    const origin = window.location.origin;
    if (origin.includes("localhost") || origin.includes("preview")) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      if (projectId) return `https://${projectId}.lovable.app`;
    }
    return origin;
  };

  const copyTicketLink = (code: string) => {
    const link = `${getShareOrigin()}/join?code=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusActions = (u: any) => {
    const actions: { label: string; mobileLabel: string; action: () => void; color: string; key: string }[] = [];

    if (u.status === "active") {
      actions.push({ label: "[SUS]", mobileLabel: "S", action: () => handleModerationAction(u.user_id, "suspend"), color: "text-warning", key: `suspend:${u.user_id}` });
      actions.push({ label: "[BLK]", mobileLabel: "B", action: () => handleModerationAction(u.user_id, "block"), color: "text-destructive", key: `block:${u.user_id}` });
    } else if (u.status === "suspended") {
      actions.push({ label: "[UNSUS]", mobileLabel: "U", action: () => handleModerationAction(u.user_id, "unsuspend"), color: "text-foreground", key: `unsuspend:${u.user_id}` });
      actions.push({ label: "[BLK]", mobileLabel: "B", action: () => handleModerationAction(u.user_id, "block"), color: "text-destructive", key: `block:${u.user_id}` });
    } else if (u.status === "banned") {
      actions.push({ label: "[UNBLK]", mobileLabel: "U", action: () => handleModerationAction(u.user_id, "unblock"), color: "text-foreground", key: `unblock:${u.user_id}` });
    }

    return actions;
  };

  return (
    <AdminLayout>
      <PageHeader title="USER REGISTRY" description="// MANAGE AND MONITOR USER ACCOUNTS">
        <input
          placeholder="> SEARCH..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-32 sm:w-56 bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:border-foreground"
        />
      </PageHeader>

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Invite Ticket Generator */}
        <div className="terminal-box">
          <div className="terminal-header flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[9px] sm:text-[10px]">INVITE TICKETS — {tickets?.length ?? 0} AVAILABLE</span>
            <button
              onClick={generateTicket}
              disabled={generating}
              className="flex items-center gap-1 text-[9px] sm:text-[10px] text-foreground border border-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50 tracking-normal"
            >
              <Ticket className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {generating ? "..." : "[+ GENERATE]"}
            </button>
          </div>
          {tickets && tickets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between border border-border p-1.5 sm:p-2">
                  <span className="text-[10px] sm:text-xs text-foreground font-mono tracking-wider truncate">{ticket.invite_code}</span>
                  <div className="flex items-center gap-1 ml-1 shrink-0">
                    <button onClick={() => copyTicketLink(ticket.invite_code)} className="text-muted-foreground hover:text-foreground p-0.5">
                      {copiedCode === ticket.invite_code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={async () => {
                        const { error } = await supabase.from("invite_tickets").delete().eq("id", ticket.id);
                        if (error) toast.error("Failed to delete ticket");
                        else { toast.success("Ticket deleted"); refetchTickets(); }
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5"
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
          <div className="terminal-header text-[9px] sm:text-[10px]">REGISTERED USERS — {users?.length ?? 0} RECORDS</div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : users && users.length > 0 ? (
            <div className="space-y-1">
              {users.map((u) => {
                const statusActions = getStatusActions(u);
                return (
                  <div key={u.id} className="border border-border">
                    {/* Desktop row */}
                    <div className="hidden sm:flex items-center text-xs py-2 px-2 hover:bg-muted/50 transition-none">
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
                        <button onClick={() => navigate(`/users/${u.user_id}`)} className="text-muted-foreground hover:text-foreground p-0.5" title="View profile">
                          <Eye className="h-3 w-3" />
                        </button>
                        {statusActions.map((a, i) => (
                          <button
                            key={i}
                            onClick={a.action}
                            disabled={moderatingKey === a.key}
                            className={`text-[10px] ${a.color} hover:underline disabled:opacity-50 disabled:no-underline`}
                          >
                            {a.label}
                          </button>
                        ))}
                        <button
                          onClick={() => handleDeleteAccount(u.user_id)}
                          disabled={deletingUser === u.user_id}
                          className="text-muted-foreground hover:text-destructive p-0.5 ml-1 disabled:opacity-50"
                          title="Delete account"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {/* Mobile stacked - compact */}
                    <div className="sm:hidden px-2 py-1.5 hover:bg-muted/50 transition-none">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] truncate flex-1 ${u.is_admin ? "admin-text glow-admin font-bold" : "text-foreground"}`}>
                          {u.username}
                          {u.is_admin && <span className="admin-badge ml-1 text-[7px]">ADM</span>}
                        </span>
                        <span className={`text-[8px] shrink-0 ${
                          u.status === "active" ? "text-foreground" :
                          u.status === "suspended" ? "text-warning" : "text-destructive"
                        }`}>{u.status?.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[8px] text-muted-foreground">{u.location || "—"}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/users/${u.user_id}`)} className="text-muted-foreground hover:text-foreground" title="View">
                            <Eye className="h-2.5 w-2.5" />
                          </button>
                          {statusActions.map((a, i) => (
                            <button
                              key={i}
                              onClick={a.action}
                              disabled={moderatingKey === a.key}
                              className={`text-[8px] ${a.color} hover:underline px-0.5 disabled:opacity-50 disabled:no-underline`}
                            >
                              {a.mobileLabel}
                            </button>
                          ))}
                          <button
                            onClick={() => handleDeleteAccount(u.user_id)}
                            disabled={deletingUser === u.user_id}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO USERS FOUND</p>
          )}
        </div>

        {/* Recent Activity Logs */}
        <div className="terminal-box">
          <div className="terminal-header text-[9px] sm:text-[10px]">USER ACTIVITY LOG</div>
          {activityLogs && activityLogs.length > 0 ? (
            <div className="space-y-0.5">
              {activityLogs.map((log: any) => {
                const logUser = users?.find((u) => u.user_id === log.user_id);
                return (
                  <div key={log.id} className="text-[10px] sm:text-[11px] flex items-start gap-1 sm:gap-2">
                    <span className="text-muted-foreground shrink-0">
                      [{new Date(log.created_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}]
                    </span>
                    <span className="text-foreground truncate">
                      <span className="text-foreground/70">{logUser?.anonymous_name || log.user_id.slice(0, 8)}</span>
                      {" → "}
                      {log.action.replace(/_/g, " ").toUpperCase()}
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
