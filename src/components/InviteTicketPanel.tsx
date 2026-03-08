import { X, Copy, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  onClose: () => void;
  embedded?: boolean;
}

export function InviteTicketPanel({ onClose, embedded = false }: Props) {
  const { user, isAdmin } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: tickets, refetch } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_tickets")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["my-invite-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("invited_by, anonymous_name")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: inviterProfile } = useQuery({
    queryKey: ["inviter-profile", profile?.invited_by],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("anonymous_name, username, is_admin")
        .eq("user_id", profile!.invited_by!)
        .single();
      return data;
    },
    enabled: !!profile?.invited_by,
  });

  const availableTickets = tickets?.filter((t) => !t.is_used) || [];
  const usedTickets = tickets?.filter((t) => t.is_used) || [];

  const copyInviteLink = (code: string, ticketId: string) => {
    const link = `${window.location.origin}/join?code=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(ticketId);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateTicket = async () => {
    if (!user || !isAdmin) return;
    setGenerating(true);
    const { error } = await supabase.from("invite_tickets").insert({ owner_id: user.id });
    if (error) {
      toast.error("Failed to generate ticket");
    } else {
      toast.success("New ticket generated");
      refetch();
    }
    setGenerating(false);
  };

  const inviterName = inviterProfile
    ? inviterProfile.is_admin
      ? inviterProfile.username
      : inviterProfile.anonymous_name
    : null;

  const content = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground tracking-[0.3em]">INVITE TICKETS</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

        {inviterName && (
          <div className="border border-border p-2 mb-4">
            <p className="text-[10px] text-muted-foreground">
              INVITED BY: <span className="text-foreground">{inviterName}</span>
            </p>
          </div>
        )}

        <div className="border border-border p-2 mb-4">
          <p className="text-[10px] text-muted-foreground">
            AVAILABLE TICKETS: <span className="text-foreground">{availableTickets.length}</span>
            {isAdmin && <span className="admin-badge ml-2">UNLIMITED</span>}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={generateTicket}
            disabled={generating}
            className="w-full text-[10px] text-foreground border border-foreground px-3 py-1.5 mb-4 hover:bg-foreground hover:text-primary-foreground transition-none disabled:opacity-50"
          >
            {generating ? "[GENERATING...]" : "[+ GENERATE NEW TICKET]"}
          </button>
        )}

        {/* Available tickets */}
        {availableTickets.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground tracking-[0.2em] mb-2">UNUSED TICKETS</p>
            {availableTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between border border-border p-2 mb-1">
                <span className="text-xs text-foreground font-mono tracking-wider">{ticket.invite_code}</span>
                <button
                  onClick={() => copyInviteLink(ticket.invite_code, ticket.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copiedId === ticket.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Used tickets */}
        {usedTickets.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground tracking-[0.2em] mb-2">USED TICKETS</p>
            {usedTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between border border-border/50 p-2 mb-1 opacity-50">
                <span className="text-xs text-muted-foreground font-mono tracking-wider line-through">{ticket.invite_code}</span>
                <span className="text-[10px] text-muted-foreground">
                  {ticket.used_at ? formatDistanceToNow(new Date(ticket.used_at), { addSuffix: true }) : "USED"}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-4">
          // Share your invite link to bring someone into the network
        </p>
      </div>
    </div>
  );
}
