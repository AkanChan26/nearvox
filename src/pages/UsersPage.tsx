import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Ticket, Copy, Check, X } from "lucide-react";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) {
        query = query.ilike("username", `%${search}%`);
      }
      if (user?.id) {
        query = query.neq("user_id", user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
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

  const handleStatusChange = async (userId: string, newStatus: "suspended" | "banned") => {
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("user_id", userId);
    if (error) {
      toast.error("Failed to update user status");
    } else {
      toast.success(`User ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  };

  const generateTicket = async () => {
    if (!user) return;
    setGenerating(true);
    const { data, error } = await supabase
      .from("invite_tickets")
      .insert({ owner_id: user.id })
      .select()
      .single();
    if (error) {
      toast.error("Failed to generate ticket");
    } else {
      toast.success("Invite ticket generated");
      refetchTickets();
    }
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
        <Input
          placeholder="> SEARCH USER..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 bg-input border-border text-foreground placeholder:text-muted-foreground text-xs"
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
                    <button
                      onClick={() => copyTicketLink(ticket.invite_code)}
                      className="text-muted-foreground hover:text-foreground"
                    >
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

          <div className="flex items-center text-[10px] text-muted-foreground tracking-wider pb-2 mb-2 border-b border-border">
            <span className="w-24">ID</span>
            <span className="w-28">NAME</span>
            <span className="flex-1">HANDLE</span>
            <span className="w-28">REGION</span>
            <span className="w-24">STATUS</span>
            <span className="w-32 text-right">ACTIONS</span>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 cursor-blink">LOADING</p>
          ) : users && users.length > 0 ? (
            users.map((u) => (
              <div key={u.id} className="flex items-center text-xs py-2 border-b border-border last:border-0 hover:bg-muted/50 transition-none">
                <span className="w-24 text-muted-foreground">{u.id.slice(0, 8)}</span>
                <span className="w-28 text-muted-foreground">{(u as any).name || "—"}</span>
                <span className={`flex-1 ${u.is_admin ? "admin-text glow-admin font-bold" : "text-foreground"}`}>
                  {u.username}
                  {u.is_admin && <span className="admin-badge ml-1">ADMIN</span>}
                </span>
                <span className="w-28 text-muted-foreground">{u.location || "—"}</span>
                <span className={`w-24 ${
                  u.status === "active" ? "text-foreground" :
                  u.status === "suspended" ? "text-warning" : "text-destructive"
                }`}>{u.status?.toUpperCase()}</span>
                <span className="w-32 text-right space-x-2">
                  <button className="text-foreground hover:underline">[VIEW]</button>
                  <button onClick={() => handleStatusChange(u.user_id, "suspended")} className="text-warning hover:underline">[SUS]</button>
                  <button onClick={() => handleStatusChange(u.user_id, "banned")} className="text-destructive hover:underline">[BAN]</button>
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2">NO USERS FOUND</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
